const LostFoundItem = require("../models/LostFoundItem");
const User = require("../models/user");
const { makeId } = require("../utils/id");

const {
  LOCATION_VALUES,
  TYPE_VALUES,
  CATEGORY_VALUES,
  STATUS_VALUES,
  CLAIM_STATUS_VALUES,
} = require("../models/LostFoundItem");

function normalizeLocation(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return LOCATION_VALUES.includes(normalized) ? normalized : null;
}

function normalizeType(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return TYPE_VALUES.includes(normalized) ? normalized : null;
}

function normalizeCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return CATEGORY_VALUES.includes(normalized) ? normalized : null;
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return STATUS_VALUES.includes(normalized) ? normalized : null;
}

function normalizeClaimStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return CLAIM_STATUS_VALUES.includes(normalized) ? normalized : null;
}

function toPublicClaim(claim) {
  return {
    id: claim.id,
    userId: claim.userId,
    userName: claim.userName,
    userEmail: claim.userEmail,
    answer: claim.answer,
    status: claim.status,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

function toPublicItem(item, viewerId = "") {
  const claims = Array.isArray(item.claims) ? item.claims : [];
  const isOwner = String(item.userId) === String(viewerId || "");
  const myClaim = !isOwner ? claims.find((claim) => String(claim.userId) === String(viewerId || "")) : null;

  return {
    id: item.id,
    title: item.title,
    description: item.description || "",
    location: item.location,
    type: item.type,
    category: item.category,
    status: item.status,
    userId: item.userId,
    userName: item.userName,
    userEmail: item.userEmail,
    claimQuestion: item.type === "FOUND" ? item.claimQuestion || "" : "",
    claimCount: claims.length,
    acceptedClaimId: item.acceptedClaimId || "",
    claims: isOwner ? claims.map(toPublicClaim) : [],
    myClaim: myClaim ? toPublicClaim(myClaim) : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

exports.createItem = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const safeTitle = String(req.body?.title || "").trim();
    const safeDescription = String(req.body?.description || "").trim();
    const safeLocation = normalizeLocation(req.body?.location);
    const safeType = normalizeType(req.body?.type);
    const safeCategory = normalizeCategory(req.body?.category);
    const safeClaimQuestion = String(req.body?.claimQuestion || "").trim();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!safeTitle) {
      return res.status(400).json({ success: false, message: "title is required" });
    }
    if (!safeDescription) {
      return res.status(400).json({ success: false, message: "description is required" });
    }
    if (!safeLocation) {
      return res.status(400).json({ success: false, message: "Valid location is required" });
    }
    if (!safeType) {
      return res.status(400).json({ success: false, message: "type must be LOST or FOUND" });
    }
    if (!safeCategory) {
      return res.status(400).json({ success: false, message: "Valid category is required" });
    }
    if (safeType === "FOUND" && !safeClaimQuestion) {
      return res.status(400).json({ success: false, message: "claimQuestion is required for found items" });
    }

    const user = await User.findOne({ id: userId }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const item = await LostFoundItem.create({
      id: makeId("lf_"),
      userId,
      userName: user.name,
      userEmail: user.email,
      title: safeTitle,
      titleKey: safeTitle.toLowerCase(),
      description: safeDescription,
      location: safeLocation,
      type: safeType,
      category: safeCategory,
      status: "OPEN",
      claimQuestion: safeType === "FOUND" ? safeClaimQuestion : "",
    });

    return res.status(201).json({ success: true, data: toPublicItem(item.toObject(), userId) });
  } catch (err) {
    return next(err);
  }
};

exports.getItems = async (req, res, next) => {
  try {
    const safeLocation = req.query?.location ? normalizeLocation(req.query.location) : null;
    const safeType = req.query?.type ? normalizeType(req.query.type) : null;
    const safeCategory = req.query?.category ? normalizeCategory(req.query.category) : null;
    const safeStatus = req.query?.status ? normalizeStatus(req.query.status) : null;
    const q = String(req.query?.q || "").trim();

    const query = {};
    if (safeLocation) query.location = safeLocation;
    if (safeType) query.type = safeType;
    if (safeCategory) query.category = safeCategory;
    if (safeStatus) query.status = safeStatus;
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const viewerId = String(req.user?.id || req.user?.userId || "").trim();
    const items = await LostFoundItem.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items.map((item) => toPublicItem(item, viewerId)) });
  } catch (err) {
    return next(err);
  }
};

exports.getMyItems = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const items = await LostFoundItem.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items.map((item) => toPublicItem(item, userId)) });
  } catch (err) {
    return next(err);
  }
};

exports.getItemById = async (req, res, next) => {
  try {
    const viewerId = String(req.user?.id || req.user?.userId || "").trim();
    const item = await LostFoundItem.findOne({ id: String(req.params?.id || "").trim() }).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    return res.json({ success: true, data: toPublicItem(item, viewerId) });
  } catch (err) {
    return next(err);
  }
};

exports.updateItemStatus = async (req, res, next) => {
  try {
    const item = await LostFoundItem.findOne({ id: String(req.params?.id || "").trim() });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const userId = String(req.user?.id || req.user?.userId || "").trim();
    if (String(item.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const nextStatus = normalizeStatus(req.body?.status);
    if (!nextStatus) {
      return res.status(400).json({ success: false, message: "status must be OPEN or RESOLVED" });
    }

    item.status = nextStatus;
    if (nextStatus === "OPEN") {
      item.acceptedClaimId = "";
      item.claims = (item.claims || []).map((claim) => ({
        ...claim.toObject(),
        status: normalizeClaimStatus(claim.status) === "ACCEPTED" ? "PENDING" : claim.status,
      }));
    }
    await item.save();
    return res.json({ success: true, data: toPublicItem(item.toObject(), userId), message: "Post status updated" });
  } catch (err) {
    return next(err);
  }
};

exports.submitClaim = async (req, res, next) => {
  try {
    const item = await LostFoundItem.findOne({ id: String(req.params?.id || "").trim() });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const userId = String(req.user?.id || req.user?.userId || "").trim();
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (item.type !== "FOUND") {
      return res.status(400).json({ success: false, message: "Claims are only available for found items" });
    }
    if (item.status !== "OPEN") {
      return res.status(400).json({ success: false, message: "This item is already resolved" });
    }
    if (String(item.userId) === userId) {
      return res.status(400).json({ success: false, message: "You cannot claim your own post" });
    }

    const answer = String(req.body?.answer || "").trim();
    if (!answer) {
      return res.status(400).json({ success: false, message: "Answer is required" });
    }

    const existingClaim = (item.claims || []).find((claim) => String(claim.userId) === userId);
    if (existingClaim) {
      return res.status(400).json({ success: false, message: "You already submitted a claim for this item" });
    }

    const user = await User.findOne({ id: userId }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    item.claims.push({
      id: makeId("claim_"),
      userId,
      userName: user.name,
      userEmail: user.email,
      answer,
      status: "PENDING",
    });

    await item.save();
    return res.status(201).json({ success: true, data: toPublicItem(item.toObject(), userId), message: "Claim submitted" });
  } catch (err) {
    return next(err);
  }
};

exports.acceptClaim = async (req, res, next) => {
  try {
    const item = await LostFoundItem.findOne({ id: String(req.params?.id || "").trim() });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const userId = String(req.user?.id || req.user?.userId || "").trim();
    if (String(item.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    if (item.type !== "FOUND") {
      return res.status(400).json({ success: false, message: "Only found items can accept claims" });
    }

    const claimId = String(req.params?.claimId || "").trim();
    const targetClaim = (item.claims || []).find((claim) => claim.id === claimId);
    if (!targetClaim) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }

    item.claims = (item.claims || []).map((claim) => ({
      ...claim.toObject(),
      status: claim.id === claimId ? "ACCEPTED" : "REJECTED",
    }));
    item.acceptedClaimId = claimId;
    item.status = "RESOLVED";

    await item.save();
    return res.json({ success: true, data: toPublicItem(item.toObject(), userId), message: "Claim accepted and post resolved" });
  } catch (err) {
    return next(err);
  }
};
