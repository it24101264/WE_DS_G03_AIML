const KuppiRequest = require("../models/KuppiRequest");
const KuppiSession = require("../models/KuppiSession");
const { makeId } = require("../utils/id");

const REQUEST_STATUS = ["PENDING", "GROUPED", "SCHEDULED"];
const SESSION_STATUS = ["DRAFT", "PUBLISHED", "REJECTED"];

function nowIso() {
  return new Date().toISOString();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function normalizeRequestStatus(status) {
  if (!status) return null;
  const normalized = String(status).trim().toUpperCase();
  return REQUEST_STATUS.includes(normalized) ? normalized : null;
}

function normalizeSessionStatus(status) {
  if (!status) return null;
  const normalized = String(status).trim().toUpperCase();
  return SESSION_STATUS.includes(normalized) ? normalized : null;
}

function toPublicSession(session, requestCount) {
  return {
    id: session.id,
    _id: session.id,
    topic: session.topic,
    description: session.description || "",
    location: session.location || null,
    scheduledAt: session.scheduledAt || null,
    status: session.status,
    publishedAt: session.publishedAt || null,
    createdAt: session.createdAt,
    requestCount,
    participantCount: asArray(session.participantIds).length,
  };
}

exports.createRequest = async (req, res, next) => {
  try {
    const { topic, description = "", availabilitySlots } = req.body || {};
    const userId = String(req.user?.id || req.user?.userId || "");
    const safeTopic = String(topic || "").trim();
    const normalizedSlots = Array.isArray(availabilitySlots)
      ? availabilitySlots.map((s) => String(s).trim()).filter(Boolean)
      : [];

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!safeTopic) {
      return res.status(400).json({
        success: false,
        message: "topic is required",
      });
    }

    const request = await KuppiRequest.create({
      id: makeId("r_"),
      userId,
      topic: safeTopic,
      topicKey: safeTopic.toLowerCase(),
      description: String(description),
      availabilitySlots: normalizedSlots.length ? normalizedSlots : ["Not specified"],
      status: "PENDING",
    });

    return res.status(201).json({ success: true, data: request.toObject() });
  } catch (err) {
    return next(err);
  }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "");
    const mine = await KuppiRequest.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: mine });
  } catch (err) {
    return next(err);
  }
};

exports.getAllRequests = async (req, res, next) => {
  try {
    const { topic, status } = req.query || {};
    const query = {};
    if (topic) query.topic = topic;
    if (status) {
      const normalizedStatus = normalizeRequestStatus(status);
      if (!normalizedStatus) {
        return res.status(400).json({ success: false, message: "Invalid status filter" });
      }
      query.status = normalizedStatus;
    }

    const filtered = await KuppiRequest.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: filtered });
  } catch (err) {
    return next(err);
  }
};

exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const nextStatus = normalizeRequestStatus(status);

    if (!nextStatus) {
      return res.status(400).json({ success: false, message: "status must be one of PENDING, GROUPED, SCHEDULED" });
    }

    const request = await KuppiRequest.findOne({ id });
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const allowedTransitions = {
      PENDING: "GROUPED",
      GROUPED: "SCHEDULED",
      SCHEDULED: null,
    };

    if (request.status === nextStatus) {
      return res.json({ success: true, data: request.toObject(), message: "Status unchanged" });
    }

    if (allowedTransitions[request.status] !== nextStatus) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: ${request.status} -> ${nextStatus}`,
      });
    }

    request.status = nextStatus;
    await request.save();
    return res.json({ success: true, data: request.toObject(), message: "Request status updated" });
  } catch (err) {
    return next(err);
  }
};

exports.deleteMyRequest = async (req, res, next) => {
  try {
    const userId = String(req.user?.id || req.user?.userId || "");
    const { id } = req.params;
    const reqDoc = await KuppiRequest.findOne({ id });

    if (!reqDoc) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (String(reqDoc.userId) !== userId) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    if (reqDoc.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Cannot delete after grouping" });
    }

    await KuppiRequest.deleteOne({ id });
    return res.json({ success: true, message: "Request deleted" });
  } catch (err) {
    return next(err);
  }
};

exports.createSession = async (req, res, next) => {
  try {
    const { topic, requestIds = [], description = "", location = "", scheduledAt = null } = req.body || {};
    if (!topic) {
      return res.status(400).json({ success: false, message: "topic is required" });
    }
    if (!Array.isArray(requestIds)) {
      return res.status(400).json({ success: false, message: "requestIds must be an array" });
    }

    const normalizedRequestIds = requestIds.map((id) => String(id));
    const foundRequests = await KuppiRequest.find({ id: { $in: normalizedRequestIds } }).lean();
    if (foundRequests.length !== normalizedRequestIds.length) {
      return res.status(400).json({ success: false, message: "Some requestIds are invalid" });
    }

    const session = await KuppiSession.create({
      id: makeId("s_"),
      topic: String(topic).trim(),
      topicKey: String(topic).trim().toLowerCase(),
      description: String(description),
      location: location ? String(location) : null,
      scheduledAt: scheduledAt ? String(scheduledAt) : null,
      requestIds: foundRequests.map((r) => r.id),
      participantIds: [],
      status: "DRAFT",
      publishedAt: null,
      createdBy: String(req.user?.id || req.user?.userId || ""),
    });

    await KuppiRequest.updateMany(
      { id: { $in: normalizedRequestIds }, status: "PENDING" },
      { $set: { status: "GROUPED" } }
    );

    return res.status(201).json({ success: true, data: session.toObject() });
  } catch (err) {
    return next(err);
  }
};

exports.createSessionFromGroup = async (req, res, next) => {
  try {
    const { groupId, timeSlot = null, mode = null, meetLink = null, description = "" } = req.body || {};
    if (!groupId) {
      return res.status(400).json({ success: false, message: "groupId is required" });
    }

    const normalizedGroupId = String(groupId).trim();

    const groupedRequests = await KuppiRequest.find({
      status: "GROUPED",
      groupId: normalizedGroupId,
    }).lean();

    if (groupedRequests.length === 0) {
      return res.status(404).json({ success: false, message: "No grouped requests found for this groupId" });
    }

    const participantIds = [...new Set(groupedRequests.map((r) => String(r.userId)).filter(Boolean))];
    const fallbackTopic = String(groupedRequests[0].topic || "Grouped Session").trim();

    const session = await KuppiSession.create({
      id: makeId("s_"),
      topic: fallbackTopic,
      topicKey: fallbackTopic.toLowerCase(),
      description: String(description || groupedRequests[0].description || ""),
      location: mode ? String(mode) : null,
      meetLink: meetLink ? String(meetLink) : null,
      scheduledAt: timeSlot ? String(timeSlot) : null,
      requestIds: groupedRequests.map((r) => r.id),
      participantIds,
      groupId: normalizedGroupId,
      status: "DRAFT",
      publishedAt: null,
      createdBy: String(req.user?.id || req.user?.userId || ""),
    });

    await KuppiRequest.updateMany(
      { id: { $in: groupedRequests.map((r) => r.id) } },
      { $set: { status: "SCHEDULED" } }
    );

    return res.status(201).json({
      success: true,
      data: {
        session: session.toObject(),
        requestIds: session.requestIds,
        participantIds: session.participantIds,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.getSessions = async (req, res, next) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const query = role === "admin" || role === "batchrep" ? {} : { status: "PUBLISHED" };

    const sessions = await KuppiSession.find(query).sort({ createdAt: -1 }).lean();

    const data = sortByCreatedAtDesc(sessions).map((s) => toPublicSession(s, asArray(s.requestIds).length));
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

exports.getSessionDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await KuppiSession.findOne({ id }).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const requests = await KuppiRequest.find({ id: { $in: asArray(session.requestIds) } }).lean();
    const requestById = new Map(requests.map((r) => [r.id, r]));

    const populated = {
      ...session,
      _id: session.id,
      requestIds: asArray(session.requestIds).map((rid) => requestById.get(rid)).filter(Boolean),
      participantIds: asArray(session.participantIds),
    };
    return res.json({ success: true, data: populated });
  } catch (err) {
    return next(err);
  }
};

exports.joinSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = String(req.user?.id || req.user?.userId || "");
    const session = await KuppiSession.findOne({ id });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (normalizeSessionStatus(session.status) !== "PUBLISHED") {
      return res.status(400).json({ success: false, message: "Only published sessions can be joined" });
    }

    session.participantIds = asArray(session.participantIds);
    if (session.participantIds.includes(userId)) {
      return res.status(400).json({ success: false, message: "Already joined" });
    }

    session.participantIds.push(userId);
    await session.save();
    return res.json({ success: true, message: "Joined session", data: { id: session.id } });
  } catch (err) {
    return next(err);
  }
};

exports.publishSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await KuppiSession.findOne({ id });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (normalizeSessionStatus(session.status) !== "DRAFT") {
      return res.status(400).json({ success: false, message: "Only DRAFT sessions can be published" });
    }

    const now = nowIso();
    session.status = "PUBLISHED";
    session.publishedAt = now;

    await session.save();
    return res.json({ success: true, message: "Session published", data: session.toObject() });
  } catch (err) {
    return next(err);
  }
};

exports.decideSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, scheduledAt = null, location = null, meetLink = null } = req.body || {};
    const normalizedDecision = String(decision || "").trim().toLowerCase();

    if (!["accept", "reject"].includes(normalizedDecision)) {
      return res.status(400).json({ success: false, message: "decision must be accept or reject" });
    }

    const session = await KuppiSession.findOne({ id });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (normalizeSessionStatus(session.status) !== "DRAFT") {
      return res.status(400).json({ success: false, message: "Only DRAFT sessions can be decided" });
    }

    const requestIds = new Set(asArray(session.requestIds).map((rid) => String(rid)));
    const now = nowIso();

    if (normalizedDecision === "reject") {
      session.status = "REJECTED";
      session.rejectedAt = now;

      await Promise.all([
        session.save(),
        KuppiRequest.updateMany(
          { id: { $in: [...requestIds] } },
          { $set: { status: "PENDING", groupId: null } }
        ),
      ]);

      return res.json({ success: true, message: "Session rejected", data: session.toObject() });
    }

    session.status = "PUBLISHED";
    session.publishedAt = now;
    if (scheduledAt) session.scheduledAt = String(scheduledAt);
    if (location) session.location = String(location);
    if (meetLink) session.meetLink = String(meetLink);

    await Promise.all([
      session.save(),
      KuppiRequest.updateMany(
        { id: { $in: [...requestIds] } },
        { $set: { status: "SCHEDULED" } }
      ),
    ]);

    return res.json({ success: true, message: "Session accepted and published", data: session.toObject() });
  } catch (err) {
    return next(err);
  }
};

exports.confirmSession = async (_req, res) => {
  return res.status(410).json({
    success: false,
    message: "confirmSession is deprecated. Use PATCH /requests/:id/status and PATCH /sessions/:id/publish",
  });
};

// Backward-compatible aliases
exports.getRequests = exports.getMyRequests;
exports.getSessionsSummary = exports.getSessions;
exports.getSessionById = exports.getSessionDetails;
