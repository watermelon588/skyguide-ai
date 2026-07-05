# DAY-5

# Astronomy Intelligence Engine & Multi-Device Platform

---

## Overview

Day 5 marks one of the largest architectural milestones of the SkyGuide AI project.

The application has successfully evolved from a traditional MERN stack application into a distributed, real-time astronomy platform consisting of multiple independent services communicating together.

Current architecture now consists of:

- React Frontend
- Node.js Gateway
- FastAPI Astronomy Engine
- MongoDB Atlas
- OpenWeather Integration
- Socket.IO Realtime Communication

The platform is now capable of:

- Performing real astronomical calculations using Astropy
- Maintaining an astronomical object catalog
- Computing object visibility in real time
- Evaluating weather conditions for observation
- Running on Local, LAN and Cloudflare networking modes
- Supporting real-time multi-device synchronization
- Preparing telescope-specific recommendations

---

# Current Architecture

```text
                    React Frontend
                          │
                          ▼
                 Node.js Gateway Server
                  │         │          │
                  │         │          │
                  ▼         ▼          ▼
             Socket.IO   MongoDB   FastAPI Astro Engine
                                       │
                 ┌─────────────────────┴────────────────────┐
                 │                                          │
                 ▼                                          ▼
           Astropy Engine                          OpenWeather API
                 │
                 ▼
      Astronomy Calculations & Visibility Engine
```

---

# Overall Progress

```text
Authentication
        │
        ▼
Dashboard
        │
        ▼
Observer Location
        │
        ▼
Weather Engine
        │
        ▼
Telescope Configuration
        │
        ▼
QR Device Pairing
        │
        ▼
Realtime Socket Infrastructure
        │
        ▼
Astronomy Engine
        │
        ▼
Celestial Catalog
        │
        ▼
Visibility Engine
        │
        ▼
Recommendation Engine (Upcoming)
        │
        ▼
Realtime Orientation Streaming
        │
        ▼
Realtime Telescope Alignment
```

---

# Session 6 — Celestial Catalog Engine

## Objective

Build a scalable astronomical catalog capable of serving future recommendation engines without relying on external APIs during runtime.

---

## Completed

### MongoDB Collection

```
celestial_objects
```

Current Dataset

- 110 Messier Objects

Each document stores:

- Catalog ID
- Object Name
- Aliases
- Object Type
- Constellation
- Right Ascension
- Declination
- Angular Size
- Visual Magnitude

Reserved for future sessions:

- AI Description
- Hero Image
- Thumbnail
- Observation Tips
- Telescope Recommendations
- Difficulty Rating
- Seasonal Visibility

---

## Seeder

Implemented an idempotent seeding engine.

Repeated execution:

```
110 inserted

↓

110 updated

↓

0 duplicates
```

---

## Search APIs

```
GET /api/v1/catalog

GET /api/v1/catalog/search

GET /api/v1/catalog/{id}
```

Supports:

- Pagination
- Alias Search
- Object Search
- Constellation Filter
- Object Type Filter

---

## Database Size

Current

```
110 Objects

≈55 KB Data

≈144 KB Indexes
```

Estimated Capacity

```
50,000 Objects

≈40–70 MB

<100 MB Mongo Atlas Free Tier
```

---

## Successfully Tested

- Seeder
- Duplicate Protection
- Pagination
- Search
- Alias Search
- Indexes

---

# Session 7 — Visibility Engine

## Objective

Answer:

> What can I observe right now?

using only astronomical calculations.

---

## Pipeline

```text
Observer

↓

EarthLocation

↓

Catalog Objects

↓

Astropy Coordinate Transform

↓

Visibility Filter

↓

Scoring

↓

Ranking
```

---

## Visibility Score

```
70%

Altitude

+

20%

Brightness

+

10%

Angular Size
```

Designed to be deterministic and easily replaceable by ML later.

---

## Endpoints

```
POST /api/v1/visibility/observable

POST /api/v1/visibility/recommended
```

Returns

- Altitude
- Azimuth
- Hour Angle
- Local Sidereal Time
- Visibility Score

Supports

- Minimum Altitude
- Minimum Score
- Object Type
- Catalog Filter

---

## Performance

Pure Engine

```
≈5.5 ms
```

Complete Request

```
≈400–600 ms

(Database latency included)
```

---

## Tested

Locations

- Kolkata
- London
- Sydney
- New York

Returned unique observable targets for each city.

---

# Session 8 — Weather Engine

## Objective

Integrate real-world observing conditions.

---

## Provider

OpenWeather API

---

## Architecture

```text
Frontend

↓

Node Gateway

↓

FastAPI

↓

OpenWeather

↓

Mongo Cache
```

---

## Weather Cache

Collection

```
weather_cache
```

TTL

```
10 Minutes
```

Repeated request

```
Cache Hit

↓

No OpenWeather API Call
```

---

## Weather Information

Stores

- Temperature
- Feels Like
- Humidity
- Pressure
- Wind Speed
- Visibility
- Cloud Cover
- Weather Description

---

## Observing Score

Weather Quality computed from

| Factor | Weight |
|----------|---------|
| Cloud Cover | 45% |
| Humidity | 15% |
| Wind | 15% |
| Visibility | 15% |
| Rain/Snow | 10% |

Returns

- Excellent
- Very Good
- Good
- Fair
- Poor
- Unusable

---

## Endpoint

```
POST /api/v1/weather/current
```

---

## Successfully Tested

- OpenWeather Integration
- Mongo Cache
- TTL Expiration
- Invalid Coordinates
- Missing API Key
- API Authentication
- Error Handling

---

# Session 9 — Frontend Weather Integration

Weather Engine connected to dashboard.

Dashboard now displays

- Temperature
- Humidity
- Wind
- Cloud Cover
- Pressure
- Visibility
- Observing Score
- Weather Quality

The Weather button now dynamically loads data from the FastAPI backend.

---

# Session 9.5 — Dual Network Mode

## Objective

Run the complete application without changing source code.

Supported Modes

```
LOCAL

LAN

Cloudflare Tunnel
```

---

## Network Architecture

```text
Environment Variables

↓

Network Layer

↓

Frontend

↓

Gateway

↓

Socket.IO

↓

QR Generator
```

---

## Features

- Local Development
- LAN Testing
- Cloudflare Ready
- Multi-device QR Pairing
- Phone Support

---

## Network Config

Frontend

```
frontend/src/config/network.js
```

Backend

```
server-gateway/src/config/network.js
```

Single source of truth.

---

## Successfully Solved

- CORS
- LAN Routing
- QR URLs
- Socket URLs
- FastAPI CORS
- Environment Switching

---

## Verified

Desktop

↓

Phone

↓

QR Scan

↓

Realtime Pairing

↓

Socket Connection

---

# Session 10 — Telescope Configuration UI

Frontend Only

No Backend

---

## Features

Users can

- Search telescope
- Select telescope
- Add custom telescope
- Edit telescope configuration
- Preview specifications
- Save locally

---

## Demo Telescope Catalog

41 real telescope models

Manufacturers

- SkyWatcher
- Celestron
- Orion
- Meade
- Takahashi
- Explore Scientific
- Vaonis
- ZWO
- Apertura
- William Optics

---

## Automatic Calculations

Live calculations

- F Ratio
- Limiting Magnitude
- Maximum Magnification
- Light Gathering Power

Future placeholders

- Field of View
- Recommended Targets

---

## Local Storage

```
skyguide_telescope
```

Temporary only.

Backend integration will happen next session.

---

## Dashboard Improvements

Dashboard Layout

```
Observer Location

↓

Telescope

↓

Sync Telescope
```

All dashboard cards now share

- Equal Height
- Equal Typography
- Equal Button Sizes
- Shared Design Language

---

# Astro Engine Status

```
FastAPI Server                 ✅
Astropy Integration            ✅
MongoDB Connection             ✅
Health Endpoint                ✅
Observer Endpoint              ✅
Coordinate Transform           ✅
EarthLocation                  ✅
SkyCoord                       ✅
AltAz Conversion               ✅
Sidereal Time                  ✅
Celestial Catalog              ✅
Visibility Engine              ✅
Weather Engine                 ✅
Structured Logging             ✅
```

---

# Networking Status

```
Local Development        ✅

LAN Development          ✅

Socket.IO                ✅

QR Pairing               ✅

Realtime Sync            ✅

Cloudflare Ready         ✅
```

---

# Backend Testing

Successfully verified

- Health Endpoint
- Observer Endpoint
- Coordinate Transformation
- Catalog APIs
- Visibility APIs
- Weather APIs
- MongoDB Connectivity
- OpenWeather Integration

---

# Frontend Testing

Verified

- Observer Location
- Weather Widget
- Telescope Configuration
- Dashboard Layout
- Responsive Components

---

# Networking Testing

Verified

Desktop

↓

Phone

↓

LAN Connection

↓

QR Pairing

↓

Realtime Socket Connection

↓

Live Synchronization

---

# Database Testing

Verified

- Celestial Catalog
- Weather Cache
- MongoDB Indexes
- Seeder
- Duplicate Prevention

---

# Upcoming Sessions

## Session 11

Telescope Backend

- Mongo Schema
- REST APIs
- Replace LocalStorage
- Persistent Telescope Configuration

---

## Session 12

Personalized Recommendation Engine

Inputs

- Telescope
- Observer Location
- Weather
- Visibility
- Celestial Catalog

Outputs

Top recommended celestial objects for the current night.

---

## Final Development Phase

- Phone Sensor Streaming
- Accelerometer
- Gyroscope
- Magnetometer
- Quaternion Mathematics
- Telescope Orientation
- Live Alignment Guidance
- AI Recommendation Engine
- Observation Planning
- Deep Sky Assistance

---

# Current Project Status

SkyGuide AI has officially evolved into a modular astronomy platform.

Current responsibilities are clearly separated across services:

### React Frontend

- Dashboard
- Observer Location
- Weather Interface
- Telescope Configuration
- QR Pairing
- Multi-device UI

---

### Node Gateway

- Authentication
- REST APIs
- Socket.IO
- User Management
- Device Pairing

---

### FastAPI Astro Engine

- Astronomical Calculations
- Celestial Catalog
- Visibility Engine
- Weather Engine
- Astropy Integration

---

### MongoDB Atlas

- User Data
- Celestial Catalog
- Weather Cache
- Future Telescope Profiles

---

The project is now fully prepared for the next stage:

**Building a personalized AI-powered celestial recommendation system that combines observer location, telescope specifications, weather conditions, and astronomical visibility to recommend the best objects to observe in real time.**