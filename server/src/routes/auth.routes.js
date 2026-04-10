const router = require("express").Router();
const auth = require("../middlewares/auth");
const authController = require("../controllers/auth.controller");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", auth, authController.me);
router.patch("/push-token", auth, authController.updatePushToken);

module.exports = router;
