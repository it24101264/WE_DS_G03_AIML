const mongoose = require("mongoose");

const REQUEST_STATUS_VALUES = ["PENDING", "ACCEPTED", "DECLINED"];
const PAYMENT_METHOD_VALUES = ["cod", "payhere"];
const PAYMENT_STATUS_VALUES = ["unpaid", "cod_pending", "pending", "paid", "failed"];

const marketplaceRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    postId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    sellerName: { type: String, required: true, trim: true },
    sellerEmail: { type: String, required: true, trim: true, lowercase: true },
    buyerId: { type: String, required: true, index: true },
    buyerName: { type: String, required: true, trim: true },
    buyerEmail: { type: String, required: true, trim: true, lowercase: true },
    buyerContact: { type: String, default: "", trim: true },
    negotiatedPrice: { type: Number, required: true, min: 0 },
    message: { type: String, required: true, trim: true },
    pickupLocationId: { type: String, default: "", trim: true },
    pickupLocationName: { type: String, default: "", trim: true },
    pickupDate: { type: String, default: "", trim: true },
    pickupTimeSlot: { type: String, default: "", trim: true },
    pickupDateTime: { type: Date, default: null },
    status: { type: String, enum: REQUEST_STATUS_VALUES, default: "PENDING", index: true },
    decidedAt: { type: Date, default: null },
    reofferedAt: { type: Date, default: null },

    // ── Payment fields ────────────────────────────────────────────────────────
    paymentMethod: { type: String, enum: PAYMENT_METHOD_VALUES, default: null },
    paymentStatus: { type: String, enum: PAYMENT_STATUS_VALUES, default: "unpaid", index: true },
    paymentId: { type: String, default: null, trim: true },
    paidAt: { type: Date, default: null },
    pickupReminderPushSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

marketplaceRequestSchema.index({ postId: 1, buyerId: 1 }, { unique: true });

module.exports = mongoose.model("MarketplaceRequest", marketplaceRequestSchema);
module.exports.REQUEST_STATUS_VALUES = REQUEST_STATUS_VALUES;
module.exports.PAYMENT_METHOD_VALUES = PAYMENT_METHOD_VALUES;
module.exports.PAYMENT_STATUS_VALUES = PAYMENT_STATUS_VALUES;
