const MarketplacePost = require("../models/MarketplacePost");
const MarketplaceRequest = require("../models/MarketplaceRequest");
const MarketplaceCart = require("../models/MarketplaceCart");
const MarketplaceFavorite = require("../models/MarketplaceFavorite");
const User = require("../models/user");
const { makeId } = require("../utils/id");

const { STATUS_VALUES, CATEGORY_VALUES } = require("../models/MarketplacePost");
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
  maxCostPrice: 100000000,
  minQuantity: 0,
  maxQuantity: 999,
  minOfferRatio: 0.3,
  requestUpdateWindowHours: 3,
};

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return STATUS_VALUES.includes(normalized) ? normalized : null;
}

function normalizeCategory(value) {
  const normalized = String(value || "").trim();
  return CATEGORY_VALUES.includes(normalized) ? normalized : null;
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

function isValidMarketplaceCostPrice(value) {
  return value == null || (Number.isFinite(value) && value >= 0 && value <= MARKETPLACE_LIMITS.maxCostPrice);
}

function isValidQuantity(value) {
  return Number.isFinite(value)
    && Number.isInteger(value)
    && value >= MARKETPLACE_LIMITS.minQuantity
    && value <= MARKETPLACE_LIMITS.maxQuantity;
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

function validateSellerPostInput({ title, description, sellerName, contactNumber, price, photos, category, availableQuantity, costPrice }) {
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
  if (category && !normalizeCategory(category)) {
    return `category must be one of: ${CATEGORY_VALUES.join(", ")}`;
  }
  if (!isValidMarketplaceCostPrice(costPrice)) {
    return `costPrice must be a valid non-negative number not greater than ${MARKETPLACE_LIMITS.maxCostPrice}`;
  }
  if (availableQuantity != null && !isValidQuantity(availableQuantity)) {
    return `availableQuantity must be an integer between ${MARKETPLACE_LIMITS.minQuantity}-${MARKETPLACE_LIMITS.maxQuantity}`;
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
          category: post.category || "Other",
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
    category: post.category || "Other",
    description: post.description || "",
    price: post.price,
    costPrice: isOwner ? post.costPrice : null,
    availableQuantity: isOwner ? Number(post.availableQuantity ?? 0) : undefined,
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
    const category = String(req.body?.category || "").trim();
    const price = Number(req.body?.price);
    const costPrice = Object.prototype.hasOwnProperty.call(req.body || {}, "costPrice") ? Number(req.body?.costPrice) : null;
    const availableQuantity = Object.prototype.hasOwnProperty.call(req.body || {}, "availableQuantity")
      ? Number.parseInt(req.body?.availableQuantity, 10)
      : 1;
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
      category,
      costPrice,
      availableQuantity,
    });
    if (sellerValidationError) {
      return res.status(400).json({ success: false, message: sellerValidationError });
    }

    const user = await findUserOr404(userId, res);
    if (!user) return;

    const post = await MarketplacePost.create({
      id: makeId("mp_"),
      userId,
      userName: user.name,
      userEmail: user.email,
      sellerName,
      contactNumber,
      title,
      titleKey: title.toLowerCase(),
      category: normalizeCategory(category) || "Other",
      description,
      price,
      costPrice: costPrice != null && Number.isFinite(costPrice) ? costPrice : null,
      availableQuantity: Number.isFinite(availableQuantity) ? Math.max(0, availableQuantity) : 1,
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
    const category = String(req.body?.category || "").trim();
    const price = Number(req.body?.price);
    const costPrice = Object.prototype.hasOwnProperty.call(req.body || {}, "costPrice") ? Number(req.body?.costPrice) : null;
    const availableQuantity = Object.prototype.hasOwnProperty.call(req.body || {}, "availableQuantity")
      ? Number.parseInt(req.body?.availableQuantity, 10)
      : post.availableQuantity;
    const photos = normalizePhotos(req.body?.photos);

    const sellerValidationError = validateSellerPostInput({
      title,
      description,
      sellerName,
      contactNumber,
      price,
      photos,
      category,
      costPrice,
      availableQuantity,
    });
    if (sellerValidationError) {
      return res.status(400).json({ success: false, message: sellerValidationError });
    }

    post.title = title;
    post.titleKey = title.toLowerCase();
    post.category = normalizeCategory(category) || "Other";
    post.description = description;
    post.sellerName = sellerName;
    post.contactNumber = contactNumber;
    post.price = price;
    post.costPrice = costPrice != null && Number.isFinite(costPrice) ? costPrice : null;
    post.availableQuantity = Number.isFinite(availableQuantity) ? Math.max(0, availableQuantity) : post.availableQuantity;
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

exports.getRequestsToMe = async (req, res, next) => {
  try {
    // Auto-revert any expired accepted requests first
    await revertExpiredRequests();

    const sellerId = String(req.user?.id || req.user?.userId || "").trim();
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const status = req.query?.status ? normalizeRequestStatus(req.query.status) : null;
    const query = { sellerId };
    if (status) query.status = status;

    const requests = await MarketplaceRequest.find(query).sort({ updatedAt: -1 }).lean();
    const postIds = [...new Set(requests.map((request) => String(request.postId)).filter(Boolean))];
    const posts = await MarketplacePost.find({ id: { $in: postIds } }).lean();
    const postMap = new Map(posts.map((post) => [String(post.id), post]));

    return res.json({
      success: true,
      data: requests.map((request) => toPublicRequest(request, sellerId, postMap.get(String(request.postId)) || null)),
    });
  } catch (err) {
    return next(err);
  }
};

function parseDateParam(value) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toCsvRow(cells) {
  return cells
    .map((cell) => {
      const text = cell == null ? "" : String(cell);
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    })
    .join(",");
}

async function buildSellerAnalytics(sellerId, { startDate, endDate } = {}) {
  const dateQuery = {};
  if (startDate || endDate) {
    dateQuery.createdAt = {};
    if (startDate) dateQuery.createdAt.$gte = startDate;
    if (endDate) dateQuery.createdAt.$lte = endDate;
  }

  const [allRequests, acceptedRequests, paidRequests] = await Promise.all([
    MarketplaceRequest.countDocuments({ sellerId, ...dateQuery }),
    MarketplaceRequest.countDocuments({ sellerId, status: "ACCEPTED", ...dateQuery }),
    MarketplaceRequest.find({ sellerId, status: "ACCEPTED", paymentStatus: "paid", ...dateQuery })
      .select("postId negotiatedPrice paidAt createdAt updatedAt")
      .lean(),
  ]);

  const revenue = paidRequests.reduce((sum, r) => sum + Number(r?.negotiatedPrice || 0), 0);
  const orders = paidRequests.length;
  const conversion = allRequests > 0 ? acceptedRequests / allRequests : 0;

  // Best-selling products by paid orders
  const countsByPost = new Map();
  for (const req of paidRequests) {
    const postId = String(req?.postId || "");
    if (!postId) continue;
    countsByPost.set(postId, (countsByPost.get(postId) || 0) + 1);
  }

  const topPostIds = [...countsByPost.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([postId]) => postId);

  const topPosts = topPostIds.length
    ? await MarketplacePost.find({ id: { $in: topPostIds } }).select("id title category price costPrice availableQuantity status").lean()
    : [];
  const postMap = new Map(topPosts.map((p) => [String(p.id), p]));

  const bestSelling = topPostIds
    .map((postId) => {
      const post = postMap.get(String(postId));
      if (!post) return null;
      return {
        postId,
        title: post.title,
        category: post.category || "Other",
        paidOrders: countsByPost.get(String(postId)) || 0,
        listingPrice: post.price,
      };
    })
    .filter(Boolean);

  // Profit estimate (if costPrice is set on listing). If missing, we exclude from estimate.
  const costByPostId = new Map(topPosts.map((p) => [String(p.id), p.costPrice]));
  let profitSum = 0;
  let profitCounted = 0;
  for (const req of paidRequests) {
    const cost = costByPostId.get(String(req.postId));
    if (cost == null || !Number.isFinite(Number(cost))) continue;
    profitSum += Number(req.negotiatedPrice || 0) - Number(cost || 0);
    profitCounted += 1;
  }
  const profitEstimate = profitCounted ? Number(profitSum.toFixed(2)) : null;

  // Alerts
  const lowStockThreshold = 2;
  const lowStockPosts = await MarketplacePost.find({
    userId: sellerId,
    status: "ACTIVE",
    availableQuantity: { $lte: lowStockThreshold },
  })
    .select("id title availableQuantity category status")
    .sort({ availableQuantity: 1, updatedAt: -1 })
    .limit(10)
    .lean();

  const alerts = [];
  if (lowStockPosts.length) {
    alerts.push({
      type: "stock_running_out",
      message: `Low stock on ${lowStockPosts.length} listing(s) (≤ ${lowStockThreshold})`,
      items: lowStockPosts.map((p) => ({
        postId: p.id,
        title: p.title,
        category: p.category || "Other",
        availableQuantity: p.availableQuantity ?? 0,
      })),
    });
  }

  // Placeholders for features not yet modeled in DB
  alerts.push({
    type: "listing_rejected",
    message: "Listing rejection alerts require moderation flow (not implemented).",
    items: [],
  });
  alerts.push({
    type: "high_return_rate",
    message: "Return-rate alerts require returns/refunds data (not implemented).",
    items: [],
  });

  return {
    revenue: Number(revenue.toFixed(2)),
    orders,
    acceptedRequests,
    totalRequests: allRequests,
    conversion,
    bestSelling,
    profitEstimate,
    profitEstimateCoverageOrders: profitCounted,
    alerts,
  };
}

exports.getSellerAnalytics = async (req, res, next) => {
  try {
    const sellerId = String(req.user?.id || req.user?.userId || "").trim();
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const startDate = parseDateParam(req.query?.start);
    const endDate = parseDateParam(req.query?.end);
    const data = await buildSellerAnalytics(sellerId, { startDate, endDate });
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

exports.getSellerReportCsv = async (req, res, next) => {
  try {
    const sellerId = String(req.user?.id || req.user?.userId || "").trim();
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const startDate = parseDateParam(req.query?.start);
    const endDate = parseDateParam(req.query?.end);
    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = startDate;
      if (endDate) dateQuery.createdAt.$lte = endDate;
    }

    const rows = await MarketplaceRequest.find({ sellerId, ...dateQuery })
      .select("id postId buyerId buyerName negotiatedPrice status paymentMethod paymentStatus createdAt updatedAt paidAt")
      .sort({ createdAt: -1 })
      .lean();

    const postIds = [...new Set(rows.map((r) => String(r.postId || "")).filter(Boolean))];
    const posts = await MarketplacePost.find({ id: { $in: postIds } }).select("id title category price").lean();
    const postMap = new Map(posts.map((p) => [String(p.id), p]));

    const header = toCsvRow([
      "requestId",
      "postId",
      "postTitle",
      "category",
      "listingPrice",
      "negotiatedPrice",
      "status",
      "paymentMethod",
      "paymentStatus",
      "buyerName",
      "createdAt",
      "paidAt",
    ]);

    const lines = [header];
    for (const r of rows) {
      const post = postMap.get(String(r.postId)) || {};
      lines.push(
        toCsvRow([
          r.id,
          r.postId,
          post.title || "",
          post.category || "Other",
          post.price ?? "",
          r.negotiatedPrice ?? "",
          r.status,
          r.paymentMethod || "",
          r.paymentStatus || "",
          r.buyerName || "",
          r.createdAt ? new Date(r.createdAt).toISOString() : "",
          r.paidAt ? new Date(r.paidAt).toISOString() : "",
        ])
      );
    }

    const csv = `${lines.join("\n")}\n`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"seller_report_${Date.now()}.csv\"`);
    return res.status(200).send(csv);
  } catch (err) {
    return next(err);
  }
};

exports.getSellerReportPdf = async (req, res, next) => {
  try {
    const sellerId = String(req.user?.id || req.user?.userId || "").trim();
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const startDate = parseDateParam(req.query?.start);
    const endDate = parseDateParam(req.query?.end);
    const analytics = await buildSellerAnalytics(sellerId, { startDate, endDate });

    // Lazy require so server still boots if PDF is unused
    // eslint-disable-next-line global-require
    const PDFDocument = require("pdfkit");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"seller_report_${Date.now()}.pdf\"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text("Seller Analytics Report", { bold: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#555").text(`Generated: ${new Date().toLocaleString()}`);
    doc.fillColor("#000");
    if (startDate || endDate) {
      doc.text(`Date range: ${startDate ? startDate.toLocaleDateString() : "-"} to ${endDate ? endDate.toLocaleDateString() : "-"}`);
    }
    doc.moveDown();

    doc.fontSize(12).text(`Revenue: LKR ${analytics.revenue.toLocaleString()}`);
    doc.text(`Orders (paid): ${analytics.orders}`);
    doc.text(`Conversion: ${(analytics.conversion * 100).toFixed(1)}%`);
    doc.text(`Accepted requests: ${analytics.acceptedRequests}`);
    doc.text(`Total requests: ${analytics.totalRequests}`);
    doc.text(`Profit estimate: ${analytics.profitEstimate == null ? "N/A" : `LKR ${analytics.profitEstimate.toLocaleString()}`}`);
    doc.moveDown();

    doc.fontSize(14).text("Best-selling products", { underline: true });
    doc.moveDown(0.4);
    if (!analytics.bestSelling.length) {
      doc.fontSize(11).text("No paid orders in this period.");
    } else {
      analytics.bestSelling.forEach((p, idx) => {
        doc.fontSize(11).text(`${idx + 1}. ${p.title} (${p.category}) — paid orders: ${p.paidOrders}`);
      });
    }
    doc.moveDown();

    doc.fontSize(14).text("Alerts", { underline: true });
    doc.moveDown(0.4);
    analytics.alerts.forEach((a) => {
      doc.fontSize(11).text(`- ${a.type}: ${a.message}`);
    });

    doc.end();
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
