const router = require("express").Router();
const { authRequired, optionalAuth, requireRole } = require("../middlewares/auth");
const kuppiController = require("../controllers/kuppi.controller");

// Student
router.post("/requests", authRequired, requireRole("student"), kuppiController.createRequest);
router.get("/requests/mine", authRequired, requireRole("student"), kuppiController.getMyRequests);
router.get("/requests/my", authRequired, requireRole("student"), kuppiController.getMyRequests);
router.delete("/requests/:id", authRequired, requireRole("student"), kuppiController.deleteMyRequest);

// Batch rep / Admin
router.get("/requests/all", authRequired, requireRole("batchrep", "admin"), kuppiController.getAllRequests);
router.patch(
  "/requests/:id/status",
  authRequired,
  requireRole("batchrep", "admin"),
  kuppiController.updateRequestStatus
);
router.post("/sessions", authRequired, requireRole("batchrep", "admin"), kuppiController.createSession);
router.post(
  "/sessions/from-group",
  authRequired,
  requireRole("batchrep", "admin"),
  kuppiController.createSessionFromGroup
);
router.patch(
  "/sessions/:id/publish",
  authRequired,
  requireRole("batchrep", "admin"),
  kuppiController.publishSession
);
router.patch(
  "/sessions/:id/decision",
  authRequired,
  requireRole("batchrep", "admin"),
  kuppiController.decideSession
);

// Sessions visibility / participation
router.get("/sessions", optionalAuth, kuppiController.getSessions);
router.get("/sessions/:id", authRequired, kuppiController.getSessionDetails);
router.post("/sessions/:id/join", authRequired, requireRole("student"), kuppiController.joinSession);

// Backward compatibility
router.patch("/sessions/:id/confirm", authRequired, requireRole("batchrep", "admin"), kuppiController.confirmSession);

module.exports = router;
