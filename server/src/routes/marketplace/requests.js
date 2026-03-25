const express = require("express");
const authRequired = require("../../middlewares/auth");
const MarketplaceRequest = require("../../models/MarketplaceRequest");
const MarketplaceItem = require("../../models/MarketplaceItem");
const { resolveCurrentUser } = require("./_helpers");

const router = express.Router();

router.post("/", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { itemId, message, offerPrice, pickupLocation, pickupLocationName, pickupDate, pickupTime } =
      req.body || {};

    const normalizedMessage = String(message || "").trim();
    if (normalizedMessage.length > 150) {
      return res.status(400).json({ message: "Description/message must be 150 characters or less" });
    }

    const hasLocation = Boolean(String(pickupLocation || "").trim());
    const hasDate = Boolean(pickupDate);
    const hasTime = Boolean(String(pickupTime || "").trim());
    if (!hasLocation || !hasDate || !hasTime) {
      return res.status(400).json({ message: "Pickup venue, date, and time are required" });
    }

    let parsedOfferPrice;
    if (offerPrice !== undefined && offerPrice !== null && String(offerPrice).trim() !== "") {
      parsedOfferPrice = Number(offerPrice);
      if (!Number.isFinite(parsedOfferPrice) || parsedOfferPrice <= 0) {
        return res.status(400).json({ message: "Offer price must be greater than 0" });
      }
    }

    const item = await MarketplaceItem.findById(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (item.status !== "available") return res.status(400).json({ message: "Item is no longer available" });
    if (String(item.seller) === String(user._id)) {
      return res.status(400).json({ message: "You cannot buy your own item" });
    }

    const existing = await MarketplaceRequest.findOne({
      item: itemId,
      buyer: user._id,
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({ message: "You already have a pending request for this item" });
    }

    const request = await MarketplaceRequest.create({
      item: itemId,
      buyer: user._id,
      seller: item.seller,
      message: normalizedMessage,
      offerPrice: parsedOfferPrice,
      pickupLocation: pickupLocation || null,
      pickupLocationName: pickupLocationName || null,
      pickupDate: pickupDate ? new Date(pickupDate) : null,
      pickupTime: pickupTime || null,
    });

    await request.populate([
      { path: "item", select: "title price images category" },
      { path: "buyer", select: "name studentId" },
    ]);

    return res.status(201).json({ request });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/my", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });

    const requests = await MarketplaceRequest.find({ buyer: user._id })
      .populate("item", "title price images category")
      .sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.put("/:id", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });

    const request = await MarketplaceRequest.findOne({ _id: req.params.id, buyer: user._id });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: "Can only edit pending requests" });

    const { message, offerPrice, pickupLocation, pickupLocationName, pickupDate, pickupTime } = req.body || {};
    if (message !== undefined) request.message = message;
    if (offerPrice !== undefined) request.offerPrice = offerPrice;
    if (pickupLocation !== undefined) request.pickupLocation = pickupLocation;
    if (pickupLocationName !== undefined) request.pickupLocationName = pickupLocationName;
    if (pickupDate !== undefined) request.pickupDate = pickupDate ? new Date(pickupDate) : null;
    if (pickupTime !== undefined) request.pickupTime = pickupTime;

    await request.save();
    return res.json({ request });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const user = await resolveCurrentUser(req);
    if (!user) return res.status(401).json({ message: "User not found" });

    const request = await MarketplaceRequest.findOne({ _id: req.params.id, buyer: user._id });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: "Cannot cancel this request" });

    request.status = "cancelled";
    await request.save();
    return res.json({ message: "Request cancelled" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
