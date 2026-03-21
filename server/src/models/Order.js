const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    StudentID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    CanteenID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CanteenProfile'
    },
    DisplayID: {
        type: String
    },
    FoodID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Food',
        required: true
    },
    Quantity: { type: Number, required: true },
    PickupTime: { type: String, required: true },
    TotalPrice: { type: Number, required: true },
    Status: { type: Boolean, default: false } // false = incomplete, true = prepared
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
