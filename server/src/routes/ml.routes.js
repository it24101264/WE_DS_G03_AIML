const express = require("express");
const crypto = require("crypto");
const KuppiRequest = require("../models/KuppiRequest");
const KuppiSession = require("../models/KuppiSession");
const { makeId } = require("../utils/id");
const { fetchGroupsFromPython } = require("../services/ml/pythonClient");
const { authRequired, requireRole } = require("../middlewares/auth");
const { normalizeKuppiTopic } = require("../constants/kuppiTopics");

const router = express.Router();
const MONTH_INDEX = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function normalizeStatus(status) {
  return String(status || "").trim().toUpperCase();
}

function buildMlItems(requests) {
  return requests.map((r) => ({
    id: r.id,
    text: String(r.description || r.topic || "").trim(),
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

function parseAvailabilitySlot(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const monthFirst = raw.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (monthFirst) {
    const [, monthName, day, hour, minute, meridiem] = monthFirst;
    const month = MONTH_INDEX[monthName.slice(0, 3).toLowerCase()];
    if (month == null) return null;
    let nextHour = Number(hour) % 12;
    if (meridiem.toUpperCase() === "PM") nextHour += 12;
    return alignToFuture(new Date(new Date().getFullYear(), month, Number(day), nextHour, Number(minute), 0, 0));
  }

  const dayFirst = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+at\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (dayFirst) {
    const [, day, monthName, hour, minute, meridiem] = dayFirst;
    const month = MONTH_INDEX[monthName.slice(0, 3).toLowerCase()];
    if (month == null) return null;
    let nextHour = Number(hour);
    if (meridiem) {
      nextHour %= 12;
      if (meridiem.toUpperCase() === "PM") nextHour += 12;
    }
    return alignToFuture(new Date(new Date().getFullYear(), month, Number(day), nextHour, Number(minute), 0, 0));
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return alignToFuture(direct);
  }

  return null;
}

function alignToFuture(date) {
  if (Number.isNaN(date.getTime())) return null;

  const now = Date.now();
  const next = new Date(date);
  while (next.getTime() < now) {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

async function recommendTimeWithAI(requests) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const allSlots = (requests || []).flatMap((r) =>
    Array.isArray(r.availabilitySlots) ? r.availabilitySlots : []
  ).map((s) => String(s || "").trim()).filter(Boolean);

  if (allSlots.length === 0) return null;

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const prompt =
    `Today is ${today}. The following students have listed their availability for a group study session:\n` +
    allSlots.map((s) => `- ${s}`).join("\n") +
    `\n\nIdentify the single best date and time that works for the most students. ` +
    `Return ONLY a valid ISO 8601 datetime string (e.g. 2026-05-02T14:00:00.000Z) with no explanation.`;

  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "KuppiMLService/1.0",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a scheduling assistant. You receive student availability slots in any format and return the single best meeting time as a valid ISO 8601 datetime string only. No explanation, no extra text.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 32,
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const raw = String(data.choices?.[0]?.message?.content || "").trim().replace(/['"]/g, "");
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return null;
    return alignToFuture(parsed);
  } catch {
    return null;
  }
}

function recommendTimeForRequests(requests) {
  const slotStats = new Map();

  for (const request of requests || []) {
    for (const slot of Array.isArray(request?.availabilitySlots) ? request.availabilitySlots : []) {
      const parsed = parseAvailabilitySlot(slot);
      if (!parsed) continue;

      const key = String(slot).trim();
      const existing = slotStats.get(key) || {
        label: key,
        iso: parsed.toISOString(),
        count: 0,
      };
      existing.count += 1;
      if (new Date(parsed).getTime() < new Date(existing.iso).getTime()) {
        existing.iso = parsed.toISOString();
      }
      slotStats.set(key, existing);
    }
  }

  const ranked = [...slotStats.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return new Date(left.iso).getTime() - new Date(right.iso).getTime();
  });

  if (ranked.length === 0) {
    return { scheduledAt: null, label: null, supportingCount: 0 };
  }

  const best = ranked[0];
  return {
    scheduledAt: best.iso,
    label: best.label,
    supportingCount: best.count,
  };
}

router.get(
  "/groups",
  authRequired,
  requireRole("batchRep", "admin", "rep"),
  async (req, res) => {
    const minSize = Number(req.query.minSize ?? 5);
    const maxClusters = Number(req.query.maxClusters ?? 8);
    const topClusters = Number(req.query.topClusters ?? 3);
    const selectedModule = normalizeKuppiTopic(req.query.module);

    const pendingQuery = { status: "PENDING" };
    if (selectedModule) pendingQuery.topic = selectedModule;

    const pending = await KuppiRequest.find(pendingQuery).lean();
    const items = buildMlItems(pending);

    try {
      const result = await fetchGroupsFromPython({ items, minSize, maxClusters, topClusters });
      const groups = Array.isArray(result?.groups)
        ? result.groups.map((group) => ({
            ...group,
            module: selectedModule || null,
          }))
        : [];

      return res.json({
        success: true,
        meta: {
          minSize,
          maxClusters,
          topClusters,
          totalPending: pending.length,
          module: selectedModule || null,
        },
        data: {
          ...result,
          groups,
        },
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
    const selectedModule = normalizeKuppiTopic(req.body?.module);

    const pendingQuery = { status: "PENDING" };
    if (selectedModule) pendingQuery.topic = selectedModule;

    const pending = await KuppiRequest.find(pendingQuery).lean();
    const items = buildMlItems(pending);

    try {
      const result = await fetchGroupsFromPython({ items, minSize, maxClusters, topClusters });
      const groups = Array.isArray(result?.groups)
        ? result.groups.map((group) => ({
            ...group,
            module: selectedModule || null,
          }))
        : [];
      const groupedIdSet = new Set();
      const createdSessions = [];
      const activeSessions = await KuppiSession.find({ status: { $in: ["DRAFT", "PUBLISHED"] } }).lean();

      // Resolve per-group requests and run AI time recommendations in parallel
      const groupMeta = groups.map((group) => {
        const requestIds = Array.isArray(group.request_ids) ? group.request_ids : [];
        const normalizedRequestIds = requestIds.map((id) => String(id));
        const groupedRequests = pending.filter((r) => normalizedRequestIds.includes(String(r.id)));
        return { group, normalizedRequestIds, groupedRequests };
      });

      const aiTimes = await Promise.all(
        groupMeta.map(({ groupedRequests }) => recommendTimeWithAI(groupedRequests))
      );

      for (let i = 0; i < groupMeta.length; i++) {
        const { group, normalizedRequestIds, groupedRequests } = groupMeta[i];
        if (normalizedRequestIds.length === 0) continue;

        // Use AI time if available, fall back to heuristic
        const aiTime = aiTimes[i];
        const heuristicTime = recommendTimeForRequests(groupedRequests);
        const recommendedTime = aiTime
          ? { scheduledAt: aiTime.toISOString(), label: heuristicTime.label, supportingCount: heuristicTime.supportingCount, source: "ai" }
          : { ...heuristicTime, source: "heuristic" };

        const groupId = buildStableGroupId(normalizedRequestIds);
        group.group_id = groupId;
        group.recommended_time = recommendedTime.scheduledAt;
        group.recommended_time_label = recommendedTime.label;
        group.recommended_time_supporting_count = recommendedTime.supportingCount;

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

        const topic = String(
          selectedModule ? `${selectedModule} - ${group.topic || "Auto Cluster Session"}` : group.topic || "Auto Cluster Session"
        ).trim();
        const cohesion = typeof group.cohesion === "number" ? group.cohesion : null;
        const cohesionPct = cohesion !== null ? ` Cluster cohesion: ${Math.round(cohesion * 100)}%.` : "";
        const session = await KuppiSession.create({
          id: makeId("s_"),
          topic,
          topicKey: topic.toLowerCase(),
          description: (() => {
            const base = `Auto-generated from ${normalizedRequestIds.length} semantically similar requests.`;
            const timeNote = recommendedTime.source === "ai"
              ? ` AI-recommended time based on ${recommendedTime.supportingCount || 0} student slot(s).`
              : recommendedTime.label
                ? ` Recommended time: ${recommendedTime.label} (${recommendedTime.supportingCount} student${recommendedTime.supportingCount === 1 ? "" : "s"} available).`
                : "";
            return `${base}${timeNote}${cohesionPct}`;
          })(),
          location: null,
          scheduledAt: recommendedTime.scheduledAt,
          meetLink: null,
          groupId,
          requestIds: normalizedRequestIds,
          participantIds: [],
          status: "DRAFT",
          publishedAt: null,
          createdBy: String(req.user?.id || req.user?.userId || ""),
          keywords: Array.isArray(group.keywords) ? group.keywords : [],
          cohesion,
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
          module: selectedModule || null,
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
