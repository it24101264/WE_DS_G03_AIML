const mongoose = require("mongoose");

const studyAreaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    radius: {
      type: Number,
      required: true
    },
    specialNote: {
      type: String,
      default: ""
    },
    currentCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["Free", "Moderate", "Crowded"],
      default: "Free"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyArea", studyAreaSchema);