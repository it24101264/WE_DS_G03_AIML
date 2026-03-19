const LostFoundItem = require("../models/LostFoundItem");
const { makeId } = require("../utils/id");

const LOCATION_OPTIONS = new Set([
  "CANTEEN",
  "BIRD_NEST",
  "AR",
  "LIBRARY",
  "LAB_COMPLEX",
  "AUDITORIUM",
  "HOSTEL",
  "OTHER",
]);

const ITEM_CATEGORY_OPTIONS = new Set(["DEVICE", "BAG", "PURSE", "ID_CARD", "BOOK", "KEYS", "OTHER"]);
const CLAIM_STATUS_OPTIONS = new Set(["PENDING", "APPROVED", "REJECTED"]);

function normalizeType(type) {
  const value = String(type || "").trim().toUpperCase();
  return value === "LOST" || value === "FOUND" ? value : null;
}

function normalizeStatus(status) {
  const value = String(status || "").trim().toUpperCase();
  return value === "OPEN" || value === "RESOLVED" ? value : null;
}

function normalizeLocation(location) {
  const value = String(location || "").trim().toUpperCase().replace(/\s+/g, "_");
  return LOCATION_OPTIONS.has(value) ? value : null;
}

function normalizeItemCategory(itemCategory) {
  const value = String(itemCategory || "").trim().toUpperCase().replace(/\s+/g, "_");
  return ITEM_CATEGORY_OPTIONS.has(value) ? value : null;
}

function normalizeClaimStatus(status) {
  const value = String(status || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (value === "APPROVE" || value === "APPROVED" || value === "ACCEPT" || value === "ACCEPTED") {
    return "APPROVED";
  }
  if (value === "REJECT" || value === "REJECTED" || value === "DECLINE" || value === "DECLINED") {
    return "REJECTED";
  }
  return CLAIM_STATUS_OPTIONS.has(value) ? value : null;
}

function toClaimPayload(claim) {
  return {
    id: claim.id,
    claimantId: claim.claimantId,
    claimantName: claim.claimantName || "",
    answer: claim.answer || "",
    contactInfo: claim.contactInfo || "",
    status: claim.status,
    reviewedAt: claim.reviewedAt || null,
    createdAt: claim.createdAt || null,
    updatedAt: claim.updatedAt || null,
  };
}

function toItemPayload(item, viewerId = "", includeClaims = false) {
  const claims = Array.isArray(item.claims) ? item.claims : [];
  const viewerClaim = claims.find((claim) => String(claim.claimantId) === String(viewerId));

  return {
    id: item.id,
    userId: item.userId,
    userName: item.userName || "",
    type: item.type,
    itemCategory: item.itemCategory,
    title: item.title,
    description: item.description || "",
    claimQuestion: includeClaims || String(item.userId) === String(viewerId) ? item.claimQuestion || "" : "",
    hasClaimQuestion: Boolean(String(item.claimQuestion || "").trim()),
    location: item.location,
    contactInfo: item.contactInfo || "",
    status: item.status,
    resolvedAt: item.resolvedAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    canClaim:
      item.type === "FOUND" &&
      item.status === "OPEN" &&
      String(item.userId) !== String(viewerId) &&
      !viewerClaim,
    myClaim: viewerClaim ? toClaimPayload(viewerClaim) : null,
    claims: includeClaims ? claims.map(toClaimPayload) : [],
  };
}

exports.createItem = async (req, res, next) => {
  try {
    const {
      type,
      itemCategory = "OTHER",
      title,
      description = "",
      claimQuestion = "",
      location = "OTHER",
      contactInfo = "",
    } = req.body || {};
    const userId = String(req.user?.id || req.user?.userId || "");
    const itemType = normalizeType(type);
    const normalizedCategory = normalizeItemCategory(itemCategory);
    const normalizedLocation = normalizeLocation(location);
    const safeTitle = String(title || "").trim();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!itemType) {
      return res.status(400).json({ success: false, message: "type must be LOST or FOUND" });
    }
    if (!safeTitle) {
      return res.status(400).json({ success: false, message: "title is required" });
    }
    if (!normalizedCategory) {
      return res.status(400).json({ success: false, message: "Invalid itemCategory" });
    }
    if (!normalizedLocation) {
      return res.status(400).json({ success: false, message: "Invalid location" });
    }

    const item = await LostFoundItem.create({
      id: makeId("lf_"),
      userId,
      userName: String(req.user?.name || req.user?.email || ""),
      type: itemType,
      itemCategory: normalizedCategory,
      title: safeTitle,
      description: String(description),
      claimQuestion: itemType === "FOUND" ? String(claimQuestion || "") : "",
      location: normalizedLocation,
      contactInfo: String(contactInfo),
      status: "OPEN",
      resolvedAt: null,
      claims: [],
    });

    return res.status(201).json({ success: true, data: toItemPayload(item.toObject(), userId, true) });
  } catch (err) {
    return next(err);
  }
};

exports.getItems = async (req, res, next) => {
  try {
    const { type, status, location, itemCategory, q } = req.query || {};
    const query = {};
    const viewerId = String(req.user?.id || req.user?.userId || "");

    const itemType = normalizeType(type);
    const itemStatus = normalizeStatus(status);
    const normalizedLocation = normalizeLocation(location);
    const normalizedCategory = normalizeItemCategory(itemCategory);
    if (type && !itemType) {
      return res.status(400).json({ success: false, message: "Invalid type filter" });
    }
    if (status && !itemStatus) {
      return res.status(400).json({ success: false, message: "Invalid status filter" });
    }
    if (location && !normalizedLocation) {
      return res.status(400).json({ success: false, message: "Invalid location filter" });
    }
    if (itemCategory && !normalizedCategory) {
      return res.status(400).json({ success: false, message: "Invalid itemCategory filter" });
    }

    if (itemType) query.type = itemType;
    if (itemStatus) query.status = itemStatus;
    if (normalizedLocation) query.location = normalizedLocation;
    if (normalizedCategory) query.itemCategory = normalizedCategory;

    const keyword = String(q || "").trim();
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { location: { $regex: keyword, $options: "i" } },
      ];
    }

    const items = await LostFoundItem.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items.map((item) => toItemPayload(item, viewerId, false)) });
  } catch (err) {
    return next(err);
  }
};

exports.getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const viewerId = String(req.user?.id || req.user?.userId || "");
    const item = await LostFoundItem.findOne({ id }).lean();

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const includeClaims = String(item.userId) === viewerId;
    return res.json({ success: true, data: toItemPayload(item, viewerId, includeClaims) });
  } catch (err) {
    return next(err);
  }
};

exports.getMyItems = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "");
    const items = await LostFoundItem.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items.map((item) => toItemPayload(item, userId, true)) });
  } catch (err) {
    return next(err);
  }
};

exports.updateMyItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { itemCategory, title, description, claimQuestion, location, contactInfo } = req.body || {};
    const userId = String(req.user?.id || req.user?.userId || "");

    const item = await LostFoundItem.findOne({ id });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    if (String(item.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const safeTitle = String(title || "").trim();
    const normalizedCategory = normalizeItemCategory(itemCategory);
    const normalizedLocation = normalizeLocation(location);

    if (!safeTitle) {
      return res.status(400).json({ success: false, message: "title is required" });
    }
    if (!normalizedCategory) {
      return res.status(400).json({ success: false, message: "Invalid itemCategory" });
    }
    if (!normalizedLocation) {
      return res.status(400).json({ success: false, message: "Invalid location" });
    }

    item.itemCategory = normalizedCategory;
    item.title = safeTitle;
    item.description = String(description || "");
    item.location = normalizedLocation;
    item.contactInfo = String(contactInfo || "");
    item.claimQuestion = item.type === "FOUND" ? String(claimQuestion || "") : "";

    await item.save();
    return res.json({ success: true, data: toItemPayload(item.toObject(), userId, true) });
  } catch (err) {
    return next(err);
  }
};

exports.createClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer = "", contactInfo = "" } = req.body || {};
    const userId = String(req.user?.id || req.user?.userId || "");
    const userName = String(req.user?.name || req.user?.email || "");
    const safeAnswer = String(answer || "").trim();

    if (!safeAnswer) {
      return res.status(400).json({ success: false, message: "answer is required" });
    }

    const item = await LostFoundItem.findOne({ id });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    if (item.type !== "FOUND") {
      return res.status(400).json({ success: false, message: "Only found items can be claimed" });
    }
    if (item.status !== "OPEN") {
      return res.status(400).json({ success: false, message: "Item is no longer open for claims" });
    }
    if (String(item.userId) === userId) {
      return res.status(400).json({ success: false, message: "You cannot claim your own item" });
    }

    const existingClaim = (item.claims || []).find((claim) => String(claim.claimantId) === userId);
    if (existingClaim) {
      return res.status(400).json({ success: false, message: "You have already claimed this item" });
    }

    item.claims.push({
      id: makeId("cl_"),
      claimantId: userId,
      claimantName: userName,
      answer: safeAnswer,
      contactInfo: String(contactInfo || ""),
      status: "PENDING",
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await item.save();
    const claim = item.claims[item.claims.length - 1];
    return res.status(201).json({ success: true, data: toClaimPayload(claim.toObject ? claim.toObject() : claim) });
  } catch (err) {
    return next(err);
  }
};

exports.reviewClaim = async (req, res, next) => {
  try {
    const { id, claimId } = req.params;
    const { decision } = req.body || {};
    const userId = String(req.user?.id || req.user?.userId || "");
    const normalizedDecision = normalizeClaimStatus(decision);

    if (!normalizedDecision || normalizedDecision === "PENDING") {
      return res.status(400).json({ success: false, message: "decision must be APPROVED or REJECTED" });
    }

    const item = await LostFoundItem.findOne({ id });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    if (String(item.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const claim = (item.claims || []).find((entry) => String(entry.id) === String(claimId));
    if (!claim) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }
    if (claim.status !== "PENDING") {
      return res.json({
        success: true,
        message: "Claim was already reviewed",
        data: toItemPayload(item.toObject(), userId, true),
      });
    }

    const now = new Date().toISOString();
    claim.status = normalizedDecision;
    claim.reviewedAt = now;

    if (normalizedDecision === "APPROVED") {
      item.status = "RESOLVED";
      item.resolvedAt = now;
      for (const entry of item.claims || []) {
        if (String(entry.id) !== String(claimId) && entry.status === "PENDING") {
          entry.status = "REJECTED";
          entry.reviewedAt = now;
        }
      }
    }

    await item.save();
    return res.json({ success: true, data: toItemPayload(item.toObject(), userId, true) });
  } catch (err) {
    return next(err);
  }
};

exports.updateMyItemStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const userId = String(req.user?.id || req.user?.userId || "");
    const nextStatus = normalizeStatus(status);

    if (!nextStatus) {
      return res.status(400).json({ success: false, message: "status must be OPEN or RESOLVED" });
    }

    const item = await LostFoundItem.findOne({ id });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    if (String(item.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    item.status = nextStatus;
    item.resolvedAt = nextStatus === "RESOLVED" ? new Date().toISOString() : null;
    await item.save();
    return res.json({ success: true, data: toItemPayload(item.toObject(), userId, true) });
  } catch (err) {
    return next(err);
  }
};
