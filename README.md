# FabOps Sentinel

> AI-powered surveillance for 3D printers, laser cutters, and CNC machines.
> Watches your live camera feed, detects print failures (spaghetti, warping, etc.), and sends SMS alerts — in real time.

## How It Works

1. **Camera captures** a live feed of your machine
2. **AI (vision model)** analyzes each frame against reference images of known defects
3. **Alerts** fire via SMS (Twilio) when something goes wrong
4. **Dashboard** shows real-time status, historical reports, and incident logs

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- A webcam (built-in or USB) pointed at your machine
- An OpenAI-compatible API key (e.g., [EAON](https://eaon.dev), OpenAI, Groq, etc.)

### 1. Clone & Set Up the Backend

```bash
# Clone the repo
git clone <repo-url>
cd Hackathon-Ryan-June

# Set up Python backend
cd backend
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# IMPORTANT: Create your .env file from the template
# Mac / Linux:
cp .env.example .env
# Windows:
copy .env.example .env
# Then edit .env and put in your API key
```

### 2. Configure `.env`

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | Your API key (OpenAI, EAON, Groq, etc.) |
| `OPENAI_BASE_URL` | ✅ | API endpoint (e.g., `https://api.eaon.dev/v1`) |
| `OPENAI_MODEL` | ✅ | Model name (e.g., `gemini-3.1-flash-lite`, `gpt-4o-mini`) |
| `TWILIO_*` | ❌ | Optional — for SMS alerts |

**Your `.env` file is git-ignored** — use `.env.example` as a template. Never commit real API keys.

### 3. Start the Backend Server

```bash
cd backend
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`.  
Swagger docs at `http://localhost:8000/docs`.

### 4. Start the Dashboard

```bash
cd dashboard
npm install
npm run dev
```

The dashboard runs at `http://localhost:5173` (or `http://localhost:3000`).

### 5. Use It

1. Open the dashboard in your browser
2. **Add a machine** (3D printer, laser cutter, CNC, or generic camera)
3. **Click "Watch It"** — this creates a monitoring session
4. Point your webcam at the machine
5. The AI will automatically analyze frames and flag defects
6. Click **"Analyze Now"** to manually trigger an analysis

---

## Project Structure

```
backend/                        # Python FastAPI backend
├── main.py                     # Server entry point, routes, CORS
├── .env.example                # Template for environment variables
├── database/
│   ├── db.py                   # SQLite connection & init
│   └── schema.sql              # Table definitions
├── models/
│   └── schemas.py              # Pydantic models (request/response)
├── routers/
│   ├── frames.py               # Frame analysis endpoint (POST /api/frames/analyze)
│   ├── jobs.py                 # Job management
│   ├── machines.py             # Machine CRUD
│   ├── reports.py              # Report generation
│   ├── seed.py                 # Test data seeding
│   └── sessions.py             # Start/stop monitoring sessions
├── services/
│   ├── vision.py               # AI image analysis (calls the vision API)
│   └── notifications.py        # Twilio SMS alerts
├── reference_images/           # Reference images for AI defect detection
├── requirements.txt
└── tests/
    └── test_api.py             # API integration tests

dashboard/                      # Next.js frontend
├── src/
│   ├── app/
│   │   ├── page.tsx            # Home / overview
│   │   ├── analytics/
│   │   ├── incidents/
│   │   ├── machines/
│   │   └── reports/
│   ├── components/
│   │   ├── camera/             # Live camera feed & capture
│   │   ├── dashboard/          # Widgets, charts, cards
│   │   ├── layout/             # Sidebar, header, notifications
│   │   └── ui/                 # Reusable shadcn-style components
│   ├── hooks/                  # use-api, use-polling
│   ├── lib/                    # API client, utils
│   └── types/                  # TypeScript type definitions
├── package.json
└── next.config.ts
```

---

## API Endpoints

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
| `POST` | `/api/frames/analyze` | **Analyze a camera frame** (sends to AI) |
| `GET` | `/api/frames/{job_id}` | Get frames for a job |
| `GET` | `/api/reports` | List reports |
| `GET` | `/api/reports/{job_id}` | Get report for a job |
| `POST` | `/api/sessions/start` | Start monitoring session |
| `POST` | `/api/sessions/{job_id}/stop` | Stop monitoring session |

---

## Reference Images

The `backend/reference_images/` folder contains sample images the AI uses as reference:

- Files with `error` or `spagheti` in the name → defect references (spaghetti, warping, etc.)
- All other images → good/normal print references

Add your own reference images to improve detection accuracy!

---

## SMS Alerts (Optional)

To enable SMS alerts via Twilio:

1. Sign up at [Twilio](https://console.twilio.com)
2. Get your Account SID, API Key SID, and API Key Secret
3. Add them to `.env` (see `.env.example` for the format)
4. Set `TWILIO_PHONE_NUMBER` (your Twilio number) and `ALERT_PHONE_NUMBER` (your cell)

When the AI detects a `warning` or `stop` condition, you'll get a text message.

---

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

---

## Troubleshooting

### "No API key found" in the dashboard

```
Copy backend/.env.example to backend/.env and fill in your OPENAI_API_KEY
```

**Cause:** The `.env` file is missing or doesn't have `OPENAI_API_KEY` set.  
**Fix:**
```bash
cd backend
# Mac / Linux:
cp .env.example .env
# Windows:
copy .env.example .env
```

Then edit `.env` and replace `sk-your-key-here` with your actual API key. Restart the server.

### "AI analysis failed: 413 Payload Too Large"

**Cause:** The reference images are too large for the API.  
**Fix:** Reduce image sizes or use fewer reference images.

### Camera not working

- Make sure your browser has permission to access the camera
- Try a different browser (Chrome works best)
- Check that no other app is using the camera

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLite, httpx |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| AI | OpenAI-compatible vision API (EAON, OpenAI, Groq, etc.) |
| Alerts | Twilio SMS |
| Testing | pytest (backend) |
