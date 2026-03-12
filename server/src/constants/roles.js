const ROLES = {
  STUDENT: "student",
  BATCH_REP: "batchRep",
  CANTEEN_OWNER: "canteenOwner",
  ADMIN: "admin",
};

const ROLE_ALIASES = new Map([
  ["student", ROLES.STUDENT],
  ["batchrep", ROLES.BATCH_REP],
  ["batch_rep", ROLES.BATCH_REP],
  ["rep", ROLES.BATCH_REP],
  ["canteenowner", ROLES.CANTEEN_OWNER],
  ["canteen_owner", ROLES.CANTEEN_OWNER],
  ["canteen owner", ROLES.CANTEEN_OWNER],
  ["owner", ROLES.CANTEEN_OWNER],
  ["admin", ROLES.ADMIN],
]);

function normalizeRole(role, fallback = ROLES.STUDENT) {
  const value = String(role || "").trim().toLowerCase();
  return ROLE_ALIASES.get(value) || fallback;
}

module.exports = {
  ROLES,
  normalizeRole,
  roleValues: Object.values(ROLES),
};
