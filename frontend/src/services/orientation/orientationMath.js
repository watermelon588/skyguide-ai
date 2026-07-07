/**
 * Orientation math — pure functions, zero browser APIs, zero React.
 *
 * Conventions (fixed here so nothing downstream ever thinks about them):
 *
 *  World frame (ENU, per W3C deviceorientation): x = East, y = North, z = Up.
 *  Device frame: x = right edge, y = top edge, z = out of the screen —
 *    relative to the device's NATURAL (portrait) orientation; browser
 *    deviceorientation events are never remapped for screen rotation.
 *  Screen frame: device frame rotated about z by the screen-orientation
 *    angle, so "up" means the top of what the user currently sees.
 *
 *  Aim vector: -z of the screen (out of the BACK of the phone — where the
 *    rear camera looks). heading/pitch describe this vector:
 *    heading 0..360° clockwise from North; pitch −90° (ground) .. +90° (zenith).
 *  Roll: rotation of the screen's up axis around the aim vector, positive
 *    clockwise from the user's point of view, −180..180°.
 *
 * Quaternions are {w, x, y, z}, mapping device/screen frame → world frame.
 */

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

/**
 * Quaternion from W3C deviceorientation angles — intrinsic Z-X'-Y''
 * (alpha about z, then beta about x', then gamma about y'').
 */
export function quatFromDeviceEuler(alphaDeg, betaDeg, gammaDeg) {
  const a = ((alphaDeg ?? 0) * DEG2RAD) / 2;
  const b = ((betaDeg ?? 0) * DEG2RAD) / 2;
  const g = ((gammaDeg ?? 0) * DEG2RAD) / 2;
  const cA = Math.cos(a), sA = Math.sin(a);
  const cB = Math.cos(b), sB = Math.sin(b);
  const cG = Math.cos(g), sG = Math.sin(g);
  return {
    w: cA * cB * cG - sA * sB * sG,
    x: sB * cA * cG - sA * cB * sG,
    y: cA * cB * sG + sA * sB * cG,
    z: sA * cB * cG + cA * sB * sG,
  };
}

export function quatMultiply(q1, q2) {
  return {
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
  };
}

export function quatNormalize(q) {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1;
  return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n };
}

export function quatDot(q1, q2) {
  return q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;
}

/** Rotate a vector [x, y, z] by quaternion q (frame → world). */
export function rotateVector(q, v) {
  const { w, x, y, z } = q;
  const [vx, vy, vz] = v;
  // t = 2 * (q.xyz × v)
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  // v' = v + w*t + q.xyz × t
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

/**
 * Device→world quaternion adjusted for screen rotation, giving screen→world.
 * screenAngleDeg is screen.orientation.angle (counterclockwise rotation of
 * the device from natural orientation; content compensates clockwise).
 */
export function screenAdjust(qDevice, screenAngleDeg) {
  const half = ((screenAngleDeg ?? 0) * DEG2RAD) / 2;
  // Rotation about the device z axis by -angle (screen frame → device frame).
  const qScreen = { w: Math.cos(half), x: 0, y: 0, z: -Math.sin(half) };
  return quatMultiply(qDevice, qScreen);
}

/** Signed shortest angular difference a−b, normalized to −180..180. */
export function circularDelta(aDeg, bDeg) {
  let d = (aDeg - bDeg) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function normalizeHeading(deg) {
  return ((deg % 360) + 360) % 360;
}

/** Angle between two unit quaternions in degrees (double-cover aware). */
export function quatAngleDeg(q1, q2) {
  const d = Math.min(1, Math.abs(quatDot(q1, q2)));
  return 2 * Math.acos(d) * RAD2DEG;
}

/**
 * Normalized-lerp quaternion smoothing step (double-cover aware).
 * k = 0 keeps the previous estimate, k = 1 jumps to the target.
 * nlerp ≈ slerp for the small per-frame steps this filter takes, at a
 * fraction of the cost.
 */
export function quatSmooth(qPrev, qNext, k) {
  if (!qPrev) return qNext;
  const sign = quatDot(qPrev, qNext) < 0 ? -1 : 1;
  return quatNormalize({
    w: qPrev.w + (sign * qNext.w - qPrev.w) * k,
    x: qPrev.x + (sign * qNext.x - qPrev.x) * k,
    y: qPrev.y + (sign * qNext.y - qPrev.y) * k,
    z: qPrev.z + (sign * qNext.z - qPrev.z) * k,
  });
}

const WORLD_UP = [0, 0, 1];
const WORLD_NORTH = [0, 1, 0];
// Above this |pitch| the aim is near-vertical and world-up no longer spans a
// stable reference plane for roll — fall back to North (gimbal handling).
const GIMBAL_PITCH_DEG = 85;

/**
 * Extract {heading, pitch, roll} in degrees from a screen→world quaternion.
 * See file header for the exact conventions.
 */
export function anglesFromQuat(qScreenToWorld) {
  const aim = rotateVector(qScreenToWorld, [0, 0, -1]);
  const up = rotateVector(qScreenToWorld, [0, 1, 0]);

  const heading = normalizeHeading(Math.atan2(aim[0], aim[1]) * RAD2DEG);
  const pitch = Math.asin(Math.max(-1, Math.min(1, aim[2]))) * RAD2DEG;

  // Roll: angle of the screen-up axis around aim, measured from a reference
  // "up" projected into the plane perpendicular to aim.
  const gimbal = Math.abs(pitch) > GIMBAL_PITCH_DEG;
  const refSource = gimbal ? WORLD_NORTH : WORLD_UP;
  const dotAim =
    refSource[0] * aim[0] + refSource[1] * aim[1] + refSource[2] * aim[2];
  let ref = [
    refSource[0] - aim[0] * dotAim,
    refSource[1] - aim[1] * dotAim,
    refSource[2] - aim[2] * dotAim,
  ];
  const refLen = Math.hypot(ref[0], ref[1], ref[2]) || 1;
  ref = [ref[0] / refLen, ref[1] / refLen, ref[2] / refLen];
  const cross = [
    aim[1] * ref[2] - aim[2] * ref[1],
    aim[2] * ref[0] - aim[0] * ref[2],
    aim[0] * ref[1] - aim[1] * ref[0],
  ];
  const roll =
    Math.atan2(
      up[0] * cross[0] + up[1] * cross[1] + up[2] * cross[2],
      up[0] * ref[0] + up[1] * ref[1] + up[2] * ref[2],
    ) * RAD2DEG;

  return { heading, pitch, roll, gimbal };
}
