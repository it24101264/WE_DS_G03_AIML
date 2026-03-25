const mongoose = require("mongoose");
require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }

    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("Server startup failed:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
