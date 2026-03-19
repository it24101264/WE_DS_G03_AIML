const mongoose = require("mongoose");

const lostFoundClaimSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    claimantId: { type: String, required: true, index: true },
    claimantName: { type: String, default: "" },
    answer: { type: String, default: "" },
    contactInfo: { type: String, default: "" },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    reviewedAt: { type: String, default: null },
  },
  { timestamps: true, _id: false }
);

const lostFoundItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    type: { type: String, enum: ["LOST", "FOUND"], required: true, index: true },
    itemCategory: {
      type: String,
      enum: ["DEVICE", "BAG", "PURSE", "ID_CARD", "BOOK", "KEYS", "OTHER"],
      default: "OTHER",
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    claimQuestion: { type: String, default: "" },
    location: {
      type: String,
      enum: ["CANTEEN", "BIRD_NEST", "AR", "LIBRARY", "LAB_COMPLEX", "AUDITORIUM", "HOSTEL", "OTHER"],
      default: "OTHER",
      index: true,
    },
    contactInfo: { type: String, default: "" },
    status: { type: String, enum: ["OPEN", "RESOLVED"], default: "OPEN", index: true },
    resolvedAt: { type: String, default: null },
    claims: { type: [lostFoundClaimSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LostFoundItem", lostFoundItemSchema);
