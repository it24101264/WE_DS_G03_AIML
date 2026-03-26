const MarketplacePost = require("../models/MarketplacePost");
const MarketplaceRequest = require("../models/MarketplaceRequest");
const User = require("../models/user");
const { makeId } = require("../utils/id");

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
  phoneMinDigits: 9,
  phoneMaxDigits: 15,
  maxPrice: 100000000,
};

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
  return /^[0-9+()\-\s]+$/.test(text)
    && digits.length >= MARKETPLACE_LIMITS.phoneMinDigits
    && digits.length <= MARKETPLACE_LIMITS.phoneMaxDigits;
}

function isValidMarketplacePrice(value) {
  return Number.isFinite(value) && value > 0 && value <= MARKETPLACE_LIMITS.maxPrice;
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

function validateBuyerRequestInput({ negotiatedPrice, message, buyerContact, requireMessage = true }) {
  if (!isValidMarketplacePrice(negotiatedPrice)) {
    return `negotiatedPrice must be a positive number not greater than ${MARKETPLACE_LIMITS.maxPrice}`;
  }
  if (requireMessage && !message) {
    return "message is required";
  }
  if (message && (message.length < MARKETPLACE_LIMITS.requestMessageMin || message.length > MARKETPLACE_LIMITS.requestMessageMax)) {
    return `message must be ${MARKETPLACE_LIMITS.requestMessageMin}-${MARKETPLACE_LIMITS.requestMessageMax} characters`;
  }
  if (buyerContact && !hasValidPhoneNumber(buyerContact)) {
    return "buyerContact must be a valid phone number";
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
    buyerContact: isSeller && isAccepted ? request.buyerContact || "" : "",
    negotiatedPrice: request.negotiatedPrice,
    message: request.message,
    status: request.status || "PENDING",
    decidedAt: request.decidedAt || null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
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
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
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
      price,
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
    const counts = await MarketplaceRequest.aggregate([
      { $match: { postId: { $in: posts.map((post) => post.id) } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((row) => [String(row._id), Number(row.count || 0)]));
    const data = posts.map((post) => ({ ...post, requestCount: countMap.get(String(post.id)) || 0 }));
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

exports.getPostById = async (req, res, next) => {
  try {
    const viewerId = String(req.user?.id || req.user?.userId || "").trim();
    const post = await MarketplacePost.findOne({ id: String(req.params?.id || "").trim() }).lean();

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const enrichedPost = { ...post };
    if (String(post.userId || "") === viewerId) {
      enrichedPost.requests = await MarketplaceRequest.find({ postId: post.id }).sort({ updatedAt: -1 }).lean();
      enrichedPost.requestCount = enrichedPost.requests.length;
    } else if (viewerId) {
      enrichedPost.viewerRequest = await MarketplaceRequest.findOne({ postId: post.id, buyerId: viewerId }).lean();
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

    post.title = title;
    post.titleKey = title.toLowerCase();
    post.description = description;
    post.sellerName = sellerName;
    post.contactNumber = contactNumber;
    post.price = price;
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
    const requestValidationError = validateBuyerRequestInput({
      negotiatedPrice,
      message,
      buyerContact,
    });
    if (requestValidationError) {
      return res.status(400).json({ success: false, message: requestValidationError });
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
      status: "PENDING",
    });

    return res.status(201).json({ success: true, data: toPublicRequest(request.toObject(), userId, post) });
  } catch (err) {
    return next(err);
  }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const requests = await MarketplaceRequest.find({ buyerId: userId }).sort({ updatedAt: -1 }).lean();
    const postIds = [...new Set(requests.map((request) => String(request.postId)).filter(Boolean))];
    const posts = await MarketplacePost.find({ id: { $in: postIds } }).lean();
    const postMap = new Map(posts.map((post) => [String(post.id), post]));

    return res.json({
      success: true,
      data: requests.map((request) => toPublicRequest(request, userId, postMap.get(String(request.postId)) || null)),
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
    if (String(request.status || "PENDING") !== "PENDING") {
      return res.status(400).json({ success: false, message: "This request is already finalized" });
    }

    const hasPrice = Object.prototype.hasOwnProperty.call(req.body || {}, "negotiatedPrice")
      || Object.prototype.hasOwnProperty.call(req.body || {}, "price");
    const hasMessage = Object.prototype.hasOwnProperty.call(req.body || {}, "message")
      || Object.prototype.hasOwnProperty.call(req.body || {}, "text");
    const hasContact = Object.prototype.hasOwnProperty.call(req.body || {}, "buyerContact")
      || Object.prototype.hasOwnProperty.call(req.body || {}, "contactNumber");

    if (!hasPrice && !hasMessage && !hasContact) {
      return res.status(400).json({ success: false, message: "Provide negotiatedPrice, message, or buyerContact" });
    }

    if (hasPrice) {
      const negotiatedPrice = Number(req.body?.negotiatedPrice ?? req.body?.price);
      const requestValidationError = validateBuyerRequestInput({
        negotiatedPrice,
        message: hasMessage ? String(req.body?.message || req.body?.text || "").trim() : request.message,
        buyerContact: hasContact ? String(req.body?.buyerContact || req.body?.contactNumber || "").trim() : request.buyerContact,
        requireMessage: false,
      });
      if (requestValidationError) {
        return res.status(400).json({ success: false, message: requestValidationError });
      }
      request.negotiatedPrice = negotiatedPrice;
    }

    if (hasMessage) {
      const message = String(req.body?.message || req.body?.text || "").trim();
      const requestValidationError = validateBuyerRequestInput({
        negotiatedPrice: hasPrice ? Number(req.body?.negotiatedPrice ?? req.body?.price) : request.negotiatedPrice,
        message,
        buyerContact: hasContact ? String(req.body?.buyerContact || req.body?.contactNumber || "").trim() : request.buyerContact,
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
      });
      if (requestValidationError) {
        return res.status(400).json({ success: false, message: requestValidationError });
      }
      request.buyerContact = buyerContact;
    }

    await request.save();
    const post = await MarketplacePost.findOne({ id: request.postId }).lean();

    return res.json({ success: true, data: toPublicRequest(request.toObject(), userId, post), message: "Request updated" });
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
    if (String(request.status || "PENDING") !== "PENDING") {
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
      post.status = "SOLD";
      await Promise.all([
        post.save(),
        MarketplaceRequest.updateMany(
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
        ),
      ]);
    }

    return res.json({
      success: true,
      data: toPublicRequest(request.toObject(), userId, post.toObject()),
      message: status === "ACCEPTED" ? "Request accepted, listing marked as sold, and other offers declined" : "Request declined",
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
