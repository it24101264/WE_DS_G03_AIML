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
  parkingSlots: () => apiRequest("/parking/slots"),
  parkVehicle: (payload) => apiRequest("/parking/park", { method: "POST", body: payload }),
  leaveParking: (payload) => apiRequest("/parking/leave", { method: "POST", body: payload }),
  myParkingSlot: (username) => apiRequest(`/parking/my-slot/${encodeURIComponent(username)}`),
  createLostFoundItem: (payload) => apiRequest("/lost-found/items", { method: "POST", body: payload }),
  lostFoundItems: (params = {}) => {
    const queryParts = [];
    if (params.type) queryParts.push(`type=${encodeURIComponent(params.type)}`);
    if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.location) queryParts.push(`location=${encodeURIComponent(params.location)}`);
    if (params.itemCategory) queryParts.push(`itemCategory=${encodeURIComponent(params.itemCategory)}`);
    if (params.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
    const suffix = queryParts.length ? `?${queryParts.join("&")}` : "";
    return apiRequest(`/lost-found/items${suffix}`);
  },
  myLostFoundItems: () => apiRequest("/lost-found/items/mine"),
  lostFoundItemById: (id) => apiRequest(`/lost-found/items/${encodeURIComponent(id)}`),
  updateLostFoundItem: (id, payload) =>
    apiRequest(`/lost-found/items/${encodeURIComponent(id)}`, { method: "PATCH", body: payload }),
  claimLostFoundItem: (id, payload) =>
    apiRequest(`/lost-found/items/${encodeURIComponent(id)}/claims`, { method: "POST", body: payload }),
  reviewLostFoundClaim: (id, claimId, payload) =>
    apiRequest(`/lost-found/items/${encodeURIComponent(id)}/claims/${encodeURIComponent(claimId)}/review`, {
      method: "PATCH",
      body: payload,
    }),
  updateLostFoundStatus: (id, payload) =>
    apiRequest(`/lost-found/items/${encodeURIComponent(id)}/status`, { method: "PATCH", body: payload }),
};
