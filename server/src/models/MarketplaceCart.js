const mongoose = require("mongoose");

const marketplaceCartItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, index: true },
    postId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, trim: true },
    sellerName: { type: String, required: true, trim: true },
    sellerEmail: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, default: "ACTIVE", trim: true },
    photos: { type: Array, default: [] },
    negotiatedPrice: { type: Number, required: true, min: 0 },
    message: { type: String, required: true, trim: true },
    buyerContact: { type: String, required: true, trim: true },
    pickupLocationId: { type: String, required: true, trim: true },
    pickupLocationName: { type: String, required: true, trim: true },
    pickupDate: { type: String, required: true, trim: true },
    pickupTimeSlot: { type: String, required: true, trim: true },
    pickupDateTime: { type: Date, required: true },
  },
  { _id: false, timestamps: true }
);

const marketplaceCartSchema = new mongoose.Schema(
  {
    buyerId: { type: String, required: true, unique: true, index: true },
    items: { type: [marketplaceCartItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MarketplaceCart", marketplaceCartSchema);
