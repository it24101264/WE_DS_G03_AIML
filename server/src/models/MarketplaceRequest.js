const mongoose = require("mongoose");

const marketplaceRequestSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceItem", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, default: "", maxlength: 150 },
    offerPrice: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "completed"],
      default: "pending",
    },
    sellerResponse: { type: String, default: "" },
    pickupLocation: { type: String, default: null },
    pickupLocationName: { type: String, default: null },
    pickupDate: { type: Date, default: null },
    pickupTime: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MarketplaceRequest", marketplaceRequestSchema);
