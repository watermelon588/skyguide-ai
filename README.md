# 🌌 SkyGuide AI

> **A Real-Time Personalized Celestial Matchmaking & Telescope Alignment Platform**

SkyGuide AI solves the common amateur astronomer's dilemma:

> **"I have a telescope, but what should I look at right now?"**

The platform acts as a highly responsive cosmic recommendation engine, combining real-time astronomical calculations, environmental conditions, and personalized telescope profiles to recommend the best celestial targets visible at any given moment.

---

# 🏗️ System Architecture

SkyGuide AI follows a distributed microservices architecture consisting of three major layers.

## 1. 💻 Laptop Command Center (Next.js SPA)

A rich data-visualization dashboard that provides:

* Interactive sky maps
* Visible target recommendations
* Airmass and altitude curves
* Field-of-view overlays
* Observation planning tools
* Real-time telescope telemetry visualization

---

## 2. 📱 Lightweight Mobile Client (PWA / React Native)

A mobile companion application mounted directly onto the telescope tube.

Features:

* Streams real-time 3-axis IMU orientation data
* Communicates via WebSockets
* Acts as a telescope alignment assistant
* Provides sensory tracking and positioning feedback

---

## 3. ⚙️ Double Backend Architecture

### Node.js / Express Gateway

Acts as the I/O-efficient traffic controller responsible for:

* Authentication and authorization
* User profile management
* Session handling
* Database interactions
* Caching layers
* High-frequency WebSocket communication
* Secure state management

---

### FastAPI (Python Calculation Engine)

Responsible for computationally intensive tasks:

* Astronomical calculations using `astropy`
* Observation planning using `astroplan`
* Sky visibility predictions
* Atmospheric transparency calculations
* Machine learning regression models using `scikit-learn`

The service computes a continuous:

```text
Sky Transparency Score ∈ [0.0, 1.0]
```

for each celestial target.

---

# 🛠️ What We Built Today

Today we completed the foundational security and storage architecture of the Node.js Gateway.

---

# 1. 🚀 Robust Server Bootstrapping (`app.js`)

Implemented a production-grade Express server with:

* `helmet` for HTTP security headers
* `cors` with strict origin configuration and credential support
* `compression` for payload optimization
* `morgan` for request logging
* `cookie-parser` for secure cookie parsing and signing

---

# 2. 🌍 High-Fidelity Geolocation & Equipment Schema (`src/models/User.js`)

Designed a production-ready MongoDB schema supporting:

## Multi-Telescope Profiles

* Aperture sizes
* Focal lengths
* Mount types
* Camera attachments

## Geospatial Processing

Implemented MongoDB's native:

```javascript
2dsphere
```

index for:

* Location-aware calculations
* Observer positioning
* Future nearby-observer features
* Local astronomical computations

## Security Hooks

Integrated:

* Password hashing using `bcryptjs`
* Pre-save document middleware
* Sensitive field sanitization

---

# 3. 🔐 Secure HTTP-Only Cookie Authentication System

Implemented a stateless authentication architecture designed to mitigate:

* Cross-Site Scripting (XSS)
* Cross-Site Request Forgery (CSRF)

---

## `authController.js`

Implemented:

* User registration
* User login
* Logout flow
* Last login tracking
* JWT generation
* HTTP-only cookie creation

Authentication cookies are configured using:

```javascript
httpOnly: true
secure: true
sameSite: "strict"
```

---

## `authMiddleware.js`

Built a custom protection middleware that:

* Validates JWT tokens
* Extracts user identity from cookies
* Checks account activity state
* Attaches authenticated user data to requests
* Blocks unauthorized access

---

# ✅ Current Authentication Features

* User Registration
* User Login
* User Logout
* Protected Routes
* JWT Authentication
* HTTP-Only Cookies
* Password Hashing
* MongoDB Atlas Integration
* Account Activity Tracking
* Last Login Tracking

---

# 🗺️ Where We Stand

The entry gate of SkyGuide AI is now:

* Securely authenticated
* Connected to MongoDB Atlas
* Production-ready for feature development
* Prepared for telescope and observation services

---

# 🚀 Next Milestones

## Authentication

* Email Verification
* Forgot Password
* Password Reset
* Role-Based Authorization
* Rate Limiting
* Refresh Tokens

## Astronomy Engine

* Telescope Management APIs
* Observation History
* Celestial Recommendation Engine
* Visibility Prediction Service
* Telescope Alignment Assistant
* Real-Time WebSocket Telemetry
* Machine Learning Transparency Scoring

---

# 🌌 Vision

SkyGuide AI aims to become an intelligent astronomical copilot that helps observers answer one simple question:

> **"What should I observe right now, and how do I point my telescope to it?"**
