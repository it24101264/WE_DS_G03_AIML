const mongoose = require("mongoose");

const marketplaceItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: [
        "Books & Notes",
        "Electronics",
        "Stationery",
        "Clothing",
        "Sports",
        "Lab Equipment",
        "Furniture",
        "Food & Beverages",
        "Other",
      ],
    },
    condition: {
      type: String,
      required: true,
      enum: ["New", "Like New", "Good", "Fair", "Poor"],
    },
    images: [{ type: String }],
    status: { type: String, enum: ["available", "reserved", "sold"], default: "available" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    views: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

marketplaceItemSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("MarketplaceItem", marketplaceItemSchema);
