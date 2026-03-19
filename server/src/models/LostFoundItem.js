const mongoose = require("mongoose");

const LOCATION_VALUES = ["canteen", "auditorium", "lab", "library", "classroom", "parking", "other"];
const TYPE_VALUES = ["LOST", "FOUND"];
const CATEGORY_VALUES = ["device", "bag", "book", "id-card", "keys", "wallet", "clothing", "other"];
const STATUS_VALUES = ["OPEN", "RESOLVED"];
const CLAIM_STATUS_VALUES = ["PENDING", "ACCEPTED", "REJECTED"];

const claimSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true },
    answer: { type: String, required: true, trim: true },
    status: { type: String, enum: CLAIM_STATUS_VALUES, default: "PENDING" },
  },
  { timestamps: true, _id: false }
);

const lostFoundItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    titleKey: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    location: { type: String, enum: LOCATION_VALUES, required: true, index: true },
    type: { type: String, enum: TYPE_VALUES, required: true, index: true },
    category: { type: String, enum: CATEGORY_VALUES, required: true, index: true },
    status: { type: String, enum: STATUS_VALUES, default: "OPEN" },
    claimQuestion: { type: String, default: "", trim: true },
    claims: { type: [claimSchema], default: [] },
    acceptedClaimId: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LostFoundItem", lostFoundItemSchema);
module.exports.LOCATION_VALUES = LOCATION_VALUES;
module.exports.TYPE_VALUES = TYPE_VALUES;
module.exports.CATEGORY_VALUES = CATEGORY_VALUES;
module.exports.STATUS_VALUES = STATUS_VALUES;
module.exports.CLAIM_STATUS_VALUES = CLAIM_STATUS_VALUES;
