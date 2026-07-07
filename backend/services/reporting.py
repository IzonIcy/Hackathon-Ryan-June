"""
this file makes incident reports from all the frame data
it looks at all the AI observations and summarizes them
kinda like how datadog does postmortems i guess
"""

from database.db import get_connection


def generate_incident_report(job_id):
    """
    takes a job id and makes a report with all the AI observations
    returns a dict with the report data
    """
    conn = get_connection()

    # Get the job and machine info together
    job = conn.execute(
        """
        SELECT j.*, m.name as machine_name, m.machine_type 
        FROM jobs j 
        JOIN machines m ON j.machine_id = m.id 
        WHERE j.id = ?
    """,
        (job_id,),
    ).fetchone()

    if not job:
        conn.close()
        return None

    # Get all the frames (AI observations) for this job
    frames = conn.execute(
        """
        SELECT * FROM frames 
        WHERE job_id = ? 
        ORDER BY created_at ASC
    """,
        (job_id,),
    ).fetchall()

    conn.close()

    # Count how many of each type
    statuses = [f["status"] for f in frames]
    normal_count = statuses.count("normal")
    warning_count = statuses.count("warning")
    stop_count = statuses.count("stop")

    # what was the worst thing that happened?
    if stop_count > 0:
        worst_status = "stop"
    elif warning_count > 0:
        worst_status = "warning"
    else:
        worst_status = "normal"

    # Get the bad frames (warnings and stops)
    bad_frames = [f for f in frames if f["status"] in ("warning", "stop")]

    # Figure out the severity based on how bad it got
    if stop_count > 0:
        severity = "high"
    elif warning_count > 2:
        severity = "medium"
    elif warning_count > 0:
        severity = "low"
    else:
        severity = "low"

    # Build the report
    report = {
        "job_id": job["id"],
        "job_name": job["job_name"],
        "machine_name": job["machine_name"],
        "machine_type": job["machine_type"],
        "material": job["material"],
        "job_status": job["status"],
        "worst_status": worst_status,
        "severity": severity,
        "duration": f"{job['estimated_duration']} min"
        if job["estimated_duration"]
        else "Unknown",
        "total_frames": len(frames),
        "normal_frames": normal_count,
        "warning_frames": warning_count,
        "stop_frames": stop_count,
        "incidents": [],
        "observations": [],
    }

    # Add observations from the bad frames (max 5 so its not too long)
    for f in bad_frames[:5]:
        report["observations"].append(
            {
                "time": f["created_at"],
                "status": f["status"],
                "observation": f["observation"],
                "probable_cause": f["probable_cause"],
                "recommended_action": f["recommended_action"],
                "severity": f["severity"],
            }
        )

    # Create an incident summary if something went wrong
    if worst_status in ("warning", "stop") and bad_frames:
        last_bad = bad_frames[-1]  # the most recent bad frame
        report["incidents"].append(
            {
                "title": f"{worst_status.upper()} on {job['machine_name']}",
                "description": last_bad["observation"] or "Something went wrong",
                "root_cause": last_bad["probable_cause"] or "Unknown cause",
                "recommended_action": last_bad["recommended_action"]
                or "Go check the machine",
            }
        )

    return report
