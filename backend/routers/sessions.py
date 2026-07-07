"""super simple monitoring sessions - just start and stop"""

from fastapi import APIRouter, Query
from database.db import get_connection

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("/start")
def start_session(machine_id: int = Query(1)):
    """creates a new monitoring session for a specific machine"""
    conn = get_connection()

    # make sure the machine exists
    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (machine_id,)
    ).fetchone()
    if not machine:
        conn.close()
        return {"error": "machine not found"}

    # create the job linked to that machine
    cursor = conn.execute(
        """INSERT INTO jobs (machine_id, job_name, status)
           VALUES (?, 'Live Monitoring Session', 'running')""",
        (machine_id,),
    )
    job_id = cursor.lastrowid

    # mark machine as running
    conn.execute("UPDATE machines SET status = 'running' WHERE id = ?", (machine_id,))
    conn.commit()
    conn.close()

    return {"job_id": job_id, "machine_name": machine["name"]}


@router.post("/{job_id}/stop")
def stop_session(job_id: int):
    """stops a monitoring session"""
    conn = get_connection()

    # get the machine id first
    job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        return {"error": "session not found"}

    # mark job as completed and free the machine
    conn.execute(
        "UPDATE jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
        (job_id,),
    )
    conn.execute(
        "UPDATE machines SET status = 'idle' WHERE id = ?",
        (job["machine_id"],),
    )
    conn.commit()
    conn.close()

    return {"status": "completed", "job_id": job_id}
