const express = require("express");
const crypto = require("crypto");
const KuppiRequest = require("../models/KuppiRequest");
const KuppiSession = require("../models/KuppiSession");
const { makeId } = require("../utils/id");
const { fetchGroupsFromPython } = require("../services/ml/pythonClient");
const { authRequired, requireRole } = require("../middlewares/auth");

const router = express.Router();

function normalizeStatus(status) {
  return String(status || "").trim().toUpperCase();
}

function buildMlItems(requests) {
  return requests.map((r) => ({
    id: r.id,
    text: `${r.topic || ""} ${r.description || ""} ${(r.availabilitySlots || []).join(" ")}`.trim(),
  }));
}

function buildStableGroupId(requestIds) {
  const source = [...requestIds].map(String).sort().join("|");
  const digest = crypto.createHash("sha1").update(source).digest("hex").slice(0, 10);
  return `g_${digest}`;
}

function sameRequestSet(left, right) {
  const leftSorted = [...new Set((left || []).map(String))].sort();
  const rightSorted = [...new Set((right || []).map(String))].sort();
  return leftSorted.length === rightSorted.length && leftSorted.every((id, idx) => id === rightSorted[idx]);
}

router.get(
  "/groups",
  authRequired,
  requireRole("batchRep", "admin", "rep"),
  async (req, res) => {
    const minSize = Number(req.query.minSize ?? 5);
    const maxClusters = Number(req.query.maxClusters ?? 8);
    const topClusters = Number(req.query.topClusters ?? 3);

    const pending = await KuppiRequest.find({ status: "PENDING" }).lean();
    const items = buildMlItems(pending);

    try {
      const result = await fetchGroupsFromPython({ items, minSize, maxClusters, topClusters });
      return res.json({
        success: true,
        meta: { minSize, maxClusters, topClusters, totalPending: pending.length },
        data: result,
      });
    } catch (e) {
      return res.status(503).json({
        success: false,
        message: "ML service unavailable",
        error: e.message,
      });
    }
  }
);

router.post(
  "/apply-groups",
  authRequired,
  requireRole("batchRep", "admin", "rep"),
  async (req, res) => {
    const minSize = Number(req.body?.minSize ?? 5);
    const maxClusters = Number(req.body?.maxClusters ?? 8);
    const topClusters = Number(req.body?.topClusters ?? 3);

    const pending = await KuppiRequest.find({ status: "PENDING" }).lean();
    const items = buildMlItems(pending);

    try {
      const result = await fetchGroupsFromPython({ items, minSize, maxClusters, topClusters });
      const groups = Array.isArray(result?.groups) ? result.groups : [];
      const groupedIdSet = new Set();
      const createdSessions = [];
      const activeSessions = await KuppiSession.find({ status: { $in: ["DRAFT", "PUBLISHED"] } }).lean();

      for (const group of groups) {
        const requestIds = Array.isArray(group.request_ids) ? group.request_ids : [];
        const normalizedRequestIds = requestIds.map((id) => String(id));
        if (normalizedRequestIds.length === 0) continue;

        const groupId = buildStableGroupId(normalizedRequestIds);
        group.group_id = groupId;

        for (const requestId of normalizedRequestIds) groupedIdSet.add(requestId);

        await KuppiRequest.updateMany(
          { id: { $in: normalizedRequestIds } },
          { $set: { status: "GROUPED", groupId } }
        );

        const sessionExists = activeSessions.some((s) => {
          if (sameRequestSet(s.requestIds || [], normalizedRequestIds)) return true;
          return String(s.groupId || "") === groupId;
        });

        if (sessionExists || !groupId || normalizedRequestIds.length < minSize) continue;

        const topic = String(group.topic || "Auto Cluster Session").trim();
        const session = await KuppiSession.create({
          id: makeId("s_"),
          topic,
          topicKey: topic.toLowerCase(),
          description: `Auto-generated from ${normalizedRequestIds.length} semantically similar requests`,
          location: null,
          scheduledAt: null,
          meetLink: null,
          groupId,
          requestIds: normalizedRequestIds,
          participantIds: [],
          status: "DRAFT",
          publishedAt: null,
          createdBy: String(req.user?.id || req.user?.userId || ""),
          keywords: Array.isArray(group.keywords) ? group.keywords : [],
        });

        const savedSession = session.toObject();
        createdSessions.push(savedSession);
        activeSessions.push(savedSession);
      }

      return res.json({
        success: true,
        meta: {
          minSize,
          maxClusters,
          topClusters,
          totalPending: pending.length,
          groupedCount: groupedIdSet.size,
          sessionsCreated: createdSessions.length,
        },
        data: { groups, createdSessions },
      });
    } catch (e) {
      return res.status(503).json({
        success: false,
        message: "ML service unavailable",
        error: e.message,
      });
    }
  }
);

module.exports = router;
