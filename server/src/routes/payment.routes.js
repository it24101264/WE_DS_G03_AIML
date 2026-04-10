const express          = require("express");
const router           = express.Router();
const { authRequired } = require("../middlewares/auth");
const {
  initiatePayment,
  getPaymentStatus,
  confirmCodCollected,
  payhereWebhook,
} = require("../controllers/payment.controller");

// Buyer-facing payment routes (auth required)
router.post(
  "/marketplace/requests/:requestId/payment",
  authRequired,
  initiatePayment
);
router.get(
  "/marketplace/requests/:requestId/payment",
  authRequired,
  getPaymentStatus
);
router.patch(
  "/marketplace/requests/:requestId/payment/cod-confirm",
  authRequired,
  confirmCodCollected
);

// PayHere webhook (NO auth)
router.post(
  "/payments/notify",
  express.urlencoded({ extended: true }),
  payhereWebhook
);

module.exports = router;
