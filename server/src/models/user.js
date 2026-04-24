const mongoose = require("mongoose");
const { roleValues, ROLES } = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: roleValues, default: ROLES.STUDENT },
    isBanned: { type: Boolean, default: false, index: true },
    bannedAt: { type: Date, default: null },
    bannedReason: { type: String, default: "", trim: true },
    expoPushToken: { type: String, default: "", trim: true },
    expoPushTokenUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
