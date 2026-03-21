const router = require("express").Router();
const auth = require("../middlewares/auth");
const parkingController = require("../controllers/parking.controller");

router.use(auth);

router.get("/vehicles", parkingController.getVehicleProfiles);
router.post("/vehicles", parkingController.createVehicleProfile);
router.patch("/vehicles/:id", parkingController.updateVehicleProfile);
router.delete("/vehicles/:id", parkingController.deleteVehicleProfile);
router.get("/slots", parkingController.getSlots);
router.post("/park", parkingController.parkVehicle);
router.post("/leave", parkingController.leaveSlot);
router.get("/my-slot", parkingController.getMySlot);
router.get("/my-slot/:username", parkingController.getMySlot);

module.exports = router;
