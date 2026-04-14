const router = require("express").Router();
const { authRequired } = require("../middlewares/auth");
const lostFoundController = require("../controllers/lostFound.controller");

router.get("/", authRequired, lostFoundController.getItems);
router.get("/mine", authRequired, lostFoundController.getMyItems);
router.post("/ai-search", authRequired, lostFoundController.aiSearchItems);
router.get("/:id", authRequired, lostFoundController.getItemById);
router.patch("/:id", authRequired, lostFoundController.updateItem);
router.delete("/:id", authRequired, lostFoundController.deleteItem);
router.post("/:id/found-reports", authRequired, lostFoundController.submitFoundReport);
router.post("/:id/claims", authRequired, lostFoundController.submitClaim);
router.patch("/:id/claims/:claimId/accept", authRequired, lostFoundController.acceptClaim);
router.patch("/:id/status", authRequired, lostFoundController.updateItemStatus);
router.post("/", authRequired, lostFoundController.createItem);

module.exports = router;
