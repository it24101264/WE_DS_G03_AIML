// server/controllers/payment.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles:
//   POST /api/v1/marketplace/requests/:requestId/payment  → initiatePayment
//   GET  /api/v1/marketplace/requests/:requestId/payment  → getPaymentStatus
//   POST /api/v1/payments/notify                          → payhereWebhook
//
// Environment variables required in .env:
//   PAYHERE_MERCHANT_ID=your_merchant_id
//   PAYHERE_MERCHANT_SECRET=your_merchant_secret
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");
const mongoose = require("mongoose");
const MarketplaceRequest = require("../models/MarketplaceRequest");
const MarketplacePost = require("../models/MarketplacePost");

const MERCHANT_ID     = process.env.PAYHERE_MERCHANT_ID;
const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;

// ─── Helper: generate PayHere MD5 hash ───────────────────────────────────────
// Hash formula (PayHere docs):
//   MD5( merchant_id + order_id + amount + currency + MD5(secret).toUpperCase() )
function generateHash(orderId, amount, currency = "LKR") {
  const secretHash = crypto
    .createHash("md5")
    .update(MERCHANT_SECRET)
    .digest("hex")
    .toUpperCase();

  const amountFormatted = parseFloat(amount).toFixed(2);
  const raw = `${MERCHANT_ID}${orderId}${amountFormatted}${currency}${secretHash}`;

  return crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
}

// ─── Helper: verify PayHere webhook signature ─────────────────────────────────
// Webhook hash formula (PayHere docs):
//   MD5( merchant_id + order_id + amount + currency + status_code + MD5(secret).toUpperCase() )
function verifyWebhookHash({ merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig }) {
  const secretHash = crypto
    .createHash("md5")
    .update(MERCHANT_SECRET)
    .digest("hex")
    .toUpperCase();

  const raw = `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`;
  const expected = crypto.createHash("md5").update(raw).digest("hex").toUpperCase();

  return md5sig === expected;
}

async function findRequestByParamId(requestId) {
  const byBusinessId = await MarketplaceRequest.findOne({ id: String(requestId || "").trim() });
  if (byBusinessId) return byBusinessId;

  if (mongoose.Types.ObjectId.isValid(requestId)) {
    return MarketplaceRequest.findById(requestId);
  }
  return null;
}

async function reduceQuantityAfterPaid(postId) {
  const safePostId = String(postId || "").trim();
  if (!safePostId) return null;

  const post = await MarketplacePost.findOne({ id: safePostId });
  if (!post) return null;

  post.availableQuantity = 0;
  post.status = "SOLD";
  await post.save();
  return post;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/marketplace/requests/:requestId/payment
//
// Body: { method: "payhere" | "cod" }
//
// For "payhere": returns hash + merchant_id so the mobile WebView can build the
//               PayHere checkout form.
// For "cod":    marks the request as cod_pending immediately.
// ─────────────────────────────────────────────────────────────────────────────
async function initiatePayment(req, res) {
  try {
    const { requestId } = req.params;
    const { method }    = req.body;
    console.log("[initiatePayment] requestId:", requestId);
    console.log("[initiatePayment] method:", method);
    console.log("[initiatePayment] user:", req.user);

    // ── Validate method ───────────────────────────────────────────────────────
    if (!["payhere", "cod"].includes(method)) {
      return res.status(400).json({ success: false, message: "Invalid payment method. Use 'payhere' or 'cod'." });
    }

    // ── Load request ──────────────────────────────────────────────────────────
    const request = await findRequestByParamId(requestId);
    if (!request) {
      console.log("[initiatePayment] request not found for:", requestId);
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    // ── Only the buyer can initiate payment ───────────────────────────────────
    const callerId = req.user?._id?.toString() || req.user?.id?.toString() || req.user?.userId?.toString();
    console.log("[initiatePayment] request.buyerId:", request.buyerId);
    console.log("[initiatePayment] callerId:", callerId);
    if (request.buyerId !== callerId) {
      console.log("[initiatePayment] buyer mismatch -> forbidden");
      return res.status(403).json({ success: false, message: "Only the buyer can initiate payment." });
    }

    // ── Request must be ACCEPTED before payment ───────────────────────────────
    if (request.status !== "ACCEPTED") {
      console.log("[initiatePayment] status not accepted:", request.status);
      return res.status(400).json({ success: false, message: "Payment is only allowed for ACCEPTED requests." });
    }

    // ── Block re-payment if already paid ─────────────────────────────────────
    if (request.paymentStatus === "paid") {
      console.log("[initiatePayment] already paid");
      return res.status(400).json({ success: false, message: "This request has already been paid." });
    }

    // ── COD flow ──────────────────────────────────────────────────────────────
    if (method === "cod") {
      console.log("[initiatePayment] COD flow");
      request.paymentMethod = "cod";
      request.paymentStatus = "cod_pending";
      await request.save();

      return res.json({
        success: true,
        method: "cod",
        paymentStatus: request.paymentStatus,
        message: "Cash on Delivery confirmed. Pay at pickup.",
      });
    }

    // ── PayHere flow ──────────────────────────────────────────────────────────
    if (!MERCHANT_ID || !MERCHANT_SECRET) {
      console.log("[initiatePayment] missing PayHere credentials");
      return res.status(500).json({ success: false, message: "PayHere credentials not configured on server." });
    }

    const orderId = String(request.id || request._id || "");
    const hash = generateHash(orderId, request.negotiatedPrice, "LKR");
    console.log("[initiatePayment] payhere orderId:", orderId, "amount:", request.negotiatedPrice);

    // Mark as pending so we know a PayHere session was started
    request.paymentMethod = "payhere";
    request.paymentStatus = "pending";
    await request.save();

    return res.json({
      success:    true,
      method:     "payhere",
      merchantId: MERCHANT_ID,
      hash,
      orderId,
      amount:     parseFloat(request.negotiatedPrice).toFixed(2),
      currency:   "LKR",
    });

  } catch (err) {
    console.error("[initiatePayment] error:", err);
    res.status(500).json({ success: false, message: err?.message || "Server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/marketplace/requests/:requestId/payment
//
// Returns the current payment status so the app can poll after returning
// from the PayHere WebView.
// ─────────────────────────────────────────────────────────────────────────────
async function getPaymentStatus(req, res) {
  try {
    const { requestId } = req.params;

    const request = await findRequestByParamId(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    // Only buyer or seller can view payment status
    const callerId = req.user?._id?.toString() || req.user?.id?.toString() || req.user?.userId?.toString();
    const isParty  = request.buyerId === callerId || request.sellerId === callerId;
    if (!isParty) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    return res.json({
      success:       true,
      paymentStatus: request.paymentStatus,
      paymentMethod: request.paymentMethod,
      paymentId:     request.paymentId,
      paidAt:        request.paidAt,
    });

  } catch (err) {
    console.error("[getPaymentStatus] error:", err);
    res.status(500).json({ success: false, message: err?.message || "Server error." });
  }
}

async function confirmCodCollected(req, res) {
  try {
    const { requestId } = req.params;
    const request = await findRequestByParamId(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const callerId = req.user?._id?.toString() || req.user?.id?.toString() || req.user?.userId?.toString();
    if (String(request.sellerId || "") !== String(callerId || "")) {
      return res.status(403).json({ success: false, message: "Only the seller can confirm COD collection." });
    }
    if (String(request.status || "").toUpperCase() !== "ACCEPTED") {
      return res.status(400).json({ success: false, message: "COD can only be confirmed for ACCEPTED requests." });
    }
    if (String(request.paymentMethod || "") !== "cod" || String(request.paymentStatus || "") !== "cod_pending") {
      if (String(request.paymentStatus || "") === "paid") {
        return res.json({
          success: true,
          message: "Payment already confirmed.",
          data: {
            paymentStatus: request.paymentStatus,
            paymentMethod: request.paymentMethod,
            paymentId: request.paymentId,
            paidAt: request.paidAt,
          },
        });
      }
      return res.status(400).json({ success: false, message: "This request is not waiting for COD confirmation." });
    }

    request.paymentStatus = "paid";
    request.paymentId = request.paymentId || `cod_${Date.now()}`;
    request.paidAt = new Date();
    await request.save();
    await reduceQuantityAfterPaid(request.postId);

    return res.json({
      success: true,
      message: "COD payment confirmed and stock updated.",
      data: {
        paymentStatus: request.paymentStatus,
        paymentMethod: request.paymentMethod,
        paymentId: request.paymentId,
        paidAt: request.paidAt,
      },
    });
  } catch (err) {
    console.error("[confirmCodCollected] error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Server error." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payments/notify
//
// PayHere calls this server-to-server after every payment attempt.
// Body is application/x-www-form-urlencoded (PayHere standard).
//
// PayHere status codes:
//   2  = Success
//   0  = Pending
//  -1  = Cancelled
//  -2  = Failed
//  -3  = Chargebacked
// ─────────────────────────────────────────────────────────────────────────────
async function payhereWebhook(req, res) {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = req.body;

    console.log("[payhereWebhook] received:", { order_id, status_code, payment_id });

    // ── Verify signature ──────────────────────────────────────────────────────
    const valid = verifyWebhookHash({
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    });

    if (!valid) {
      console.warn("[payhereWebhook] Invalid signature — possible tampering.");
      return res.sendStatus(400);
    }

    // ── Find the request ──────────────────────────────────────────────────────
    const request = await MarketplaceRequest.findOne({ id: String(order_id || "").trim() });
    if (!request) {
      console.warn("[payhereWebhook] Request not found for order_id:", order_id);
      return res.sendStatus(404);
    }

    const wasAlreadyPaid = String(request.paymentStatus || "") === "paid";

    // ── Map status_code → paymentStatus ──────────────────────────────────────
    const codeInt = parseInt(status_code, 10);

    if (codeInt === 2) {
      // Payment successful
      request.paymentStatus = "paid";
      request.paymentId     = payment_id || null;
      request.paidAt        = new Date();
    } else if (codeInt === 0) {
      // Pending (bank processing)
      request.paymentStatus = "pending";
    } else if (codeInt === -1) {
      // Cancelled by user
      request.paymentStatus = "failed";
    } else if (codeInt === -2 || codeInt === -3) {
      // Failed or chargebacked
      request.paymentStatus = "failed";
    }

    await request.save();
    if (!wasAlreadyPaid && request.paymentStatus === "paid") {
      await reduceQuantityAfterPaid(request.postId);
    }

    console.log(`[payhereWebhook] Updated request ${order_id} → paymentStatus: ${request.paymentStatus}`);

    // PayHere expects HTTP 200 to confirm receipt
    return res.sendStatus(200);

  } catch (err) {
    console.error("[payhereWebhook] error:", err);
    return res.sendStatus(500);
  }
}

module.exports = { initiatePayment, getPaymentStatus, confirmCodCollected, payhereWebhook };
