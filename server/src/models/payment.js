const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceRequest',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  method: {
    type: String,
    enum: ['payhere', 'cod'],
    default: 'payhere'
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  payherePaymentId: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);