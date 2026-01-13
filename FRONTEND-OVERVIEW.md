# Frontend Overview (traffic-control-system)

Purpose
- Provides the web dashboard and controls for the Traffic Control System.
- Consumes the Python FastAPI backend at `http://localhost:8000` to show MJPEG feed and live stats.

Where it lives
- Next.js (app router) project. Key areas:
  - `app/` — pages and layout (app/page.tsx, app/*/page.tsx)
  - `components/` — React UI components (dashboard widgets, layout, UI primitives)
  - `lib/` — small helpers and API functions (`lib/api.ts`, `lib/types.ts`)
  - `app/globals.css` — global CSS and theme variables

How to run (dev)
- From repo root:

```bash
cd traffic-control-system
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
- `lib/api.ts` — central helper functions calling backend endpoints (fetchLiveStats, startCamera, stopCamera, changeSource, getVideoFeedUrl).
- `components/dashboard/video-feed.tsx` — renders the MJPEG feed using an `<img>` tag, Start/Stop buttons and cache-bust handling.
- `components/dashboard/stats-cards.tsx` — top-level stat cards reading `TrafficStats`.

Common frontend issues & troubleshooting
- Video is blank/frozen:
  1. Ensure backend is running (`python main.py` in `backend`).
  2. Start the camera backend via API or server startup: `POST /api/video/start`.
  3. The frontend uses an `<img src="${API_BASE_URL}/api/video/feed">`. If the image caches, the UI app was updated to append `?t=${Date.now()}` to force reload after start.
  4. If the Start button shows an error toast, open the browser devtools network tab and check the response body — backend errors are now surfaced in the frontend toasts.

How to contribute / extend
- Add pages under `app/` using the app-router pattern (`page.tsx`).
- Reusable UI should go in `components/` and follow existing UI primitives (`components/ui/*`).
- Keep API surface in `lib/api.ts` up to date when backend endpoints change.
- For visual theming, prefer semantic CSS variables in `globals.css` rather than hard-coded colors.

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