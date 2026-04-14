require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("./src/models/user");
const LostFoundItem = require("./src/models/LostFoundItem");
const { ROLES } = require("./src/constants/roles");
const { makeId } = require("./src/utils/id");
const { embedTextsInPython } = require("./src/services/ml/pythonClient");

const SAMPLE_PASSWORD = "Pass@123";

const SAMPLE_USERS = [
  {
    key: "owner_1",
    name: "Nimal Perera",
    email: "lostfound.sample1@sliit.lk",
  },
  {
    key: "owner_2",
    name: "Kavindi Silva",
    email: "lostfound.sample2@sliit.lk",
  },
  {
    key: "owner_3",
    name: "Malith Fernando",
    email: "lostfound.sample3@sliit.lk",
  },
];

const SAMPLE_POSTS = [
  {
    ownerKey: "owner_1",
    title: "Black Anker Power Bank",
    description:
      "Lost a black Anker PowerCore power bank near the library charging ports. It has a white cable, a small SLIIT sticker on the back, and a light scratch on one side.",
    location: "library",
    type: "LOST",
    category: "device",
    status: "OPEN",
  },
  {
    ownerKey: "owner_2",
    title: "Anker Power Bank Found At Library",
    description:
      "Found a black Anker power bank at the library charging station with a white USB cable attached. There is a SLIIT sticker on the back and the casing is slightly scratched.",
    location: "library",
    type: "FOUND",
    category: "device",
    status: "OPEN",
    claimQuestion: "What sticker and cable were attached to this power bank?",
  },
  {
    ownerKey: "owner_3",
    title: "Black Anker Power Bank In Cafeteria",
    description:
      "Found a black Anker power bank on a cafeteria table. It has a black cable, no sticker, and looks newer than most used devices.",
    location: "main-basement-canteen",
    type: "FOUND",
    category: "device",
    status: "OPEN",
    claimQuestion: "Which cable color was attached when you lost it?",
  },
  {
    ownerKey: "owner_2",
    title: "White Xiaomi Power Bank",
    description:
      "Found a white Xiaomi power bank near the library charging area. It has a small university logo sticker and no visible damage.",
    location: "library",
    type: "FOUND",
    category: "device",
    status: "OPEN",
    claimQuestion: "Describe the brand and sticker on the device.",
  },
  {
    ownerKey: "owner_1",
    title: "Grey Sony Power Bank",
    description:
      "Found a grey Sony power bank in the engineering computer lab. It has a scratch on the corner and no cables attached.",
    location: "engineering-building",
    type: "FOUND",
    category: "device",
    status: "OPEN",
    claimQuestion: "What marks or damage does this item have?",
  },
  {
    ownerKey: "owner_3",
    title: "Black Phone Case Near Library",
    description:
      "Found a black phone case near the library entrance with a SLIIT sticker on the back and a tiny keychain attached to one corner.",
    location: "library",
    type: "FOUND",
    category: "other",
    status: "OPEN",
    claimQuestion: "What was attached to the phone case?",
  },
  {
    ownerKey: "owner_1",
    title: "Blue Atlas Notebook",
    description:
      "Found a blue Atlas notebook in the main hall. The name Vishwa is written on the inside front page in blue ink.",
    location: "main-building",
    type: "FOUND",
    category: "book",
    status: "OPEN",
    claimQuestion: "What name is written inside the notebook?",
  },
  {
    ownerKey: "owner_2",
    title: "Yale Keys With Cricket Keychain",
    description:
      "Found a set of Yale keys near the common room with a small cricket bat keychain attached to the ring.",
    location: "other",
    type: "FOUND",
    category: "keys",
    status: "OPEN",
    claimQuestion: "What keychain shape was attached to the keys?",
  },
  {
    ownerKey: "owner_3",
    title: "Brown Wallet Missing Near Parking",
    description:
      "Lost a brown leather wallet near the parking area. It contains a SLIIT student ID, two bank cards, and a folded bus pass inside the cash slot.",
    location: "parking",
    type: "LOST",
    category: "wallet",
    status: "OPEN",
  },
  {
    ownerKey: "owner_1",
    title: "Brown Leather Wallet Found",
    description:
      "Found a brown leather wallet beside the parking entrance. There is a student ID card inside and a folded bus pass tucked into the notes section.",
    location: "parking",
    type: "FOUND",
    category: "wallet",
    status: "OPEN",
    claimQuestion: "Which documents were inside the wallet?",
  },
  {
    ownerKey: "owner_2",
    title: "Student ID Card Lost In Auditorium",
    description:
      "Lost my student ID card after a session in the auditorium. The card is in a clear plastic holder with a red lanyard and my photo is slightly faded.",
    location: "auditorium",
    type: "LOST",
    category: "id-card",
    status: "OPEN",
  },
  {
    ownerKey: "owner_3",
    title: "ID Card Found With Red Lanyard",
    description:
      "Found a SLIIT student ID card in a transparent holder with a red lanyard near the auditorium exit. The photo on the card looks a little faded.",
    location: "auditorium",
    type: "FOUND",
    category: "id-card",
    status: "OPEN",
    claimQuestion: "What color was the lanyard on the ID card?",
  },
];

function buildSearchText(post) {
  return [post.title, post.description, post.category, post.location, post.type].filter(Boolean).join(" ").trim();
}

async function ensureSampleUser(definition) {
  const existing = await User.findOne({ email: definition.email });
  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10);
  return await User.create({
    id: makeId("u_"),
    name: definition.name,
    email: definition.email,
    passwordHash,
    role: ROLES.STUDENT,
  });
}

async function embedPosts(posts) {
  const texts = posts.map(buildSearchText);
  try {
    const response = await embedTextsInPython(texts);
    const embeddings = Array.isArray(response?.embeddings) ? response.embeddings : [];
    return posts.map((post, index) => ({
      ...post,
      searchText: texts[index],
      descriptionEmbedding: Array.isArray(embeddings[index]) ? embeddings[index].map((value) => Number(value) || 0) : [],
      embeddingModel: Array.isArray(embeddings[index]) && embeddings[index].length ? "all-MiniLM-L6-v2" : "",
      embeddingUpdatedAt: Array.isArray(embeddings[index]) && embeddings[index].length ? new Date() : null,
    }));
  } catch (error) {
    console.warn("Embedding generation skipped:", error.message);
    return posts.map((post, index) => ({
      ...post,
      searchText: texts[index],
      descriptionEmbedding: [],
      embeddingModel: "",
      embeddingUpdatedAt: null,
    }));
  }
}

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const usersByKey = {};
    for (const definition of SAMPLE_USERS) {
      usersByKey[definition.key] = await ensureSampleUser(definition);
    }

    const preparedPosts = await embedPosts(
      SAMPLE_POSTS.map((post) => {
        const owner = usersByKey[post.ownerKey];
        return {
          ...post,
          id: makeId("lf_"),
          userId: owner.id,
          userName: owner.name,
          userEmail: owner.email,
          titleKey: post.title.toLowerCase(),
          imageUrl: "",
          claims: [],
          foundReports: [],
          acceptedClaimId: "",
        };
      })
    );

    const sampleEmails = SAMPLE_USERS.map((user) => user.email);
    const owners = await User.find({ email: { $in: sampleEmails } }).lean();
    const ownerIds = owners.map((owner) => owner.id);

    await LostFoundItem.deleteMany({ userId: { $in: ownerIds } });
    await LostFoundItem.insertMany(preparedPosts);

    console.log(`Seeded ${preparedPosts.length} Lost and Found sample posts`);
    console.log("Sample student logins:");
    for (const user of SAMPLE_USERS) {
      console.log(`- ${user.email} / ${SAMPLE_PASSWORD}`);
    }
    console.log("If the Python ML service is running, embeddings were stored with the sample posts.");
  } catch (err) {
    console.error("Lost and Found seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

seed();
