const mongoose = require("mongoose");

const parkingSessionSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, index: true },
    slotId: { type: String, required: true, index: true },
    entryTime: { type: Date, required: true },
    exitTime: { type: Date, default: null },
  },
  { timestamps: true }
);

parkingSessionSchema.index({ username: 1, exitTime: 1 });

module.exports = mongoose.model("ParkingSession", parkingSessionSchema);
