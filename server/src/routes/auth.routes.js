const router = require("express").Router();
const auth = require("../middlewares/auth");
const { requireRole } = require("../middlewares/auth");
const { ROLES } = require("../constants/roles");
const authController = require("../controllers/auth.controller");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", auth, authController.me);
router.patch("/profile", auth, authController.updateProfile);
router.patch("/password", auth, authController.changePassword);
router.patch("/push-token", auth, authController.updatePushToken);
router.delete("/me", auth, authController.deleteAccount);
router.get("/admin/users", auth, requireRole(ROLES.ADMIN), authController.listUsersForAdmin);
router.patch("/admin/users/:id/ban", auth, requireRole(ROLES.ADMIN), authController.setUserBanStatus);
router.delete("/admin/users/:id", auth, requireRole(ROLES.ADMIN), authController.deleteUserForAdmin);

module.exports = router;
