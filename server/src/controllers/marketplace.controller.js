const MarketplacePost = require("../models/MarketplacePost");
const MarketplaceRequest = require("../models/MarketplaceRequest");
const MarketplaceCart = require("../models/MarketplaceCart");
const MarketplaceFavorite = require("../models/MarketplaceFavorite");
const User = require("../models/user");
const { makeId } = require("../utils/id");
const { embedMarketplaceTextsInPython, rankMarketplaceInPython } = require("../services/ml/pythonClient");

const { STATUS_VALUES } = require("../models/MarketplacePost");
const { REQUEST_STATUS_VALUES } = require("../models/MarketplaceRequest");

const MARKETPLACE_LIMITS = {
  titleMin: 3,
  titleMax: 80,
  descriptionMin: 10,
  descriptionMax: 1000,
  sellerNameMin: 2,
  sellerNameMax: 60,
  requestMessageMin: 5,
  requestMessageMax: 500,
  phoneMinDigits: 10,
  phoneMaxDigits: 10,
  maxPrice: 100000000,
  minOfferRatio: 0.3,
  requestUpdateWindowHours: 3,
};

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function buildMarketplaceSearchText({ title, description, sellerName }) {
  return [title, description, sellerName].map(cleanText).filter(Boolean).join(" ");
}

function toMarketplaceRankCandidate(post) {
  return {
    id: post.id,
    title: post.title,
    description: post.description || "",
    sellerName: post.sellerName || post.userName || "",
    price: Number(post.price || 0),
  };
}

async function createMarketplaceEmbeddingPayload(searchText) {
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
    const resp = await embedMarketplaceTextsInPython([safeSearchText]);
    const embedding = Array.isArray(resp?.embeddings?.[0]) ? resp.embeddings[0].map((value) => Number(value) || 0) : [];
    return {
      searchText: safeSearchText,
      descriptionEmbedding: embedding,
      embeddingModel: embedding.length ? "all-MiniLM-L6-v2" : "",
      embeddingUpdatedAt: embedding.length ? new Date() : null,
    };
  } catch (err) {
    console.error("Marketplace embedding error:", err.message);
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

async function ensureMarketplaceEmbeddings(posts = []) {
  const pending = posts.filter((post) => !Array.isArray(post.descriptionEmbedding) || !post.descriptionEmbedding.length);
  if (!pending.length) {
    return posts;
  }

  try {
    const texts = pending.map((post) =>
      buildMarketplaceSearchText({
        title: post.title,
        description: post.description,
        sellerName: post.sellerName || post.userName,
      })
    );
    const resp = await embedMarketplaceTextsInPython(texts);
    const embeddings = Array.isArray(resp?.embeddings) ? resp.embeddings : [];

    await Promise.all(
      pending.map((post, index) =>
        MarketplacePost.updateOne(
          { _id: post._id },
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

    return posts.map((post) => {
      const pendingIndex = pending.findIndex((pendingPost) => String(pendingPost._id) === String(post._id));
      if (pendingIndex === -1) return post;
      return {
        ...post,
        searchText: texts[pendingIndex],
        descriptionEmbedding: Array.isArray(embeddings[pendingIndex]) ? embeddings[pendingIndex].map((value) => Number(value) || 0) : [],
        embeddingModel: Array.isArray(embeddings[pendingIndex]) && embeddings[pendingIndex].length ? "all-MiniLM-L6-v2" : "",
        embeddingUpdatedAt: Array.isArray(embeddings[pendingIndex]) && embeddings[pendingIndex].length ? new Date() : null,
      };
    });
  } catch (err) {
    console.error("Marketplace ensureEmbeddings error:", err.message);
    return posts;
  }
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return STATUS_VALUES.includes(normalized) ? normalized : null;
}

function normalizeSort(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "oldest" || normalized === "date_asc") {
    return { createdAt: 1 };
  }
  if (normalized === "price_desc" || normalized === "price_high" || normalized === "high_to_low") {
    return { price: -1, createdAt: -1 };
  }
  if (normalized === "price_asc" || normalized === "price_low" || normalized === "low_to_high") {
    return { price: 1, createdAt: -1 };
  }

  return { createdAt: -1 };
}

function normalizeRequestStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return REQUEST_STATUS_VALUES.includes(normalized) ? normalized : null;
}

function normalizePhotos(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(Boolean)
    .slice(0, 2)
    .map((photo) => {
      if (typeof photo === "string") {
        return { uri: photo.trim(), fileName: "", mimeType: "", base64DataUrl: "" };
      }

      const uri = String(photo.uri || "").trim();
      const base64DataUrl = String(photo.base64DataUrl || "").trim();
      const isLocalFileUri = uri.startsWith("file:");

      return {
        // Device-local file URIs only work on the uploader's device.
        // Keep them only when we do not have a shareable base64 data URL.
        uri: isLocalFileUri && base64DataUrl ? "" : uri,
        fileName: String(photo.fileName || "").trim(),
        mimeType: String(photo.mimeType || "").trim(),
        base64DataUrl,
      };
    })
    .filter((photo) => photo.uri || photo.base64DataUrl);
}

function hasValidPhoneNumber(value) {
  const text = String(value || "").trim();
  const digits = text.replace(/\D/g, "");
  // We only accept Sri Lankan 10-digit mobile format: 07XXXXXXXX.
  // Keep server validation aligned with mobile client validation.
  return /^[0-9]+$/.test(text)
    && digits.length === 10
    && /^07\d{8}$/.test(digits);
}

function isValidMarketplacePrice(value) {
  return Number.isFinite(value) && value > 0 && value <= MARKETPLACE_LIMITS.maxPrice;
}

function isRequestFinalized(value) {
  const status = String(value || "PENDING").trim().toUpperCase();
  return status === "ACCEPTED" || status === "DECLINED";
}

function validateOfferAgainstPostPrice(negotiatedPrice, postPrice) {
  const price = Number(postPrice);
  if (!Number.isFinite(price) || price <= 0) return null;

  const minAllowed = Number((price * MARKETPLACE_LIMITS.minOfferRatio).toFixed(2));
  if (negotiatedPrice > price) {
    return `negotiatedPrice cannot be greater than listing price (${price})`;
  }
  if (negotiatedPrice < minAllowed) {
    return `negotiatedPrice must be at least ${MARKETPLACE_LIMITS.minOfferRatio * 100}% of listing price (${minAllowed})`;
  }
  return null;
}

function isPaymentCompletedForStatus(paymentStatus) {
  const status = String(paymentStatus || "").toLowerCase();
  return status === "paid";
}

function getViewerPostStatus(post, viewerId = "", acceptedRequest = null) {
  const currentStatus = String(post?.status || "ACTIVE").toUpperCase();
  if (currentStatus === "SOLD") return "SOLD";
  if (!acceptedRequest) return currentStatus;
  const paymentCompleted = isPaymentCompletedForStatus(acceptedRequest.paymentStatus);

  const isOwner = String(post?.userId || "") === String(viewerId || "");
  const isAcceptedBuyer = String(acceptedRequest.buyerId || "") === String(viewerId || "");
  if (isOwner || isAcceptedBuyer) {
    return currentStatus;
  }
  if (paymentCompleted) {
    return currentStatus;
  }
  return "RESERVED";
}

function isWithinRequestUpdateWindow(createdAt) {
  const createdTime = new Date(createdAt).getTime();
  if (!Number.isFinite(createdTime)) return false;
  const elapsed = Date.now() - createdTime;
  const windowMs = MARKETPLACE_LIMITS.requestUpdateWindowHours * 60 * 60 * 1000;
  return elapsed >= 0 && elapsed <= windowMs;
}

// ── Check if payment window (2 hours after pickup time) has expired ─────────────
function isPaymentWindowExpired(pickupDateTime) {
  if (!pickupDateTime) return false;
  try {
    const pickupTime = new Date(pickupDateTime).getTime();
    if (!Number.isFinite(pickupTime)) return false;
    const PAYMENT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
    const deadlineTime = pickupTime + PAYMENT_WINDOW_MS;
    return Date.now() > deadlineTime;
  } catch (e) {
    console.warn("Error checking payment window:", e);
    return false;
  }
}

// ── Auto-revert expired accepted requests (payment not received) ───────────────
async function revertExpiredRequests() {
  try {
    // Find all ACCEPTED requests where payment is unpaid and window expired
    const expiredRequests = await MarketplaceRequest.find({
      status: "ACCEPTED",
      paymentStatus: { $in: ["unpaid", "pending"] },
      pickupDateTime: { $exists: true, $ne: null },
    }).lean();

    const toRevert = expiredRequests.filter((req) => isPaymentWindowExpired(req.pickupDateTime));

    if (toRevert.length === 0) return; // No expired requests

    console.log(`[REVERT] Found ${toRevert.length} expired accepted requests to revert`);

    for (const request of toRevert) {
      try {
        // Revert request status back to PENDING
        await MarketplaceRequest.updateOne(
          { id: request.id },
          { $set: { status: "PENDING", decidedAt: null } }
        );

        // Make the post ACTIVE again
        await MarketplacePost.updateOne(
          { id: request.postId },
          { $set: { status: "ACTIVE" } }
        );

        console.log(`[REVERT] Reverted request ${request.id} for post ${request.postId}`);
      } catch (err) {
        console.error(`[REVERT] Error reverting request ${request.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[REVERT] Error in revertExpiredRequests:", err.message);
  }
}

function validateSellerPostInput({ title, description, sellerName, contactNumber, price, photos }) {
  if (!title) {
    return "title is required";
  }
  if (title.length < MARKETPLACE_LIMITS.titleMin || title.length > MARKETPLACE_LIMITS.titleMax) {
    return `title must be ${MARKETPLACE_LIMITS.titleMin}-${MARKETPLACE_LIMITS.titleMax} characters`;
  }
  if (!description) {
    return "description is required";
  }
  if (description.length < MARKETPLACE_LIMITS.descriptionMin || description.length > MARKETPLACE_LIMITS.descriptionMax) {
    return `description must be ${MARKETPLACE_LIMITS.descriptionMin}-${MARKETPLACE_LIMITS.descriptionMax} characters`;
  }
  if (!sellerName) {
    return "sellerName is required";
  }
  if (sellerName.length < MARKETPLACE_LIMITS.sellerNameMin || sellerName.length > MARKETPLACE_LIMITS.sellerNameMax) {
    return `sellerName must be ${MARKETPLACE_LIMITS.sellerNameMin}-${MARKETPLACE_LIMITS.sellerNameMax} characters`;
  }
  if (!contactNumber) {
    return "contactNumber is required";
  }
  if (!hasValidPhoneNumber(contactNumber)) {
    return "contactNumber must be a valid phone number";
  }
  if (!isValidMarketplacePrice(price)) {
    return `price must be a positive number not greater than ${MARKETPLACE_LIMITS.maxPrice}`;
  }
  if (!photos.length) {
    return "At least one photo is required";
  }
  if (!photos.every((photo) => photo && (photo.base64DataUrl || (photo.uri && !String(photo.uri).startsWith("file:"))))) {
    return "photos must include a shareable image";
  }
  return null;
}

function validateBuyerRequestInput({
  negotiatedPrice,
  message,
  buyerContact,
  pickupLocationId,
  pickupLocationName,
  pickupDate,
  pickupTimeSlot,
  pickupDateTime,
  requireMessage = true,
  requirePickup = true,
  requireContact = true,
}) {
  if (!isValidMarketplacePrice(negotiatedPrice)) {
    return `negotiatedPrice must be a positive number not greater than ${MARKETPLACE_LIMITS.maxPrice}`;
  }
  if (requireMessage && !message) {
    return "message is required";
  }
  if (message && (message.length < MARKETPLACE_LIMITS.requestMessageMin || message.length > MARKETPLACE_LIMITS.requestMessageMax)) {
    return `message must be ${MARKETPLACE_LIMITS.requestMessageMin}-${MARKETPLACE_LIMITS.requestMessageMax} characters`;
  }
  if (requireContact && !buyerContact) {
    return "buyerContact is required";
  }
  if (buyerContact && !hasValidPhoneNumber(buyerContact)) {
    return "buyerContact must be a valid Sri Lankan contact number (07XXXXXXXX)";
  }
  if (requirePickup) {
    if (!pickupLocationId || !pickupLocationName || !pickupDate || !pickupTimeSlot || !pickupDateTime) {
      return "pickupLocationId, pickupLocationName, pickupDate, pickupTimeSlot, and pickupDateTime are required";
    }
    const parsed = new Date(pickupDateTime);
    if (Number.isNaN(parsed.getTime())) {
      return "pickupDateTime must be a valid date-time";
    }
  }
  return null;
}

function toPublicMessage(message) {
  return {
    id: message.id,
    senderId: message.senderId,
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    senderContact: message.senderContact || "",
    text: message.text,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

function toPublicRequest(request, viewerId = "", post = null) {
  const isBuyer = String(request.buyerId || "") === String(viewerId || "");
  const isSeller = String(request.sellerId || "") === String(viewerId || "");
  const isAccepted = String(request.status || "PENDING").toUpperCase() === "ACCEPTED";

  return {
    id: request.id,
    postId: request.postId,
    sellerId: request.sellerId,
    sellerName: request.sellerName,
    sellerEmail: isBuyer ? request.sellerEmail : "",
    sellerContact: isBuyer && isAccepted ? String(post?.contactNumber || "") : "",
    buyerId: request.buyerId,
    buyerName: request.buyerName,
    buyerEmail: isSeller ? request.buyerEmail : "",
    buyerContact: isBuyer
      ? request.buyerContact || ""
      : isSeller && isAccepted
        ? request.buyerContact || ""
        : "",
    negotiatedPrice: request.negotiatedPrice,
    message: request.message,
    pickupLocationId: request.pickupLocationId || "",
    pickupLocationName: request.pickupLocationName || "",
    pickupDate: request.pickupDate || "",
    pickupTimeSlot: request.pickupTimeSlot || "",
    pickupDateTime: request.pickupDateTime || null,
    paymentMethod: request.paymentMethod || null,
    paymentStatus: request.paymentStatus || "unpaid",
    paymentId: request.paymentId || null,
    paidAt: request.paidAt || null,
    status: request.status || "PENDING",
    decidedAt: request.decidedAt || null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    reofferedAt: request.reofferedAt || null,
    post: post
      ? {
          id: post.id,
          title: post.title,
          price: post.price,
          status: post.status,
          photos: Array.isArray(post.photos) ? post.photos : [],
          sellerName: post.sellerName,
          contactNumber: isBuyer && isAccepted ? post.contactNumber : "",
        }
      : null,
  };
}

function toPublicPost(post, viewerId = "") {
  const messages = Array.isArray(post.messages) ? post.messages : [];
  const isOwner = String(post.userId || "") === String(viewerId || "");
  const requests = Array.isArray(post.requests) ? post.requests : [];
  const acceptedViewerRequest = post.viewerRequest && String(post.viewerRequest.status || "PENDING").toUpperCase() === "ACCEPTED";

  return {
    id: post.id,
    userId: post.userId,
    userName: post.userName,
    userEmail: post.userEmail,
    sellerName: post.sellerName,
    contactNumber: isOwner || acceptedViewerRequest ? post.contactNumber : "",
    title: post.title,
    description: post.description || "",
    price: post.price,
    status: post.status,
    photos: Array.isArray(post.photos) ? post.photos : [],
    messageCount: messages.length,
    requestCount: Number(post.requestCount || requests.length || 0),
    messages: isOwner ? messages.map(toPublicMessage) : [],
    requests: isOwner ? requests.map((request) => toPublicRequest(request, viewerId, post)) : [],
    viewerRequest: post.viewerRequest ? toPublicRequest(post.viewerRequest, viewerId, post) : null,
    viewerCartItem: post.viewerCartItem ? toPublicCartItem(post.viewerCartItem, post) : null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function toPublicRequestMessage(message, viewerId = "") {
  return {
    id: message.id,
    requestId: message.requestId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    text: message.text,
    readByMe: Array.isArray(message.readBy) ? message.readBy.includes(String(viewerId || "")) : false,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

function toPublicCartItem(item, post = null) {
  const livePost = post || null;
  const liveStatus = livePost ? String(livePost.status || "ACTIVE").toUpperCase() : String(item.status || "ACTIVE").toUpperCase();
  const listingPrice = livePost && Number.isFinite(Number(livePost.price)) ? Number(livePost.price) : Number(item.price || 0);

  return {
    id: item.id,
    postId: item.postId,
    sellerId: item.sellerId,
    sellerName: livePost?.sellerName || item.sellerName,
    sellerEmail: livePost?.userEmail || item.sellerEmail,
    title: livePost?.title || item.title,
    price: listingPrice,
    status: liveStatus,
    photos: Array.isArray(livePost?.photos) ? livePost.photos : Array.isArray(item.photos) ? item.photos : [],
    negotiatedPrice: item.negotiatedPrice,
    message: item.message,
    buyerContact: item.buyerContact,
    pickupLocationId: item.pickupLocationId,
    pickupLocationName: item.pickupLocationName,
    pickupDate: item.pickupDate,
    pickupTimeSlot: item.pickupTimeSlot,
    pickupDateTime: item.pickupDateTime || null,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function toPublicCart(cart, postMap = new Map()) {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  const mapped = items.map((item) => toPublicCartItem(item, postMap.get(String(item.postId)) || null));
  const total = mapped.reduce((sum, item) => sum + Number(item.negotiatedPrice || 0), 0);
  return {
    buyerId: cart?.buyerId || "",
    itemCount: mapped.length,
    totalNegotiatedPrice: Number(total.toFixed(2)),
    items: mapped,
    createdAt: cart?.createdAt || null,
    updatedAt: cart?.updatedAt || null,
  };
}

async function findUserOr404(userId, res) {
  const user = await User.findOne({ id: userId }).lean();
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return null;
  }
  return user;
}

async function getOrCreateCart(buyerId) {
  let cart = await MarketplaceCart.findOne({ buyerId });
  if (!cart) {
    cart = await MarketplaceCart.create({ buyerId, items: [] });
  }
  return cart;
}

async function findViewerCartItem(buyerId, postId) {
  const safeBuyerId = String(buyerId || "").trim();
  const safePostId = String(postId || "").trim();
  if (!safeBuyerId || !safePostId) return null;

  const cart = await MarketplaceCart.findOne(
    { buyerId: safeBuyerId, "items.postId": safePostId },
    { "items.$": 1 }
  ).lean();

  const items = Array.isArray(cart?.items) ? cart.items : [];
  return items[0] || null;
}

exports.createPost = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const sellerName = String(req.body?.sellerName || "").trim();
    const contactNumber = String(req.body?.contactNumber || "").trim();
    const price = Number(req.body?.price);
    const photos = normalizePhotos(req.body?.photos);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const sellerValidationError = validateSellerPostInput({
      title,
      description,
      sellerName,
      contactNumber,
      price,
      photos,
    });
    if (sellerValidationError) {
      return res.status(400).json({ success: false, message: sellerValidationError });
    }

    const user = await findUserOr404(userId, res);
    if (!user) return;

    const embeddingPayload = await createMarketplaceEmbeddingPayload(
      buildMarketplaceSearchText({ title, description, sellerName })
    );

    const post = await MarketplacePost.create({
      id: makeId("mp_"),
      userId,
      userName: user.name,
      userEmail: user.email,
      sellerName,
      contactNumber,
      title,
      titleKey: title.toLowerCase(),
      description,
      searchText: embeddingPayload.searchText,
      descriptionEmbedding: embeddingPayload.descriptionEmbedding,
      embeddingModel: embeddingPayload.embeddingModel,
      embeddingUpdatedAt: embeddingPayload.embeddingUpdatedAt,
      price,
      availableQuantity: 1,
      status: "ACTIVE",
      photos,
    });

    return res.status(201).json({ success: true, data: toPublicPost(post.toObject(), userId) });
  } catch (err) {
    return next(err);
  }
};

exports.getPosts = async (req, res, next) => {
  try {
    const viewerId = String(req.user?.id || req.user?.userId || "").trim();
    const q = String(req.query?.q || "").trim();
    const status = req.query?.status ? normalizeStatus(req.query.status) : null;
    const sort = normalizeSort(req.query?.sort);
    const query = {};

    if (status) query.status = status;
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { sellerName: { $regex: q, $options: "i" } },
      ];
    }

    const posts = await MarketplacePost.find(query).sort(sort).lean();
    const postIds = posts.map((post) => String(post.id || "")).filter(Boolean);
    const acceptedRows = postIds.length
      ? await MarketplaceRequest.find({ postId: { $in: postIds }, status: "ACCEPTED" })
          .select("postId buyerId paymentStatus")
          .lean()
      : [];
    const acceptedMap = new Map(acceptedRows.map((row) => [String(row.postId), row]));
    const counts = await MarketplaceRequest.aggregate([
      { $match: { postId: { $in: posts.map((post) => post.id) } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((row) => [String(row._id), Number(row.count || 0)]));
    const data = posts.map((post) => ({
      ...post,
      status: getViewerPostStatus(post, viewerId, acceptedMap.get(String(post.id)) || null),
      requestCount: countMap.get(String(post.id)) || 0,
    }));
    return res.json({ success: true, data: data.map((post) => toPublicPost(post, viewerId)) });
  } catch (err) {
    return next(err);
  }
};

exports.getMyPosts = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const posts = await MarketplacePost.find({ userId }).sort({ createdAt: -1 }).lean();
    const postIds = posts.map((post) => post.id);
    const counts = await MarketplaceRequest.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((row) => [String(row._id), Number(row.count || 0)]));
    const data = posts.map((post) => ({ ...post, requestCount: countMap.get(String(post.id)) || 0 }));
    return res.json({ success: true, data: data.map((post) => toPublicPost(post, userId)) });
  } catch (err) {
    return next(err);
  }
};

exports.aiSearchPosts = async (req, res, next) => {
  try {
    const viewerId = String(req.user?.id || req.user?.userId || "").trim();
    const description = cleanText(req.body?.description);
    const limit = Math.min(20, Math.max(1, Number(req.body?.limit) || 8));
    const status = req.body?.status ? normalizeStatus(req.body.status) : "ACTIVE";
    const maxPrice = Number(req.body?.maxPrice);

    if (!description) {
      return res.status(400).json({ success: false, message: "description is required" });
    }

    const query = {};
    if (status) query.status = status;
    if (Number.isFinite(maxPrice) && maxPrice > 0) {
      query.price = { $lte: maxPrice };
    }

    let posts = await MarketplacePost.find(query).sort({ createdAt: -1 }).lean();
    posts = posts.filter((post) => String(post.userId || "") !== viewerId);
    posts = await ensureMarketplaceEmbeddings(posts);

    const postIds = posts.map((post) => String(post.id || "")).filter(Boolean);
    const counts = postIds.length
      ? await MarketplaceRequest.aggregate([
          { $match: { postId: { $in: postIds } } },
          { $group: { _id: "$postId", count: { $sum: 1 } } },
        ])
      : [];
    const countMap = new Map(counts.map((row) => [String(row._id), Number(row.count || 0)]));
    posts = posts.map((post) => ({
      ...post,
      requestCount: countMap.get(String(post.id)) || 0,
    }));

    const fallbackScore = async () => {
      const queryEmbeddingPayload = await createMarketplaceEmbeddingPayload(description);
      return posts
        .map((post) => ({
          ...post,
          similarityScore: cosineSimilarity(queryEmbeddingPayload.descriptionEmbedding, post.descriptionEmbedding),
          matchReasons: [],
          matchBreakdown: {
            semantic: cosineSimilarity(queryEmbeddingPayload.descriptionEmbedding, post.descriptionEmbedding),
            keyword: 0,
            price: 0,
          },
        }))
        .filter((post) => post.similarityScore > 0)
        .sort((left, right) => right.similarityScore - left.similarityScore)
        .slice(0, limit);
    };

    let scored = [];
    try {
      const rankResp = await rankMarketplaceInPython({
        queryText: description,
        candidates: posts.map(toMarketplaceRankCandidate),
        limit,
      });
      const postMap = new Map(posts.map((post) => [String(post.id), post]));
      scored = (Array.isArray(rankResp?.results) ? rankResp.results : [])
        .map((ranked) => {
          const post = postMap.get(String(ranked.id));
          if (!post) return null;
          return {
            ...post,
            similarityScore: Number(ranked.similarityScore) || 0,
            matchReasons: Array.isArray(ranked.matchReasons) ? ranked.matchReasons : [],
            matchBreakdown: ranked.matchBreakdown || {},
          };
        })
        .filter(Boolean);
    } catch (err) {
      console.error("Marketplace rank error:", err.message);
      scored = await fallbackScore();
    }

    return res.json({
      success: true,
      data: scored.map((post) => ({
        ...toPublicPost(post, viewerId),
        similarityScore: post.similarityScore,
        matchReasons: post.matchReasons || [],
        matchBreakdown: post.matchBreakdown || {},
      })),
      meta: {
        query: description,
        totalCandidates: posts.length,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.getMyFavorites = async (req, res, next) => {
  try {
    const buyerId = String(req.user?.id || req.user?.userId || "").trim();
    if (!buyerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const favorites = await MarketplaceFavorite.find({ buyerId }).sort({ updatedAt: -1 }).lean();
    const postIds = [...new Set(favorites.map((row) => String(row.postId || "")).filter(Boolean))];
    const posts = await MarketplacePost.find({ id: { $in: postIds } }).lean();
    const postMap = new Map(posts.map((post) => [String(post.id), post]));

    const data = favorites
      .map((favorite) => {
        const post = postMap.get(String(favorite.postId));
        if (!post) return null;
        return {
          favoriteId: favorite.id,
          postId: favorite.postId,
          favoritedAt: favorite.updatedAt || favorite.createdAt,
          post: toPublicPost(post, buyerId),
        };
      })
      .filter(Boolean);

    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

exports.toggleFavorite = async (req, res, next) => {
  try {
    const buyerId = String(req.user?.id || req.user?.userId || "").trim();
    const postId = String(req.params?.postId || "").trim();
    if (!buyerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!postId) {
      return res.status(400).json({ success: false, message: "postId is required" });
    }

    const post = await MarketplacePost.findOne({ id: postId }).lean();
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (String(post.userId || "") === buyerId) {
      return res.status(400).json({ success: false, message: "You cannot favorite your own post" });
    }

    const existing = await MarketplaceFavorite.findOne({ buyerId, postId });
    if (existing) {
      await existing.deleteOne();
      return res.json({
        success: true,
        data: { postId, favorited: false },
        message: "Removed from favorites",
      });
    }

    await MarketplaceFavorite.create({
      id: makeId("mfv_"),
      buyerId,
      postId,
    });
    return res.status(201).json({
      success: true,
      data: { postId, favorited: true },
      message: "Added to favorites",
    });
  } catch (err) {
    return next(err);
  }
};

exports.getPostById = async (req, res, next) => {
  try {
    // Auto-revert any expired accepted requests first
    await revertExpiredRequests();

    const viewerId = String(req.user?.id || req.user?.userId || "").trim();
    const post = await MarketplacePost.findOne({ id: String(req.params?.id || "").trim() }).lean();

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const acceptedRequest = await MarketplaceRequest.findOne({ postId: post.id, status: "ACCEPTED" })
      .select("postId buyerId paymentStatus")
      .lean();
    const enrichedPost = {
      ...post,
      status: getViewerPostStatus(post, viewerId, acceptedRequest),
    };
    if (String(post.userId || "") === viewerId) {
      enrichedPost.requests = await MarketplaceRequest.find({ postId: post.id }).sort({ updatedAt: -1 }).lean();
      enrichedPost.requestCount = enrichedPost.requests.length;
    } else if (viewerId) {
      enrichedPost.viewerRequest = await MarketplaceRequest.findOne({ postId: post.id, buyerId: viewerId }).lean();
      enrichedPost.viewerCartItem = await findViewerCartItem(viewerId, post.id);
      enrichedPost.requestCount = await MarketplaceRequest.countDocuments({ postId: post.id });
    }

    return res.json({ success: true, data: toPublicPost(enrichedPost, viewerId) });
  } catch (err) {
    return next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const post = await MarketplacePost.findOne({ id: String(req.params?.id || "").trim() });

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (String(post.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const sellerName = String(req.body?.sellerName || "").trim();
    const contactNumber = String(req.body?.contactNumber || "").trim();
    const price = Number(req.body?.price);
    const photos = normalizePhotos(req.body?.photos);

    const sellerValidationError = validateSellerPostInput({
      title,
      description,
      sellerName,
      contactNumber,
      price,
      photos,
    });
    if (sellerValidationError) {
      return res.status(400).json({ success: false, message: sellerValidationError });
    }

    const embeddingPayload = await createMarketplaceEmbeddingPayload(
      buildMarketplaceSearchText({ title, description, sellerName })
    );

    post.title = title;
    post.titleKey = title.toLowerCase();
    post.description = description;
    post.searchText = embeddingPayload.searchText;
    post.descriptionEmbedding = embeddingPayload.descriptionEmbedding;
    post.embeddingModel = embeddingPayload.embeddingModel;
    post.embeddingUpdatedAt = embeddingPayload.embeddingUpdatedAt;
    post.sellerName = sellerName;
    post.contactNumber = contactNumber;
    post.price = price;
    post.availableQuantity = 1;
    post.photos = photos;

    await post.save();
    return res.json({ success: true, data: toPublicPost(post.toObject(), userId), message: "Post updated" });
  } catch (err) {
    return next(err);
  }
};

exports.updatePostStatus = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const post = await MarketplacePost.findOne({ id: String(req.params?.id || "").trim() });

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (String(post.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const status = normalizeStatus(req.body?.status);
    if (!status) {
      return res.status(400).json({ success: false, message: "status must be ACTIVE or SOLD" });
    }

    post.status = status;
    await post.save();
    return res.json({ success: true, data: toPublicPost(post.toObject(), userId), message: "Post status updated" });
  } catch (err) {
    return next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const post = await MarketplacePost.findOne({ id: String(req.params?.id || "").trim() });

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (String(post.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    await Promise.all([post.deleteOne(), MarketplaceRequest.deleteMany({ postId: post.id })]);
    return res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    return next(err);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const post = await MarketplacePost.findOne({ id: String(req.params?.id || "").trim() }).lean();
    const negotiatedPrice = Number(req.body?.negotiatedPrice ?? req.body?.price);
    const message = String(req.body?.message || req.body?.text || "").trim();
    const buyerContact = String(req.body?.buyerContact || req.body?.contactNumber || "").trim();
    const pickupLocationId = String(req.body?.pickupLocationId || "").trim();
    const pickupLocationName = String(req.body?.pickupLocationName || "").trim();
    const pickupDate = String(req.body?.pickupDate || "").trim();
    const pickupTimeSlot = String(req.body?.pickupTimeSlot || "").trim();
    const pickupDateTime = req.body?.pickupDateTime ? new Date(req.body.pickupDateTime) : null;

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (String(post.userId || "") === userId) {
      return res.status(400).json({ success: false, message: "You cannot send a buying request to your own post" });
    }
    if (String(post.status || "").toUpperCase() === "SOLD") {
      return res.status(400).json({ success: false, message: "This item is already sold" });
    }
    const reservedByAccepted = await MarketplaceRequest.findOne({
      postId: post.id,
      status: "ACCEPTED",
      paymentStatus: { $ne: "paid" },
    }).lean();
    if (reservedByAccepted && String(reservedByAccepted.buyerId || "") !== userId) {
      return res.status(409).json({ success: false, message: "This item is reserved while payment is pending." });
    }
    const requestValidationError = validateBuyerRequestInput({
      negotiatedPrice,
      message,
      buyerContact,
      pickupLocationId,
      pickupLocationName,
      pickupDate,
      pickupTimeSlot,
      pickupDateTime,
    });
    if (requestValidationError) {
      return res.status(400).json({ success: false, message: requestValidationError });
    }
    const offerValidationError = validateOfferAgainstPostPrice(negotiatedPrice, post.price);
    if (offerValidationError) {
      return res.status(400).json({ success: false, message: offerValidationError });
    }

    const existing = await MarketplaceRequest.findOne({ postId: post.id, buyerId: userId }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You already have a request for this post. Update it to negotiate again.",
        data: toPublicRequest(existing, userId, post),
      });
    }

    const user = await findUserOr404(userId, res);
    if (!user) return;

    const request = await MarketplaceRequest.create({
      id: makeId("mpr_"),
      postId: post.id,
      sellerId: post.userId,
      sellerName: post.sellerName || post.userName,
      sellerEmail: post.userEmail,
      buyerId: userId,
      buyerName: user.name,
      buyerEmail: user.email,
      buyerContact,
      negotiatedPrice,
      message,
      pickupLocationId,
      pickupLocationName,
      pickupDate,
      pickupTimeSlot,
      pickupDateTime,
      status: "PENDING",
    });

    return res.status(201).json({ success: true, data: toPublicRequest(request.toObject(), userId, post) });
  } catch (err) {
    return next(err);
  }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    // Auto-revert any expired accepted requests first
    await revertExpiredRequests();

    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const requests = await MarketplaceRequest.find({ buyerId: userId }).sort({ updatedAt: -1 }).lean();
    const postIds = [...new Set(requests.map((request) => String(request.postId)).filter(Boolean))];
    const posts = await MarketplacePost.find({ id: { $in: postIds } }).lean();
    const acceptedRows = postIds.length
      ? await MarketplaceRequest.find({ postId: { $in: postIds }, status: "ACCEPTED" })
          .select("postId buyerId paymentStatus")
          .lean()
      : [];
    const acceptedMap = new Map(acceptedRows.map((row) => [String(row.postId), row]));
    const postMap = new Map(
      posts.map((post) => [
        String(post.id),
        { ...post, status: getViewerPostStatus(post, userId, acceptedMap.get(String(post.id)) || null) },
      ])
    );

    return res.json({
      success: true,
      data: requests.map((request) => toPublicRequest(request, userId, postMap.get(String(request.postId)) || null)),
    });
  } catch (err) {
    return next(err);
  }
};

exports.getMyCart = async (req, res, next) => {
  try {
    const buyerId = String(req.user?.id || req.user?.userId || "").trim();
    if (!buyerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await getOrCreateCart(buyerId);
    const postIds = [...new Set((cart.items || []).map((item) => String(item.postId || "")).filter(Boolean))];
    const posts = await MarketplacePost.find({ id: { $in: postIds } }).lean();
    const postMap = new Map(posts.map((post) => [String(post.id), post]));
    return res.json({ success: true, data: toPublicCart(cart.toObject(), postMap) });
  } catch (err) {
    return next(err);
  }
};

exports.addCartItem = async (req, res, next) => {
  try {
    const buyerId = String(req.user?.id || req.user?.userId || "").trim();
    const postId = String(req.body?.postId || "").trim();
    const negotiatedPrice = Number(req.body?.negotiatedPrice ?? req.body?.price);
    const message = String(req.body?.message || req.body?.text || "").trim();
    const buyerContact = String(req.body?.buyerContact || req.body?.contactNumber || "").trim();
    const pickupLocationId = String(req.body?.pickupLocationId || "").trim();
    const pickupLocationName = String(req.body?.pickupLocationName || "").trim();
    const pickupDate = String(req.body?.pickupDate || "").trim();
    const pickupTimeSlot = String(req.body?.pickupTimeSlot || "").trim();
    const pickupDateTime = req.body?.pickupDateTime ? new Date(req.body.pickupDateTime) : null;

    if (!buyerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!postId) {
      return res.status(400).json({ success: false, message: "postId is required" });
    }
    if (!buyerContact) {
      return res.status(400).json({ success: false, message: "buyerContact is required" });
    }

    const post = await MarketplacePost.findOne({ id: postId }).lean();
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (String(post.userId || "") === buyerId) {
      return res.status(400).json({ success: false, message: "You cannot add your own post to cart" });
    }
    if (String(post.status || "").toUpperCase() === "SOLD") {
      return res.status(400).json({ success: false, message: "This item is already sold" });
    }
    const reservedByAccepted = await MarketplaceRequest.findOne({
      postId: post.id,
      status: "ACCEPTED",
      paymentStatus: { $ne: "paid" },
    }).lean();
    if (reservedByAccepted && String(reservedByAccepted.buyerId || "") !== buyerId) {
      return res.status(409).json({ success: false, message: "This item is reserved while payment is pending." });
    }

    const existingRequest = await MarketplaceRequest.findOne({ postId, buyerId }).lean();
    if (existingRequest) {
      return res.status(409).json({ success: false, message: "You already have a request for this post" });
    }

    const requestValidationError = validateBuyerRequestInput({
      negotiatedPrice,
      message,
      buyerContact,
      pickupLocationId,
      pickupLocationName,
      pickupDate,
      pickupTimeSlot,
      pickupDateTime,
    });
    if (requestValidationError) {
      return res.status(400).json({ success: false, message: requestValidationError });
    }
    const offerValidationError = validateOfferAgainstPostPrice(negotiatedPrice, post.price);
    if (offerValidationError) {
      return res.status(400).json({ success: false, message: offerValidationError });
    }

    const cart = await getOrCreateCart(buyerId);
    const existingIndex = (cart.items || []).findIndex((item) => String(item.postId || "") === postId);
    const cartItem = {
      id: existingIndex >= 0 ? cart.items[existingIndex].id : makeId("mci_"),
      postId: post.id,
      sellerId: post.userId,
      sellerName: post.sellerName || post.userName,
      sellerEmail: post.userEmail,
      title: post.title,
      price: Number(post.price || 0),
      status: String(post.status || "ACTIVE").toUpperCase(),
      photos: Array.isArray(post.photos) ? post.photos : [],
      negotiatedPrice,
      message,
      buyerContact,
      pickupLocationId,
      pickupLocationName,
      pickupDate,
      pickupTimeSlot,
      pickupDateTime,
    };

    if (existingIndex >= 0) {
      cart.items[existingIndex] = cartItem;
    } else {
      cart.items.push(cartItem);
    }
    await cart.save();

    const postIds = [...new Set((cart.items || []).map((item) => String(item.postId || "")).filter(Boolean))];
    const posts = await MarketplacePost.find({ id: { $in: postIds } }).lean();
    const postMap = new Map(posts.map((entry) => [String(entry.id), entry]));
    return res.status(existingIndex >= 0 ? 200 : 201).json({
      success: true,
      data: toPublicCart(cart.toObject(), postMap),
      message: existingIndex >= 0 ? "Cart item updated" : "Added to cart",
    });
  } catch (err) {
    return next(err);
  }
};

exports.removeCartItem = async (req, res, next) => {
  try {
    const buyerId = String(req.user?.id || req.user?.userId || "").trim();
    const itemId = String(req.params?.itemId || "").trim();
    if (!buyerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!itemId) {
      return res.status(400).json({ success: false, message: "itemId is required" });
    }

    const cart = await getOrCreateCart(buyerId);
    const before = cart.items.length;
    cart.items = cart.items.filter((item) => String(item.id || "") !== itemId);
    if (cart.items.length === before) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }
    await cart.save();

    const postIds = [...new Set((cart.items || []).map((item) => String(item.postId || "")).filter(Boolean))];
    const posts = await MarketplacePost.find({ id: { $in: postIds } }).lean();
    const postMap = new Map(posts.map((entry) => [String(entry.id), entry]));
    return res.json({ success: true, data: toPublicCart(cart.toObject(), postMap), message: "Cart item removed" });
  } catch (err) {
    return next(err);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const buyerId = String(req.user?.id || req.user?.userId || "").trim();
    if (!buyerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const cart = await getOrCreateCart(buyerId);
    cart.items = [];
    await cart.save();
    return res.json({ success: true, data: toPublicCart(cart.toObject()), message: "Cart cleared" });
  } catch (err) {
    return next(err);
  }
};

exports.checkoutCart = async (req, res, next) => {
  try {
    const buyerId = String(req.user?.id || req.user?.userId || "").trim();
    if (!buyerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await getOrCreateCart(buyerId);
    const items = Array.isArray(cart.items) ? cart.items : [];
    if (!items.length) {
      return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    const buyer = await findUserOr404(buyerId, res);
    if (!buyer) return;

    const targetItemId = String(req.body?.itemId || "").trim();
    const created = [];
    const skipped = [];
    const keptItems = [];

    for (const item of items) {
      if (targetItemId && String(item.id || "") !== targetItemId) {
        keptItems.push(item);
        continue;
      }
      const post = await MarketplacePost.findOne({ id: String(item.postId || "").trim() }).lean();
      if (!post) {
        skipped.push({ itemId: item.id, postId: item.postId, title: item.title, reason: "Post not found" });
        continue;
      }
      if (String(post.userId || "") === buyerId) {
        skipped.push({ itemId: item.id, postId: item.postId, title: post.title, reason: "Cannot request your own post" });
        continue;
      }
      if (String(post.status || "").toUpperCase() === "SOLD") {
        skipped.push({ itemId: item.id, postId: item.postId, title: post.title, reason: "Item already sold" });
        keptItems.push(item);
        continue;
      }
      const existing = await MarketplaceRequest.findOne({ postId: post.id, buyerId }).lean();
      if (existing) {
        skipped.push({ itemId: item.id, postId: item.postId, title: post.title, reason: "Request already exists for this item" });
        continue;
      }

      const validationError = validateBuyerRequestInput({
        negotiatedPrice: Number(item.negotiatedPrice),
        message: String(item.message || "").trim(),
        buyerContact: String(item.buyerContact || "").trim(),
        pickupLocationId: String(item.pickupLocationId || "").trim(),
        pickupLocationName: String(item.pickupLocationName || "").trim(),
        pickupDate: String(item.pickupDate || "").trim(),
        pickupTimeSlot: String(item.pickupTimeSlot || "").trim(),
        pickupDateTime: item.pickupDateTime ? new Date(item.pickupDateTime) : null,
      });
      if (validationError) {
        skipped.push({ itemId: item.id, postId: item.postId, title: post.title, reason: validationError });
        keptItems.push(item);
        continue;
      }
      const offerValidationError = validateOfferAgainstPostPrice(Number(item.negotiatedPrice), post.price);
      if (offerValidationError) {
        skipped.push({ itemId: item.id, postId: item.postId, title: post.title, reason: offerValidationError });
        keptItems.push(item);
        continue;
      }

      const request = await MarketplaceRequest.create({
        id: makeId("mpr_"),
        postId: post.id,
        sellerId: post.userId,
        sellerName: post.sellerName || post.userName,
        sellerEmail: post.userEmail,
        buyerId,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerContact: String(item.buyerContact || "").trim(),
        negotiatedPrice: Number(item.negotiatedPrice),
        message: String(item.message || "").trim(),
        pickupLocationId: String(item.pickupLocationId || "").trim(),
        pickupLocationName: String(item.pickupLocationName || "").trim(),
        pickupDate: String(item.pickupDate || "").trim(),
        pickupTimeSlot: String(item.pickupTimeSlot || "").trim(),
        pickupDateTime: item.pickupDateTime ? new Date(item.pickupDateTime) : null,
        status: "PENDING",
      });
      created.push(toPublicRequest(request.toObject(), buyerId, post));
    }

    cart.items = keptItems;
    await cart.save();

    const postIds = [...new Set((cart.items || []).map((item) => String(item.postId || "")).filter(Boolean))];
    const posts = await MarketplacePost.find({ id: { $in: postIds } }).lean();
    const postMap = new Map(posts.map((entry) => [String(entry.id), entry]));

    return res.json({
      success: true,
      data: {
        created,
        skipped,
        cart: toPublicCart(cart.toObject(), postMap),
      },
      message: created.length ? `Created ${created.length} request(s) from cart` : "No requests were created from cart",
    });
  } catch (err) {
    return next(err);
  }
};

exports.updateMyRequest = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const request = await MarketplaceRequest.findOne({ id: String(req.params?.requestId || "").trim() });

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (String(request.buyerId || "") !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    if (isRequestFinalized(request.status)) {
      return res.status(400).json({ success: false, message: "This request is already finalized" });
    }
    if (!isWithinRequestUpdateWindow(request.reofferedAt || request.createdAt)) {
      return res.status(400).json({
        success: false,
        message: `Requests can only be updated within ${MARKETPLACE_LIMITS.requestUpdateWindowHours} hours of sending.`,
      });
    }
    const post = await MarketplacePost.findOne({ id: String(request.postId || "").trim() }).lean();
    if (!post) {
      return res.status(404).json({ success: false, message: "Related post not found" });
    }
    if (String(post.status || "").toUpperCase() === "SOLD") {
      return res.status(400).json({ success: false, message: "This item is already sold. Request cannot be updated." });
    }

    const hasPrice = Object.prototype.hasOwnProperty.call(req.body || {}, "negotiatedPrice")
      || Object.prototype.hasOwnProperty.call(req.body || {}, "price");
    const hasMessage = Object.prototype.hasOwnProperty.call(req.body || {}, "message")
      || Object.prototype.hasOwnProperty.call(req.body || {}, "text");
    const hasContact = Object.prototype.hasOwnProperty.call(req.body || {}, "buyerContact")
      || Object.prototype.hasOwnProperty.call(req.body || {}, "contactNumber");
    const hasPickupLocationId = Object.prototype.hasOwnProperty.call(req.body || {}, "pickupLocationId");
    const hasPickupLocationName = Object.prototype.hasOwnProperty.call(req.body || {}, "pickupLocationName");
    const hasPickupDate = Object.prototype.hasOwnProperty.call(req.body || {}, "pickupDate");
    const hasPickupTimeSlot = Object.prototype.hasOwnProperty.call(req.body || {}, "pickupTimeSlot");
    const hasPickupDateTime = Object.prototype.hasOwnProperty.call(req.body || {}, "pickupDateTime");
    const hasPickup =
      hasPickupLocationId || hasPickupLocationName || hasPickupDate || hasPickupTimeSlot || hasPickupDateTime;

    if (!hasPrice && !hasMessage && !hasContact && !hasPickup) {
      return res.status(400).json({
        success: false,
        message: "Provide negotiatedPrice, message, buyerContact, or pickup details",
      });
    }

    if (hasPrice) {
      const negotiatedPrice = Number(req.body?.negotiatedPrice ?? req.body?.price);
      const requestValidationError = validateBuyerRequestInput({
        negotiatedPrice,
        message: hasMessage ? String(req.body?.message || req.body?.text || "").trim() : request.message,
        buyerContact: hasContact ? String(req.body?.buyerContact || req.body?.contactNumber || "").trim() : request.buyerContact,
        pickupLocationId: hasPickupLocationId ? String(req.body?.pickupLocationId || "").trim() : request.pickupLocationId,
        pickupLocationName: hasPickupLocationName ? String(req.body?.pickupLocationName || "").trim() : request.pickupLocationName,
        pickupDate: hasPickupDate ? String(req.body?.pickupDate || "").trim() : request.pickupDate,
        pickupTimeSlot: hasPickupTimeSlot ? String(req.body?.pickupTimeSlot || "").trim() : request.pickupTimeSlot,
        pickupDateTime: hasPickupDateTime ? req.body?.pickupDateTime : request.pickupDateTime,
        requireMessage: false,
        requirePickup: false,
      });
      if (requestValidationError) {
        return res.status(400).json({ success: false, message: requestValidationError });
      }
      const offerValidationError = validateOfferAgainstPostPrice(negotiatedPrice, post.price);
      if (offerValidationError) {
        return res.status(400).json({ success: false, message: offerValidationError });
      }
      request.negotiatedPrice = negotiatedPrice;
    }

    if (hasMessage) {
      const message = String(req.body?.message || req.body?.text || "").trim();
      const requestValidationError = validateBuyerRequestInput({
        negotiatedPrice: hasPrice ? Number(req.body?.negotiatedPrice ?? req.body?.price) : request.negotiatedPrice,
        message,
        buyerContact: hasContact ? String(req.body?.buyerContact || req.body?.contactNumber || "").trim() : request.buyerContact,
        pickupLocationId: hasPickupLocationId ? String(req.body?.pickupLocationId || "").trim() : request.pickupLocationId,
        pickupLocationName: hasPickupLocationName ? String(req.body?.pickupLocationName || "").trim() : request.pickupLocationName,
        pickupDate: hasPickupDate ? String(req.body?.pickupDate || "").trim() : request.pickupDate,
        pickupTimeSlot: hasPickupTimeSlot ? String(req.body?.pickupTimeSlot || "").trim() : request.pickupTimeSlot,
        pickupDateTime: hasPickupDateTime ? req.body?.pickupDateTime : request.pickupDateTime,
        requirePickup: false,
      });
      if (requestValidationError) {
        return res.status(400).json({ success: false, message: requestValidationError });
      }
      request.message = message;
    }

    if (hasContact) {
      const buyerContact = String(req.body?.buyerContact || req.body?.contactNumber || "").trim();
      const requestValidationError = validateBuyerRequestInput({
        negotiatedPrice: hasPrice ? Number(req.body?.negotiatedPrice ?? req.body?.price) : request.negotiatedPrice,
        message: hasMessage ? String(req.body?.message || req.body?.text || "").trim() : request.message,
        buyerContact,
        pickupLocationId: hasPickupLocationId ? String(req.body?.pickupLocationId || "").trim() : request.pickupLocationId,
        pickupLocationName: hasPickupLocationName ? String(req.body?.pickupLocationName || "").trim() : request.pickupLocationName,
        pickupDate: hasPickupDate ? String(req.body?.pickupDate || "").trim() : request.pickupDate,
        pickupTimeSlot: hasPickupTimeSlot ? String(req.body?.pickupTimeSlot || "").trim() : request.pickupTimeSlot,
        pickupDateTime: hasPickupDateTime ? req.body?.pickupDateTime : request.pickupDateTime,
        requirePickup: false,
      });
      if (requestValidationError) {
        return res.status(400).json({ success: false, message: requestValidationError });
      }
      request.buyerContact = buyerContact;
    }

    if (hasPickupLocationId) {
      request.pickupLocationId = String(req.body?.pickupLocationId || "").trim();
    }
    if (hasPickupLocationName) {
      request.pickupLocationName = String(req.body?.pickupLocationName || "").trim();
    }
    if (hasPickupDate) {
      request.pickupDate = String(req.body?.pickupDate || "").trim();
    }
    if (hasPickupTimeSlot) {
      request.pickupTimeSlot = String(req.body?.pickupTimeSlot || "").trim();
    }
    if (hasPickupDateTime) {
      request.pickupDateTime = req.body?.pickupDateTime ? new Date(req.body.pickupDateTime) : null;
    }

    await request.save();

    return res.json({ success: true, data: toPublicRequest(request.toObject(), userId, post), message: "Request updated" });
  } catch (err) {
    return next(err);
  }
};

exports.reofferRequest = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const request = await MarketplaceRequest.findOne({ id: String(req.params?.requestId || "").trim() });

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (String(request.buyerId || "") !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    if (String(request.status || "").toUpperCase() !== "DECLINED") {
      return res.status(400).json({ success: false, message: "Only declined requests can be reoffered" });
    }

    const post = await MarketplacePost.findOne({ id: String(request.postId || "").trim() }).lean();
    if (!post) {
      return res.status(404).json({ success: false, message: "Related post not found" });
    }
    if (String(post.status || "").toUpperCase() === "SOLD") {
      return res.status(400).json({ success: false, message: "This item is already sold" });
    }

    const negotiatedPrice = Number(req.body?.negotiatedPrice ?? req.body?.price);
    const message = String(req.body?.message || req.body?.text || "").trim();
    const buyerContact = String(req.body?.buyerContact || req.body?.contactNumber || "").trim();
    const pickupLocationId = String(req.body?.pickupLocationId || "").trim();
    const pickupLocationName = String(req.body?.pickupLocationName || "").trim();
    const pickupDate = String(req.body?.pickupDate || "").trim();
    const pickupTimeSlot = String(req.body?.pickupTimeSlot || "").trim();
    const pickupDateTime = req.body?.pickupDateTime ? new Date(req.body.pickupDateTime) : null;

    const requestValidationError = validateBuyerRequestInput({
      negotiatedPrice,
      message,
      buyerContact,
      pickupLocationId,
      pickupLocationName,
      pickupDate,
      pickupTimeSlot,
      pickupDateTime,
    });
    if (requestValidationError) {
      return res.status(400).json({ success: false, message: requestValidationError });
    }
    const offerValidationError = validateOfferAgainstPostPrice(negotiatedPrice, post.price);
    if (offerValidationError) {
      return res.status(400).json({ success: false, message: offerValidationError });
    }

    request.negotiatedPrice = negotiatedPrice;
    request.message = message;
    request.buyerContact = buyerContact;
    request.pickupLocationId = pickupLocationId;
    request.pickupLocationName = pickupLocationName;
    request.pickupDate = pickupDate;
    request.pickupTimeSlot = pickupTimeSlot;
    request.pickupDateTime = pickupDateTime;
    request.status = "PENDING";
    request.decidedAt = null;
    request.reofferedAt = new Date();
    request.paymentMethod = null;
    request.paymentStatus = "unpaid";
    request.paymentId = null;
    request.paidAt = null;
    request.pickupReminderPushSentAt = null;

    await request.save();

    return res.json({
      success: true,
      data: toPublicRequest(request.toObject(), userId, post),
      message: "Reoffer sent",
    });
  } catch (err) {
    return next(err);
  }
};

exports.deleteMyRequest = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const request = await MarketplaceRequest.findOne({ id: String(req.params?.requestId || "").trim() });

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (String(request.buyerId || "") !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    if (isRequestFinalized(request.status)) {
      return res.status(400).json({ success: false, message: "Finalized requests cannot be deleted" });
    }

    await request.deleteOne();
    return res.json({ success: true, message: "Request deleted" });
  } catch (err) {
    return next(err);
  }
};

exports.decideRequest = async (req, res, next) => {
  try {
    // Auto-revert any expired accepted requests first
    await revertExpiredRequests();

    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const request = await MarketplaceRequest.findOne({ id: String(req.params?.requestId || "").trim() });

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (String(request.sellerId || "") !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const status = normalizeRequestStatus(req.body?.status);
    if (!status || status === "PENDING") {
      return res.status(400).json({ success: false, message: "status must be ACCEPTED or DECLINED" });
    }
    if (String(request.status || "PENDING") !== "PENDING") {
      return res.status(400).json({ success: false, message: "This request has already been decided" });
    }

    const decidedAt = new Date();
    request.status = status;
    request.decidedAt = decidedAt;
    await request.save();

    const post = await MarketplacePost.findOne({ id: request.postId });
    if (!post) {
      return res.status(404).json({ success: false, message: "Related post not found" });
    }

    if (status === "ACCEPTED") {
      await MarketplaceRequest.updateMany(
        {
          postId: request.postId,
          id: { $ne: request.id },
          status: "PENDING",
        },
        {
          $set: {
            status: "DECLINED",
            decidedAt,
          },
        }
      );
    }

    return res.json({
      success: true,
      data: toPublicRequest(request.toObject(), userId, post.toObject()),
      message: status === "ACCEPTED" ? "Request accepted and other offers declined" : "Request declined",
    });
  } catch (err) {
    return next(err);
  }
};

exports.createMessage = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const text = String(req.body?.text || req.body?.message || "").trim();
    const senderContact = String(req.body?.senderContact || req.body?.contactNumber || "").trim();
    const post = await MarketplacePost.findOne({ id: String(req.params?.id || "").trim() });

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (String(post.userId) === userId) {
      return res.status(400).json({ success: false, message: "You cannot message your own post" });
    }
    if (!text) {
      return res.status(400).json({ success: false, message: "message text is required" });
    }

    const user = await findUserOr404(userId, res);
    if (!user) return;

    post.messages.push({
      id: makeId("msg_"),
      senderId: userId,
      senderName: user.name,
      senderEmail: user.email,
      senderContact,
      text,
    });

    await post.save();
    return res.status(201).json({ success: true, data: toPublicPost(post.toObject(), userId), message: "Message sent" });
  } catch (err) {
    return next(err);
  }
};
