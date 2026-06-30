# DAY 1

# Authentication & Database Foundation

---

# 🎯 Day 1 Objectives

Build the foundational backend infrastructure:

- Secure authentication
- MongoDB integration
- Production-grade schemas
- Cookie-based sessions
- Email workflows

---

# 🚀 Express Server Bootstrapping

Implemented production-grade middleware.

## Installed Packages

```javascript
helmet;
cors;
compression;
morgan;
cookie - parser;
dotenv;
```

---

# Purpose of Each Package

## helmet

Protects against:

- Clickjacking
- XSS attacks
- MIME sniffing

---

## cors

Allows:

- Cross-origin communication
- Credential sharing
- Frontend-backend interaction

---

## compression

Compresses:

- JSON responses
- Payload sizes

Improves performance.

---

## morgan

Provides:

- Request logging
- API debugging

---

## cookie-parser

Parses:

- JWT cookies
- Signed cookies

---

# 🌍 MongoDB Atlas Integration

Implemented:

```javascript
config / db.js;
```

Responsibilities:

- Connect to Atlas
- Handle connection failures
- Export reusable database instance

---

# 👤 Production User Schema

Implemented:

## User Information

```javascript
username;
email;
password;
avatar;
role;
isVerified;
isActive;
lastLogin;
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
  location: "2dsphere",
});
```

Benefits:

- Location-aware recommendations
- Future nearby observer features
- Fast geospatial queries

---

# 🔭 Telescope Schema

Supports multiple telescope profiles.

```javascript
telescopeProfile: [TelescopeSchema];
```

Each profile stores:

- Name
- Aperture
- Focal Length
- Mount Type
- Camera Attachment
- Bortle Scale

---

# 🔐 Password Security

Implemented:

```javascript
UserSchema.pre("save");
```

Responsibilities:

- Generate salt
- Hash password
- Prevent plain-text storage

---

# Password Comparison

Implemented:

```javascript
comparePassword();
```

using:

```javascript
bcrypt.compare();
```

---

# 🍪 JWT Cookie Authentication

Implemented secure authentication cookies.

```javascript
httpOnly: true;
secure: true;
sameSite: "strict";
```

Benefits:

### Prevents:

- Cross Site Scripting
- Cookie theft
- CSRF attacks

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

- Secure token generation
- SHA256 hashing
- Expiration handling

---

# 🔑 Forgot Password System

Implemented:

```http
POST /forgot-password
PATCH /reset-password/:token
```

Features:

- Password reset emails
- Secure tokens
- Automatic login after reset

---

# 🚦 Rate Limiting

Implemented:

```javascript
express - rate - limit;
```

Protects:

- Login endpoints
- Registration
- Password reset

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
