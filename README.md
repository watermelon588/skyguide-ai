# 🌌 SkyGuide AI
---

# 📖 Project Overview

## What is SkyGuide AI?

SkyGuide AI is a **Real-Time Personalized Celestial Matchmaking and Telescope Alignment Platform** designed to solve one of the biggest problems faced by amateur astronomers:

> **"I have a telescope, but what should I observe right now?"**

The platform acts as an intelligent astronomical copilot that combines:

* Real-time astronomical calculations
* Telescope specifications
* Environmental conditions
* Geolocation data
* Machine Learning predictions

to generate personalized observing recommendations and telescope alignment assistance.

---

# 🎯 Vision Statement

SkyGuide AI aims to become an intelligent astronomical assistant capable of answering:

> **"What celestial objects are visible right now, and how do I accurately point my telescope toward them?"**

---

# 🏗️ Overall System Architecture

The platform follows a **distributed microservices architecture**.

```text
┌──────────────────────────┐
│     Frontend Clients     │
└────────────┬─────────────┘
             │
      ┌──────▼───────┐
      │ Node Gateway │
      │ (Express.js) │
      └──────┬────────┘
             │
             ▼
      ┌──────────────┐
      │ MongoDB Atlas│
      └──────────────┘
             ▲
             │
      ┌──────┴────────┐
      │ FastAPI Engine│
      │ (Python)      │
      └───────────────┘
```

---

# 🖥️ Frontend Layer

## 1. Laptop Command Center (Next.js SPA)

The primary dashboard used by astronomers.

### Features

* Interactive Sky Maps
* Celestial Recommendations
* Altitude and Airmass Curves
* Field of View Simulations
* Observation Planning
* Telescope Telemetry Dashboard
* Real-Time Visibility Analytics

---

## 2. Mobile Telescope Companion (PWA / React Native)

A lightweight mobile application physically mounted on the telescope.

### Features

* Streams 3-axis IMU orientation data
* WebSocket communication
* Telescope alignment assistant
* Sensory tracking
* Real-time positioning feedback

---

# ⚙️ Backend Architecture

SkyGuide AI uses a **Double Backend Architecture**.

---

# 🟢 Node.js Gateway (Express.js)

Responsible for:

### Authentication

* Registration
* Login
* Logout
* Session Management

### User Management

* Profiles
* Telescope Storage
* Preferences

### WebSockets

* Real-time communication
* Telescope telemetry

### Database Layer

* MongoDB interactions
* Caching
* State management

### Security

* JWT Authentication
* Cookies
* Rate Limiting

---

# 🔵 FastAPI Astronomy Engine

Responsible for:

### Astronomy

* Coordinate calculations
* Observation planning
* Celestial catalog management

### Machine Learning

* Transparency prediction
* Recommendation scoring

### Scientific Computation

* Visibility calculations
* Atmospheric analysis
* Telescope calculations

---

# 📊 Current Project Status

```text
Authentication System              ✅
MongoDB Integration                ✅
FastAPI Scaffold                   ✅
Astronomy Engine Foundation        ✅
WebSocket Infrastructure           ✅
Socket Room System                 ✅
Pairing JWT System                 ✅
Temporary Auth Console             ✅
Cross-Device Architecture          ✅
QR Pairing System                  🔄
Mobile Companion Route             ⏳
Sensor Permission Layer            ⏳
Orientation Streaming Engine       ⏳
Celestial Catalog Seeder           ⏳
Coordinate Engine                  ⏳
Visibility Recommendation Engine   ⏳
ML Transparency Model              ⏳
Telescope Alignment UI             ⏳
Observation Planner                ⏳
Real-Time Telemetry Dashboard      ⏳

# 🌌 Final Vision

SkyGuide AI is evolving into an intelligent astronomical copilot capable of answering:

> **"What should I observe tonight, and how do I accurately point my telescope toward it?"**
