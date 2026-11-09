# FabOps Sentinel

Vision monitoring for 3D printers, laser cutters, and CNC machines. A camera captures frames, an OpenAI-compatible vision API judges them against reference images, and a warning or stop verdict sends an SMS. A Next.js dashboard shows live state, incidents, analytics, and reports.

## Three surfaces

| Path        | Stack                        | Runs on        |
| ----------- | ---------------------------- | -------------- |
| `backend/`  | FastAPI, SQLite, Twilio      | Python 3.12+   |
| `dashboard/`| Next.js, Radix, Tailwind     | Node 20+       |
| `frontend/` | Vite, React, vitest          | Node 20+       |
| `hardware/` | camera and rig notes         | n/a            |

Each surface has its own dependency manifest. There is no workspace linking them, so install and test them separately.

## Commands

```sh
# backend
cd backend && source venv/bin/activate
pytest
uvicorn main:app --reload

# dashboard
cd dashboard && npm run lint && npm run build

# frontend
cd frontend && npm test && npm run lint
```

`docker-compose.yml` starts the stack together.

## Data flow

The dashboard starts a monitoring job. The capture loop posts frames to `POST /api/frames/analyze`. The backend sends the frame plus reference images to the vision API, stores the verdict, and fires Twilio when the verdict is warning or stop. The dashboard polls for state, so it does not hold a socket.

## Conventions

- Secrets live in `.env` and never in code. `.env.example` is the template.
- The database is runtime state. Do not commit `fabops.db`, `-shm`, or `-wal`.
- API shapes are defined once in the backend and duplicated in the frontend. If you change a response, update both and say so in the PR.
- Frame analysis must be idempotent per frame id. Retries happen.

## Verification

Run the affected surface's tests plus a build. For a change to frame analysis, exercise the endpoint with a real image, not a mock. For a dashboard change, the build must pass and the page must render.
