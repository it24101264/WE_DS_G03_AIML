const router = require("express").Router();
const { authRequired } = require("../middlewares/auth");
const lostFoundController = require("../controllers/lostFound.controller");

router.get("/", authRequired, lostFoundController.getItems);
router.get("/mine", authRequired, lostFoundController.getMyItems);
router.get("/:id", authRequired, lostFoundController.getItemById);
router.post("/:id/claims", authRequired, lostFoundController.submitClaim);
router.patch("/:id/claims/:claimId/accept", authRequired, lostFoundController.acceptClaim);
router.patch("/:id/status", authRequired, lostFoundController.updateItemStatus);
router.post("/", authRequired, lostFoundController.createItem);

module.exports = router;
