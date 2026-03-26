const mongoose = require("mongoose");

const kuppiRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    topic: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    topicKey: { type: String, required: true, index: true },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    availabilitySlots: { type: [String], required: true, default: [] },
    status: {
      type: String,
      enum: ["PENDING", "GROUPED", "SCHEDULED"],
      default: "PENDING",
      index: true,
    },
    groupId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KuppiRequest", kuppiRequestSchema);
