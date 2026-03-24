import Constants from "expo-constants";
import { Platform } from "react-native";

function inferHost() {
  const fromEnv = process.env.EXPO_PUBLIC_API_HOST;
  if (fromEnv) return fromEnv;

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    return String(hostUri).split(":")[0];
  }

  return Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
}

const explicitBase = process.env.EXPO_PUBLIC_API_BASE;
const explicitRoot = process.env.EXPO_PUBLIC_API_ROOT;

export const API_ROOT = explicitRoot || `http://${inferHost()}:5001/api`;
export const API_BASE = explicitBase || `${API_ROOT}/v1`;

export const API_URLS = {
    AUTH: `${API_BASE}/auth`,
    ADMIN: `${API_BASE}/admin`,
    CANTEEN: `${API_BASE}/canteen`,
    STUDENT: `${API_BASE}/student`,
  STUDY_AREAS: `${API_ROOT}/study-areas`,
};
