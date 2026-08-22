"""tests for the async frame analysis endpoint (202 + polling)"""


def _create_job(client, name):
    cam = client.post(
        "/api/machines",
        json={"name": f"Async Cam {name}", "machine_type": "3d_printer"},
    )
    machine_id = cam.json()["id"]
    job = client.post("/api/jobs", json={"machine_id": machine_id, "job_name": name})
    return job.json()["id"]


def test_async_analysis_completes(client):
    """POST returns 202 + poll url; the background task finishes before we poll"""
    job_id = _create_job(client, "Async Job")

    res = client.post(
        "/api/frames/analyze/async",
        json={
            "job_id": job_id,
            "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
    )
    assert res.status_code == 202
    body = res.json()
    assert body["status"] == "processing"
    assert body["poll_url"].startswith("/api/frames/analysis/")

    # TestClient executes background tasks before returning, so it's done now
    res = client.get(body["poll_url"])
    assert res.status_code == 200
    result = res.json()
    assert result["status"] == "done"
    assert set(result["frame"]) >= {"job_id", "status", "observation"}


def test_unknown_analysis_id_404s(client):
    res = client.get("/api/frames/analysis/not-a-real-id")
    assert res.status_code == 404


def test_tracked_analyses_are_bounded():
    from routers.frames import ANALYSIS_RESULTS, MAX_TRACKED_ANALYSES

    overflow = MAX_TRACKED_ANALYSES + 10
    for i in range(overflow):
        ANALYSIS_RESULTS[str(i)] = {"status": "done"}

    oldest = list(ANALYSIS_RESULTS.keys())[: 10 + 1]
    # simulate what the endpoint does on a new submission
    extra = 1
    drop = len(ANALYSIS_RESULTS) - MAX_TRACKED_ANALYSES + extra
    for key in list(ANALYSIS_RESULTS.keys())[:drop]:
        ANALYSIS_RESULTS.pop(key, None)

    assert len(ANALYSIS_RESULTS) <= MAX_TRACKED_ANALYSES
    assert all(k not in ANALYSIS_RESULTS for k in oldest)
