# Traffic Situations Analysis & System Limitations

**Date:** February 21, 2026  
**System:** Vehicle Counting & Dynamic Traffic Light System (VAC-based)  
**Context:** Philippine intersections (Graceland & Capitol)

---

## 1. Red Light Runners / Non-Compliant Drivers

**Problem:** Vehicles that ignore the RED signal and proceed through the intersection. The system assumes drivers obey signals — it only controls light timing, not driver behavior.

**Impact:** Could cause collisions at the intersection, especially during ALL_RED intervals or when conflicting lanes have GREEN.

**Solution:**
- **Red Light Violation Detection** — Add a counting line at the stop line of each lane. If a vehicle crosses the line while the lane signal is RED, flag it as a violation. Log the event with timestamp, lane, and vehicle class.
- **Violation Alert System** — Push real-time alerts to the dashboard when a red light violation is detected.
- **Extended ALL_RED** — If frequent violations are detected on a lane, automatically increase the ALL_RED interval (e.g., from 2s to 4s) to provide a larger safety buffer.
- **What to Add:** New `RedLightViolationDetector` module, violation logging in DB, dashboard alert panel, configurable ALL_RED extension per lane.

---

## 2. Pedestrians Crossing the Intersection

**Problem:** The system only detects vehicles (8 classes). Pedestrians crossing the road are invisible to the system. If pedestrians are in the intersection during a GREEN phase, vehicles may be forced to stop, creating false "gaps" in traffic flow that trigger premature phase termination.

**Impact:** VAC may incorrectly terminate GREEN early because pedestrians caused vehicles to slow/stop, creating a gap > MAX_GAP (3s).

**Solution:**
- **Pedestrian Detection** — Train or add a separate YOLO model/class for pedestrian detection.
- **Pedestrian Phase** — Add a dedicated pedestrian signal phase (WALK / DON'T WALK) with a configurable duration.
- **Pedestrian Button (Manual Trigger)** — Add a dashboard button or API endpoint to manually request a pedestrian phase.
- **Gap Tolerance Adjustment** — When pedestrians are detected in the intersection, temporarily increase MAX_GAP to avoid premature GREEN termination.
- **What to Add:** Pedestrian class in YOLO model, pedestrian phase in VAC state machine, `POST /api/v1/intersections/{id}/pedestrian-request` endpoint, pedestrian detection zone configuration.

---

## 3. Emergency Vehicles Needing Priority

**Problem:** Ambulances, fire trucks, and police vehicles need to pass through the intersection immediately. The current system has no way to detect or prioritize emergency vehicles.

**Impact:** Emergency vehicles may be stuck at a RED light, losing critical response time.

**Solution:**
- **Emergency Vehicle Detection** — Train the YOLO model to detect emergency vehicles (ambulance, fire truck, police car) as additional classes, or detect flashing lights.
- **Emergency Vehicle Preemption (EVP)** — When an emergency vehicle is detected approaching a lane, immediately transition that lane to GREEN (with proper ALL_RED clearing for conflicting lanes).
- **Manual Override API** — The existing `force-green` endpoint already supports this. Add a dedicated "Emergency Vehicle Approaching" button per lane on the dashboard.
- **Audio Detection (Future)** — Detect siren sounds as a secondary trigger.
- **What to Add:** Emergency vehicle classes in YOLO, EVP logic in `IntersectionVACManager`, priority queue override, siren detection module (optional).

---

## 4. Traffic Congestion / Queue Spillback

**Problem:** A lane gets GREEN, but vehicles can't move because the road ahead (exit) is blocked/congested. The system keeps giving GREEN to a lane that can't actually use it, wasting time for other lanes.

**Impact:** Other lanes starve while the congested lane wastes its GREEN time. Vehicles pile up, worsening gridlock.

**Solution:**
- **Exit Queue Detection** — Place a detection zone or counting line at the EXIT of each lane. If vehicles are stationary/queued at the exit, the lane is "blocked."
- **Blocked Lane Logic** — If a lane's exit is blocked, skip it in the priority queue and give GREEN to the next eligible lane. Resume normal scheduling when the blockage clears.
- **Queue Length Estimation** — Count vehicles waiting in each lane. If queue exceeds a threshold, give that lane extra GREEN time (up to MAX_GREEN).
- **What to Add:** Exit detection zones in config, `is_exit_blocked()` check in `IntersectionVACManager`, queue length counter per lane, blocked-lane skip logic.

---

## 5. Camera Occlusion / Blind Spots

**Problem:** Large vehicles (buses, trucks) block the camera's view of smaller vehicles (motorcycles, tricycles) behind them. The system undercounts vehicles, leading to premature GREEN termination.

**Impact:** VAC thinks traffic has stopped (gap > MAX_GAP) when vehicles are actually still there but hidden. GREEN terminates too early.

**Solution:**
- **Multiple Camera Angles** — Add a second camera per lane at a different angle (e.g., overhead + side view) to reduce blind spots.
- **Occlusion-Aware Counting** — After a large vehicle passes, add a brief "cooldown" before declaring a gap (e.g., +1s grace period after a bus/truck).
- **Historical Pattern Adjustment** — If a large vehicle was recently detected, assume there may be hidden vehicles and extend the gap tolerance.
- **What to Add:** Multi-camera fusion per lane, large-vehicle cooldown parameter in VAC config, secondary camera support in `stream_handler.py`.

---

## 6. Night / Low-Light Conditions

**Problem:** Camera image quality degrades at night. Vehicle headlights cause glare. YOLO detection accuracy drops significantly in low-light conditions.

**Impact:** Missed detections → undercounting → premature GREEN termination. False detections from headlight glare → overcounting.

**Solution:**
- **Night Mode Configuration** — Adjust YOLO confidence threshold dynamically based on time of day (lower confidence at night to catch more detections).
- **IR / Night-Vision Cameras** — Use infrared or low-light cameras for better nighttime imagery.
- **Fallback to Fixed-Time** — If detection confidence drops below a threshold (e.g., avg confidence < 40%), automatically switch to fixed-time mode (like Lane 3's current behavior with `max_gap: 999`).
- **Image Preprocessing** — Apply histogram equalization or contrast enhancement before detection.
- **What to Add:** Time-based confidence adjustment in `VehicleDetector`, fixed-time fallback trigger, image preprocessing pipeline, `model_config.yaml` night mode parameters.

---

## 7. Adverse Weather (Rain, Fog, Flooding)

**Problem:** Rain/fog reduces visibility and camera clarity. Flooding may slow or stop vehicles regardless of signal state.

**Impact:** Detection accuracy drops. Vehicle behavior becomes unpredictable (slower speeds, longer gaps that don't mean traffic has stopped).

**Solution:**
- **Weather-Adaptive Parameters** — Increase MAX_GAP during rain (e.g., from 3s to 5s) because vehicles move slower and gaps naturally increase.
- **Confidence Monitoring** — Track average detection confidence. If it drops below threshold, switch to conservative/fixed-time mode.
- **Weather API Integration** — Pull weather data and auto-adjust parameters.
- **What to Add:** Weather-adaptive VAC parameters, confidence-based mode switching, weather API integration (OpenWeatherMap), `PUT /api/v1/intersections/{id}/weather-mode` endpoint.

---

## 8. Power / System Failure

**Problem:** Power outage, server crash, or camera disconnection. Traffic lights go dark or freeze in their current state.

**Impact:** Complete loss of traffic control. Potential for accidents.

**Solution:**
- **Hardware Fallback Controller** — Physical traffic light controller with fixed-time backup that activates when the software system is unresponsive.
- **UPS (Uninterruptible Power Supply)** — Battery backup for the server and cameras.
- **Watchdog Timer** — Hardware watchdog that resets the system if it becomes unresponsive.
- **Graceful Degradation** — If one camera fails, switch that lane to fixed-time mode while others continue VAC.
- **What to Add:** Health monitor already exists. Add auto-fallback to fixed-time per lane when camera disconnects, hardware watchdog integration, `system_mode` state (NORMAL / DEGRADED / FALLBACK).

---

## 9. Unusual / Unrecognized Vehicles

**Problem:** Vehicles not in the 8 trained classes (e.g., bicycles, pushcarts, horse-drawn carriages, construction vehicles, oversized loads) are not detected.

**Impact:** These vehicles are invisible to the system. They occupy road space but aren't counted, causing incorrect gap calculations.

**Solution:**
- **Generic "Vehicle" Fallback** — Use a secondary COCO-pretrained model to detect generic vehicles/objects that the custom model misses.
- **Expand Training Data** — Add more vehicle classes to the training dataset over time.
- **Unknown Object Detection** — If something is moving in the detection zone but not classified, count it as "Unknown" and still treat it as a vehicle for gap purposes.
- **What to Add:** Secondary detection model, "Unknown" vehicle class, motion-based detection fallback.

---

## 10. Motorcycles Lane Splitting / Filtering

**Problem:** In the Philippines, motorcycles commonly weave between lanes and pass between larger vehicles. They're harder to detect when partially occluded by cars and may be counted in the wrong lane.

**Impact:** Inaccurate per-lane counts. Motorcycles may trigger gap extension in the wrong lane.

**Solution:**
- **Smaller Detection Zones** — Fine-tune detection zones to be narrower, reducing cross-lane assignments.
- **Tracking-Based Counting** — ByteTrack (already implemented) helps track motorcycles across frames even when briefly occluded.
- **Motorcycle-Specific Logic** — Don't use motorcycles for gap calculation if they're detected between lanes (outside any lane's detection zone).
- **What to Add:** Cross-lane filtering logic, motorcycle-specific tracking parameters, zone boundary strictness config.

---

## 11. Construction / Road Work / Lane Closures

**Problem:** A lane is temporarily closed due to construction, but the system doesn't know and keeps giving it GREEN.

**Impact:** Wasted GREEN time on a closed lane. Other lanes are underserved.

**Solution:**
- **Lane Disable Feature** — API endpoint to mark a lane as "disabled/closed." The system skips it in the priority queue.
- **Automatic Detection** — If a lane receives GREEN but no vehicles pass for multiple consecutive cycles, auto-flag it for review.
- **What to Add:** `PUT /api/v1/intersections/{id}/lanes/{lane_id}/disable` endpoint, lane enabled/disabled state, dashboard toggle, auto-flagging logic.

---

## 12. Special Events / Unusual Traffic Patterns

**Problem:** Events like parades, processions, or accidents cause abnormal traffic patterns (e.g., all traffic from one direction, zero from another).

**Impact:** The VAC algorithm's parameters (tuned for normal traffic) may not handle extreme imbalances well.

**Solution:**
- **Manual Mode Override** — Allow operators to manually set GREEN duration per lane from the dashboard.
- **Preset Profiles** — Create timing profiles for known scenarios (Normal, Rush Hour, Event, Night) with different MIN_GREEN/MAX_GREEN/MAX_GAP values.
- **What to Add:** Manual timing mode, timing profiles in config, `PUT /api/v1/intersections/{id}/mode` endpoint (AUTO / MANUAL / PRESET).

---

## 13. U-Turns / Wrong-Way Vehicles

**Problem:** Vehicles making U-turns or entering the wrong way may be double-counted or counted in the wrong direction.

**Impact:** Inflated vehicle counts, incorrect gap calculations.

**Solution:**
- **Direction Filtering** — Already implemented! `CountingLine.direction` filters crossings by travel direction using cross-product sign. Ensure all counting lines have proper direction set (`"forward"` instead of `"both"`).
- **Tracking Validation** — Use ByteTrack trajectory to verify a vehicle is moving in the expected direction before counting.
- **What to Add:** Already partially handled. Verify all config lines use directional filtering. Add trajectory-based validation.

---

## Summary: Priority Features to Add

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| **HIGH** | Lane Disable/Enable toggle | Low | Handles construction & closures |
| **HIGH** | Fixed-time fallback on camera failure | Low | System resilience |
| **HIGH** | Red light violation detection | Medium | Safety monitoring |
| **MEDIUM** | Emergency vehicle preemption | Medium | Emergency response |
| **MEDIUM** | Night mode / confidence-based fallback | Medium | 24/7 reliability |
| **MEDIUM** | Queue spillback detection | Medium | Prevents wasted GREEN |
| **MEDIUM** | Timing profiles (Normal/Rush/Event) | Low | Operational flexibility |
| **LOW** | Pedestrian detection & phase | High | Pedestrian safety |
| **LOW** | Weather-adaptive parameters | Medium | Adverse conditions |
| **LOW** | Multi-camera fusion per lane | High | Reduces occlusion |

---

## What Our System Already Handles Well

- **Fair lane scheduling** — Priority queue prevents starvation
- **Safety coordination** — Conflict matrix prevents simultaneous conflicting greens
- **Direction filtering** — Counting lines already filter by travel direction
- **Vehicle tracking** — ByteTrack provides persistent IDs across frames
- **Emergency stop** — Manual override to force all lanes RED
- **Force green** — Manual override to give a specific lane GREEN
- **Health monitoring** — CPU, RAM, GPU, FPS monitoring with alerts
- **Camera failure detection** — Health system detects disconnected cameras

---

*This document outlines limitations and potential improvements. Not all solutions need to be implemented for the thesis — focus on documenting awareness of these limitations in the thesis paper and implementing the HIGH priority items if time permits.*
