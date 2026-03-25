const mongoose = require("mongoose");
require("dotenv").config();

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Drop the problematic index
    await mongoose.connection.collection("users").dropIndex("studentId_1");
    console.log("Dropped studentId_1 index");

    // Remove old documents with empty studentId
    const result = await mongoose.connection.collection("users").deleteMany({ studentId: "" });
    console.log(`Deleted ${result.deletedCount} documents with empty studentId`);

    // Recreate the index with sparse option
    await mongoose.connection.collection("users").createIndex({ studentId: 1 }, { unique: true, sparse: true });
    console.log("Created sparse unique index on studentId");

    await mongoose.disconnect();
    console.log("Done!");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

fixIndex();
