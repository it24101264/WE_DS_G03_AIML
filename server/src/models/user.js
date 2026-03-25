const mongoose = require("mongoose");
const { roleValues, ROLES } = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: roleValues, default: ROLES.STUDENT },
    studentId: { type: String, trim: true, default: "" },
    faculty: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    savedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceItem" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
