const express = require("express");
const authRequired = require("../../middlewares/auth");
const MarketplaceItem = require("../../models/MarketplaceItem");
const { resolveCurrentUser } = require("./_helpers");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      condition,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 12,
    } = req.query;
    const query = { status: "available" };

    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 12;

    const total = await MarketplaceItem.countDocuments(query);
    const items = await MarketplaceItem.find(query)
      .populate("seller", "name studentId faculty")
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    res.json({
      items,
      pagination: {
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/featured", async (_req, res) => {
  try {
    const items = await MarketplaceItem.find({ status: "available" })
      .populate("seller", "name studentId")
      .sort({ createdAt: -1 })
      .limit(8);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await MarketplaceItem.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate("seller", "name studentId faculty phone email");

    if (!item) return res.status(404).json({ message: "Item not found" });
    return res.json({ item });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/:id/save", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });

    const item = await MarketplaceItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const isSaved = item.savedBy.some((id) => String(id) === String(user._id));
    if (isSaved) {
      item.savedBy.pull(user._id);
      user.savedItems.pull(item._id);
    } else {
      item.savedBy.push(user._id);
      user.savedItems.push(item._id);
    }
    await item.save();
    await user.save();

    return res.json({
      saved: !isSaved,
      message: isSaved ? "Removed from saved" : "Item saved!",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
