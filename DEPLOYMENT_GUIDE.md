# Deployment Guide: From Software to Physical Traffic Lights

**Date:** February 21, 2026  
**System:** Vehicle Counting & Dynamic Traffic Light System (VAC-based)  
**Target Users:** Traffic Management Agencies (e.g., MMDA, LGU Traffic Offices)

---

## The Big Picture

Right now, our system is **software-only** — it runs on a computer, processes video, and decides when lights should change. But the actual traffic lights on the street are **hardware** controlled by electrical signals. To connect our software to the physical lights, we need a **bridge** between the two.

Here's the full deployment chain:

```
CCTV Camera → Computer (AI + VAC) → Traffic Light Controller → Traffic Lights
     ↑                                        ↓
  Video Feed                          Electrical Signals (12V/24V/220V)
```

---

## 1. Hardware Components Needed

### A. Traffic Light Controller Box (The Bridge)

This is the most critical piece. It's an electronic device installed at the intersection that:
- Receives commands from our software (via network/serial)
- Converts those commands into electrical signals
- Physically switches the RED/YELLOW/GREEN lights ON and OFF

**Options:**

| Controller Type | How It Connects | Cost | Complexity |
|----------------|-----------------|------|------------|
| **Raspberry Pi + Relay Board** | GPIO pins → Relays → Light bulbs | ₱5,000–₱10,000 | Low (DIY) |
| **Arduino + Relay Module** | Serial/USB → Relays → Light bulbs | ₱3,000–₱7,000 | Low (DIY) |
| **Industrial PLC** (Programmable Logic Controller) | Ethernet/Modbus → Outputs → Lights | ₱30,000–₱80,000 | Medium |
| **Commercial Traffic Controller** (e.g., Siemens, Peek) | NTCIP Protocol → Built-in outputs | ₱200,000+ | High (Standard) |

**For a thesis/proof-of-concept:** Raspberry Pi + 12-channel relay board is the cheapest and simplest. For actual city deployment, an industrial PLC or commercial controller is required.

### B. CCTV Cameras (Already Part of Our System)

- **IP Cameras** (recommended) — Connect via Ethernet/WiFi, stream RTSP video
- **Resolution:** 1080p minimum for reliable YOLO detection
- **Placement:** Elevated position (3–5 meters) overlooking the approach lanes
- **Night vision:** IR-capable cameras for 24/7 operation
- **Cost:** ₱3,000–₱15,000 per camera
- **Power:** 12V DC (via PoE — Power over Ethernet) or 220V AC adapter

### C. Edge Computer (Runs Our Software)

- **What it does:** Runs the Python server (FastAPI + YOLOv8 + VAC algorithm)
- **Options:**
  - NVIDIA Jetson Orin Nano (₱25,000–₱40,000) — GPU-capable, compact, low power
  - Mini PC with NVIDIA GPU (₱40,000–₱80,000) — More powerful, needs more power
  - Cloud server (remote) — Camera streams via internet, commands sent back (adds latency)
- **Recommended for deployment:** NVIDIA Jetson Orin at each intersection (edge computing)
- **Power:** 15–65W depending on device

### D. Network Infrastructure

- **Local network** at the intersection: Router/switch connecting cameras, computer, and controller
- **Internet connection** (optional): For remote monitoring dashboard, updates, and alerts
- **VPN** (recommended): Secure remote access to the system

### E. Power Supply

- **Main power:** 220V AC from the city grid (same as existing traffic lights)
- **UPS (Uninterruptible Power Supply):** Battery backup for 15–30 minutes during brownouts
- **Surge protector:** Essential for Philippine weather (lightning, power fluctuations)
- **Cost:** ₱5,000–₱15,000 for UPS

### F. Weatherproof Enclosure

- **NEMA 4X / IP65 rated cabinet** to house the computer, controller, and network equipment
- Protects against rain, dust, heat
- Ventilation fan or small AC unit for cooling
- **Cost:** ₱10,000–₱30,000

---

## 2. How the Software Connects to Physical Lights

### Option A: Raspberry Pi Relay Bridge (Simplest / Thesis Demo)

```
Our Software (FastAPI) 
    ↓ HTTP API or WebSocket
Raspberry Pi (Python client script)
    ↓ GPIO pins
12-Channel Relay Board
    ↓ Switches 12V/24V/220V
Traffic Light Bulbs (3 lights × 3 lanes = 9 channels + pedestrian)
```

**How it works:**
1. A small Python script runs on the Raspberry Pi
2. It polls our API every 100ms: `GET /api/v1/intersections/{id}/signals`
3. The API returns the current signal for each lane: `{ "lane1": "GREEN", "lane2": "RED", "lane3": "RED" }`
4. The script sets GPIO pins HIGH/LOW to activate/deactivate relays
5. Each relay switches the corresponding light bulb ON/OFF

**Example client code (runs on Raspberry Pi):**
```python
import requests
import RPi.GPIO as GPIO
import time

# GPIO pin mapping: lane → {color: pin}
PINS = {
    "lane1": {"GREEN": 17, "YELLOW": 27, "RED": 22},
    "lane2": {"GREEN": 5,  "YELLOW": 6,  "RED": 13},
    "lane3": {"GREEN": 19, "YELLOW": 26, "RED": 21},
}

API_URL = "http://192.168.1.100:8000/api/v1/intersections/graceland/signals"

GPIO.setmode(GPIO.BCM)
for lane in PINS.values():
    for pin in lane.values():
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.LOW)

while True:
    try:
        resp = requests.get(API_URL, timeout=1)
        signals = resp.json()  # {"lane1": "GREEN", "lane2": "RED", ...}
        
        for lane_id, color in signals.items():
            if lane_id in PINS:
                for c, pin in PINS[lane_id].items():
                    GPIO.output(pin, GPIO.HIGH if c == color else GPIO.LOW)
    except:
        # Fallback: all RED on communication failure
        for lane in PINS.values():
            for c, pin in lane.items():
                GPIO.output(pin, GPIO.HIGH if c == "RED" else GPIO.LOW)
    
    time.sleep(0.1)  # Poll every 100ms
```

### Option B: Industrial PLC via Modbus/TCP (City Deployment)

```
Our Software (FastAPI)
    ↓ Modbus TCP protocol
PLC (e.g., Siemens S7-1200)
    ↓ 24V DC outputs
Traffic Light Driver Circuits
    ↓ 220V AC switching
Traffic Light Bulbs (LED or incandescent)
```

### Option C: Existing Traffic Controller via NTCIP (Standard Protocol)

If the intersection already has a modern traffic controller:
```
Our Software (FastAPI)
    ↓ NTCIP v2 protocol (industry standard)
Existing Traffic Controller
    ↓ Already wired
Existing Traffic Lights
```

NTCIP (National Transportation Communications for ITS Protocol) is the standard used by traffic management systems worldwide. Our system would need an NTCIP adapter module.

---

## 3. Deployment Architecture

### Single Intersection Setup

```
┌─────────────────── Weatherproof Cabinet ───────────────────┐
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ Network  │    │ Edge Computer │    │ Traffic Light    │  │
│  │ Switch   │◄──►│ (Jetson/PC)  │───►│ Controller       │  │
│  └────┬─────┘    │              │    │ (Relay/PLC)      │  │
│       │          │ - FastAPI    │    └────────┬─────────┘  │
│       │          │ - YOLOv8    │             │             │
│       │          │ - VAC       │             │             │
│       │          └──────────────┘             │             │
│  ┌────┴─────┐                                │             │
│  │   UPS    │    ┌──────────────┐             │             │
│  │ Battery  │    │ 4G/WiFi     │             │             │
│  │ Backup   │    │ Router      │             │             │
│  └──────────┘    └──────────────┘             │             │
│                                               │             │
└───────────────────────────────────────────────┼─────────────┘
                                                │
                    ┌───────────────────────────┼──────────┐
                    │           INTERSECTION               │
                    │                                      │
    ┌─────┐         │   🔴🟡🟢      🔴🟡🟢     🔴🟡🟢    │
    │Cam 1│────────►│   Lane 1      Lane 2     Lane 3    │
    │Cam 2│────────►│                                      │
    │Cam 3│────────►│                                      │
    └─────┘         └──────────────────────────────────────┘
```

### Multi-Intersection (City-Wide) Setup

```
           ┌──────────────────────┐
           │  Central Command     │
           │  Center (TMC)        │
           │  - Dashboard         │
           │  - Monitoring        │
           │  - Analytics         │
           └──────────┬───────────┘
                      │ Internet/VPN
          ┌───────────┼───────────────┐
          │           │               │
    ┌─────┴─────┐ ┌──┴──────┐ ┌──────┴────┐
    │Graceland  │ │Capitol  │ │Future     │
    │Edge Node  │ │Edge Node│ │Edge Node  │
    │(Jetson)   │ │(Jetson) │ │(Jetson)   │
    └─────┬─────┘ └────┬────┘ └─────┬─────┘
          │            │             │
    ┌─────┴─────┐ ┌────┴────┐ ┌─────┴─────┐
    │Graceland  │ │Capitol  │ │Future     │
    │Intersect. │ │Intersect│ │Intersect. │
    └───────────┘ └─────────┘ └───────────┘
```

---

## 4. Step-by-Step Deployment Process

### Phase 1: Approval & Planning (1–2 months)
1. **Present to LGU/Traffic Management Office** — Show the thesis, demo the system
2. **Get permits** — Electrical permit, DPWH clearance (if national road), LGU resolution
3. **Site survey** — Inspect the intersection, plan camera placement, check power availability
4. **Safety review** — Ensure the system has proper fallback (all-RED default)
5. **Budget approval** — Hardware procurement

### Phase 2: Hardware Installation (1–2 weeks per intersection)
1. **Install cameras** — Mount on existing poles or new ones, run Ethernet cables
2. **Install cabinet** — Mount weatherproof enclosure near the intersection
3. **Install edge computer** — Place inside cabinet, connect to cameras
4. **Install controller** — Wire relay board/PLC to traffic light circuits
5. **Install UPS & network** — Battery backup, 4G router for remote access
6. **Power connection** — Connect to city grid, licensed electrician required

### Phase 3: Calibration & Testing (1–2 weeks)
1. **Camera calibration** — Run `calibrate_zones.py` and `calibrate_lines.py` for the real intersection
2. **Detection tuning** — Adjust YOLO confidence/IOU for the specific camera angles
3. **VAC parameter tuning** — Adjust MIN_GREEN, MAX_GREEN, MAX_GAP based on actual traffic patterns
4. **Shadow mode** — Run the system alongside existing fixed-time controller for 1–2 weeks. Compare decisions but don't control actual lights yet.
5. **Safety validation** — Verify ALL_RED intervals, conflict matrix, emergency stop

### Phase 4: Supervised Live Operation (2–4 weeks)
1. **Switch to live control** — System now controls actual lights
2. **Traffic officer on-site** — Manual override ready in case of issues
3. **24/7 monitoring** — Dashboard monitored from traffic command center
4. **Data collection** — Log all signal changes, vehicle counts, incidents
5. **Performance comparison** — Compare wait times vs. old fixed-time system

### Phase 5: Full Autonomous Operation
1. **Remove manual supervision** — System runs independently
2. **Remote monitoring only** — Dashboard alerts for anomalies
3. **Periodic maintenance** — Camera cleaning, software updates, hardware checks
4. **Performance reporting** — Monthly analytics reports for traffic management

---

## 5. Estimated Costs

### Per Intersection (Proof of Concept / Thesis Demo)

| Item | Cost (₱) |
|------|----------|
| 3× IP Cameras (1080p, IR, PoE) | ₱15,000–₱45,000 |
| NVIDIA Jetson Orin Nano | ₱25,000–₱40,000 |
| Raspberry Pi 4 + 12-ch Relay Board | ₱5,000–₱8,000 |
| Network Switch (PoE) | ₱3,000–₱8,000 |
| UPS (600VA) | ₱5,000–₱10,000 |
| Weatherproof Cabinet (IP65) | ₱10,000–₱25,000 |
| Cabling & Installation | ₱10,000–₱20,000 |
| 4G Router + SIM | ₱3,000–₱5,000 |
| **TOTAL** | **₱76,000–₱161,000** |

### Per Intersection (City-Grade Deployment)

| Item | Cost (₱) |
|------|----------|
| 3× Industrial IP Cameras | ₱45,000–₱120,000 |
| Edge Computer (Industrial PC + GPU) | ₱60,000–₱150,000 |
| Industrial PLC Controller | ₱30,000–₱80,000 |
| Network & Communication | ₱15,000–₱30,000 |
| UPS (1000VA) | ₱10,000–₱20,000 |
| Industrial Cabinet + Climate Control | ₱25,000–₱50,000 |
| Installation & Wiring (Licensed) | ₱30,000–₱60,000 |
| **TOTAL** | **₱215,000–₱510,000** |

### Software (One-Time + Ongoing)

| Item | Cost |
|------|------|
| Software license | Free (open source / thesis project) |
| Cloud dashboard hosting (optional) | ₱500–₱2,000/month |
| Internet per intersection | ₱1,000–₱2,500/month |
| Maintenance & updates | ₱5,000–₱15,000/month (personnel) |

---

## 6. Safety Requirements (Non-Negotiable)

1. **Default to ALL RED** — If the system crashes, loses power, or loses camera feed, ALL lights must turn RED. This is handled by the hardware controller's failsafe, not software.

2. **Hardware watchdog** — The controller must independently verify it's receiving valid commands. If no command is received for >5 seconds, force ALL RED.

3. **Conflict monitor** — A separate hardware device that checks the electrical signals going to the lights. If conflicting greens are detected (e.g., Lane 1 and Lane 2 both GREEN), it forces ALL RED and triggers an alarm. This is a legal requirement in most countries.

4. **Manual override** — Physical switch at the cabinet to disable the AI system and revert to fixed-time or manual control.

5. **Backup timer** — Hardware-based fixed-time backup that runs when the AI system is offline.

6. **Logging** — Every signal change must be logged with timestamp for legal/liability purposes (our system already does this).

---

## 7. What We'd Need to Add to Our Software

For actual deployment, our system would need these additional modules:

| Module | Purpose | Priority |
|--------|---------|----------|
| **Controller Interface** | API/protocol to send signal commands to hardware (GPIO/Modbus/NTCIP) | Critical |
| **Failsafe Watchdog** | Software-side heartbeat to hardware controller | Critical |
| **Shadow Mode** | Run in parallel with existing controller, compare but don't control | High |
| **Audit Log** | Immutable log of all signal changes for legal compliance | High |
| **Remote Update** | OTA (over-the-air) software updates | Medium |
| **Multi-Intersection Coordination** | Green wave / corridor optimization between intersections | Medium |
| **User Authentication** | Login system for operators/administrators | Medium |
| **Role-Based Access** | Different permissions for operators vs. admins | Medium |

---

## 8. Answering Common Questions

**Q: Does it need electricity?**  
A: Yes. The cameras, computer, controller, and traffic lights all need electricity. We connect to the city grid (220V AC) with a UPS battery backup for brownouts.

**Q: Does it replace the existing traffic lights?**  
A: No. The physical traffic lights stay the same. We only replace the **controller** — the device that decides when to switch the lights. The bulbs, poles, and wiring remain.

**Q: What happens during a power outage?**  
A: The UPS provides 15–30 minutes of backup. If power is out longer, the system shuts down gracefully and all lights go dark (same as current traffic lights during brownouts). Traffic officers would need to direct traffic manually, as they already do today.

**Q: Can it work with the existing CCTV cameras?**  
A: Potentially, if the existing cameras have sufficient resolution (1080p+), proper angle (overlooking approach lanes), and accessible video stream (RTSP). Most existing CCTV for security may not be positioned correctly for traffic detection.

**Q: How does the traffic management agency monitor it?**  
A: Through our web dashboard, accessible from any browser. They can see real-time video feeds, vehicle counts, signal states, and system health from their office. The analytics page provides hourly reports and PDF exports.

**Q: Is it legal to deploy?**  
A: Traffic signal systems in the Philippines are governed by the DPWH and LGU traffic offices. Deployment requires proper permits, safety certifications, and approval from the local traffic management authority. The system must comply with the Manual on Uniform Traffic Control Devices (MUTCD) standards.

---

*This guide is intended for thesis documentation and presentation purposes. Actual deployment would require collaboration with licensed electrical engineers, traffic engineers, and the local government unit.*
