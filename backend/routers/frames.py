"""routes for camera frames - this is where the AI magic happens (no cap)"""

import base64
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException
from models.schemas import FrameAnalysis
from database.db import get_connection
from services.vision import analyze_image
from services.notifications import send_alert, should_send_alert, mark_alert_sent

router = APIRouter(prefix="/api/frames", tags=["frames"])

# In-flight + completed async analyses. Keyed by analysis_id.
# In-memory on purpose: results also land in the frames table, this just
# powers the poll-until-done flow without a job queue.
ANALYSIS_RESULTS: dict[str, dict] = {}
MAX_TRACKED_ANALYSES = 200


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


def _save_offending_frame(job_id: int, status: str, image_b64: str) -> str | None:
    """Write the camera frame that triggered warning/stop to disk.

    Keeps receipts for postmortems and doubles as training data for better
    prompts. Returns the path, or None when the image can't be decoded.
    """
    try:
        # tolerate data URLs ("data:image/jpeg;base64,....")
        payload = image_b64.split(",", 1)[-1]
        raw = base64.b64decode(payload, validate=False)
        ext = "png" if raw[:8] == b"\x89PNG\r\n\x1a\n" else "jpg"
        out_dir = (
            Path(__file__).resolve().parent.parent / "captured_frames" / f"job_{job_id}"
        )
        out_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
        path = out_dir / f"{stamp}_{status}.{ext}"
        path.write_bytes(raw)
        return str(path)
    except Exception as e:  # noqa: BLE001 - capture failure must not break analysis
        print(f"[frames] couldnt save offending frame: {e}")
        return None


async def process_frame(job_id: int, machine: dict | None, image_b64: str) -> dict:
    """The whole pipeline: AI -> DB -> incident -> SMS. Shared by the sync
    and async endpoints so they behave identically."""
    machine_type = machine["machine_type"] if machine else "3d_printer"

    result = await analyze_image(machine_type, image_b64)

    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO frames
           (job_id, status, confidence, observation, probable_cause, recommended_action, severity)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            job_id,
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

    if result["status"] in ("warning", "stop"):
        title = f"{result['status'].upper()}: {result['observation'][:50]}..."
        conn.execute(
            """INSERT INTO incidents (job_id, title, description, root_cause, severity)
               VALUES (?, ?, ?, ?, ?)""",
            (
                job_id,
                title,
                result["observation"],
                result["probable_cause"],
                result["severity"],
            ),
        )
        conn.commit()

        saved_path = _save_offending_frame(job_id, result["status"], image_b64)

        machine_name = machine["name"] if machine else "Unknown"
        if should_send_alert(job_id, result["status"]):
            sent = send_alert(
                machine_name=machine_name,
                status=result["status"],
                severity=result["severity"],
                observation=result["observation"],
                probable_cause=result["probable_cause"],
                recommended_action=result["recommended_action"],
            )
            if sent:
                mark_alert_sent(job_id, result["status"])
            if saved_path:
                print(f"[frames] offending frame kept at {saved_path}")

    frame = conn.execute("SELECT * FROM frames WHERE id = ?", (frame_id,)).fetchone()
    conn.close()
    return dict(frame)


async def _run_analysis(
    analysis_id: str, job_id: int, machine: dict | None, image_b64: str
):
    try:
        frame = await process_frame(job_id, machine, image_b64)
        ANALYSIS_RESULTS[analysis_id] = {"status": "done", "frame": frame}
    except Exception as e:  # noqa: BLE001 - surface background failures to the poller
        ANALYSIS_RESULTS[analysis_id] = {"status": "error", "error": str(e)}


@router.post("/analyze")
async def analyze_frame(data: FrameAnalysis):
    """
    sync version - frontend sends a picture -> we send it to GPT -> save the
    result. blocks ~2s while the AI thinks, which is why analyze/async exists
    """
    conn = get_connection()
    job = conn.execute("SELECT * FROM jobs WHERE id = ?", (data.job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(
            status_code=404, detail="job not found bro (it doesnt exist lol)"
        )

    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (job["machine_id"],)
    ).fetchone()
    conn.close()

    return await process_frame(
        data.job_id, dict(machine) if machine else None, data.image
    )


@router.post("/analyze/async", status_code=202)
async def analyze_frame_async(data: FrameAnalysis, background: BackgroundTasks):
    """
    async version - kicks off the same pipeline in the background and returns
    202 immediately. poll GET /api/frames/analysis/{analysis_id} until done
    """
    conn = get_connection()
    job = conn.execute("SELECT * FROM jobs WHERE id = ?", (data.job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(
            status_code=404, detail="job not found bro (it doesnt exist lol)"
        )
    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (job["machine_id"],)
    ).fetchone()
    conn.close()

    analysis_id = uuid.uuid4().hex
    ANALYSIS_RESULTS[analysis_id] = {"status": "processing"}

    # keep memory bounded - drop oldest once we're tracking too many
    overflow = len(ANALYSIS_RESULTS) - MAX_TRACKED_ANALYSES
    if overflow > 0:
        for key in list(ANALYSIS_RESULTS.keys())[:overflow]:
            ANALYSIS_RESULTS.pop(key, None)

    background.add_task(
        _run_analysis,
        analysis_id,
        data.job_id,
        dict(machine) if machine else None,
        data.image,
    )

    return {
        "analysis_id": analysis_id,
        "status": "processing",
        "poll_url": f"/api/frames/analysis/{analysis_id}",
    }


@router.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: str):
    """poll this until status is done or error"""
    result = ANALYSIS_RESULTS.get(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="unknown analysis id")
    return result
