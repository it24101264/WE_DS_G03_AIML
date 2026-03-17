const ParkingSlot = require("../models/ParkingSlot");
const ParkingSession = require("../models/ParkingSession");

exports.getSlots = async (_req, res) => {
  try {
    const slots = await ParkingSlot.find().sort({ slotId: 1 }).lean();
    return res.status(200).json({ success: true, data: slots });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.parkVehicle = async (req, res) => {
  try {
    const { username, slotId } = req.body || {};
    const safeUsername = String(username || "").trim();
    const safeSlotId = String(slotId || "").trim();

    if (!safeUsername || !safeSlotId) {
      return res.status(400).json({ success: false, message: "username and slotId are required" });
    }

    const existingActive = await ParkingSession.findOne({
      username: safeUsername,
      exitTime: null,
    }).lean();

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: "You already have an active parking session. Leave first.",
      });
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
      username: safeUsername,
      slotId: safeSlotId,
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
    const { username, slotId } = req.body || {};
    const safeUsername = String(username || "").trim();
    const safeSlotId = String(slotId || "").trim();

    if (!safeUsername || !safeSlotId) {
      return res.status(400).json({ success: false, message: "username and slotId are required" });
    }

    const session = await ParkingSession.findOne({
      username: safeUsername,
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
    const username = String(req.params.username || "").trim();
    if (!username) {
      return res.status(400).json({ success: false, message: "username is required" });
    }

    const activeSession = await ParkingSession.findOne({ username, exitTime: null }).lean();
    return res.status(200).json({
      success: true,
      data: { slotId: activeSession ? activeSession.slotId : null },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
