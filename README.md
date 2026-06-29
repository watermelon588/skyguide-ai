# 🌌 SkyGuide AI

# Development Journal

## Day 1 & Day 2 Documentation

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

# ====================================

# DAY 1

# Authentication & Database Foundation

# ====================================

---

# 🎯 Day 1 Objectives

Build the foundational backend infrastructure:

* Secure authentication
* MongoDB integration
* Production-grade schemas
* Cookie-based sessions
* Email workflows

---

# 🚀 Express Server Bootstrapping

Implemented production-grade middleware.

## Installed Packages

```javascript
helmet
cors
compression
morgan
cookie-parser
dotenv
```

---

# Purpose of Each Package

## helmet

Protects against:

* Clickjacking
* XSS attacks
* MIME sniffing

---

## cors

Allows:

* Cross-origin communication
* Credential sharing
* Frontend-backend interaction

---

## compression

Compresses:

* JSON responses
* Payload sizes

Improves performance.

---

## morgan

Provides:

* Request logging
* API debugging

---

## cookie-parser

Parses:

* JWT cookies
* Signed cookies

---

# 🌍 MongoDB Atlas Integration

Implemented:

```javascript
config/db.js
```

Responsibilities:

* Connect to Atlas
* Handle connection failures
* Export reusable database instance

---

# 👤 Production User Schema

Implemented:

## User Information

```javascript
username
email
password
avatar
role
isVerified
isActive
lastLogin
```

---

# 🌎 Geospatial Location System

```javascript
location: {
    type: "Point",
    coordinates: [longitude, latitude],
    elevation_m,
    timezone
}
```

Created:

```javascript
UserSchema.index({
  location: "2dsphere"
});
```

Benefits:

* Location-aware recommendations
* Future nearby observer features
* Fast geospatial queries

---

# 🔭 Telescope Schema

Supports multiple telescope profiles.

```javascript
telescopeProfile: [TelescopeSchema]
```

Each profile stores:

* Name
* Aperture
* Focal Length
* Mount Type
* Camera Attachment
* Bortle Scale

---

# 🔐 Password Security

Implemented:

```javascript
UserSchema.pre("save")
```

Responsibilities:

* Generate salt
* Hash password
* Prevent plain-text storage

---

# Password Comparison

Implemented:

```javascript
comparePassword()
```

using:

```javascript
bcrypt.compare()
```

---

# 🍪 JWT Cookie Authentication

Implemented secure authentication cookies.

```javascript
httpOnly: true
secure: true
sameSite: "strict"
```

Benefits:

### Prevents:

* Cross Site Scripting
* Cookie theft
* CSRF attacks

---

# 🔐 Authentication Controllers

Implemented:

## Register

```http
POST /api/v1/auth/register
```

---

## Login

```http
POST /api/v1/auth/login
```

---

## Logout

```http
POST /api/v1/auth/logout
```

---

## Current User

```http
GET /api/v1/auth/me
```

---

# ✉️ Email Verification System

Implemented:

```http
GET /verify-email/:token
POST /resend-verification
```

Features:

* Secure token generation
* SHA256 hashing
* Expiration handling

---

# 🔑 Forgot Password System

Implemented:

```http
POST /forgot-password
PATCH /reset-password/:token
```

Features:

* Password reset emails
* Secure tokens
* Automatic login after reset

---

# 🚦 Rate Limiting

Implemented:

```javascript
express-rate-limit
```

Protects:

* Login endpoints
* Registration
* Password reset

---

# 🧪 Authentication Testing

Tested:

✅ Register

✅ Verify Email

✅ Login

✅ Logout

✅ JWT Cookies

✅ Protected Routes

✅ Forgot Password

✅ Reset Password

✅ Rate Limiting

---

# 📈 Day 1 Result

Authentication module became:

```text
Production Ready (MVP)
```

---

# ====================================

# DAY 2

# Astronomy Engine Foundation

# ====================================

---

# 🎯 Day 2 Objectives

Build:

* FastAPI service
* Python environment
* Astronomy stack
* Microservice architecture

---

# 🐍 Created Python Service

```text
astro-engine/
```

---

# Created Virtual Environment

```bash
python -m venv venv
```

---

# Installed Dependencies

---

# API Framework

```bash
fastapi
uvicorn
```

---

# Astronomy Libraries

```bash
astropy
astroplan
astroquery
skyfield
```

---

# Database

```bash
motor
pymongo
```

---

# Machine Learning

```bash
numpy
pandas
scikit-learn
```

---

# Configuration

```bash
python-dotenv
pydantic-settings
```

---

# 🏗️ Production Folder Structure

```text
astro-engine/
│
├── app/
│   ├── main.py
│   ├── api/
│   │   └── v1/
│   │       └── health.py
│   ├── core/
│   │   ├── config.py
│   │   └── database.py
│   ├── models/
│   └── services/
│
├── scripts/
├── requirements.txt
├── .env
└── venv/
```

---

# Environment Variables

```env
APP_NAME=SkyGuide Astro Engine
APP_ENV=development
APP_PORT=8000

MONGO_URI=...
DATABASE_NAME=skyguide_ai
```

---

# 🌐 FastAPI Bootstrap

Implemented:

```python
FastAPI(
    title="SkyGuide Astro Engine",
    version="1.0.0"
)
```

---

# ❤️ Health Endpoint

Implemented:

```http
GET /api/v1/health
```

Response:

```json
{
  "status": "healthy",
  "service": "astro-engine"
}
```

---

# 📚 Swagger Documentation

Available at:

```text
http://localhost:8000/docs
```

---

# 🧠 Major Architectural Decision

Astronomical logic will live entirely inside FastAPI.

---

# FastAPI Owns

* SIMBAD integration
* VizieR integration
* Catalog ingestion
* Coordinate calculations
* ML models
* Recommendation engine

---

# Node.js Owns

* Authentication
* Users
* Telescope data
* WebSockets
* Business logic

---

# 🌌 Celestial Catalog Strategy

Instead of manually typing celestial objects:

SkyGuide AI will use:

### astroquery

*

### SIMBAD

*

### VizieR

to automatically build the catalog.

---

# Planned Pipeline

```text
astroquery
      ↓
SIMBAD / VizieR
      ↓
Messier Catalog
      ↓
MongoDB Atlas
```

---

# Planned Seed Script

```text
scripts/
└── seed_messier.py
```

---

# Future Catalog Expansion

### Phase 1

Messier Catalog

```text
110 Objects
```

---

### Phase 2

NGC Catalog

```text
7840 Objects
```

---

### Phase 3

IC Catalog

```text
5386 Objects
```

---

# 🚀 Immediate Next Milestones

## Step 1

Create:

```text
CelestialTarget Schema
```

---

## Step 2

Build:

```text
seed_messier.py
```

---

## Step 3

Implement:

```text
Coordinate Engine
```

using:

```python
astropy
astroplan
```

---

## Step 4

Create:

```text
Visibility Recommendation Engine
```

---

## Step 5

Train:

```text
Sky Transparency ML Model
```

---

# 📊 Current Project Status

```text
Authentication System          ✅
MongoDB Integration            ✅
FastAPI Scaffold               ✅
Astronomy Engine               🔄
Celestial Catalog Seeder       ⏳
Coordinate Engine              ⏳
Recommendation Engine          ⏳
ML Transparency Model          ⏳
WebSocket Alignment            ⏳
```

---

# 🌌 Final Vision

SkyGuide AI is evolving into an intelligent astronomical copilot capable of answering:

> **"What should I observe tonight, and how do I accurately point my telescope toward it?"**
