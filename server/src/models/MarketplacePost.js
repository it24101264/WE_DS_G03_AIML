const mongoose = require("mongoose");

const STATUS_VALUES = ["ACTIVE", "SOLD"];

const photoSchema = new mongoose.Schema(
  {
    uri: { type: String, default: "", trim: true },
    fileName: { type: String, default: "", trim: true },
    mimeType: { type: String, default: "", trim: true },
    base64DataUrl: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true, trim: true },
    senderEmail: { type: String, required: true, trim: true, lowercase: true },
    senderContact: { type: String, default: "", trim: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true, _id: false }
);

const marketplacePostSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true },
    sellerName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    titleKey: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: STATUS_VALUES, default: "ACTIVE", index: true },
    photos: { type: [photoSchema], default: [] },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MarketplacePost", marketplacePostSchema);
module.exports.STATUS_VALUES = STATUS_VALUES;
