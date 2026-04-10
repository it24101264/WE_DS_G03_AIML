const MarketplaceRequest = require("../models/MarketplaceRequest");
const MarketplacePost = require("../models/MarketplacePost");
const User = require("../models/user");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function isExpoPushToken(value) {
  return /^ExponentPushToken\[.+\]$/.test(String(value || "").trim());
}

async function sendExpoPush(token, title, body, data = {}) {
  const message = {
    to: token,
    sound: "default",
    title,
    body,
    data,
    priority: "high",
  };

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed: HTTP ${response.status} ${text}`);
  }

  return response.json();
}

async function runMarketplacePickupReminderSweep() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const due = await MarketplaceRequest.find({
    status: "ACCEPTED",
    pickupDateTime: { $gt: now, $lte: horizon },
    pickupReminderPushSentAt: null,
  }).lean();

  if (!due.length) return { checked: 0, sent: 0, skipped: 0, failed: 0 };

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const request of due) {
    const buyerId = String(request?.buyerId || "").trim();
    if (!buyerId) {
      skipped += 1;
      continue;
    }

    const buyer = await User.findOne({ id: buyerId }).select("id expoPushToken").lean();
    const token = String(buyer?.expoPushToken || "").trim();
    if (!isExpoPushToken(token)) {
      skipped += 1;
      continue;
    }

    const post = await MarketplacePost.findOne({ id: String(request?.postId || "").trim() }).select("title").lean();
    const item = post?.title || "Marketplace item";
    const location = request?.pickupLocationName || "pickup location";
    const pickupAt = request?.pickupDateTime ? new Date(request.pickupDateTime).toLocaleString() : "soon";

    try {
      await sendExpoPush(
        token,
        "Pickup Reminder",
        `${item} pickup is within 24 hours at ${location} (${pickupAt}).`,
        { requestId: request.id, type: "pickup_reminder_24h" }
      );

      await MarketplaceRequest.updateOne(
        { id: request.id, pickupReminderPushSentAt: null },
        { $set: { pickupReminderPushSentAt: new Date() } }
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error("[pickupReminder] send failed:", request.id, err.message);
    }
  }

  return { checked: due.length, sent, skipped, failed };
}

let reminderInterval = null;

function startMarketplacePickupReminderScheduler() {
  if (reminderInterval) return;

  const run = async () => {
    try {
      const result = await runMarketplacePickupReminderSweep();
      if (result.sent || result.failed) {
        console.log("[pickupReminder] sweep:", result);
      }
    } catch (err) {
      console.error("[pickupReminder] sweep error:", err.message);
    }
  };

  run();
  reminderInterval = setInterval(run, 10 * 60 * 1000);
}

module.exports = {
  startMarketplacePickupReminderScheduler,
  runMarketplacePickupReminderSweep,
};
