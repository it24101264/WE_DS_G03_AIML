const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['Books', 'Electronics', 'Clothing', 'Stationery', 'Other'],
    required: true
  },
  condition: {
    type: String,
    enum: ['New', 'Like New', 'Good', 'Fair'],
    required: true
  },
  image_url: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Available', 'Sold'],
    default: 'Available'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Listing', listingSchema);