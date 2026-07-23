const rateLimit =
    require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

exports.authLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message:
                "Too many requests. Please try again later.",
        },
    });

/**
 * Failed-login limiter.
 *
 * `authLimiter`'s 100 attempts per 15 minutes is a traffic guard, not a
 * credential-stuffing defence — with no account lockout anywhere, it allowed
 * ~9,600 password guesses a day per IP.
 *
 * `skipSuccessfulRequests` is what makes tightening this SAFE: only failures
 * consume budget, so a real observer who mistypes their password twice and then
 * signs in spends nothing. Only someone who is wrong over and over — which is
 * exactly what guessing looks like — ever reaches the cap.
 *
 * Keyed by IP because there is no session yet. Sized to tolerate a shared
 * office/campus NAT while still cutting the guess rate by 5x.
 */
exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Too many failed sign-in attempts. Please try again in a few minutes.",
    },
});

/**
 * One-time-code guess limiter.
 *
 * The OTP is six digits — a million possibilities, which sounds ample until you
 * divide by an unthrottled request rate. This route is authenticated, so the
 * key is the USER: capping by IP would let one attacker's guesses against their
 * own account exhaust the budget for everyone behind a shared address, and
 * would not bind the limit to the thing actually being guessed.
 *
 * Successful redemptions are free (see above), so this only ever bites guessing.
 */
exports.otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    keyGenerator: (req) =>
        req.user ? `user:${req.user._id}` : ipKeyGenerator(req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many incorrect codes. Request a new one in a few minutes.",
    },
});

/**
 * Password-reset request limiter.
 *
 * Every call here sends an email, so an unthrottled endpoint is both a mail-bomb
 * aimed at whichever address the attacker names and a fast way to burn the SMTP
 * quota the app depends on. Counts ALL requests, not just failures — the
 * response is deliberately identical either way (see forgotPassword), so
 * "failure" isn't observable here.
 */
exports.passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Too many password reset requests. Please try again in an hour.",
    },
});

/**
 * Reset-token REDEMPTION limiter.
 *
 * Deliberately separate from passwordResetLimiter, and more permissive. The two
 * endpoints are abused differently:
 *   /forgot-password  sends mail  -> strict, every call counts
 *   /reset-password   spends none -> the token is 32 random bytes, so guessing
 *                                    is already infeasible; a limit here is
 *                                    only belt-and-braces
 * Sharing one strict bucket meant a person who fumbled the form could exhaust
 * the budget and be locked out of a reset they had legitimately started —
 * caught by driving the real UI, where the redemption blocked on a budget the
 * request step had already spent.
 *
 * `skipSuccessfulRequests` so completing a reset costs nothing.
 */
exports.resetRedeemLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 15,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Too many attempts. Request a fresh reset link and try again shortly.",
    },
});

/**
 * Gallery upload limiter.
 *
 * Uploads are the one endpoint that consumes DISK, which nothing reclaims on
 * its own — an unthrottled route fills the volume and takes the whole gateway
 * down with it. Keyed by user (the route is authenticated) so one account can't
 * spend everyone's budget, and sized for someone sharing a night's photos
 * rather than for a script.
 */
exports.galleryUploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    keyGenerator: (req) =>
        req.user ? `user:${req.user._id}` : ipKeyGenerator(req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "You've shared a lot of photos just now — please try again later.",
    },
});

/**
 * Astro Engine proxy limiter.
 *
 * Sized for BROWSING, not for a single call: /explore paginates through ~13k
 * objects and /tonight fires several catalog + visibility requests per view, so
 * a tight cap here would break normal use for signed-out visitors — the exact
 * regression this hardening pass must avoid. It exists to stop someone driving
 * the engine's astropy pipelines in a loop, which a few hundred requests per
 * quarter-hour still comfortably prevents.
 *
 * Compute we own, so it is far looser than chatLimiter, which guards a metered
 * third-party bill.
 */
exports.astroProxyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: (req) => (req.user ? 600 : 300),
    keyGenerator: (req) =>
        req.user ? `user:${req.user._id}` : ipKeyGenerator(req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many sky queries. Please slow down for a few minutes.",
    },
});

/**
 * Astro (LLM) chat limiter.
 *
 * This route spends real money per call against a metered third-party API, and
 * it stays reachable while signed OUT — the chat widget is part of the landing
 * page and /guide, so `protect` would have silently removed a public feature.
 * The limiter is therefore the primary control, not a backstop:
 *
 *   signed in  -> keyed by user id, generous enough for real conversation
 *   anonymous  -> keyed by IP, deliberately tight (a browsing visitor asks a
 *                 few questions; a scraper asks thousands)
 *
 * `ipKeyGenerator` is used rather than raw `req.ip` because it normalizes IPv6
 * to a subnet — without it a single client can rotate through addresses in its
 * own prefix and get an unlimited number of buckets. It takes the IP STRING,
 * not the request: handing it `req` returns the object unchanged, which the
 * store then keys by reference, so every request lands in a brand-new bucket
 * and the limit never fires. Verified against express-rate-limit v8.
 */
exports.chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: (req) => (req.user ? 60 : 10),
    keyGenerator: (req) =>
        req.user ? `user:${req.user._id}` : ipKeyGenerator(req.ip),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Astro is catching its breath. Please try again in a few minutes.",
    },
});