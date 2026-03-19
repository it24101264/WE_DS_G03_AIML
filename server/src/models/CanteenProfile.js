const mongoose = require('mongoose');

const canteenProfileSchema = new mongoose.Schema({
    UserID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    Name: { type: String, required: true },
    Location: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('CanteenProfile', canteenProfileSchema);
