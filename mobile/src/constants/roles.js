export const ROLES = {
  STUDENT: "student",
  BATCH_REP: "batchRep",
  CANTEEN_OWNER: "canteenOwner",
  ADMIN: "admin",
};

export const ROLE_OPTIONS = [
  { label: "Student", value: ROLES.STUDENT },
  { label: "Batch Rep", value: ROLES.BATCH_REP },
  { label: "Canteen Owner", value: ROLES.CANTEEN_OWNER },
];

export function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "admin") return ROLES.ADMIN;
  if (value === "rep" || value === "batchrep" || value === "batch_rep") return ROLES.BATCH_REP;
  if (value === "canteenowner" || value === "canteen_owner" || value === "canteen owner" || value === "owner") {
    return ROLES.CANTEEN_OWNER;
  }
  return ROLES.STUDENT;
}
