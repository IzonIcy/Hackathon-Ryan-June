"""routes for the incident reports - post job summaries"""

from fastapi import APIRouter, HTTPException
from database.db import get_connection
from services.reporting import generate_incident_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/{job_id}")
def get_job_report(job_id: int):
    """get a full report for a specific job"""
    report = generate_incident_report(job_id)
    if not report:
        raise HTTPException(status_code=404, detail="couldnt find that job")
    return report


@router.get("")
def list_reports():
    """get reports for all completed/failed jobs (for the reports page)"""
    conn = get_connection()
    jobs = conn.execute(
        "SELECT id FROM jobs WHERE status IN ('completed', 'failed') ORDER BY created_at DESC"
    ).fetchall()
    conn.close()

    reports = []
    for job in jobs:
        report = generate_incident_report(job["id"])
        if report:
            reports.append(report)

    return reports
