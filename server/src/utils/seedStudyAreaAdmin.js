const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { ROLES } = require("../constants/roles");
const { makeId } = require("./id");

async function seedStudyAreaAdmin() {
  const email = String(process.env.DEFAULT_ADMIN_EMAIL || process.env.STUDY_AREA_ADMIN_EMAIL || "admin@sliit.local").trim().toLowerCase();
  const password = String(process.env.DEFAULT_ADMIN_PASSWORD || process.env.STUDY_AREA_ADMIN_PASSWORD || "Admin@2026");
  const name = String(process.env.DEFAULT_ADMIN_NAME || process.env.STUDY_AREA_ADMIN_NAME || "System Admin").trim();

  const existing = await User.findOne({ email });
  const passwordHash = await bcrypt.hash(password, 10);

  if (!existing) {
    await User.create({
      id: makeId("u_"),
      name,
      email,
      passwordHash,
      role: ROLES.ADMIN,
      isBanned: false,
      bannedAt: null,
      bannedReason: "",
    });
    console.log(`Seeded default admin: ${email}`);
    return;
  }

  let shouldSave = false;

  if (existing.role !== ROLES.ADMIN) {
    existing.role = ROLES.ADMIN;
    shouldSave = true;
  }

  if (existing.isBanned) {
    existing.isBanned = false;
    existing.bannedAt = null;
    existing.bannedReason = "";
    shouldSave = true;
  }

  if (existing.name !== name) {
    existing.name = name;
    shouldSave = true;
  }

  const matchesPassword = await bcrypt.compare(password, existing.passwordHash);
  if (!matchesPassword) {
    existing.passwordHash = passwordHash;
    shouldSave = true;
  }

  if (shouldSave) {
    await existing.save();
    console.log(`Updated default admin: ${email}`);
  }
}

module.exports = { seedStudyAreaAdmin };
