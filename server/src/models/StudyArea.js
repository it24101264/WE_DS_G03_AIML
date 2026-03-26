const mongoose = require("mongoose");

const occupantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    enteredAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studyAreaSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    center: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    radiusMeters: { type: Number, required: true, min: 5, max: 2000 },
    occupants: { type: [occupantSchema], default: [] },
    lastOccupancySyncAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyArea", studyAreaSchema);
