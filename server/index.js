const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

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

const marketplaceRoutes = require("./src/routes/marketplace.routes");
app.use("/api/v1/marketplace", marketplaceRoutes);

const canteenRoutes = require("./src/routes/canteen");
app.use("/api/v1/canteen", canteenRoutes);

const adminRoutes = require("./src/routes/canteen");
app.use("/api/v1/admin", adminRoutes);

const studentRoutes = require("./src/routes/canteenStudent");
app.use("/api/v1/student", studentRoutes);

const { notFound, errorHandler } = require("./src/middlewares/errorHandler");

// Root route
app.get("/", (_req, res) => res.send("Backend is running"));

// Health route
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err.message);
    process.exit(1);
  }
}

startServer();
