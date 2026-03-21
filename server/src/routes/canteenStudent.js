const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const Order = require('../models/Order');
const CanteenProfile = require('../models/CanteenProfile');
const User = require('../models/user');

// Get foods for a specific canteen
router.get('/canteens/:canteenId/foods', async (req, res) => {
    try {
        const identifier = req.params.canteenId;
        let profile;
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            profile = await CanteenProfile.findById(identifier);
            if (!profile) profile = await CanteenProfile.findOne({ UserID: identifier });
        } else if (identifier.startsWith('u_')) {
            const u = await User.findOne({ id: identifier });
            if (u) profile = await CanteenProfile.findOne({ UserID: u._id });
        }
        
        if (!profile) return res.json([]);
        const foods = await Food.find({ CanteenID: profile._id });
        const formatted = foods.map(f => ({ ...f.toObject(), FoodID: f._id }));
        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Post a new order
router.post('/orders', async (req, res) => {
    const { studentId, foodId, quantity, pickupTime, totalPrice } = req.body;
    try {
        const food = await Food.findById(foodId).populate('CanteenID');
        if (!food) return res.status(404).json({ error: "Food not found" });

        const order = new Order({
            FoodID: foodId,
            Quantity: quantity,
            PickupTime: pickupTime,
            TotalPrice: totalPrice,
            DisplayID: Math.floor(1000 + Math.random() * 9000).toString()
        });
        
        if (food.CanteenID) order.CanteenID = food.CanteenID._id;

        let user = null;
        if (studentId !== undefined && studentId !== null) {
            const sid = studentId.toString();
            if (sid.match(/^[0-9a-fA-F]{24}$/)) {
                user = await User.findById(sid);
            } else {
                user = await User.findOne({ id: sid });
            }
        }

        if (!user) return res.status(400).json({ error: 'Valid Student User not found in DB.' });

        order.StudentID = user._id;

        await order.save();
        res.json({ success: true, orderId: order._id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get orders for a specific student
router.get('/:studentId/orders', async (req, res) => {
    try {
        const { studentId } = req.params;
        let user = null;
        const sid = studentId.toString();
        if (sid.match(/^[0-9a-fA-F]{24}$/)) user = await User.findById(sid);
        else user = await User.findOne({ id: sid });
        
        if (!user) return res.json([]);

        const orders = await Order.find({ StudentID: user._id }).populate('FoodID', 'Name');
        
        const formatted = orders.map(o => ({
            ...o.toObject(),
            OrderID: o.DisplayID || o._id,
            FoodName: o.FoodID ? o.FoodID.Name : 'Unknown',
            Quantity: o.Quantity,
            PickupTime: o.PickupTime,
            TotalPrice: o.TotalPrice,
            Status: o.Status
        }));
        
        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
