const mongoose = require("mongoose");

const parkingSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, default: null },
    username: { type: String, required: true, index: true },
    slotId: { type: String, required: true, index: true },
    vehicleProfileId: { type: String, default: null },
    vehicleType: { type: String, default: null },
    vehicleNumber: { type: String, default: null },
    ownerPhone: { type: String, default: null },
    entryTime: { type: Date, required: true },
    exitTime: { type: Date, default: null },
  },
  { timestamps: true }
);

parkingSessionSchema.index({ username: 1, exitTime: 1 });
parkingSessionSchema.index({ userId: 1, exitTime: 1 });

module.exports = mongoose.model("ParkingSession", parkingSessionSchema);
