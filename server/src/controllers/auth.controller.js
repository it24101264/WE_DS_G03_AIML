const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const CanteenProfile = require("../models/CanteenProfile");
const { makeId } = require("../utils/id");
const { ROLES } = require("../constants/roles");
const { validateRegisterPayload, validateLoginPayload } = require("../utils/authValidation");

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

exports.register = async (req, res) => {
  try {
    const { isValid, message, values } = validateRegisterPayload(req.body);
    if (!isValid) {
      const status = message === "Admin accounts cannot be self-registered" ? 403 : 400;
      return res.status(status).json({ success: false, message });
    }

    const exists = await User.findOne({ email: values.email }).lean();
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(values.password, 10);

    const user = await User.create({
      id: makeId("u_"),
      name: values.name,
      email: values.email,
      passwordHash,
      role: values.role,
    });
    if (values.role === ROLES.CANTEEN_OWNER) {
      const newCanteen = new CanteenProfile({
        UserID: user._id,
        Name: values.canteenName,
        Location: values.canteenLocation,
      });

      await newCanteen.save();
    }

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
    const { isValid, message, values } = validateLoginPayload(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, message });
    }

    const user = await User.findOne({ email: values.email }).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(values.password, user.passwordHash);
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

// PATCH /api/v1/auth/push-token
exports.updatePushToken = async (req, res) => {
  try {
    const userId = String(req.user?.id || "").trim();
    const token = String(req.body?.expoPushToken || "").trim();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (token && !/^ExponentPushToken\[.+\]$/.test(token)) {
      return res.status(400).json({ success: false, message: "Invalid Expo push token format" });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.expoPushToken = token;
    user.expoPushTokenUpdatedAt = token ? new Date() : null;
    await user.save();

    return res.status(200).json({
      success: true,
      data: { id: user.id, expoPushToken: user.expoPushToken, expoPushTokenUpdatedAt: user.expoPushTokenUpdatedAt },
      message: token ? "Push token updated" : "Push token cleared",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
