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

5. Capture the page at 1440x600. Position the browser window at y=240 first so a
   system dialog cannot land in frame, then capture the region below the browser
   toolbar:

   ```sh
   screencapture -x -R 0,400,1440,600 docs/images/demo.png
   ```

## What the repo carries now

`docs/images/demo.png` is a real capture of the dashboard served by `next start`
against a seeded demo session, cropped to the page so no browser chrome shows.
The feed reads "everything fine" because the seeded frames were never analyzed:
that needs a working vision endpoint. Re-run the steps above with a key to
replace it with a shot that carries a real verdict.

The capture command used:

```sh
screencapture -x -R 0,400,1440,600 docs/images/demo.png
```
