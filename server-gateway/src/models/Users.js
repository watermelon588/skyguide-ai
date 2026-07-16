const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const TelescopeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "Custom Telescope",
      maxlength: 100,
    },

    aperture_mm: {
      type: Number,
      required: true,
      min: 20,
      max: 10000,
    },

    focal_length_mm: {
      type: Number,
      required: true,
      min: 50,
      max: 50000,
    },

    bortle_scale: {
      type: Number,
      required: true,
      min: 1,
      max: 9,
    },

    mount_type: {
      type: String,
      enum: [
        "Alt-Azimuth",
        "Equatorial",
        "Dobsonian",
        "GoTo",
        "Other",
      ],
      default: "Other",
    },

    camera_attached: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      lowercase: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Invalid email",
      ],
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
    },

    verificationTokenExpires: {
      type: Date,
    },

    passwordResetToken: {
      type: String,
    },

    passwordResetExpires: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    avatar: {
      // A compact data URL (client-cropped 256px square) or a hosted URL.
      // Kept small so it can live on the document; swappable for a CDN later.
      type: String,
      default: "",
    },

    avatarPublicId: {
      // Reserved for a future CDN (e.g. Cloudinary) — the asset handle to
      // delete/replace. Null while avatars are stored inline.
      type: String,
      default: null,
    },

    // --- Public identity (Feature 4) ---
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 280,
      default: "",
    },

    // Who may view /observers/:username. "observers" = any signed-in user.
    profileVisibility: {
      type: String,
      enum: ["public", "observers", "private"],
      default: "public",
    },

    // When false, the public profile hides the city/region label entirely.
    showApproxLocation: {
      type: Boolean,
      default: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
        default: [0, 0], // [longitude, latitude]
      },

      elevation_m: {
        type: Number,
        default: 0,
      },

      timezone: {
        type: String,
        default: "UTC",
      },

      // Human-readable place, filled by best-effort reverse geocoding on save.
      // These — never the raw coordinates — are what public profiles may show.
      city: { type: String, default: null },
      state: { type: String, default: null },
      country: { type: String, default: null },
    },

    // Geohash-4 cell (~39 km) of the observing location — the observer's
    // regional chat room. Denormalized from location.coordinates on save so
    // "who else is in my room" is an indexed lookup rather than a geo query.
    // Null until a location is set; backfilled lazily by communityService.
    geohash4: {
      type: String,
      default: null,
      index: true,
    },

    // Notification settings (Feature 7). `digestHourLocal` is an hour in the
    // observer's OWN timezone (location.timezone) — the digest cron converts,
    // so 17:00 means 17:00 where they actually observe.
    notificationPrefs: {
      digest: { type: Boolean, default: true },
      digestHourLocal: { type: Number, min: 0, max: 23, default: 17 },
      greatNight: { type: Boolean, default: false },
      issAlerts: { type: Boolean, default: false },
      // These two default ON where greatNight/issAlerts default off: both are
      // about the observer's own plan or a once-a-month sky event, so they fire
      // rarely and only ever in-app.
      planUrgency: { type: Boolean, default: true },
      moonEvents: { type: Boolean, default: true },
      // Master switch for EMAIL delivery. In-app notifications are always
      // written — turning this off silences the inbox, not the app.
      email: { type: Boolean, default: true },
    },

    telescopeProfile: {
      type: [TelescopeSchema],
      default: []
    },

    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ location: "2dsphere" });

// presave hashed password with bcrypt js

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// check password user method

UserSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return bcrypt.compare(
    candidatePassword,
    this.password
  );
};
/**
 * Issue a 6-digit email-verification code (OTP).
 *
 * Replaces the old emailed URL+token: a link had to point somewhere, and a link
 * to the API rendered raw JSON while a link to the frontend forced a tab
 * switch. A code the user types keeps the whole flow on the page they're
 * already on.
 *
 * Only the HASH is stored — the plaintext code is returned once, for the email,
 * and is never recoverable from the database. `randomInt` is the CSPRNG, not
 * Math.random: a guessable OTP is a bypass of the whole check.
 */
UserSchema.methods.createVerificationCode =
  function () {
    const code = String(
      crypto.randomInt(0, 1000000)
    ).padStart(6, "0");

    this.verificationToken =
      crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");

    this.verificationTokenExpires =
      Date.now() + 10 * 60 * 1000;

    return code;
  };

// password reset token 
UserSchema.methods.createPasswordResetToken =
  function () {
    const resetToken =
      crypto.randomBytes(32).toString(
        "hex"
      );

    this.passwordResetToken =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    this.passwordResetExpires =
      Date.now() + 10 * 60 * 1000;

    return resetToken;
  };

// hide password and v from response
UserSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.password;
  delete user.__v;

  return user;
};

module.exports = mongoose.model(
  "User",
  UserSchema
);