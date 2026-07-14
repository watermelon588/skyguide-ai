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
// verification token user method

UserSchema.methods.createVerificationToken =
  function () {
    const token =
      crypto.randomBytes(32).toString("hex");

    this.verificationToken =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    this.verificationTokenExpires =
      Date.now() + 10 * 60 * 1000;

    return token;
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