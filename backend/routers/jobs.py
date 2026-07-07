"""routes for jobs - starting/stopping and stuff"""

from fastapi import APIRouter, HTTPException
from models.schemas import JobCreate
from database.db import get_connection

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("")
def list_jobs(status: str = None):
    """get all jobs, or filter by status if you want"""
    conn = get_connection()
    if status:
        jobs = conn.execute(
            "SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC",
            (status,),
        ).fetchall()
    else:
        jobs = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(j) for j in jobs]


@router.get("/{job_id}")
def get_job(job_id: int):
    conn = get_connection()
    job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return dict(job)


@router.post("")
def create_job(job: JobCreate):
    """start a new job on a machine"""
    conn = get_connection()

    # make sure the machine exists
    machine = conn.execute(
        "SELECT * FROM machines WHERE id = ?", (job.machine_id,)
    ).fetchone()
    if not machine:
        conn.close()
        raise HTTPException(status_code=404, detail="that machine doesnt exist")

    # insert the job
    cursor = conn.execute(
        """INSERT INTO jobs (machine_id, job_name, material, estimated_duration, status)
           VALUES (?, ?, ?, ?, 'running')""",
        (job.machine_id, job.job_name, job.material, job.estimated_duration),
    )
    job_id = cursor.lastrowid

    # mark machine as running
    conn.execute(
        "UPDATE machines SET status = 'running' WHERE id = ?", (job.machine_id,)
    )
    conn.commit()

    new_job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return dict(new_job)


@router.patch("/{job_id}/status")
def update_job_status(job_id: int, status: str):
    """update job status: running, paused, completed, failed"""
    allowed = ["running", "paused", "completed", "failed"]
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of: {allowed}")

    conn = get_connection()
    job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="job not found")

    # if job is done, set completed time and free the machine
    if status in ("completed", "failed"):
        conn.execute(
            "UPDATE jobs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
            (status, job_id),
        )
        conn.execute(
            "UPDATE machines SET status = 'idle' WHERE id = ?", (job["machine_id"],)
        )
    else:
        conn.execute("UPDATE jobs SET status = ? WHERE id = ?", (status, job_id))
        conn.execute(
            "UPDATE machines SET status = ? WHERE id = ?", (status, job["machine_id"])
        )

    conn.commit()
    updated = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return dict(updated)
