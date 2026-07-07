"""routes for camera frames - this is where the AI magic happens"""

from fastapi import APIRouter, HTTPException
from models.schemas import FrameAnalysis
from database.db import get_connection
from services.vision import analyze_image
from services.notifications import send_alert

router = APIRouter(prefix="/api/frames", tags=["frames"])


@router.get("/{job_id}")
def get_frames(job_id: int, limit: int = 20):
    """get the most recent frames for a job (for the timeline view)"""
    conn = get_connection()
    frames = conn.execute(
        "SELECT * FROM frames WHERE job_id = ? ORDER BY created_at DESC LIMIT ?",
        (job_id, limit),
    ).fetchall()
    conn.close()
    return [dict(f) for f in frames]


@router.post("/analyze")
async def analyze_frame(data: FrameAnalysis):
    """
    this is the main endpoint
    frontend sends a picture -> we send it to GPT -> save the result
    """
    conn = get_connection()

    # check the job exists
    job = conn.execute("SELECT * FROM jobs WHERE id = ?", (data.job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="job not found bro")

    # find out what kind of machine it is
    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (job["machine_id"],)
    ).fetchone()
    conn.close()

    if machine:
        machine_type = machine["machine_type"]
    else:
        machine_type = "3d_printer"  # fallback i guess

    # send to AI!
    result = await analyze_image(machine_type, data.image)

    # save the analysis to the database
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO frames 
           (job_id, status, confidence, observation, probable_cause, recommended_action, severity)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            data.job_id,
            result["status"],
            result["confidence"],
            result["observation"],
            result["probable_cause"],
            result["recommended_action"],
            result["severity"],
        ),
    )
    frame_id = cursor.lastrowid
    conn.commit()

    # if its bad, also create an incident record and send a text alert
    if result["status"] in ("warning", "stop"):
        title = f"{result['status'].upper()}: {result['observation'][:50]}..."
        conn.execute(
            """INSERT INTO incidents (job_id, title, description, root_cause, severity)
               VALUES (?, ?, ?, ?, ?)""",
            (
                data.job_id,
                title,
                result["observation"],
                result["probable_cause"],
                result["severity"],
            ),
        )
        conn.commit()

        # fire off an SMS alert in the background
        machine_name = machine["name"] if machine else "Unknown"
        send_alert(
            machine_name=machine_name,
            status=result["status"],
            severity=result["severity"],
            observation=result["observation"],
            probable_cause=result["probable_cause"],
            recommended_action=result["recommended_action"],
        )

    frame = conn.execute("SELECT * FROM frames WHERE id = ?", (frame_id,)).fetchone()
    conn.close()

    return dict(frame)
