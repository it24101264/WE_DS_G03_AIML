const { normalizeRole, ROLES } = require("../constants/roles");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SELF_REGISTER_ROLE_INPUTS = new Set([
  "student",
  "batchrep",
  "batch_rep",
  "rep",
  "canteenowner",
  "canteen_owner",
  "canteen owner",
  "owner",
  "admin",
]);

function cleanText(value) {
  return String(value || "").trim();
}

function validateEmail(email) {
  if (!email) return "Email is required";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address";
  return null;
}

function validatePasswordForRegister(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 72) return "Password must be 72 characters or fewer";
  return null;
}

function validatePasswordForLogin(password) {
  if (!password) return "Password is required";
  if (password.length > 72) return "Password must be 72 characters or fewer";
  return null;
}

function validateName(name) {
  if (!name) return "Name is required";
  if (name.length < 2) return "Name must be at least 2 characters";
  if (name.length > 60) return "Name must be 60 characters or fewer";
  return null;
}

function validateCanteenField(value, label) {
  if (!value) return `${label} is required`;
  if (value.length < 2) return `${label} must be at least 2 characters`;
  if (value.length > 80) return `${label} must be 80 characters or fewer`;
  return null;
}

function validateRegisterPayload(payload = {}) {
  const name = cleanText(payload.name);
  const email = cleanText(payload.email).toLowerCase();
  const password = String(payload.password || "");
  const roleInput = cleanText(payload.role);
  const normalizedRole = normalizeRole(roleInput || ROLES.STUDENT, ROLES.STUDENT);
  const canteenName = cleanText(payload.canteenName);
  const canteenLocation = cleanText(payload.canteenLocation);

  const invalidRole =
    roleInput &&
    !SELF_REGISTER_ROLE_INPUTS.has(roleInput.toLowerCase()) &&
    normalizedRole === ROLES.STUDENT;

  const message =
    validateName(name) ||
    validateEmail(email) ||
    validatePasswordForRegister(password) ||
    (invalidRole ? "Select a valid role" : null) ||
    (normalizedRole === ROLES.ADMIN ? "Admin accounts cannot be self-registered" : null) ||
    (normalizedRole === ROLES.CANTEEN_OWNER
      ? validateCanteenField(canteenName, "Canteen name") || validateCanteenField(canteenLocation, "Canteen location")
      : null);

  return {
    isValid: !message,
    message,
    values: {
      name,
      email,
      password,
      role: normalizedRole,
      canteenName,
      canteenLocation,
    },
  };
}

function validateLoginPayload(payload = {}) {
  const email = cleanText(payload.email).toLowerCase();
  const password = String(payload.password || "");
  const message = validateEmail(email) || validatePasswordForLogin(password);

  return {
    isValid: !message,
    message,
    values: { email, password },
  };
}

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
};
