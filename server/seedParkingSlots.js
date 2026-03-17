require("dotenv").config();
const mongoose = require("mongoose");
const ParkingSlot = require("./src/models/ParkingSlot");

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }

    await mongoose.connect(process.env.MONGO_URI);

    await ParkingSlot.deleteMany({});

    const slots = [];

    for (let i = 1; i <= 80; i += 1) {
      slots.push({ slotId: `BK${i}`, side: "BIKE", status: "available" });
    }
    for (let i = 1; i <= 50; i += 1) {
      slots.push({ slotId: `A${i}`, side: "A", status: "available" });
    }
    for (let i = 1; i <= 50; i += 1) {
      slots.push({ slotId: `B${i}`, side: "B", status: "available" });
    }

    await ParkingSlot.insertMany(slots);
    console.log("Parking slots seeded");
  } catch (err) {
    console.error("Parking seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

seed();
