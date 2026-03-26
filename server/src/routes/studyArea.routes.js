const router = require("express").Router();
const auth = require("../middlewares/auth");
const studyAreaController = require("../controllers/studyArea.controller");
const { ROLES } = require("../constants/roles");

router.get("/", auth.optionalAuth, studyAreaController.listStudyAreas);
router.post("/presence", auth.authRequired, studyAreaController.syncPresence);
router.get("/admin/bootstrap", studyAreaController.getAdminBootstrap);

router.post("/", auth.authRequired, auth.requireRole(ROLES.ADMIN), studyAreaController.createStudyArea);
router.put("/:id", auth.authRequired, auth.requireRole(ROLES.ADMIN), studyAreaController.updateStudyArea);
router.delete("/:id", auth.authRequired, auth.requireRole(ROLES.ADMIN), studyAreaController.deleteStudyArea);

module.exports = router;
