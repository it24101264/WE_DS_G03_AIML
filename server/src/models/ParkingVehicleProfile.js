const mongoose = require("mongoose");

const parkingVehicleProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    ownerName: { type: String, required: true, trim: true },
    ownerPhone: { type: String, required: true, trim: true },
    vehicleType: {
      type: String,
      enum: ["bike", "car"],
      required: true,
    },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true },
  },
  { timestamps: true }
);

parkingVehicleProfileSchema.index({ userId: 1, vehicleNumber: 1 }, { unique: true });

module.exports = mongoose.model("ParkingVehicleProfile", parkingVehicleProfileSchema);
