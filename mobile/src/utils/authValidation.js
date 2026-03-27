import { ROLES, normalizeRole } from "../constants/roles";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTERABLE_ROLES = new Set([ROLES.STUDENT, ROLES.BATCH_REP, ROLES.CANTEEN_OWNER]);

function cleanText(value) {
  return String(value || "").trim();
}

function validateEmail(email) {
  if (!email) return "Email is required";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address";
  return null;
}

function validateRegisterPassword(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 72) return "Password must be 72 characters or fewer";
  return null;
}

function validateLoginPassword(password) {
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

export function validateLoginForm(values = {}) {
  const email = cleanText(values.email).toLowerCase();
  const password = String(values.password || "");
  const message = validateEmail(email) || validateLoginPassword(password);

  return {
    isValid: !message,
    message,
    values: { email, password },
  };
}

export function validateRegisterForm(values = {}) {
  const name = cleanText(values.name);
  const email = cleanText(values.email).toLowerCase();
  const password = String(values.password || "");
  const role = normalizeRole(values.role || ROLES.STUDENT);
  const canteenName = cleanText(values.canteenName);
  const canteenLocation = cleanText(values.canteenLocation);

  const message =
    validateName(name) ||
    validateEmail(email) ||
    validateRegisterPassword(password) ||
    (!REGISTERABLE_ROLES.has(role) ? "Select a valid role" : null) ||
    (role === ROLES.CANTEEN_OWNER
      ? validateCanteenField(canteenName, "Canteen name") || validateCanteenField(canteenLocation, "Canteen location")
      : null);

  return {
    isValid: !message,
    message,
    values: {
      name,
      email,
      password,
      role,
      canteenName,
      canteenLocation,
    },
  };
}
