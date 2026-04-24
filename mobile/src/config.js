import Constants from "expo-constants";
import { Platform } from "react-native";

function normalizeHost(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  return raw
    .replace(/^https?:\/\//i, "")
    .split(/[/:]/)[0]
    .replace(/[^a-zA-Z0-9.-]/g, "");
}

function normalizeBase(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!/^https?:$/.test(parsed.protocol)) return "";
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function inferHost() {
  const fromEnv = normalizeHost(process.env.EXPO_PUBLIC_API_HOST);
  if (fromEnv) return fromEnv;

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (hostUri) return normalizeHost(hostUri);

  return Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
}

const explicitBase = normalizeBase(process.env.EXPO_PUBLIC_API_BASE);
const explicitHost = normalizeHost(process.env.EXPO_PUBLIC_API_HOST);

// API base with auto-detection for development
// For physical devices: Set EXPO_PUBLIC_API_HOST env var to your machine's IP (e.g., 192.168.1.x)
// For emulators: Will auto-detect from Expo debugger host or use Android emulator defaults
export const API_BASE = explicitBase || `http://${explicitHost || inferHost()}:5001/api/v1`;

export const API_URLS = {
  AUTH: `${API_BASE}/auth`,
  ADMIN: `${API_BASE}/admin`,
  CANTEEN: `${API_BASE}/canteen`,
  STUDENT: `${API_BASE}/student`,
};
