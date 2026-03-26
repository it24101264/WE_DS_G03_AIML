const router = require("express").Router();
const { authRequired } = require("../middlewares/auth");
const marketplaceController = require("../controllers/marketplace.controller");

router.get("/", authRequired, marketplaceController.getPosts);
router.get("/mine", authRequired, marketplaceController.getMyPosts);
router.get("/requests/mine", authRequired, marketplaceController.getMyRequests);
router.get("/:id", authRequired, marketplaceController.getPostById);
router.post("/", authRequired, marketplaceController.createPost);
router.post("/:id/requests", authRequired, marketplaceController.createRequest);
router.patch("/:id", authRequired, marketplaceController.updatePost);
router.patch("/:id/status", authRequired, marketplaceController.updatePostStatus);
router.patch("/requests/:requestId", authRequired, marketplaceController.updateMyRequest);
router.patch("/requests/:requestId/decision", authRequired, marketplaceController.decideRequest);
router.delete("/:id", authRequired, marketplaceController.deletePost);
router.delete("/requests/:requestId", authRequired, marketplaceController.deleteMyRequest);
router.post("/:id/messages", authRequired, marketplaceController.createMessage);

module.exports = router;
