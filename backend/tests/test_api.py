"""
tests for the fabops sentinel api (hope these pass lmao)
tests the main endpoints to make sure they work
now with cameras instead of seed machines!
todo: add more tests when we have time (we wont lol)
"""

from fastapi.testclient import TestClient
from database.db import DB_PATH, init_db, seed_data

# this needs to be before importing main so the db is fresh (ngl this was a pain to figure out)
if DB_PATH.exists():
    DB_PATH.unlink()

from main import app

client = TestClient(app)


def setup_module():
    """recreate the database before all tests (clean slate fr fr)"""
    if DB_PATH.exists():
        DB_PATH.unlink()
    init_db()
    seed_data()


def _create_camera(name="Test Cam", device_id="cam_123"):
    """helper to create a camera machine for testing (saves typing lol)"""
    return client.post(
        "/api/machines",
        json={"name": name, "machine_type": "camera", "device_id": device_id},
    )


def test_health_check():
    """the health endpoint should return ok (is it alive tho??)"""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "FabOps Sentinel"


def test_get_machines_empty_initially():
    """no seed data means no machines to start (lonely db 😔)"""
    res = client.get("/api/machines")
    assert res.status_code == 200
    machines = res.json()
    assert len(machines) == 0


def test_create_camera():
    """creating a camera monitor should work (we love new hardware)"""
    res = _create_camera("Workshop Cam", "dev_001")
    assert res.status_code == 200
    cam = res.json()
    assert cam["name"] == "Workshop Cam"
    assert cam["machine_type"] == "camera"
    assert cam["device_id"] == "dev_001"
    assert cam["status"] == "idle"
    assert "id" in cam

    # list should now include it
    res = client.get("/api/machines")
    assert len(res.json()) == 1


def test_get_machine_by_id():
    """getting a machine by id should work (like a lookup table but cooler)"""
    # create a camera first
    res = _create_camera("Office Cam", "dev_002")
    cam_id = res.json()["id"]

    res = client.get(f"/api/machines/{cam_id}")
    assert res.status_code == 200
    cam = res.json()
    assert cam["id"] == cam_id
    assert cam["name"] == "Office Cam"
    assert cam["device_id"] == "dev_002"


def test_get_machine_not_found():
    """getting a machine that doesnt exist should 404 (shocking i know)"""
    res = client.get("/api/machines/999")
    assert res.status_code == 404


def test_delete_camera():
    """deleting a camera should work (rip little buddy)"""
    res = _create_camera("Delete Me", "dev_delete")
    cam_id = res.json()["id"]

    res = client.delete(f"/api/machines/{cam_id}")
    assert res.status_code == 200
    assert res.json()["ok"] is True

    # should be gone now
    res = client.get(f"/api/machines/{cam_id}")
    assert res.status_code == 404


def test_delete_nonexistent():
    """deleting a machine that doesnt exist should 404 (it already gone lol)"""
    res = client.delete("/api/machines/999")
    assert res.status_code == 404


def test_create_job():
    """creating a job should work and set machine to running (lets print!!)"""
    # first create a camera
    res = _create_camera("Job Test Cam", "dev_job")
    machine_id = res.json()["id"]

    res = client.post(
        "/api/jobs",
        json={
            "machine_id": machine_id,
            "job_name": "Test Print",
            "material": "PLA",
        },
    )
    assert res.status_code == 200
    job = res.json()
    assert job["job_name"] == "Test Print"
    assert job["material"] == "PLA"
    assert job["status"] == "running"
    assert job["machine_id"] == machine_id

    # machine should now be running
    res = client.get(f"/api/machines/{machine_id}")
    assert res.json()["status"] == "running"


def test_get_jobs():
    """should return jobs (fr this time)"""
    res = client.get("/api/jobs")
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)
    # at least one job exists from test_create_job
    assert len(jobs) >= 1


def test_get_job_by_id():
    """getting a job by id should work (wow who would have guessed)"""
    # create a camera + job
    res = _create_camera("Job By ID Cam", "dev_jobid")
    machine_id = res.json()["id"]

    res = client.post(
        "/api/jobs",
        json={"machine_id": machine_id, "job_name": "Find Me"},
    )
    job_id = res.json()["id"]

    res = client.get(f"/api/jobs/{job_id}")
    assert res.status_code == 200
    job = res.json()
    assert job["id"] == job_id
    assert job["job_name"] == "Find Me"


def test_update_job_status():
    """completing a job should mark machine as idle (she's freeeee)"""
    # create a camera + job
    res = _create_camera("Status Test Cam", "dev_status")
    machine_id = res.json()["id"]

    res = client.post(
        "/api/jobs",
        json={
            "machine_id": machine_id,
            "job_name": "Laser Test",
            "material": "plywood",
        },
    )
    assert res.status_code == 200
    job_id = res.json()["id"]

    # complete it
    res = client.patch(f"/api/jobs/{job_id}/status?status=completed")
    assert res.status_code == 200
    assert res.json()["status"] == "completed"

    # machine should be idle again
    res = client.get(f"/api/machines/{machine_id}")
    assert res.json()["status"] == "idle"


def test_get_frames():
    """getting frames for a job should return an empty list initially (no pics yet)"""
    res = _create_camera("Frames Test Cam", "dev_frames")
    machine_id = res.json()["id"]

    res = client.post(
        "/api/jobs",
        json={"machine_id": machine_id, "job_name": "Frames Job"},
    )
    job_id = res.json()["id"]

    res = client.get(f"/api/frames/{job_id}")
    assert res.status_code == 200
    frames = res.json()
    assert isinstance(frames, list)


def test_analyze_frame_no_api_key():
    """without an api key, it should return unknown status gracefully (no key = no fun)"""
    res = _create_camera("AI Test Cam", "dev_ai")
    machine_id = res.json()["id"]

    res = client.post(
        "/api/jobs",
        json={"machine_id": machine_id, "job_name": "AI Job"},
    )
    job_id = res.json()["id"]

    res = client.post(
        "/api/frames/analyze",
        json={
            "job_id": job_id,
            "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
    )
    assert res.status_code == 200
    result = res.json()
    assert result["status"] == "unknown"


def test_get_report():
    """getting a report for a job should work (the postmortem)"""
    res = _create_camera("Report Test Cam", "dev_report")
    machine_id = res.json()["id"]

    res = client.post(
        "/api/jobs",
        json={"machine_id": machine_id, "job_name": "Report Job"},
    )
    job_id = res.json()["id"]

    res = client.get(f"/api/reports/{job_id}")
    assert res.status_code == 200
    report = res.json()
    assert "job_name" in report
    assert "machine_name" in report
    assert "job_id" in report


def test_get_nonexistent_report():
    """getting a report for a job that doesnt exist should 404 (ghost job)"""
    res = client.get("/api/reports/9999")
    assert res.status_code == 404


def test_update_machine_status():
    """changing machine status should work (machine identity crisis)"""
    res = _create_camera("Status Update Cam", "dev_update")
    machine_id = res.json()["id"]

    res = client.patch(f"/api/machines/{machine_id}/status?status=stopped")
    assert res.status_code == 200
    assert res.json()["status"] == "stopped"

    # invalid status should fail (nice try)
    res = client.patch(f"/api/machines/{machine_id}/status?status=invalid")
    assert res.status_code == 400
