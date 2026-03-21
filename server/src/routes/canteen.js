const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const Order = require('../models/Order');
const CanteenProfile = require('../models/CanteenProfile');
const User = require('../models/user');

async function getOrCreateCanteenProfile(identifier) {
    if (!identifier || typeof identifier !== 'string') return null;

    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
        let profile = await CanteenProfile.findById(identifier);
        if (profile) return profile;
        profile = await CanteenProfile.findOne({ UserID: identifier });
        if (profile) return profile;
        const user = await User.findById(identifier);
        if (user) {
            profile = new CanteenProfile({
                UserID: user._id,
                Name: `${user.name}'s Canteen`,
                Location: "Main Campus"
            });
            await profile.save();
            return profile;
        }
    } else if (identifier.startsWith('u_')) {
        const user = await User.findOne({ id: identifier });
        if (!user) return null;
        let profile = await CanteenProfile.findOne({ UserID: user._id });
        if (profile) return profile;
        profile = new CanteenProfile({
            UserID: user._id,
            Name: `${user.name}'s Canteen`,
            Location: "Main Campus"
        });
        await profile.save();
        return profile;
    }

    return null;
}

// Add new food
router.post('/food', async (req, res) => {
    const { canteenId, name, price, availability, image } = req.body;
    try {
        const profile = await getOrCreateCanteenProfile(canteenId);
        if (!profile) return res.status(400).json({ error: 'Invalid Canteen or User ID' });

        const newFood = new Food({
            CanteenID: profile._id,
            Name: name,
            Price: price,
            Availability: availability !== undefined ? availability : true,
            Image: image || null
        });
        await newFood.save();
        res.status(201).json({ success: true, foodId: newFood._id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get food items for a canteen
router.get('/:canteenId/food', async (req, res) => {
    try {
        const profile = await getOrCreateCanteenProfile(req.params.canteenId);
        if (!profile) return res.json([]);
        const foods = await Food.find({ CanteenID: profile._id });
        // Map _id to FoodID for frontend compatibility
        const formattedFoods = foods.map(f => ({
            ...f.toObject(),
            FoodID: f._id
        }));
        res.json(formattedFoods);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete food
router.delete('/food/:foodId', async (req, res) => {
    try {
        await Food.findByIdAndDelete(req.params.foodId);
        res.json({ success: true, message: 'Food item deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update food
router.put('/food/:foodId', async (req, res) => {
    const { name, price, availability, image } = req.body;
    try {
        const updatedFood = await Food.findByIdAndUpdate(
            req.params.foodId,
            { Name: name, Price: price, Availability: availability !== undefined ? availability : true, Image: image || null },
            { new: true }
        );
        if (!updatedFood) return res.status(404).json({ error: 'Food not found' });
        res.json({ success: true, food: updatedFood });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Order Status (Complete/Incomplete)
router.put('/orders/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body; // true = prepared, false = not
    try {
        let order = await Order.findOneAndUpdate({ DisplayID: orderId }, { Status: status });

        if (!order && orderId.match(/^[0-9a-fA-F]{24}$/)) {
            order = await Order.findByIdAndUpdate(orderId, { Status: status });
        }
        res.json({ success: !!order });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Orders for Canteen
router.get('/:canteenId/orders', async (req, res) => {
    const { canteenId } = req.params;
    try {
        const profile = await getOrCreateCanteenProfile(canteenId);
        if (!profile) return res.json([]);

        // Find foods belonging to canteen
        const foods = await Food.find({ CanteenID: profile._id }).select('_id');
        const foodIds = foods.map(f => f._id);

        // Find orders associated with those foods
        const orders = await Order.find({ FoodID: { $in: foodIds } }).populate('FoodID', 'Name');

        const formattedOrders = orders.map(o => ({
            ...o.toObject(),
            OrderID: o.DisplayID || o._id,
            FoodName: o.FoodID ? o.FoodID.Name : 'Unknown Food',
            FoodID: o.FoodID ? o.FoodID._id : null
        }));

        res.json(formattedOrders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all canteens
router.get('/canteens', async (req, res) => {
    try {
        const canteens = await CanteenProfile.find();
        res.json(canteens.map(c => ({
            CanteenID: c.UserID || c._id, 
            CanteenName: c.Name,
            Location: c.Location
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
