const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { makeId } = require("../utils/id");
const { normalizeRole, ROLES } = require("../constants/roles");

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = ROLES.STUDENT } = req.body || {};
    const safeName = String(name || "").trim();
    const safeEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "");

    if (!safeName || !safeEmail || !safePassword) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const exists = await User.findOne({ email: safeEmail }).lean();
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(safePassword, 10);

    const user = await User.create({
      id: makeId("u_"),
      name: safeName,
      email: safeEmail,
      passwordHash,
      role: normalizeRole(role, ROLES.STUDENT),
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const safeEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "");

    if (!safeEmail || !safePassword) {
      return res.status(400).json({ success: false, message: "email and password required" });
    }

    const user = await User.findOne({ email: safeEmail }).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(safePassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      token,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/auth/me
exports.me = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).lean();

    if (!user) {
      if (process.env.DEV_BYPASS_AUTH === "true") {
        return res.status(200).json({ success: true, data: req.user });
      }
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { passwordHash, _id, __v, ...safeUser } = user;
    return res.status(200).json({ success: true, data: safeUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
