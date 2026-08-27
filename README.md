# FabOps Sentinel

FabOps Sentinel watches a webcam pointed at your 3D printer, laser cutter, or CNC machine, sends captured frames to an AI vision model, and texts you when it spots something wrong. A Next.js dashboard shows live status, analytics, incidents, and reports.

## How it works

A camera watches the machine. When you start monitoring a job from the dashboard, it captures a frame every few seconds and posts each one to the backend's `/api/frames/analyze` endpoint. The backend sends the frame along with your reference images of good and failed prints to an OpenAI-compatible vision API, stores the verdict, and fires a Twilio SMS if the result is a warning or stop condition. The dashboard polls the API for results so live status, incidents, and reports stay current. You can also trigger an analysis manually at any point with the "Analyze Now" button.

## Quick start

### Prerequisites

- Python 3.12+ and Node.js 20+
- A webcam (built-in or USB) pointed at the machine
- An API key for an OpenAI-compatible vision provider (e.g., [EAON](https://eaon.dev), OpenAI, Groq)

### Backend

```bash
git clone <repo-url>
cd Hackathon-Ryan-June/backend
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env       # On Windows: copy .env.example .env
```

Edit `.env` (it is git-ignored; `.env.example` is the template, never commit real keys):

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | yes | Key for your vision API provider |
| `OPENAI_BASE_URL` | yes | Provider endpoint, e.g. `https://api.eaon.dev/v1` |
| `OPENAI_MODEL` | yes | Model name, e.g. `gemini-3.1-flash-lite` or `gpt-4o-mini` |
| `FABOPS_API_TOKEN` | recommended | Any long random string. Enables bearer auth on all `/api` routes |
| `VITE_FABOPS_API_TOKEN` | with token auth | Same value, exposed to the Vite frontend so its API client sends the bearer header |
| `NEXT_PUBLIC_FABOPS_API_TOKEN` | with token auth | Same value for the Next.js dashboard's API client |
| `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_PHONE_NUMBER`, `ALERT_PHONE_NUMBER` | no | Twilio SMS alerts |

Start the server:

```bash
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`, Swagger docs at `http://localhost:8000/docs`.

A note on security: with `FABOPS_API_TOKEN` set, every `/api` route requires an `Authorization: Bearer <your-token>` header (`/api/health` excepted). Without a token configured, the API only serves loopback clients and rejects everything else with a `503`, so an accidentally exposed port is not an open API. The `/api/debug/*` routes stay disabled unless you set `FABOPS_DEBUG=1`. Frame analysis is rate limited per client at 10 requests per minute by default, tunable with `ANALYZE_RATE_LIMIT_PER_MINUTE`.

### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open `http://localhost:3000`. Add a machine (3D printer, laser cutter, CNC, or generic camera), click "Watch It" to start a monitoring session, and point the webcam at the machine. Frames get analyzed automatically while the session is active, or click "Analyze Now" for a manual check.

### Alternate frontend

There is also a smaller React Router app under `frontend/` that proxies `/api` calls to the backend:

```bash
cd frontend
npm install
npm run dev
```

It serves `http://localhost:5173`.

## Project structure

```
backend/                        # Python FastAPI backend
├── main.py                     # Server entry point, routes, CORS
├── auth.py                     # Bearer token middleware
├── rate_limit.py               # Per-client rate limiting for paid AI endpoints
├── .env.example                # Template for environment variables
├── database/
│   ├── db.py                   # SQLite connection & init
│   └── schema.sql              # Table definitions
├── models/
│   └── schemas.py              # Pydantic request/response models
├── routers/
│   ├── frames.py               # Frame analysis (sync and async)
│   ├── jobs.py                 # Job management
│   ├── machines.py             # Machine CRUD
│   ├── reports.py              # Report generation
│   ├── seed.py                 # Demo data seeding/clearing
│   └── sessions.py             # Start/stop monitoring sessions
├── services/
│   ├── vision.py               # Calls the vision API
│   ├── notifications.py        # Twilio SMS alerts
│   └── reporting.py            # Report building
├── reference_images/           # Reference images for defect detection
├── requirements.txt
└── tests/                      # pytest suite

dashboard/                      # Next.js frontend
├── src/
│   ├── app/                    # Home, analytics, incidents, machines, reports
│   ├── components/
│   │   ├── camera/             # Live camera feed, capture, "Watch It"/"Analyze Now"
│   │   ├── dashboard/          # Widgets, charts, cards
│   │   ├── layout/             # Sidebar, header, notifications
│   │   └── ui/                 # Reusable shadcn-style components
│   ├── hooks/                  # use-api, use-polling
│   ├── lib/                    # API client, utils
│   └── types/                  # TypeScript type definitions
├── package.json
└── next.config.ts

frontend/                       # Alternate Vite + React Router UI
hardware/                       # Hardware configs
database.db                     # SQLite database
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/machines` | List all machines |
| `POST` | `/api/machines` | Create a machine |
| `GET` | `/api/machines/{id}` | Get machine details |
| `DELETE` | `/api/machines/{id}` | Delete a machine |
| `PATCH` | `/api/machines/{id}/status` | Update machine status |
| `GET` | `/api/jobs` | List jobs |
| `POST` | `/api/jobs` | Create a job |
| `GET` | `/api/jobs/{id}` | Get job details |
| `PATCH` | `/api/jobs/{id}/status` | Update job status |
| `POST` | `/api/frames/analyze` | Analyze a frame synchronously |
| `POST` | `/api/frames/analyze/async` | Queue an analysis, returns `202` |
| `GET` | `/api/frames/{job_id}` | List frames for a job |
| `GET` | `/api/frames/analysis/{analysis_id}` | Poll an async analysis result |
| `GET` | `/api/reports` | List reports |
| `GET` | `/api/reports/{job_id}` | Get report for a job |
| `POST` | `/api/sessions/start` | Start a monitoring session |
| `POST` | `/api/sessions/{job_id}/stop` | Stop a monitoring session |
| `POST` | `/api/seed/demo/{job_id}` | Fill a job with demo frames and incidents |
| `POST` | `/api/seed/clear` | Wipe all frames, incidents, jobs, and machines |

## Reference images

The `backend/reference_images/` folder holds the sample images the model compares against:

- Files with `error` or `spagheti` in the name are defect references (spaghetti, warping, etc.)
- Everything else counts as a good/normal print

Adding more of your own real failure photos is the easiest way to improve detection.

## SMS alerts (optional)

1. Sign up at [Twilio](https://console.twilio.com)
2. Get your Account SID, API Key SID, and API Key Secret
3. Add them to `.env`, plus `TWILIO_PHONE_NUMBER` (your Twilio number) and `ALERT_PHONE_NUMBER` (your cell)

When a `warning` or `stop` condition comes back from an analysis, you get a text.

## Running tests

```bash
# Backend
cd backend && python -m pytest tests/ -v

# Alternate frontend
cd frontend && npm test
```

## Limitations

- Hackathon project. Expect rough edges.
- Detection quality depends entirely on the reference image set. Generic stock references catch obvious spaghetti but may miss subtler failures on your specific printer or material.
- Analysis compares individual frames against references. There is no tracking of print state across frames.
- Auth is a single shared bearer token and storage is SQLite. This is built for local and demo use, not exposure to the open internet.
- The Next.js dashboard has no automated tests. The backend has a pytest suite and the Vite frontend has vitest coverage.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLite, httpx |
| Dashboard | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Alternate frontend | Vite, React Router |
| AI | OpenAI-compatible vision API (EAON, OpenAI, Groq, etc.) |
| Alerts | Twilio SMS |

## Credits

Built by Ryan Bahadori with Shreeansh Bharadwaj and SansCreates.
