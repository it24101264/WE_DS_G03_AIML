import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "./config";


async function getToken() {
  return await AsyncStorage.getItem("token");
}

export async function apiRequest(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

export const api = {
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: payload }),
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: payload }),
  me: () => apiRequest("/auth/me"),

  createRequest: (payload) => apiRequest("/kuppi/requests", { method: "POST", body: payload }),
  myRequests: () => apiRequest("/kuppi/requests/mine"),
  sessions: () => apiRequest("/kuppi/sessions"),
  decideSession: (id, payload) => apiRequest(`/kuppi/sessions/${id}/decision`, { method: "PATCH", body: payload }),

  mlGroups: (minSize = 5, maxClusters = 8, topClusters = 3) =>
    apiRequest(
      `/ml/groups?minSize=${minSize}&maxClusters=${maxClusters}&topClusters=${topClusters}`
    ),
  applyMlGroups: (minSize = 5, maxClusters = 8, topClusters = 3) =>
    apiRequest("/ml/apply-groups", {
      method: "POST",
      body: { minSize, maxClusters, topClusters },
    }),
};
