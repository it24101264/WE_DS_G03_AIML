const StudyArea = require("../models/StudyArea");
const User = require("../models/user");
const { makeId } = require("../utils/id");

const STALE_OCCUPANCY_MS = 2 * 60 * 1000;
const EARTH_RADIUS_METERS = 6371000;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(start, end) {
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLng = toRadians(end.longitude - start.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function estimateCapacity(radiusMeters) {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return 0;
  }

  const area = Math.PI * radiusMeters * radiusMeters;
  return Math.max(5, Math.round(area / 4));
}

function classifyDensity(occupancyCount, capacityEstimate) {
  if (!Number.isFinite(occupancyCount) || occupancyCount <= 0) {
    return "Free";
  }

  if (!Number.isFinite(capacityEstimate) || capacityEstimate <= 0) {
    return "Moderate";
  }

  const safeCapacity = Math.max(1, capacityEstimate);
  const ratio = occupancyCount / safeCapacity;

  if (ratio <= 0.35) return "Free";
  if (ratio <= 0.75) return "Moderate";
  return "Crowded";
}

function pruneStaleOccupants(area, now = Date.now()) {
  area.occupants = (area.occupants || []).filter((occupant) => {
    const lastSeenAt = new Date(occupant.lastSeenAt || occupant.enteredAt || now).getTime();
    return now - lastSeenAt <= STALE_OCCUPANCY_MS;
  });
}

function extractNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function normalizeAreaDocument(area) {
  if (!area) return false;

  let changed = false;
  const latitude = extractNumber(area.center?.latitude, area.latitude);
  const longitude = extractNumber(area.center?.longitude, area.longitude);
  const radiusMeters = extractNumber(area.radiusMeters, area.radius, area.radiusInMeters);

  if (!area.id) {
    area.id = makeId("sa_");
    changed = true;
  }

  if (!area.center || typeof area.center !== "object") {
    area.center = { latitude: undefined, longitude: undefined };
    changed = true;
  }

  if (latitude !== area.center.latitude) {
    area.center.latitude = latitude;
    changed = true;
  }

  if (longitude !== area.center.longitude) {
    area.center.longitude = longitude;
    changed = true;
  }

  if (radiusMeters !== area.radiusMeters) {
    area.radiusMeters = radiusMeters;
    changed = true;
  }

  if (!Array.isArray(area.occupants)) {
    area.occupants = [];
    changed = true;
  }

  if (typeof area.note !== "string") {
    area.note = String(area.note || "").trim();
    changed = true;
  }

  return changed;
}

function areaIsUsable(area) {
  return (
    Number.isFinite(area?.center?.latitude) &&
    Number.isFinite(area?.center?.longitude) &&
    Number.isFinite(area?.radiusMeters) &&
    area.radiusMeters > 0
  );
}

function serializeArea(area, currentUserId) {
  const occupants = area.occupants || [];
  const studentCount = occupants.length;
  const capacityEstimate = estimateCapacity(area.radiusMeters);
  const density = classifyDensity(studentCount, capacityEstimate);

  return {
    id: area.id,
    name: area.name,
    note: area.note || "",
    center: {
      latitude: Number.isFinite(area.center?.latitude) ? area.center.latitude : null,
      longitude: Number.isFinite(area.center?.longitude) ? area.center.longitude : null,
    },
    radiusMeters: Number.isFinite(area.radiusMeters) ? area.radiusMeters : null,
    studentCount,
    capacityEstimate,
    density,
    isConfigured: areaIsUsable(area),
    userInside: Boolean(currentUserId && occupants.some((occupant) => occupant.userId === currentUserId)),
    lastOccupancySyncAt: area.lastOccupancySyncAt,
    createdAt: area.createdAt,
    updatedAt: area.updatedAt,
  };
}

function normalizeAreaPayload(body = {}) {
  const payload = {
    name: String(body.name || "").trim(),
    note: String(body.note || "").trim(),
    center: {
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
    },
    radiusMeters: Number(body.radiusMeters),
  };

  if (!payload.name) {
    return { error: "Study area name is required" };
  }

  if (!Number.isFinite(payload.center.latitude) || !Number.isFinite(payload.center.longitude)) {
    return { error: "Valid latitude and longitude are required" };
  }

  if (!Number.isFinite(payload.radiusMeters) || payload.radiusMeters < 5) {
    return { error: "Radius must be at least 5 meters" };
  }

  return { payload };
}

exports.listStudyAreas = async (req, res) => {
  try {
    const areas = await StudyArea.find().sort({ name: 1 });
    const now = Date.now();
    let hasChanges = false;

    for (const area of areas) {
      let areaChanged = normalizeAreaDocument(area);

      const before = area.occupants.length;
      pruneStaleOccupants(area, now);
      if (before !== area.occupants.length) {
        area.lastOccupancySyncAt = new Date(now);
        areaChanged = true;
      }

      if (areaChanged) {
        await area.save({ validateBeforeSave: false });
        hasChanges = true;
      }
    }

    const data = areas.map((area) => serializeArea(area, req.user?.id));
    const summary = data.reduce(
      (acc, area) => {
        acc.total += 1;
        acc[area.density.toLowerCase()] += 1;
        return acc;
      },
      { total: 0, free: 0, moderate: 0, crowded: 0 }
    );

    return res.status(200).json({ success: true, data, summary, refreshed: hasChanges });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createStudyArea = async (req, res) => {
  try {
    const { payload, error } = normalizeAreaPayload(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const area = await StudyArea.create({
      id: makeId("sa_"),
      ...payload,
    });

    return res.status(201).json({ success: true, data: serializeArea(area, req.user?.id) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStudyArea = async (req, res) => {
  try {
    const { payload, error } = normalizeAreaPayload(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const area = await StudyArea.findOne({ id: req.params.id });
    if (!area) {
      return res.status(404).json({ success: false, message: "Study area not found" });
    }

    area.name = payload.name;
    area.note = payload.note;
    area.center = payload.center;
    area.radiusMeters = payload.radiusMeters;
    await area.save();

    return res.status(200).json({ success: true, data: serializeArea(area, req.user?.id) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteStudyArea = async (req, res) => {
  try {
    const deleted = await StudyArea.findOneAndDelete({ id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Study area not found" });
    }

    return res.status(200).json({ success: true, message: "Study area deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.syncPresence = async (req, res) => {
  try {
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ success: false, message: "Valid latitude and longitude are required" });
    }

    const areas = await StudyArea.find();
    const now = Date.now();
    const user = await User.findOne({ id: req.user.id }).lean();
    const userName = user?.name || req.user.id;
    const insideAreaIds = [];

    for (const area of areas) {
      normalizeAreaDocument(area);
      pruneStaleOccupants(area, now);

      if (!areaIsUsable(area)) {
        await area.save({ validateBeforeSave: false });
        continue;
      }

      const isInside =
        distanceInMeters(
          { latitude, longitude },
          { latitude: area.center.latitude, longitude: area.center.longitude }
        ) <= area.radiusMeters;

      const existingIndex = area.occupants.findIndex((occupant) => occupant.userId === req.user.id);

      if (isInside) {
        insideAreaIds.push(area.id);

        if (existingIndex >= 0) {
          area.occupants[existingIndex].lastSeenAt = new Date(now);
          area.occupants[existingIndex].userName = userName;
        } else {
          area.occupants.push({
            userId: req.user.id,
            userName,
            enteredAt: new Date(now),
            lastSeenAt: new Date(now),
          });
        }
      } else if (existingIndex >= 0) {
        area.occupants.splice(existingIndex, 1);
      }

      area.lastOccupancySyncAt = new Date(now);
      await area.save();
    }

    const data = areas
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((area) => serializeArea(area, req.user.id));

    return res.status(200).json({
      success: true,
      data,
      presence: {
        latitude,
        longitude,
        insideAreaIds,
        trackedAt: new Date(now),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAdminBootstrap = async (_req, res) => {
  const email = process.env.STUDY_AREA_ADMIN_EMAIL || "studyadmin@sliit.local";
  const password = process.env.STUDY_AREA_ADMIN_PASSWORD || "StudyAreaAdmin@2026";

  return res.status(200).json({
    success: true,
    data: {
      email,
      password,
      note: "This is the seeded study area administrator account.",
    },
  });
};
