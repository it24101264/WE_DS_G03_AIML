const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
    CanteenID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CanteenProfile',
        required: true
    },
    Name: { type: String, required: true },
    Price: { type: Number, required: true },
    Availability: { type: Boolean, default: true },
    Image: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Food', foodSchema);
