const LostFoundItem = require("../models/LostFoundItem");
const User = require("../models/user");
const { makeId } = require("../utils/id");
const { embedLostFoundTextsInPython, rankLostFoundInPython } = require("../services/ml/pythonClient");

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

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildSearchText({ title, description, category, location, type }) {
  return [title, description, category, location, type].map(cleanText).filter(Boolean).join(" ");
}

function toLostFoundRankCandidate(item) {
  return {
    id: item.id,
    title: item.title,
    description: item.description || "",
    category: item.category || "",
    location: item.location || "",
    type: item.type || "",
  };
}

async function createEmbeddingPayload(searchText) {
  const safeSearchText = cleanText(searchText);
  if (!safeSearchText) {
    return {
      searchText: "",
      descriptionEmbedding: [],
      embeddingModel: "",
      embeddingUpdatedAt: null,
    };
  }

  try {
    const resp = await embedLostFoundTextsInPython([safeSearchText]);
    const embedding = Array.isArray(resp?.embeddings?.[0]) ? resp.embeddings[0].map((value) => Number(value) || 0) : [];
    return {
      searchText: safeSearchText,
      descriptionEmbedding: embedding,
      embeddingModel: embedding.length ? "all-MiniLM-L6-v2" : "",
      embeddingUpdatedAt: embedding.length ? new Date() : null,
    };
  } catch (err) {
    console.error("LostFound embedding error:", err.message);
    return {
      searchText: safeSearchText,
      descriptionEmbedding: [],
      embeddingModel: "",
      embeddingUpdatedAt: null,
    };
  }
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || !left.length || left.length !== right.length) {
    return 0;
  }
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = Number(left[index]) || 0;
    const b = Number(right[index]) || 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

async function ensureEmbeddings(items = []) {
  const pending = items.filter((item) => !Array.isArray(item.descriptionEmbedding) || !item.descriptionEmbedding.length);
  if (!pending.length) {
    return items;
  }

  try {
    const texts = pending.map((item) =>
      buildSearchText({
        title: item.title,
        description: item.description,
        category: item.category,
        location: item.location,
        type: item.type,
      })
    );
    const resp = await embedLostFoundTextsInPython(texts);
    const embeddings = Array.isArray(resp?.embeddings) ? resp.embeddings : [];

    await Promise.all(
      pending.map((item, index) =>
        LostFoundItem.updateOne(
          { _id: item._id },
          {
            $set: {
              searchText: texts[index],
              descriptionEmbedding: Array.isArray(embeddings[index]) ? embeddings[index].map((value) => Number(value) || 0) : [],
              embeddingModel: Array.isArray(embeddings[index]) && embeddings[index].length ? "all-MiniLM-L6-v2" : "",
              embeddingUpdatedAt: Array.isArray(embeddings[index]) && embeddings[index].length ? new Date() : null,
            },
          }
        )
      )
    );

    return items.map((item, index) => {
      const pendingIndex = pending.findIndex((pendingItem) => String(pendingItem._id) === String(item._id));
      if (pendingIndex === -1) return item;
      return {
        ...item,
        searchText: texts[pendingIndex],
        descriptionEmbedding: Array.isArray(embeddings[pendingIndex]) ? embeddings[pendingIndex].map((value) => Number(value) || 0) : [],
        embeddingModel: Array.isArray(embeddings[pendingIndex]) && embeddings[pendingIndex].length ? "all-MiniLM-L6-v2" : "",
        embeddingUpdatedAt: Array.isArray(embeddings[pendingIndex]) && embeddings[pendingIndex].length ? new Date() : null,
      };
    });
  } catch (err) {
    console.error("LostFound ensureEmbeddings error:", err.message);
    return items;
  }
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

    const embeddingPayload = await createEmbeddingPayload(
      buildSearchText({
        title: safeTitle,
        description: safeDescription,
        category: safeCategory,
        location: safeLocation,
        type: safeType,
      })
    );

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
      searchText: embeddingPayload.searchText,
      descriptionEmbedding: embeddingPayload.descriptionEmbedding,
      embeddingModel: embeddingPayload.embeddingModel,
      embeddingUpdatedAt: embeddingPayload.embeddingUpdatedAt,
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

    const embeddingPayload = await createEmbeddingPayload(
      buildSearchText({
        title: safeTitle,
        description: safeDescription,
        category: safeCategory,
        location: safeLocation,
        type: safeType,
      })
    );

    item.title = safeTitle;
    item.titleKey = safeTitle.toLowerCase();
    item.description = safeDescription;
    item.location = safeLocation;
    item.type = safeType;
    item.category = safeCategory;
    item.imageUrl = safeImageUrl || "";
    item.claimQuestion = safeType === "FOUND" ? safeClaimQuestion : "";
    item.searchText = embeddingPayload.searchText;
    item.descriptionEmbedding = embeddingPayload.descriptionEmbedding;
    item.embeddingModel = embeddingPayload.embeddingModel;
    item.embeddingUpdatedAt = embeddingPayload.embeddingUpdatedAt;

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

exports.aiSearchItems = async (req, res, next) => {
  try {
    const viewerId = String(req.user?.id || req.user?.userId || "").trim();
    const sourceItemId = String(req.body?.sourceItemId || "").trim();
    let description = cleanText(req.body?.description);
    let targetType = req.body?.targetType ? normalizeType(req.body.targetType) : null;
    const safeLocation = req.body?.location ? normalizeLocation(req.body.location) : null;
    const safeCategory = req.body?.category ? normalizeCategory(req.body.category) : null;
    const safeStatus = req.body?.status ? normalizeStatus(req.body.status) : "OPEN";
    const limit = Math.min(20, Math.max(1, Number(req.body?.limit) || 8));
    let sourceItem = null;

    if (sourceItemId) {
      sourceItem = await LostFoundItem.findOne({ id: sourceItemId }).lean();
      if (!sourceItem) {
        return res.status(404).json({ success: false, message: "Source post not found" });
      }
      if (!description) {
        description = cleanText(sourceItem.description || sourceItem.title);
      }
      if (!targetType) {
        targetType = sourceItem.type === "LOST" ? "FOUND" : "LOST";
      }
    }

    if (!description) {
      return res.status(400).json({ success: false, message: "description or sourceItemId is required" });
    }

    const query = {};
    if (targetType) query.type = targetType;
    if (safeLocation) query.location = safeLocation;
    if (safeCategory) query.category = safeCategory;
    if (safeStatus) query.status = safeStatus;
    if (sourceItemId) query.id = { $ne: sourceItemId };

    let candidates = await LostFoundItem.find(query).sort({ createdAt: -1 }).lean();
    candidates = await ensureEmbeddings(candidates);

    const queryText = buildSearchText({
      title: sourceItem?.title || "",
      description,
      category: safeCategory || sourceItem?.category || "",
      location: safeLocation || sourceItem?.location || "",
      type: sourceItem?.type || "",
    });
    const fallbackScore = async () => {
      const queryEmbeddingPayload = await createEmbeddingPayload(queryText);
      return candidates
        .map((item) => ({
          ...toPublicItem(item, viewerId),
          similarityScore: cosineSimilarity(queryEmbeddingPayload.descriptionEmbedding, item.descriptionEmbedding),
          matchReasons: [],
          matchBreakdown: {
            semantic: cosineSimilarity(queryEmbeddingPayload.descriptionEmbedding, item.descriptionEmbedding),
            keyword: 0,
            metadata: 0,
          },
        }))
        .filter((item) => item.similarityScore > 0)
        .sort((left, right) => right.similarityScore - left.similarityScore)
        .slice(0, limit);
    };

    let scored = [];
    try {
      const rankResp = await rankLostFoundInPython({
        queryText,
        queryMetadata: {
          category: safeCategory || sourceItem?.category || "",
          location: safeLocation || sourceItem?.location || "",
          sourceType: sourceItem?.type || "",
          targetType: targetType || "",
        },
        candidates: candidates.map(toLostFoundRankCandidate),
        limit,
      });
      const candidateMap = new Map(candidates.map((item) => [String(item.id), item]));
      scored = (Array.isArray(rankResp?.results) ? rankResp.results : [])
        .map((ranked) => {
          const item = candidateMap.get(String(ranked.id));
          if (!item) return null;
          return {
            ...toPublicItem(item, viewerId),
            similarityScore: Number(ranked.similarityScore) || 0,
            matchReasons: Array.isArray(ranked.matchReasons) ? ranked.matchReasons : [],
            matchBreakdown: ranked.matchBreakdown || {},
          };
        })
        .filter(Boolean);
    } catch (err) {
      console.error("LostFound rank error:", err.message);
      scored = await fallbackScore();
    }

    return res.json({
      success: true,
      data: scored,
      meta: {
        sourceItemId: sourceItem?.id || "",
        targetType: targetType || "",
        query: description,
        totalCandidates: candidates.length,
      },
    });
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
