const LostFoundItem = require("../models/LostFoundItem");
const User = require("../models/user");
const { makeId } = require("../utils/id");

const {
  LOCATION_VALUES,
  TYPE_VALUES,
  CATEGORY_VALUES,
  STATUS_VALUES,
  CLAIM_STATUS_VALUES,
  FOUND_REPORT_STATUS_VALUES,
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

function normalizeFoundReportStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return FOUND_REPORT_STATUS_VALUES.includes(normalized) ? normalized : null;
}

function normalizeImageUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(normalized)) {
    return normalized;
  }
  return null;
}

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function validateItemInput({
  title,
  description,
  location,
  type,
  category,
  claimQuestion,
  imageUrl,
}) {
  const safeTitle = String(title || "").trim();
  const safeDescription = String(description || "").trim();
  const safeLocation = normalizeLocation(location);
  const safeType = normalizeType(type);
  const safeCategory = normalizeCategory(category);
  const safeClaimQuestion = String(claimQuestion || "").trim();
  const safeImageUrl = normalizeImageUrl(imageUrl);

  if (!safeTitle) {
    return { error: "title is required" };
  }
  if (!safeDescription) {
    return { error: "description is required" };
  }
  if (countWords(safeDescription) <= 5) {
    return { error: "description must be longer than 5 words" };
  }
  if (!safeLocation) {
    return { error: "Valid location is required" };
  }
  if (!safeType) {
    return { error: "type must be LOST or FOUND" };
  }
  if (!safeCategory) {
    return { error: "Valid category is required" };
  }
  if (safeImageUrl === null) {
    return { error: "imageUrl must be a valid PNG, JPG, or WEBP data URL" };
  }
  if (safeType === "FOUND" && !safeClaimQuestion) {
    return { error: "claimQuestion is required for found items" };
  }

  return {
    data: {
      safeTitle,
      safeDescription,
      safeLocation,
      safeType,
      safeCategory,
      safeClaimQuestion,
      safeImageUrl,
    },
  };
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

function toPublicFoundReport(report, viewerId = "", isOwner = false) {
  const isReporter = String(report.userId) === String(viewerId || "");
  return {
    id: report.id,
    userId: report.userId,
    userName: report.userName,
    userEmail: isOwner || isReporter ? report.userEmail : "",
    contactDetails: isOwner || isReporter ? report.contactDetails : "",
    note: report.note || "",
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function toPublicItem(item, viewerId = "") {
  const claims = Array.isArray(item.claims) ? item.claims : [];
  const foundReports = Array.isArray(item.foundReports) ? item.foundReports : [];
  const isOwner = String(item.userId) === String(viewerId || "");
  const myClaim = !isOwner ? claims.find((claim) => String(claim.userId) === String(viewerId || "")) : null;
  const myFoundReport = !isOwner ? foundReports.find((report) => String(report.userId) === String(viewerId || "")) : null;

  return {
    id: item.id,
    title: item.title,
    description: item.description || "",
    imageUrl: item.imageUrl || "",
    location: item.location,
    type: item.type,
    category: item.category,
    status: item.status,
    userId: item.userId,
    userName: item.userName,
    userEmail: item.userEmail,
    claimQuestion: item.type === "FOUND" ? item.claimQuestion || "" : "",
    claimCount: claims.length,
    foundReportCount: foundReports.length,
    acceptedClaimId: item.acceptedClaimId || "",
    claims: isOwner ? claims.map(toPublicClaim) : [],
    myClaim: myClaim ? toPublicClaim(myClaim) : null,
    foundReports: isOwner ? foundReports.map((report) => toPublicFoundReport(report, viewerId, true)) : [],
    myFoundReport: myFoundReport ? toPublicFoundReport(myFoundReport, viewerId, false) : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

exports.createItem = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const validation = validateItemInput(req.body || {});
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }
    const { safeTitle, safeDescription, safeLocation, safeType, safeCategory, safeClaimQuestion, safeImageUrl } = validation.data;

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
      imageUrl: safeImageUrl || "",
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

exports.updateItem = async (req, res, next) => {
  try {
    const item = await LostFoundItem.findOne({ id: String(req.params?.id || "").trim() });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const userId = String(req.user?.id || req.user?.userId || "").trim();
    if (String(item.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const validation = validateItemInput(req.body || {});
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const { safeTitle, safeDescription, safeLocation, safeType, safeCategory, safeClaimQuestion, safeImageUrl } = validation.data;

    if (item.type === "FOUND" && safeType === "LOST" && Array.isArray(item.claims) && item.claims.length) {
      return res.status(400).json({ success: false, message: "Cannot change a found post with claims into a lost post" });
    }

    item.title = safeTitle;
    item.titleKey = safeTitle.toLowerCase();
    item.description = safeDescription;
    item.location = safeLocation;
    item.type = safeType;
    item.category = safeCategory;
    item.imageUrl = safeImageUrl || "";
    item.claimQuestion = safeType === "FOUND" ? safeClaimQuestion : "";

    await item.save();
    return res.json({ success: true, data: toPublicItem(item.toObject(), userId), message: "Post updated" });
  } catch (err) {
    return next(err);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const item = await LostFoundItem.findOne({ id: String(req.params?.id || "").trim() });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const userId = String(req.user?.id || req.user?.userId || "").trim();
    if (String(item.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    await item.deleteOne();
    return res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    return next(err);
  }
};

exports.submitFoundReport = async (req, res, next) => {
  try {
    const item = await LostFoundItem.findOne({ id: String(req.params?.id || "").trim() });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const userId = String(req.user?.id || req.user?.userId || "").trim();
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (item.type !== "LOST") {
      return res.status(400).json({ success: false, message: "Item found reports are only available for lost posts" });
    }
    if (item.status !== "OPEN") {
      return res.status(400).json({ success: false, message: "This item is already resolved" });
    }
    if (String(item.userId) === userId) {
      return res.status(400).json({ success: false, message: "You cannot submit a found report for your own post" });
    }

    const contactDetails = String(req.body?.contactDetails || "").trim();
    const note = String(req.body?.note || "").trim();
    if (!contactDetails) {
      return res.status(400).json({ success: false, message: "Contact details are required" });
    }

    const existingReport = (item.foundReports || []).find((report) => String(report.userId) === userId);
    if (existingReport) {
      return res.status(400).json({ success: false, message: "You already shared found details for this post" });
    }

    const user = await User.findOne({ id: userId }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    item.foundReports.push({
      id: makeId("found_"),
      userId,
      userName: user.name,
      userEmail: user.email,
      contactDetails,
      note,
      status: "PENDING",
    });

    await item.save();
    return res.status(201).json({
      success: true,
      data: toPublicItem(item.toObject(), userId),
      message: "Your contact details were shared with the post owner",
    });
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
      if (item.type === "LOST") {
        item.foundReports = (item.foundReports || []).map((report) => ({
          ...report.toObject(),
          status: normalizeFoundReportStatus(report.status) === "SEEN" ? "PENDING" : report.status,
        }));
      }
    } else if (item.type === "LOST") {
      item.foundReports = (item.foundReports || []).map((report) => ({
        ...report.toObject(),
        status: "SEEN",
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
