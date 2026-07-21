# FabOps Sentinel — Dashboard

Frontend for an AI-powered 3D printer monitoring system. Built for a hackathon.

The idea: point a webcam at your printer, and the AI watches for failures (spaghetti, warping, layer shifts) so you don't have to. This is the dashboard UI.

## Run it

```bash
npm install
npm run dev
```

Opens at `localhost:5173`. Connects to the FastAPI backend at `localhost:8000` — see the [main README](../README.md) for backend setup.

## What's in here

| Route        | Page |
|--------------|------|
| `/`          | Dashboard overview — machine status + recent alerts |
| `/machines`  | Add/remove machines |
| `/incidents` | Defect history log |
| `/reports`   | Per-job analysis reports |
| `/analytics` | Usage trends and defect patterns |

## Stack

Next.js 15 (App Router), TypeScript, Tailwind CSS. Polling-based updates from the API.

## Structure

```
src/
├── app/             # pages (app router)
├── components/      # camera, dashboard widgets, layout, ui
├── hooks/           # useApi, usePolling
├── lib/             # API client + utilities
└── types/           # TypeScript types
```

## Dev

```bash
npm run lint
npm run build
```
