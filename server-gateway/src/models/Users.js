const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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

    isActive: {
      type: Boolean,
      default: true,
    },

    avatar: {
      type: String,
      default: "",
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

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return ;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return bcrypt.compare(
    candidatePassword,
    this.password
  );
};

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