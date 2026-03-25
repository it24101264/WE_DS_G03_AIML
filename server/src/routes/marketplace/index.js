const express = require("express");
const authRoutes = require("./auth");
const itemRoutes = require("./items");
const requestRoutes = require("./requests");
const userRoutes = require("./users");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/items", itemRoutes);
router.use("/requests", requestRoutes);
router.use("/users", userRoutes);

module.exports = router;
