const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const authMiddleware = require('../middleware/auth');

// CREATE LISTING — POST /api/listings
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, price, category, condition, image_url } = req.body;

    const listing = new Listing({
      seller_id: req.user.id,
      title,
      description,
      price,
      category,
      condition,
      image_url
    });

    await listing.save();
    res.status(201).json({ message: 'Listing created!', listing });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET MY LISTINGS — GET /api/listings/mine
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const listings = await Listing.find({ seller_id: req.user.id })
                                  .sort({ created_at: -1 });
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET ALL LISTINGS — GET /api/listings
router.get('/', async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'Available' })
                                  .sort({ created_at: -1 });
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE LISTING — PUT /api/listings/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.seller_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updated = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ message: 'Listing updated!', updated });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE LISTING — DELETE /api/listings/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.seller_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Listing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted!' });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;