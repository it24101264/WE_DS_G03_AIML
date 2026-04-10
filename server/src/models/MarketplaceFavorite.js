const mongoose = require("mongoose");

const marketplaceFavoriteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    buyerId: { type: String, required: true, index: true },
    postId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

marketplaceFavoriteSchema.index({ buyerId: 1, postId: 1 }, { unique: true });

module.exports = mongoose.model("MarketplaceFavorite", marketplaceFavoriteSchema);
