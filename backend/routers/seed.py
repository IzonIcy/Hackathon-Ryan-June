"""seeds demo data so the reports arent empty for the hackathon"""

from datetime import datetime, timedelta
from fastapi import APIRouter
from database.db import get_connection
from services.notifications import send_alert

router = APIRouter(prefix="/api/seed", tags=["seed"])


@router.post("/demo/{job_id}")
def seed_demo(job_id: int):
    conn = get_connection()
    job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        return {"error": "not found"}

    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (job["machine_id"],)
    ).fetchone()
    machine_name = machine["name"] if machine else "Unknown"

    data = [
        ("normal", 0.98, "First layer looks good, good adhesion", None, None, "low"),
        ("normal", 0.95, "Print is progressing normally", None, None, "low"),
        (
            "warning",
            0.78,
            "Slight stringing detected between walls",
            "Retraction settings may need tuning",
            "Check retraction distance and speed",
            "low",
        ),
        ("normal", 0.90, "Stringing stopped, continuing fine", None, None, "low"),
        (
            "warning",
            0.72,
            "Small adhesion issue on the left corner",
            "Bed leveling might be off",
            "Check bed leveling and temp",
            "medium",
        ),
        (
            "stop",
            0.88,
            "Print has detached from the bed!",
            "Bed adhesion lost",
            "Stop print, clean bed, re-level",
            "high",
        ),
    ]

    now = datetime.now()
    frame_count = 0
    incident_count = 0
    for i, (s, c, o, cause, act, sev) in enumerate(data):
        ts = now - timedelta(seconds=(len(data) - i) * 15)
        conn.execute(
            "INSERT INTO frames (job_id, status, confidence, observation, probable_cause, recommended_action, severity, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (job_id, s, c, o, cause, act, sev, ts.strftime("%Y-%m-%d %H:%M:%S")),
        )
        frame_count += 1

        # also create incidents for warning/stop frames like the analyze endpoint does
        if s in ("warning", "stop"):
            title = f"{s.upper()}: {o[:50]}..."
            conn.execute(
                """INSERT INTO incidents (job_id, title, description, root_cause, severity)
                   VALUES (?, ?, ?, ?, ?)""",
                (job_id, title, o, cause, sev),
            )
            incident_count += 1

            # fire SMS alert too, same as live frame analysis
            send_alert(
                machine_name=machine_name,
                status=s,
                severity=sev,
                observation=o,
                probable_cause=cause,
                recommended_action=act,
            )

    conn.commit()
    conn.close()
    return {"ok": True, "frames": frame_count, "incidents": incident_count}


@router.post("/clear")
def clear_all_data():
    """wipe all frames, incidents, jobs, and machines — back to clean slate"""
    conn = get_connection()
    conn.execute("DELETE FROM frames")
    conn.execute("DELETE FROM incidents")
    conn.execute("DELETE FROM jobs")
    conn.execute("DELETE FROM machines")
    conn.commit()
    conn.close()
    return {"ok": True, "message": "All data cleared"}
