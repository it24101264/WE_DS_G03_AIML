const mongoose = require("mongoose");

const parkingSlotSchema = new mongoose.Schema(
  {
    slotId: { type: String, required: true, unique: true, index: true },
    side: { type: String, required: true },
    status: {
      type: String,
      enum: ["available", "occupied"],
      default: "available",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ParkingSlot", parkingSlotSchema);
