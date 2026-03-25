const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

app.use((req, _res, next) => {
  console.log("REQ:", req.method, req.url);
  next();
});

const kuppiRoutes = require("./src/routes/kuppi.routes");
app.use("/api/v1/kuppi", kuppiRoutes);

const authRoutes = require("./src/routes/auth.routes");
app.use("/api/v1/auth", authRoutes);

const mlRoutes = require("./src/routes/ml.routes");
app.use("/api/v1/ml", mlRoutes);

const parkingRoutes = require("./src/routes/parking.routes");
app.use("/api/v1/parking", parkingRoutes);

const lostFoundRoutes = require("./src/routes/lostFound.routes");
app.use("/api/v1/lost-found", lostFoundRoutes);

const canteenRoutes = require("./src/routes/canteen");
app.use("/api/v1/canteen", canteenRoutes);

const adminRoutes = require("./src/routes/canteen");
app.use("/api/v1/admin", adminRoutes);

const studentRoutes = require("./src/routes/canteenStudent");
app.use("/api/v1/student", studentRoutes);

const marketplaceRoutes = require("./src/routes/marketplace");
app.use("/api/v1/marketplace", marketplaceRoutes);

const { notFound, errorHandler } = require("./src/middlewares/errorHandler");

app.get("/", (_req, res) => res.send("Backend is running"));

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
