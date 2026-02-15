# Frontend Overview

## Purpose
- Next.js dashboard for the Vehicle Counting + Dynamic Traffic Light System.
- Connects to the FastAPI backend (default `http://localhost:8000`) for live video + status.

## Run

Dev:
```bash
cd traffic-control-system-frontend
npm install
npm run dev
```

Production build:
```bash
cd traffic-control-system-frontend
npm run build
npm run start
```

## Config
- `NEXT_PUBLIC_API_URL` (optional) — backend base URL. Default: `http://localhost:8000`.
  - Put it in `.env.local` if your backend runs elsewhere.

## Key Files
- `lib/api.ts` — all backend calls and response normalization.
- `lib/types.ts` — frontend types for API responses.
- `components/dashboard/video-feed.tsx` — WebSocket video feed rendered to `<canvas>`.
- `components/dashboard/camera-source-manager.tsx` — upload + assign sources to camera slots.

## Troubleshooting
- Video disconnected/blank:
  - Confirm backend is running and reachable at `NEXT_PUBLIC_API_URL`.
  - Check browser DevTools → Network → WS for `/api/v1/streams/{id}/video_feed`.
  - Check backend logs for source-open/OpenCV errors after assigning a source.
- Source assignment issues:
  - Ensure you’re calling `POST /api/v1/sources/intersection/{id}/camera/{camera_id}/source` with `{ "source": <path|index> }`.
- System metrics not updating:
  - Frontend reads health from `GET /api/v1/health/status`.