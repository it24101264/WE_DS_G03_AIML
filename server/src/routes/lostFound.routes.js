const router = require("express").Router();
const { authRequired, requireRole } = require("../middlewares/auth");
const lostFoundController = require("../controllers/lostFound.controller");

router.post("/items", authRequired, requireRole("student"), lostFoundController.createItem);
router.get("/items", authRequired, lostFoundController.getItems);
router.get("/items/mine", authRequired, lostFoundController.getMyItems);
router.get("/items/:id", authRequired, lostFoundController.getItemById);
router.patch("/items/:id", authRequired, requireRole("student"), lostFoundController.updateMyItem);
router.post("/items/:id/claims", authRequired, requireRole("student"), lostFoundController.createClaim);
router.patch(
  "/items/:id/claims/:claimId/review",
  authRequired,
  requireRole("student"),
  lostFoundController.reviewClaim
);
router.patch("/items/:id/status", authRequired, requireRole("student"), lostFoundController.updateMyItemStatus);

module.exports = router;
