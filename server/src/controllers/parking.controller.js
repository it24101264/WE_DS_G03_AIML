const ParkingSlot = require("../models/ParkingSlot");
const ParkingSession = require("../models/ParkingSession");
const ParkingVehicleProfile = require("../models/ParkingVehicleProfile");

const PARKING_AUTO_RELEASE_HOURS = 24;
const PARKING_AUTO_RELEASE_MS = PARKING_AUTO_RELEASE_HOURS * 60 * 60 * 1000;

function normalizeVehiclePayload(body = {}) {
  const rawVehicleNumber = String(body.vehicleNumber || "").trim().toUpperCase();
  const compactVehicleNumber = rawVehicleNumber.replace(/[\s-]+/g, "");
  const normalizedVehicleNumber = /^[A-Z]{2,3}\d{4}$/.test(compactVehicleNumber)
    ? `${compactVehicleNumber.slice(0, -4)}-${compactVehicleNumber.slice(-4)}`
    : rawVehicleNumber;

  return {
    ownerName: String(body.ownerName || "").trim(),
    ownerPhone: String(body.ownerPhone || "").replace(/\D/g, ""),
    vehicleType: String(body.vehicleType || "").trim().toLowerCase(),
    vehicleNumber: normalizedVehicleNumber,
  };
}

function validateVehiclePayload(payload) {
  if (!payload.ownerName || !payload.ownerPhone || !payload.vehicleType || !payload.vehicleNumber) {
    return "ownerName, ownerPhone, vehicleType, and vehicleNumber are required";
  }

  if (!["bike", "car"].includes(payload.vehicleType)) {
    return "vehicleType must be bike or car";
  }

  if (!/^\d{10}$/.test(payload.ownerPhone)) {
    return "ownerPhone must contain exactly 10 digits";
  }

  // Accept common Sri Lankan registration styles like WP AB-1234, WP ABC-1234, AB-1234, or ABC-1234.
  if (!/^(?:[A-Z]{2,3}-\d{4}|[A-Z]{2}\s[A-Z]{2,3}-\d{4})$/.test(payload.vehicleNumber)) {
    return "vehicleNumber must match a Sri Lankan format like BBJ-3020 or WP ABC-1234";
  }

  return null;
}

async function releaseExpiredParkingSessions() {
  const expiryCutoff = new Date(Date.now() - PARKING_AUTO_RELEASE_MS);
  const expiredSessions = await ParkingSession.find({
    exitTime: null,
    entryTime: { $lte: expiryCutoff },
  })
    .select({ _id: 1, slotId: 1 })
    .lean();

  if (expiredSessions.length === 0) {
    return;
  }

  const sessionIds = expiredSessions.map((session) => session._id);
  const slotIds = [...new Set(expiredSessions.map((session) => session.slotId).filter(Boolean))];
  const releasedAt = new Date();

  await ParkingSession.updateMany(
    { _id: { $in: sessionIds }, exitTime: null },
    { $set: { exitTime: releasedAt } }
  );

  if (slotIds.length > 0) {
    await ParkingSlot.updateMany({ slotId: { $in: slotIds } }, { $set: { status: "available" } });
  }
}

exports.getVehicleProfiles = async (req, res) => {
  try {
    const profiles = await ParkingVehicleProfile.find({ userId: req.user.id })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({ success: true, data: profiles });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createVehicleProfile = async (req, res) => {
  try {
    const payload = normalizeVehiclePayload(req.body);
    const validationError = validateVehiclePayload(payload);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const profile = await ParkingVehicleProfile.create({
      userId: req.user.id,
      ...payload,
    });

    return res.status(201).json({ success: true, data: profile });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: "This vehicle number already exists in your profiles" });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateVehicleProfile = async (req, res) => {
  try {
    const payload = normalizeVehiclePayload(req.body);
    const validationError = validateVehiclePayload(payload);

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const profile = await ParkingVehicleProfile.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();

    if (!profile) {
      return res.status(404).json({ success: false, message: "Vehicle profile not found" });
    }

    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: "This vehicle number already exists in your profiles" });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteVehicleProfile = async (req, res) => {
  try {
    await releaseExpiredParkingSessions();

    const activeSession = await ParkingSession.findOne({
      userId: req.user.id,
      vehicleProfileId: req.params.id,
      exitTime: null,
    }).lean();

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete a vehicle profile while it is parked",
      });
    }

    const deleted = await ParkingVehicleProfile.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Vehicle profile not found" });
    }

    return res.status(200).json({ success: true, message: "Vehicle profile deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSlots = async (_req, res) => {
  try {
    await releaseExpiredParkingSessions();

    const slots = await ParkingSlot.find().sort({ slotId: 1 }).lean();
    return res.status(200).json({ success: true, data: slots });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.parkVehicle = async (req, res) => {
  try {
    await releaseExpiredParkingSessions();

    const { slotId, vehicleProfileId } = req.body || {};
    const safeUsername = String(req.user.email || req.user.id || "").trim();
    const safeSlotId = String(slotId || "").trim();
    const safeVehicleProfileId = String(vehicleProfileId || "").trim();

    if (!safeUsername) {
      return res.status(401).json({ success: false, message: "Authenticated user identity is required" });
    }

    if (!safeSlotId || !safeVehicleProfileId) {
      return res.status(400).json({ success: false, message: "slotId and vehicleProfileId are required" });
    }

    const existingActive = await ParkingSession.findOne({
      userId: req.user.id,
      exitTime: null,
    }).lean();

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: "You already have an active parking session. Leave first.",
      });
    }

    const profile = await ParkingVehicleProfile.findOne({
      _id: safeVehicleProfileId,
      userId: req.user.id,
    }).lean();

    if (!profile) {
      return res.status(404).json({ success: false, message: "Vehicle profile not found" });
    }

    const slot = await ParkingSlot.findOneAndUpdate(
      { slotId: safeSlotId, status: "available" },
      { $set: { status: "occupied" } },
      { new: true }
    ).lean();

    if (!slot) {
      return res.status(400).json({ success: false, message: "Slot not available or not found" });
    }

    await ParkingSession.create({
      userId: req.user.id,
      username: safeUsername,
      slotId: safeSlotId,
      vehicleProfileId: String(profile._id),
      vehicleType: profile.vehicleType,
      vehicleNumber: profile.vehicleNumber,
      ownerPhone: profile.ownerPhone,
      entryTime: new Date(),
      exitTime: null,
    });

    return res.status(200).json({ success: true, message: "Vehicle parked successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.leaveSlot = async (req, res) => {
  try {
    await releaseExpiredParkingSessions();

    const { slotId } = req.body || {};
    const safeSlotId = String(slotId || "").trim();

    if (!safeSlotId) {
      return res.status(400).json({ success: false, message: "slotId is required" });
    }

    const session = await ParkingSession.findOne({
      userId: req.user.id,
      slotId: safeSlotId,
      exitTime: null,
    });

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "No active session found for this slot.",
      });
    }

    session.exitTime = new Date();
    await session.save();

    await ParkingSlot.updateOne({ slotId: safeSlotId }, { $set: { status: "available" } });

    return res.status(200).json({ success: true, message: "Vehicle left successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMySlot = async (req, res) => {
  try {
    await releaseExpiredParkingSessions();

    const username = String(req.user.email || req.user.id || "").trim();
    const activeSession = await ParkingSession.findOne({
      $or: [{ userId: req.user.id }, { username }],
      exitTime: null,
    }).lean();
    return res.status(200).json({
      success: true,
      data: activeSession
        ? {
            slotId: activeSession.slotId,
            vehicleProfileId: activeSession.vehicleProfileId || null,
            vehicleNumber: activeSession.vehicleNumber || null,
            vehicleType: activeSession.vehicleType || null,
          }
        : { slotId: null, vehicleProfileId: null, vehicleNumber: null, vehicleType: null },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
