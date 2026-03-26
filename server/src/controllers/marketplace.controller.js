const MarketplacePost = require("../models/MarketplacePost");
const User = require("../models/user");
const { makeId } = require("../utils/id");

const { STATUS_VALUES } = require("../models/MarketplacePost");

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return STATUS_VALUES.includes(normalized) ? normalized : null;
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

      return {
        uri: String(photo.uri || "").trim(),
        fileName: String(photo.fileName || "").trim(),
        mimeType: String(photo.mimeType || "").trim(),
        base64DataUrl: String(photo.base64DataUrl || "").trim(),
      };
    })
    .filter((photo) => photo.uri || photo.base64DataUrl);
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

function toPublicPost(post, viewerId = "") {
  const messages = Array.isArray(post.messages) ? post.messages : [];
  const isOwner = String(post.userId || "") === String(viewerId || "");

  return {
    id: post.id,
    userId: post.userId,
    userName: post.userName,
    userEmail: post.userEmail,
    sellerName: post.sellerName,
    contactNumber: post.contactNumber,
    title: post.title,
    description: post.description || "",
    price: post.price,
    status: post.status,
    photos: Array.isArray(post.photos) ? post.photos : [],
    messageCount: messages.length,
    messages: isOwner ? messages.map(toPublicMessage) : [],
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
    if (!title) {
      return res.status(400).json({ success: false, message: "title is required" });
    }
    if (!description) {
      return res.status(400).json({ success: false, message: "description is required" });
    }
    if (!sellerName) {
      return res.status(400).json({ success: false, message: "sellerName is required" });
    }
    if (!contactNumber) {
      return res.status(400).json({ success: false, message: "contactNumber is required" });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: "price must be a positive number" });
    }
    if (!photos.length) {
      return res.status(400).json({ success: false, message: "At least one photo is required" });
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
    const query = {};

    if (status) query.status = status;
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { sellerName: { $regex: q, $options: "i" } },
      ];
    }

    const posts = await MarketplacePost.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: posts.map((post) => toPublicPost(post, viewerId)) });
  } catch (err) {
    return next(err);
  }
};

exports.getMyPosts = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "").trim();
    const posts = await MarketplacePost.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: posts.map((post) => toPublicPost(post, userId)) });
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

    return res.json({ success: true, data: toPublicPost(post, viewerId) });
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

    if (!title) {
      return res.status(400).json({ success: false, message: "title is required" });
    }
    if (!description) {
      return res.status(400).json({ success: false, message: "description is required" });
    }
    if (!sellerName) {
      return res.status(400).json({ success: false, message: "sellerName is required" });
    }
    if (!contactNumber) {
      return res.status(400).json({ success: false, message: "contactNumber is required" });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: "price must be a positive number" });
    }
    if (!photos.length) {
      return res.status(400).json({ success: false, message: "At least one photo is required" });
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

    await post.deleteOne();
    return res.json({ success: true, message: "Post deleted" });
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
