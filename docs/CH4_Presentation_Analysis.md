# Chapter 4 — Presentation, Analysis, and Interpretation

## 4.1 Overview

- **Purpose:** Present the developed system organized by major functions, show feature pages/screens, explain behavior and architecture, then present evaluation results from two surveys (TAM qualitative; ISO quantitative) and user comments/suggestions.
- **Structure:** Each function section contains: description, features/pages, relevant code files, screenshots (placeholders), usage walkthrough, limitations & notes.

---

## 4.2 Vehicle Detection & Tracking

- **Description:** Real-time object detection and persistent tracking (YOLOv8 + ByteTrack).
- **Features / Pages:**
  - Live detection overlays on video feed — `VideoFeedWebSocket` / `/streams/{id}/video_feed` (frontend: `components/dashboard/video-feed.tsx`).
  - Model config UI: change runtime YOLO params (`/api/v1/model/config`) — page: Model Config (frontend: `app/traffic-control` model panel; backend: `src/core/detector.py`, `src/api/routes/model.py`).
- **Code files:** `src/core/detector.py`, `src/core/processing_loop.py`, `models/best.pt`.
- **Screenshot placeholder:** Figure — live video with bounding boxes and TTA overlays.
- **Notes:** runtime-safe params only (confidence/iou/detection_size etc.), TTA optional.

---

## 4.3 Vehicle Counting (Line Crossing)

- **Description:** Count vehicles by virtual counting lines with class & direction filtering.
- **Features / Pages:**
  - Live vehicle summary panel — `VehicleSummary` (`components/dashboard/vehicle-summary.tsx`).
  - Line counts API & live display (`GET /intersections/{id}/line-counts`) and reset (`POST /line-counts/reset`).
  - Counting report export & analytics page — `app/analytics/page.tsx` (Save Report PDF generation).
- **Code files:** `src/core/line_counter.py`, `src/database/repository.py`, `src/api/routes/counting.py`.
- **Screenshot placeholder:** Figure — Vehicle Summary counts, Analytics tables.
- **Notes:** per-class counts, direction filtering, overview-only currently for multi-camera limitation.

---

## 4.4 VAC — Dynamic Traffic Signal Control (Per-lane VAC)

- **Description:** Vehicle-Actuated Control applied per lane with gap-based extension & priority scheduling.
- **Features / Pages:**
  - Traffic Control dashboard — lane status cards, emergency controls, force-green buttons (frontend: `app/traffic-control/page.tsx`).
  - APIs: `PUT /intersections/{id}/lanes/{lane_id}/config`, `POST /intersections/{id}/lanes/{lane_id}/force-green`, `POST /intersections/{id}/reset`.
- **Code files:** `src/core/lane_vac_controller.py`, `src/core/safety_coordinator.py`, `src/core/intersection_vac_manager.py`.
- **Screenshot placeholder:** Figure — Traffic Control page showing per-lane light indicators and elapsed/gap metrics.
- **Notes:** Rules (MIN_GREEN, MAX_GREEN, MAX_GAP), priority queue by `_last_green_time`, supports fixed-time mode (`max_gap=999`).

---

## 4.5 Safety Coordination & Conflict Management

- **Description:** Enforce safety (no conflicting greens) and all‑red clearance.
- **Features / Pages:**
  - Safety status in Traffic Control (safety messages, warnings).
  - Safety coordinator metrics logged (`safety_violations` DB table).
- **Code files:** `src/core/safety_coordinator.py`, `src/core/processing_loop.py`.
- **Screenshot placeholder:** Figure — Safety card and safety violation log sample.
- **Notes:** `is_conflicting()` public method; all-red interval enforced.

---

## 4.6 Health Monitoring & System Status

- **Description:** Monitor CPU/GPU/RAM/FPS and processing health.
- **Features / Pages:**
  - Health dashboard panels (frontend: Health panel in `app/traffic-control` and `static/test.html`).
  - Health endpoints: `/api/v1/health/status`, `/api/v1/health/components`, `/api/v1/health/metrics/{name}`.
- **Code files:** `src/core/health_monitor.py`, `src/api/routes/health.py`.
- **Screenshot placeholder:** Figure — Health metrics sparkline panel.
- **Notes:** background monitor interval, metrics persisted to DB.

---

## 4.7 Processing Management & Sources

- **Description:** Start/stop processing, switch video sources, upload videos.
- **Features / Pages:**
  - Source manager UI (`components/dashboard/camera-source-manager.tsx`) and `GET /sources/cameras`, `POST /sources/upload`.
  - Processing control UI: Start/Stop buttons (`/processing/start`, `/processing/stop`).
- **Code files:** `src/core/processing_state.py`, `src/api/routes/sources.py`, `src/core/stream_handler.py`.
- **Screenshot placeholder:** Figure — Source assignment UI and start/stop controls.
- **Notes:** Supports hardware camera indices and uploaded files.

---

## 4.8 Reporting & Analytics

- **Description:** Aggregated exports, PDF report generation, per-interval counts.
- **Features / Pages:**
  - Analytics page (`app/analytics/page.tsx`) with hourly totals and vehicle classification; Save Report (PDF via `jsPDF` + `jspdf-autotable`).
  - Report API: `GET /intersections/{id}/reports/vehicle-counts` (params: start, end, interval).
- **Code files:** `app/analytics/page.tsx`, `src/database/repository.py`, `src/api/routes/reports.py`.
- **Screenshot placeholder:** Figure — Analytics page and generated PDF thumbnail.
- **Notes:** PDF orientation is set to portrait; footer includes generation timestamp.

---

## 4.9 Model Management & Parameter Tuning

- **Description:** Runtime tuning of detection parameters and optional persistence.
- **Features / Pages:**
  - Model Config panel: runtime/static split, apply & persist option (`app/traffic-control` model panel & `GET/PUT /api/v1/model/config`).
- **Code files:** `src/core/detector.py`, `config/model_config.yaml`, `src/api/routes/model.py`.
- **Screenshot placeholder:** Figure — Model config form and docs snippet.
- **Notes:** Only runtime-safe params applied live; persist writes YAML.

---

## 4.10 Developer & Integration Interfaces (API)

- **Description:** REST + WebSocket endpoints for integration and automation.
- **Features / Pages:**
  - API list (FastAPI docs `/docs`), streaming endpoints, control endpoints.
- **Code files:** `src/api/main.py`, `src/api/routes/*.py`, `src/core/*`.
- **Screenshot placeholder:** Figure — API endpoints list (FastAPI docs screenshot).

---

## 4.11 User Controls, UX & Manual Overrides

- **Description:** Buttons and manual override features for operators.
- **Features / Pages:**
  - Emergency Toggle (force all RED / clear emergency) — `app/traffic-control/page.tsx` (button + toast feedback).
  - Force Green per-lane buttons and Fixed Timing toggle.
- **Code files:** `app/traffic-control/page.tsx`, `lib/api.ts` (client calls: `emergencyStop`, `forceGreen`, `resetIntersection`).
- **Screenshot placeholder:** Figure — Emergency button before/after contrast fix.
- **Notes:** UX fixes from user feedback (confirmation modal optional).

---

## 4.12 Evaluation Results

### 4.12.1 Survey overview

- Participants, demographics, tasks performed, and data collection environment.

### 4.12.2 TAM (Qualitative)

- Thematic analysis mapped to system functions (e.g., Vehicle Counting → Perceived Usefulness). Include themes, definitions, representative anonymized quotes, frequency, and recommended actions.

### 4.12.3 ISO (Quantitative)

- Present dimension scores (Effectiveness, Efficiency, Satisfaction, Reliability) with tables and charts mapped to system functions. Include Cronbach's alpha and example statistics (Mean, SD, n).

### 4.12.4 Triangulation

- Synthesize TAM themes and ISO scores per function; prioritize fixes and improvements.

---

## 4.13 Comments & Suggestions (User Feedback)

- Organize by function with priority tags: Critical, Recommended, Nice-to-have. Provide suggested fixes and estimated effort.

---

## 4.14 Limitations, Implications & Recommendations

- Limitations (sample size, environment, model accuracy), practical implications, and short/medium/long-term recommendations per function.

---

## 4.15 Conclusion

- Recap system capabilities, main evaluation outcomes, top recommendations, and next steps.

---

## Appendices (linked)

- Appendix A: Full TAM interview guide and coding schema (by function).
- Appendix B: ISO questionnaire and raw scores (CSV).
- Appendix C: Full-size screenshots and architecture diagram.
- Appendix D: Analysis scripts (Python/R notebooks) and exported reports.

---

## Next steps & deliverables

- Expand any function section into full narrative text, including captions and step-by-step walkthroughs.
- Produce example tables and charts from collected survey data (if provided).
- Prepare appendices: raw data, questionnaires, and analysis scripts.
