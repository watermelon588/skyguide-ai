/**
 * Alignment math — pure spherical geometry on ALREADY-COMPUTED horizontal
 * coordinates. No astronomy lives here: RA/DEC → Alt/Az (sidereal time,
 * precession, frames) is the Astro Engine's job; this module only measures
 * the gap between two directions on the sky sphere at packet rate.
 *
 * Conventions (matching the phone's orientation model and Astropy AltAz):
 *   azimuth / heading: 0..360°, clockwise from North
 *   altitude / pitch : −90..+90°, up positive
 *
 * Error signs are "degrees the telescope must move":
 *   horizontalError > 0 → rotate clockwise (to the right, facing the sky)
 *   verticalError   > 0 → raise the tube
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Wrap any angle to 0..360. */
function normalizeDeg(deg) {
    return ((deg % 360) + 360) % 360;
}

/** Signed shortest angular difference a−b, wrapped to −180..180. */
function circularDeltaDeg(a, b) {
    let d = (a - b) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
}

/**
 * Great-circle separation between two (az, alt) directions, in degrees.
 *
 * Vincenty-style atan2 form: numerically stable for the two regimes the
 * naive arccos formula destroys — near-zero separations (which is exactly
 * where lock detection operates) and antipodal points.
 */
function angularSeparationDeg(az1, alt1, az2, alt2) {
    const a1 = alt1 * DEG2RAD;
    const a2 = alt2 * DEG2RAD;
    const dAz = (az2 - az1) * DEG2RAD;

    const cosA2 = Math.cos(a2);
    const sinA2 = Math.sin(a2);
    const cosA1 = Math.cos(a1);
    const sinA1 = Math.sin(a1);
    const cosDAz = Math.cos(dAz);

    const y = Math.hypot(
        cosA2 * Math.sin(dAz),
        cosA1 * sinA2 - sinA1 * cosA2 * cosDAz
    );
    const x = sinA1 * sinA2 + cosA1 * cosA2 * cosDAz;
    return Math.atan2(y, x) * RAD2DEG;
}

/**
 * Pointing error between the telescope direction and the target.
 *
 * horizontalError is the raw azimuth gap (what an alt-az mount's azimuth
 * axis must actually travel). Note that near the zenith a small angular
 * separation can still show a large azimuth gap — angularError is the
 * truth, the components are the decomposition.
 */
function pointingError({ heading, pitch, targetAz, targetAlt }) {
    return {
        horizontalError: circularDeltaDeg(targetAz, heading),
        verticalError: targetAlt - pitch,
        angularError: angularSeparationDeg(heading, pitch, targetAz, targetAlt),
    };
}

/**
 * Linear extrapolation of an ephemeris segment to `ageS` seconds after its
 * epoch. Azimuth wraps on the circle; altitude is clamped to the pole.
 */
function extrapolateEphemeris(eph, ageS) {
    const altitude = Math.max(
        -90,
        Math.min(90, eph.altitude_deg + eph.altitude_rate_deg_s * ageS)
    );
    return {
        altitude,
        azimuth: normalizeDeg(eph.azimuth_deg + eph.azimuth_rate_deg_s * ageS),
    };
}

module.exports = {
    normalizeDeg,
    circularDeltaDeg,
    angularSeparationDeg,
    pointingError,
    extrapolateEphemeris,
};
