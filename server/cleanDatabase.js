const mongoose = require("mongoose");
require("dotenv").config();

async function cleanDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection;
    
    // List all indexes
    const indexes = await db.collection("users").getIndexes();
    console.log("Current indexes:", Object.keys(indexes));

    // Drop the problematic index if it exists
    try {
      await db.collection("users").dropIndex("studentId_1");
      console.log("✓ Dropped studentId_1 index");
    } catch (e) {
      console.log("✓ studentId_1 index doesn't exist");
    }

    // Delete ALL users to start fresh (optional - only if needed)
    const count = await db.collection("users").countDocuments();
    console.log(`Found ${count} users`);
    
    // Alternative: just remove empty studentId documents
    const result = await db.collection("users").deleteMany({ studentId: "" });
    console.log(`✓ Deleted ${result.deletedCount} documents with empty studentId`);

    // Verify cleanup
    const remaining = await db.collection("users").countDocuments({ studentId: "" });
    console.log(`✓ Remaining documents with empty studentId: ${remaining}`);

    // IMPORTANT: Don't create any unique index on studentId if it will have empty values
    // Mongoose will handle index creation when models are loaded
    console.log("✓ Database cleaned. Schema will auto-create proper indexes on next server start.");

    await mongoose.disconnect();
    console.log("✓ Done!");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

cleanDatabase();
