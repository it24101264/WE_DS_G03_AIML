const express = require("express");
const {
  getAllAreas,
  getAreaById,
  createArea,
  updateArea,
  deleteArea,
  updateCount
} = require("../controller/studyAreaController");

const router = express.Router();

router.get("/", getAllAreas);
router.get("/:id", getAreaById);
router.post("/", createArea);
router.put("/:id", updateArea);
router.delete("/:id", deleteArea);
router.post("/update-count/:id", updateCount);

module.exports = router;