const mongoose = require("mongoose");

function isValidOptionalIsoDate(value) {
  if (value == null || value === "") return true;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === String(value);
}

function isValidOptionalHttpsUrl(value) {
  if (value == null || value === "") return true;
  try {
    const url = new URL(String(value));
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

const kuppiSessionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    topic: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    topicKey: { type: String, required: true, index: true },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    location: { type: String, default: null, trim: true, maxlength: 120 },
    scheduledAt: { type: String, default: null, validate: { validator: isValidOptionalIsoDate, message: "scheduledAt must be a valid ISO datetime" } },
    meetLink: { type: String, default: null, trim: true, validate: { validator: isValidOptionalHttpsUrl, message: "meetLink must be a valid https URL" } },
    groupId: { type: String, default: null, index: true },
    requestIds: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && new Set(value).size === value.length,
        message: "requestIds must not contain duplicates",
      },
    },
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
    cohesion: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KuppiSession", kuppiSessionSchema);
