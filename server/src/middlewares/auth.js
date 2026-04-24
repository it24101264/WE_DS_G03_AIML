const jwt = require("jsonwebtoken");
const { normalizeRole, ROLES } = require("../constants/roles");
const User = require("../models/user");

function decodeToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function authRequired(req, res, next) {
  try {
    // DEV BYPASS
    if (process.env.DEV_BYPASS_AUTH === "true") {
      req.user = {
        id: process.env.DEV_BYPASS_USER_ID || "64f000000000000000000001",
        role: normalizeRole(process.env.DEV_BYPASS_ROLE, ROLES.STUDENT),
      };
      return next();
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    const token = header.split(" ")[1];
    req.user = decodeToken(token);
    const user = await User.findOne({ id: req.user.id }).select("isBanned").lean();
    if (user?.isBanned) {
      return res.status(403).json({ success: false, message: "This account has been banned" });
    }
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return next();

    const token = header.split(" ")[1];
    req.user = decodeToken(token);
    return next();
  } catch (_err) {
    return next();
  }
}

function requireRole(...allowedRoles) {
  const allowedSet = new Set(allowedRoles.map((r) => normalizeRole(r)));
  return function roleGuard(req, res, next) {
    const role = normalizeRole(req.user?.role);
    if (!role || !allowedSet.has(role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return next();
  };
}

module.exports = authRequired;
module.exports.authRequired = authRequired;
module.exports.optionalAuth = optionalAuth;
module.exports.requireRole = requireRole;
