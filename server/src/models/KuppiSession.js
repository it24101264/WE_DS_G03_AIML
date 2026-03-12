const mongoose = require("mongoose");

const kuppiSessionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    topic: { type: String, required: true, trim: true },
    topicKey: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    location: { type: String, default: null },
    scheduledAt: { type: String, default: null },
    meetLink: { type: String, default: null },
    groupId: { type: String, default: null, index: true },
    requestIds: { type: [String], default: [] },
    participantIds: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },
    publishedAt: { type: String, default: null },
    rejectedAt: { type: String, default: null },
    createdBy: { type: String, default: "" },
    keywords: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KuppiSession", kuppiSessionSchema);
