const jwt = require("jsonwebtoken");

const User = require("../models/Users");

/**
 * Socket auth from the SESSION COOKIE, for namespaces used by the web app
 * (/community, /notifications).
 *
 * This is deliberately NOT `socketMiddleware`. That one gates the DEFAULT
 * namespace on a short-lived telescope *pairing* JWT bound to a roomId — a
 * signed-in browser has no such token, and loosening it would weaken pairing.
 * Namespace middleware doesn't inherit `io.use()`, so the two schemes coexist
 * without touching each other.
 *
 * Populates `socket.data.user` / `socket.data.userId`.
 */

/** Minimal cookie-header parser — avoids threading express middleware in here. */
function parseCookies(header = "") {
  return header.split(";").reduce((acc, part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) {
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
    }
    return acc;
  }, {});
}

module.exports = async function socketSessionAuth(socket, next) {
  try {
    const cookies = parseCookies(socket.handshake.headers?.cookie || "");
    const token = cookies.jwt;
    if (!token) return next(new Error("Not authenticated"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return next(new Error("Not authenticated"));

    socket.data.userId = String(user._id);
    socket.data.user = user;
    next();
  } catch {
    next(new Error("Not authenticated"));
  }
};

module.exports.parseCookies = parseCookies;
