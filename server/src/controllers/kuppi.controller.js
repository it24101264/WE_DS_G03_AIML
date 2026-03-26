const KuppiRequest = require("../models/KuppiRequest");
const KuppiSession = require("../models/KuppiSession");
const { makeId } = require("../utils/id");

const REQUEST_STATUS = ["PENDING", "GROUPED", "SCHEDULED"];
const SESSION_STATUS = ["DRAFT", "PUBLISHED", "REJECTED"];
const TOPIC_MIN_LENGTH = 3;
const TOPIC_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const LOCATION_MAX_LENGTH = 120;
const SLOT_MAX_LENGTH = 80;

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

function isValidIsoDateTime(value) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === String(value);
}

function isFutureIsoDateTime(value) {
  if (!isValidIsoDateTime(value)) return false;
  return new Date(value).getTime() > Date.now();
}

function isValidMeetLink(value) {
  if (!value) return false;
  try {
    const url = new URL(String(value));
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeTopic(value) {
  return String(value || "").trim();
}

function normalizeDescription(value) {
  return String(value || "").trim();
}

function normalizeLocation(value) {
  return String(value || "").trim();
}

function normalizeSlots(value) {
  return Array.isArray(value) ? value.map((s) => String(s || "").trim()).filter(Boolean) : [];
}

function validateTopic(topic) {
  if (!topic) return "topic is required";
  if (topic.length < TOPIC_MIN_LENGTH || topic.length > TOPIC_MAX_LENGTH) {
    return `topic must be between ${TOPIC_MIN_LENGTH} and ${TOPIC_MAX_LENGTH} characters`;
  }
  return null;
}

function validateDescription(description) {
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return `description must be ${DESCRIPTION_MAX_LENGTH} characters or less`;
  }
  return null;
}

function validateAvailabilitySlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return "availabilitySlots must contain at least one slot";
  }
  if (new Set(slots).size !== slots.length) {
    return "availabilitySlots must not contain duplicates";
  }
  if (slots.some((slot) => slot.length > SLOT_MAX_LENGTH)) {
    return `each availability slot must be ${SLOT_MAX_LENGTH} characters or less`;
  }
  return null;
}

function validateDecisionPayload({ scheduledAt, location, meetLink }) {
  if (!scheduledAt) return "scheduledAt is required";
  if (!isFutureIsoDateTime(scheduledAt)) return "scheduledAt must be a valid future ISO datetime";
  if (!location && !meetLink) return "Provide either a location or a meetLink";
  if (location && location.length > LOCATION_MAX_LENGTH) {
    return `location must be ${LOCATION_MAX_LENGTH} characters or less`;
  }
  if (meetLink && !isValidMeetLink(meetLink)) {
    return "meetLink must be a valid https URL";
  }
  return null;
}

function toPublicSession(session, requestCount) {
  return {
    id: session.id,
    _id: session.id,
    topic: session.topic,
    description: session.description || "",
    location: session.location || null,
    scheduledAt: session.scheduledAt || null,
    meetLink: session.meetLink || null,
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
    const safeTopic = normalizeTopic(topic);
    const safeDescription = normalizeDescription(description);
    const normalizedSlots = normalizeSlots(availabilitySlots);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const topicError = validateTopic(safeTopic);
    if (topicError) {
      return res.status(400).json({ success: false, message: topicError });
    }
    const descriptionError = validateDescription(safeDescription);
    if (descriptionError) {
      return res.status(400).json({ success: false, message: descriptionError });
    }
    const slotsError = validateAvailabilitySlots(normalizedSlots);
    if (slotsError) {
      return res.status(400).json({ success: false, message: slotsError });
    }

    const request = await KuppiRequest.create({
      id: makeId("r_"),
      userId,
      topic: safeTopic,
      topicKey: safeTopic.toLowerCase(),
      description: safeDescription,
      availabilitySlots: normalizedSlots,
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
    const safeTopic = normalizeTopic(topic);
    const safeDescription = normalizeDescription(description);
    const safeLocation = normalizeLocation(location);
    const safeScheduledAt = scheduledAt ? String(scheduledAt).trim() : null;

    const topicError = validateTopic(safeTopic);
    if (topicError) {
      return res.status(400).json({ success: false, message: topicError });
    }
    const descriptionError = validateDescription(safeDescription);
    if (descriptionError) {
      return res.status(400).json({ success: false, message: descriptionError });
    }
    if (safeLocation && safeLocation.length > LOCATION_MAX_LENGTH) {
      return res.status(400).json({ success: false, message: `location must be ${LOCATION_MAX_LENGTH} characters or less` });
    }
    if (safeScheduledAt && !isFutureIsoDateTime(safeScheduledAt)) {
      return res.status(400).json({ success: false, message: "scheduledAt must be a valid future ISO datetime" });
    }
    if (!Array.isArray(requestIds)) {
      return res.status(400).json({ success: false, message: "requestIds must be an array" });
    }

    const normalizedRequestIds = requestIds.map((id) => String(id).trim()).filter(Boolean);
    if (normalizedRequestIds.length === 0) {
      return res.status(400).json({ success: false, message: "requestIds must contain at least one request" });
    }
    if (new Set(normalizedRequestIds).size !== normalizedRequestIds.length) {
      return res.status(400).json({ success: false, message: "requestIds must not contain duplicates" });
    }
    const foundRequests = await KuppiRequest.find({ id: { $in: normalizedRequestIds } }).lean();
    if (foundRequests.length !== normalizedRequestIds.length) {
      return res.status(400).json({ success: false, message: "Some requestIds are invalid" });
    }
    if (foundRequests.some((request) => request.status !== "PENDING")) {
      return res.status(400).json({ success: false, message: "All requests must be PENDING before creating a session" });
    }
    if (foundRequests.some((request) => request.topicKey !== safeTopic.toLowerCase())) {
      return res.status(400).json({ success: false, message: "All requestIds must belong to the same topic as the session" });
    }

    const session = await KuppiSession.create({
      id: makeId("s_"),
      topic: safeTopic,
      topicKey: safeTopic.toLowerCase(),
      description: safeDescription,
      location: safeLocation || null,
      scheduledAt: safeScheduledAt || null,
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
    const fallbackTopic = normalizeTopic(groupedRequests[0].topic || "Grouped Session");
    const safeDescription = normalizeDescription(description || groupedRequests[0].description || "");
    const safeLocation = normalizeLocation(mode);
    const safeMeetLink = meetLink ? String(meetLink).trim() : null;
    const safeTimeSlot = timeSlot ? String(timeSlot).trim() : null;

    const descriptionError = validateDescription(safeDescription);
    if (descriptionError) {
      return res.status(400).json({ success: false, message: descriptionError });
    }
    if (safeLocation && safeLocation.length > LOCATION_MAX_LENGTH) {
      return res.status(400).json({ success: false, message: `location must be ${LOCATION_MAX_LENGTH} characters or less` });
    }
    if (safeMeetLink && !isValidMeetLink(safeMeetLink)) {
      return res.status(400).json({ success: false, message: "meetLink must be a valid https URL" });
    }
    if (safeTimeSlot && !isFutureIsoDateTime(safeTimeSlot)) {
      return res.status(400).json({ success: false, message: "timeSlot must be a valid future ISO datetime" });
    }
    if (groupedRequests.some((request) => request.status !== "GROUPED")) {
      return res.status(400).json({ success: false, message: "All grouped requests must still be GROUPED" });
    }
    if (groupedRequests.some((request) => String(request.groupId || "") !== normalizedGroupId)) {
      return res.status(400).json({ success: false, message: "All requests must belong to the same groupId" });
    }

    const session = await KuppiSession.create({
      id: makeId("s_"),
      topic: fallbackTopic,
      topicKey: fallbackTopic.toLowerCase(),
      description: safeDescription,
      location: safeLocation || null,
      meetLink: safeMeetLink,
      scheduledAt: safeTimeSlot,
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
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
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
    const publishError = validateDecisionPayload({
      scheduledAt: session.scheduledAt,
      location: normalizeLocation(session.location),
      meetLink: session.meetLink ? String(session.meetLink).trim() : null,
    });
    if (publishError) {
      return res.status(400).json({ success: false, message: publishError });
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
    const safeScheduledAt = scheduledAt ? String(scheduledAt).trim() : null;
    const safeLocation = normalizeLocation(location);
    const safeMeetLink = meetLink ? String(meetLink).trim() : null;

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

    const payloadError = validateDecisionPayload({
      scheduledAt: safeScheduledAt,
      location: safeLocation,
      meetLink: safeMeetLink,
    });
    if (payloadError) {
      return res.status(400).json({ success: false, message: payloadError });
    }

    session.status = "PUBLISHED";
    session.publishedAt = now;
    session.scheduledAt = safeScheduledAt;
    session.location = safeLocation || null;
    session.meetLink = safeMeetLink || null;

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
