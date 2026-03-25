const mongoose = require("mongoose");
require("dotenv").config();

async function nukeDuplicate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection;
    
    // Drop the entire users collection to start fresh
    try {
      await db.collection("users").drop();
      console.log("✓ Dropped entire users collection");
    } catch (e) {
      console.log("✓ Collection already dropped or doesn't exist");
    }

    // List what collections exist
    const collections = await db.listCollections().toArray();
    console.log("Remaining collections:", collections.map(c => c.name));

    await mongoose.disconnect();
    console.log("✓ Database reset complete!");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

nukeDuplicate();
