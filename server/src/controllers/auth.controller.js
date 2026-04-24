const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const CanteenProfile = require("../models/CanteenProfile");
const { makeId } = require("../utils/id");
const { ROLES } = require("../constants/roles");
const {
  cleanText,
  validateEmail,
  validateName,
  validatePasswordForRegister,
  validateRegisterPayload,
  validateLoginPayload,
} = require("../utils/authValidation");

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isBanned: Boolean(user.isBanned),
    bannedAt: user.bannedAt || null,
    bannedReason: user.bannedReason || "",
    expoPushToken: user.expoPushToken || "",
    expoPushTokenUpdatedAt: user.expoPushTokenUpdatedAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
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
      data: toSafeUser(user),
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

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: "This account has been banned" });
    }

    const ok = await bcrypt.compare(values.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      token,
      data: toSafeUser(user),
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

    return res.status(200).json({ success: true, data: toSafeUser(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = String(req.user?.id || "").trim();
    const name = cleanText(req.body?.name);
    const email = cleanText(req.body?.email).toLowerCase();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const message = validateName(name) || validateEmail(email);
    if (message) {
      return res.status(400).json({ success: false, message });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: "This account has been banned" });
    }

    const emailOwner = await User.findOne({ email }).lean();
    if (emailOwner && String(emailOwner.id) !== String(user.id)) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    user.name = name;
    user.email = email;
    await user.save();

    const token = signToken(user);
    return res.status(200).json({
      success: true,
      token,
      data: toSafeUser(user),
      message: "Profile updated",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/auth/password
exports.changePassword = async (req, res) => {
  try {
    const userId = String(req.user?.id || "").trim();
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: "Current password is required" });
    }

    const passwordError = validatePasswordForRegister(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError.replace("Password", "New password") });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password must be different from current password" });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/auth/me
exports.deleteAccount = async (req, res) => {
  try {
    const userId = String(req.user?.id || "").trim();
    const password = String(req.body?.password || "");

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required to delete your account" });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Password is incorrect" });
    }

    await user.deleteOne();
    return res.status(200).json({ success: true, message: "Account deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/auth/admin/users
exports.listUsersForAdmin = async (req, res) => {
  try {
    const q = cleanText(req.query?.q).toLowerCase();
    const role = cleanText(req.query?.role);
    const status = cleanText(req.query?.status).toLowerCase();

    const query = {};
    if (role) query.role = role;
    if (status === "banned") query.isBanned = true;
    if (status === "active") query.isBanned = { $ne: true };
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { id: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 }).lean();
    const allUsers = await User.find({}).select("role isBanned").lean();
    const roleCounts = allUsers.reduce((acc, user) => {
      const key = user.role || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: users.map(toSafeUser),
      meta: {
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter((user) => !user.isBanned).length,
        bannedUsers: allUsers.filter((user) => user.isBanned).length,
        roleCounts,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/v1/auth/admin/users/:id/ban
exports.setUserBanStatus = async (req, res) => {
  try {
    const adminId = String(req.user?.id || "");
    const targetId = String(req.params?.id || "").trim();
    const banned = Boolean(req.body?.banned);
    const reason = cleanText(req.body?.reason).slice(0, 240);

    if (!targetId) {
      return res.status(400).json({ success: false, message: "User id is required" });
    }
    if (targetId === adminId) {
      return res.status(400).json({ success: false, message: "Admins cannot ban their own account" });
    }

    const user = await User.findOne({ id: targetId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isBanned = banned;
    user.bannedAt = banned ? new Date() : null;
    user.bannedReason = banned ? reason : "";
    await user.save();

    return res.status(200).json({
      success: true,
      data: toSafeUser(user),
      message: banned ? "User banned" : "User unbanned",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/auth/admin/users/:id
exports.deleteUserForAdmin = async (req, res) => {
  try {
    const adminId = String(req.user?.id || "");
    const targetId = String(req.params?.id || "").trim();

    if (!targetId) {
      return res.status(400).json({ success: false, message: "User id is required" });
    }
    if (targetId === adminId) {
      return res.status(400).json({ success: false, message: "Admins cannot delete their own account" });
    }

    const user = await User.findOne({ id: targetId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await user.deleteOne();
    return res.status(200).json({ success: true, message: "User account deleted" });
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
