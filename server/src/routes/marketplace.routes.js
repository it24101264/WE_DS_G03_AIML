const router = require("express").Router();
const { authRequired } = require("../middlewares/auth");
const marketplaceController = require("../controllers/marketplace.controller");

router.get("/", authRequired, marketplaceController.getPosts);
router.get("/mine", authRequired, marketplaceController.getMyPosts);
router.get("/:id", authRequired, marketplaceController.getPostById);
router.post("/", authRequired, marketplaceController.createPost);
router.patch("/:id", authRequired, marketplaceController.updatePost);
router.patch("/:id/status", authRequired, marketplaceController.updatePostStatus);
router.delete("/:id", authRequired, marketplaceController.deletePost);
router.post("/:id/messages", authRequired, marketplaceController.createMessage);

module.exports = router;
