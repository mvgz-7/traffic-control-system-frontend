# Frontend Overview (traffic-control-system)

Purpose
- Provides the web dashboard and controls for the Traffic Control System.
- Consumes the Python FastAPI backend at `http://localhost:8000` to show live video and realtime stats.

Where it lives
- Next.js (app router) project. Key areas:
  - `app/` — pages and layout (app/page.tsx, app/*/page.tsx)
  - `components/` — React UI components (dashboard widgets, layout, UI primitives)
  - `lib/` — small helpers and API functions (`lib/api.ts`, `lib/types.ts`)
  - `app/globals.css` — global CSS and theme variables

How to run (dev)
- From repo root:

```bash
cd traffic-control-system-frontend
npm install    # if not installed
npm run dev
```

How to build (production)

```bash
cd traffic-control-system
npm run build
npm run start
```

Important environment variables
- `NEXT_PUBLIC_API_URL` — base URL for backend API. Default: `http://localhost:8000`.
  Set this in `.env.local` if your backend runs elsewhere.

Key frontend files/components
- `lib/api.ts` — central helper functions calling backend endpoints. The file normalizes backend responses (unwraps `{ cameras: [...] }` and `{ uploads: [...] }`) and converts numeric camera IDs when assigning sources.
- `components/dashboard/video-feed.tsx` — renders the live feed using a WebSocket + `<canvas>` approach (frames are base64 JPEG). Includes reconnect/backoff and connection status.
- `components/dashboard/camera-source-manager.tsx` — UI for listing hardware cameras and uploaded files, uploading new files, and assigning a source to a target camera slot. After assignment it attempts to start processing automatically.
- `components/dashboard/stats-cards.tsx` — top-level stat cards reading `TrafficStats`.

Common frontend issues & troubleshooting
- Video is blank / disconnected:
  1. Ensure backend is running (uvicorn `src.api.main:app` on `http://localhost:8000`).
  2. Check the REST endpoints the frontend uses (examples):
     - `GET /api/v1/intersections/` — list intersections
     - `GET /api/v1/intersections/{id}/cameras` — camera health/status
     - `GET /api/v1/streams/` — available WebSocket streams
     - `GET /api/v1/sources/uploads` — uploaded files
     - `POST /api/v1/sources/intersection/{id}/camera/{camera_id}/source` — assign source
     - `POST /api/v1/intersections/{id}/processing/start` — start processing (stream handler)
  3. If you assign a source but the feed stays black, inspect camera health: `GET /api/v1/intersections/{id}/cameras`. If a camera shows `failed`, check UVicorn logs for `Failed to open source` or OpenCV errors.
  4. Uploaded files must be readable by the backend process; prefer assigning the absolute path returned by `/api/v1/sources/uploads`.
  5. CORS / WebSocket connectivity: if frontend can't connect, ensure `NEXT_PUBLIC_API_URL` points to the backend and that backend allows CORS for your origin.
  6. Browser devtools: check the WebSocket connection to `ws://.../api/v1/streams/{id}/video_feed` and any error responses — the frontend surfaces backend error messages as toasts where possible.

How to contribute / extend
- Add pages under `app/` using the app-router pattern (`page.tsx`).
- Reusable UI should go in `components/` and follow existing UI primitives (`components/ui/*`).
- Keep API surface in `lib/api.ts` up to date when backend endpoints change — the frontend expects `v1` endpoints and specific response shapes.
- For visual theming, prefer semantic CSS variables in `globals.css` rather than hard-coded colors.

Small notes
- The frontend now uses WebSockets for high-bandwidth video frames and a lightweight status feed for lower-rate telemetry. Use the `video_feed` websocket for canvas frames and `status_feed` for background widgets.

Quick examples
- Get live stats from console (frontend helper):

```js
import { fetchLiveStats } from '@/lib/api'
fetchLiveStats().then(console.log).catch(console.error)
```

- Change video source to webcam 0 (curl):

```bash
curl -X POST http://localhost:8000/api/video/change_source -H "Content-Type: application/json" -d '{"source":0}'
```

Where to look first
- `lib/api.ts` to see what the frontend expects from backend endpoints.
- `components/dashboard/video-feed.tsx` to see how MJPEG is consumed and how Start/Stop are triggered.
- `app/layout.tsx` and `app/globals.css` for theme and style variables.