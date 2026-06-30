---
# DAY 2

# Astronomy Engine Foundation
---

# 🎯 Day 2 Objectives

Build:

- FastAPI service
- Python environment
- Astronomy stack
- Microservice architecture

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

- SIMBAD integration
- VizieR integration
- Catalog ingestion
- Coordinate calculations
- ML models
- Recommendation engine

---

# Node.js Owns

- Authentication
- Users
- Telescope data
- WebSockets
- Business logic

---

# 🌌 Celestial Catalog Strategy

Instead of manually typing celestial objects:

SkyGuide AI will use:

### astroquery

-

### SIMBAD

-

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
