const router = require("express").Router();
const parkingController = require("../controllers/parking.controller");

router.get("/slots", parkingController.getSlots);
router.post("/park", parkingController.parkVehicle);
router.post("/leave", parkingController.leaveSlot);
router.get("/my-slot/:username", parkingController.getMySlot);

module.exports = router;
