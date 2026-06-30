# DAY 3 — Real-Time Pairing & WebSocket Foundation

---

# 🎯 Day Objectives

Build:

- Socket.io infrastructure
- Real-time room architecture
- Pairing token system
- Room generation APIs
- Frontend socket testing environment
- Temporary browser authentication console
- Telescope mobile synchronization foundation

---

# 🏗️ Major Architectural Decision

Today we finalized the real-time communication architecture of SkyGuide AI.

The system follows a distributed state synchronization model:

```text
Laptop Dashboard
       │
       ▼
   Create Pairing Room
       │
       ▼
  Generate Pairing JWT
       │
       ▼
      QR Code
       │
       ▼
 Phone scans QR Code
       │
       ▼
 Phone joins Socket Room
       │
       ▼
 Streams Orientation Data
       │
       ▼
 Laptop renders telescope state
```

This architecture completely decouples:

- Dashboard
- Mobile Companion
- Sensor Engine
- Astronomy Engine

while keeping everything synchronized in real time.

---

# 🔌 Socket.io Integration

Installed:

```bash
npm install socket.io
npm install socket.io-client
npm install uuid
```

---

# Backend Socket Initialization

Integrated:

```js
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});
```

Created:

```text
src/
└── sockets/
    ├── index.js
    ├── alignmentSocket.js
    └── socketMiddleware.js
```

---

# 🔐 Pairing JWT System

Implemented temporary pairing tokens.

Purpose:

- authorize socket connections
- avoid exposing user credentials
- support QR-based onboarding
- allow temporary mobile sessions

---

## Token Payload

```js
{
  userId,
  roomId,
  type: "mount_pairing"
}
```

---

## Expiration

```text
5 minutes
```

This ensures:

- temporary access
- replay protection
- secure device pairing

---

# 🏠 Room Generation System

Created:

```http
POST /api/v1/alignment/create-room
```

Protected by:

```text
JWT Cookie Authentication
```

---

## Response

```json
{
  "success": true,
  "data": {
    "roomId": "mount:xxxx",
    "token": "eyJhb..."
  }
}
```

---

# 🔧 Utility System

Created:

```text
generateRoomId.js
```

Using:

```js
uuid;
```

Generated IDs:

```text
mount:xxxxxxxx
```

instead of:

```text
room1
room2
room3
```

for security and uniqueness.

---

# 🔌 Socket Authentication Middleware

Implemented:

```text
socketMiddleware.js
```

Responsibilities:

- validate pairing JWT
- reject invalid sockets
- attach decoded user payload to socket

---

## Injected into socket

```js
socket.user;
```

This removes the need to verify tokens repeatedly.

---

# 🏠 Room Join Architecture

Implemented:

```text
join_room
```

event.

Flow:

```text
Client
   ↓
Socket Connection
   ↓
join_room
   ↓
socket.join(roomId)
   ↓
room_joined
```

---

# Protection Against Invalid Room Access

Implemented:

```js
if (
  socket.user.roomId !== roomId
)
```

This prevents users from joining arbitrary rooms.

---

# 📡 Socket Events Implemented

## Incoming

```text
join_room
```

---

## Outgoing

```text
room_joined
pairing_error
```

---

# 🧪 Frontend Socket Testing Environment

Created:

```text
/socket-test
```

Purpose:

- verify socket connectivity
- verify room creation
- verify room joins
- inspect socket IDs
- debug pairing architecture

---

# Frontend Structure

```text
frontend/
│
├── pages/
│   └── SocketTest.jsx
│
├── services/
│   ├── socket.service.js
│   └── alignment.service.js
│
├── context/
│   └── SocketContext.jsx
```

---

# 🔐 Temporary Authentication Console

Created:

```text
/auth-test
```

Purpose:

- browser login
- browser registration
- protected route testing
- room creation
- cookie inspection

---

# Why It Was Needed

Authentication was originally tested via:

```text
Postman
```

However:

```text
Postman cookies
≠
Browser cookies
```

which caused:

```text
401 Unauthorized
```

on protected routes.

---

# Browser Developer Console Features

Implemented:

### Register

```http
POST /register
```

### Login

```http
POST /login
```

### Logout

```http
POST /logout
```

### Protected Route Test

```http
GET /me
```

### Create Room

```http
POST /alignment/create-room
```

---

# CORS Debugging

Resolved:

```text
Access-Control-Allow-Origin
```

issue caused by:

```js
origin: "http://localhost:5000";
```

instead of:

```js
origin: "http://localhost:5173";
```

---

# Browser Authentication Flow Finalized

```text
Browser Login
      ↓
JWT Cookie Stored
      ↓
Protected APIs Accessible
      ↓
Create Room
      ↓
Connect Socket
      ↓
Join Room
```

---

# 🧠 Major System Design Decisions Finalized

## Node.js Gateway Owns

- Authentication
- Users
- Telescope Profiles
- WebSockets
- Device Pairing
- Room Management
- Session State

---

## FastAPI Owns

- Astronomy calculations
- Celestial catalogs
- Coordinate transformations
- Visibility calculations
- Recommendation engine
- Machine learning models

---

# 🌌 Real Execution Path Finalized

```text
User Login
      ↓
Dashboard
      ↓
Sync Telescope
      ↓
Create Room
      ↓
Generate QR
      ↓
Phone Scan
      ↓
Phone Joins Room
      ↓
Begin Sensor Streaming
```

---

# 🚀 Immediate Next Milestones

## Step 1

Build:

```text
Dashboard
```

---

## Step 2

Build:

```text
QR Generation
```

---

## Step 3

Build:

```text
/align mobile route
```

---

## Step 4

Implement:

```text
phone_joined
```

event.

---

## Step 5

Implement:

```text
DeviceOrientationEvent
```

---

## Step 6

Begin:

```text
Real-time orientation streaming
```

---

# 📊 Current Project Status

```text
Authentication System          ✅
MongoDB Integration            ✅
FastAPI Scaffold               ✅
WebSocket Infrastructure       ✅
Socket Room System             ✅
Pairing JWT System             ✅
Temporary Auth Console         ✅
QR Pairing Architecture        🔄
Mobile Companion Route         ⏳
Sensor Streaming               ⏳
Coordinate Engine              ⏳
Recommendation Engine          ⏳
ML Transparency Model          ⏳
```

---

# End of Day 3

Today SkyGuide AI evolved from:

```text
a traditional web application
```

into:

```text
a distributed real-time telescope synchronization platform.
```

The entire foundation for:

- cross-device pairing
- room-based synchronization
- mobile sensor streaming
- telescope alignment assistance

is now in place.

Tomorrow we begin the **real magic**:

```text
QR Pairing
↓
Mobile Companion
↓
Real Sensor Telemetry
↓
Live Telescope Alignment
```

🌌🔭
