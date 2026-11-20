# Capturing the FabOps demo

The demo shot is the Next.js dashboard showing a monitor, a recent verdict, and
one incident row. It needs the backend and the dashboard running at the same
time, which is why it is not captured here: this repo's program does not start
servers without asking first.

## Why there is no capture yet

The dashboard reads live state from the FastAPI backend. A static build renders
empty cards and a disconnected banner, which is worse than no screenshot. The
capture needs two processes:

- `uvicorn main:app --port 8000` in `backend/`
- the dashboard on port 3000

Docker is not installed on the capture machine, so `docker compose up` is not an
option there.

## Steps

1. Copy the environment template and fill it:

   ```sh
   cp backend/.env.example backend/.env
   ```

   `OPENAI_API_KEY` is required for analysis. Twilio keys are optional and the
   SMS path disables itself when they are absent.

2. Start the backend from `backend/` in a Python 3.12+ environment:

   ```sh
   pip install -r requirements.txt
   uvicorn main:app --port 8000
   ```

3. Start the dashboard from `dashboard/`:

   ```sh
   bun install && bun run dev
   ```

4. Open `http://localhost:3000`, start a monitor against one of the reference
   images in `backend/reference_images/`, and let one frame analyze so the card
   shows a real verdict rather than an empty state.

5. Capture the window at 1440x900:

   ```sh
   screencapture -x -o -l"$(peekaboo window list --app "Google Chrome" --json | jq -r '.data.windows[0].window_id')" docs/images/demo.png
   ```

## Placeholder

`docs/images/demo.png` is intentionally absent. The README refers to this file
instead of embedding a screenshot that does not exist. Replace the reference
once the steps above produce one.
