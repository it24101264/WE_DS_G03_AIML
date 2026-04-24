import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "./config";


async function getToken() {
  return await AsyncStorage.getItem("token");
}

export async function apiRequest(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${API_BASE}${path}`;
  console.log("API CALL ->", url);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const message = err?.message || "Network request failed";
    console.log("API NETWORK ERROR <-", method, url, message);
    throw new Error(`Network error (${method} ${url}): ${message}`);
  }

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    console.log("API ERROR <-", res.status, data?.message || data?.raw || "Unknown error");
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data;
}

export async function apiRequestRaw(path, { method = "GET" } = {}) {
  const headers = {};
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${API_BASE}${path}`;
  console.log("API CALL (raw) ->", url);

  let res;
  try {
    res = await fetch(url, { method, headers });
  } catch (err) {
    const message = err?.message || "Network request failed";
    console.log("API NETWORK ERROR <-", method, url, message);
    throw new Error(`Network error (${method} ${url}): ${message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    throw new Error(parsed?.message || text || `HTTP ${res.status}`);
  }

  return res;
}

export const api = {
  register: (payload) => apiRequest("/auth/register", { method: "POST", body: payload }),
  login: (payload) => apiRequest("/auth/login", { method: "POST", body: payload }),
  me: () => apiRequest("/auth/me"),
  updatePushToken: (expoPushToken) => apiRequest("/auth/push-token", { method: "PATCH", body: { expoPushToken } }),
  studyAreaAdminBootstrap: () => apiRequest("/study-areas/admin/bootstrap"),
  studyAreas: () => apiRequest("/study-areas"),
  syncStudyAreaPresence: (payload) => apiRequest("/study-areas/presence", { method: "POST", body: payload }),
  createStudyArea: (payload) => apiRequest("/study-areas", { method: "POST", body: payload }),
  updateStudyArea: (id, payload) => apiRequest(`/study-areas/${encodeURIComponent(id)}`, { method: "PUT", body: payload }),
  deleteStudyArea: (id) => apiRequest(`/study-areas/${encodeURIComponent(id)}`, { method: "DELETE" }),
  initiatePayment: (requestId, method) =>
    apiRequest(`/marketplace/requests/${encodeURIComponent(requestId)}/payment`, {
      method: "POST",
      body: { method },
    }),
  getPaymentStatus: (requestId) =>
    apiRequest(`/marketplace/requests/${encodeURIComponent(requestId)}/payment`),
  confirmMarketplaceCodCollected: (requestId) =>
    apiRequest(`/marketplace/requests/${encodeURIComponent(requestId)}/payment/cod-confirm`, { method: "PATCH" }),

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
  parkingVehicleProfiles: () => apiRequest("/parking/vehicles"),
  createParkingVehicleProfile: (payload) => apiRequest("/parking/vehicles", { method: "POST", body: payload }),
  updateParkingVehicleProfile: (id, payload) =>
    apiRequest(`/parking/vehicles/${encodeURIComponent(id)}`, { method: "PATCH", body: payload }),
  deleteParkingVehicleProfile: (id) =>
    apiRequest(`/parking/vehicles/${encodeURIComponent(id)}`, { method: "DELETE" }),
  parkingSlots: () => apiRequest("/parking/slots"),
  parkVehicle: (payload) => apiRequest("/parking/park", { method: "POST", body: payload }),
  leaveParking: (payload) => apiRequest("/parking/leave", { method: "POST", body: payload }),
  myParkingSlot: () => apiRequest("/parking/my-slot"),
  lostFoundItems: (params = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.location) search.set("location", params.location);
    if (params.type) search.set("type", params.type);
    if (params.category) search.set("category", params.category);
    if (params.status) search.set("status", params.status);
    const qs = search.toString();
    return apiRequest(`/lost-found${qs ? `?${qs}` : ""}`);
  
  },
  myLostFoundItems: () => apiRequest("/lost-found/mine"),
  lostFoundAiSearch: (payload) => apiRequest("/lost-found/ai-search", { method: "POST", body: payload }),
  lostFoundItemById: (id) => apiRequest(`/lost-found/${encodeURIComponent(id)}`),
  updateLostFoundItem: (id, payload) =>
    apiRequest(`/lost-found/${encodeURIComponent(id)}`, { method: "PATCH", body: payload }),
  deleteLostFoundItem: (id) =>
    apiRequest(`/lost-found/${encodeURIComponent(id)}`, { method: "DELETE" }),
  submitLostFoundFoundReport: (id, payload) =>
    apiRequest(`/lost-found/${encodeURIComponent(id)}/found-reports`, { method: "POST", body: payload }),
  submitLostFoundClaim: (id, payload) =>
    apiRequest(`/lost-found/${encodeURIComponent(id)}/claims`, { method: "POST", body: payload }),
  acceptLostFoundClaim: (id, claimId) =>
    apiRequest(`/lost-found/${encodeURIComponent(id)}/claims/${encodeURIComponent(claimId)}/accept`, {
      method: "PATCH",
    }),
  updateLostFoundItemStatus: (id, payload) =>
    apiRequest(`/lost-found/${encodeURIComponent(id)}/status`, { method: "PATCH", body: payload }),
  createLostFoundItem: (payload) => apiRequest("/lost-found", { method: "POST", body: payload }),
  marketplacePosts: (params = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.status) search.set("status", params.status);
    if (params.sort) search.set("sort", params.sort);
    const qs = search.toString();
    return apiRequest(`/marketplace${qs ? `?${qs}` : ""}`);
  },
  myMarketplacePosts: () => apiRequest("/marketplace/mine"),
  myMarketplaceFavorites: () => apiRequest("/marketplace/favorites/mine"),
  toggleMarketplaceFavorite: (postId) =>
    apiRequest(`/marketplace/favorites/${encodeURIComponent(postId)}/toggle`, { method: "POST" }),
  marketplacePostById: (id) => apiRequest(`/marketplace/${encodeURIComponent(id)}`),
  createMarketplacePost: (payload) => apiRequest("/marketplace", { method: "POST", body: payload }),
  updateMarketplacePost: (id, payload) =>
    apiRequest(`/marketplace/${encodeURIComponent(id)}`, { method: "PATCH", body: payload }),
  updateMarketplacePostStatus: (id, payload) =>
    apiRequest(`/marketplace/${encodeURIComponent(id)}/status`, { method: "PATCH", body: payload }),
  deleteMarketplacePost: (id) => apiRequest(`/marketplace/${encodeURIComponent(id)}`, { method: "DELETE" }),
  createMarketplaceRequest: (postId, payload) =>
    apiRequest(`/marketplace/${encodeURIComponent(postId)}/requests`, { method: "POST", body: payload }),
  myMarketplaceRequests: () => apiRequest("/marketplace/requests/mine"),
  sellerMarketplaceRequests: (params = {}) => {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    const qs = search.toString();
    return apiRequest(`/marketplace/requests/to-me${qs ? `?${qs}` : ""}`);
  },
  sellerMarketplaceAnalytics: (params = {}) => {
    const search = new URLSearchParams();
    if (params.start) search.set("start", params.start);
    if (params.end) search.set("end", params.end);
    const qs = search.toString();
    return apiRequest(`/marketplace/analytics/seller${qs ? `?${qs}` : ""}`);
  },
  sellerMarketplaceReportCsv: async (params = {}) => {
    const search = new URLSearchParams();
    if (params.start) search.set("start", params.start);
    if (params.end) search.set("end", params.end);
    const qs = search.toString();
    const res = await apiRequestRaw(`/marketplace/reports/seller.csv${qs ? `?${qs}` : ""}`);
    return await res.text();
  },
  sellerMarketplaceReportPdf: async (params = {}) => {
    const search = new URLSearchParams();
    if (params.start) search.set("start", params.start);
    if (params.end) search.set("end", params.end);
    const qs = search.toString();
    const res = await apiRequestRaw(`/marketplace/reports/seller.pdf${qs ? `?${qs}` : ""}`);
    return await res.arrayBuffer();
  },
  myMarketplaceCart: () => apiRequest("/marketplace/cart"),
  addMarketplaceCartItem: (payload) => apiRequest("/marketplace/cart/items", { method: "POST", body: payload }),
  checkoutMarketplaceCart: (payload) => apiRequest("/marketplace/cart/checkout", { method: "POST", body: payload }),
  clearMarketplaceCart: () => apiRequest("/marketplace/cart", { method: "DELETE" }),
  removeMarketplaceCartItem: (itemId) =>
    apiRequest(`/marketplace/cart/items/${encodeURIComponent(itemId)}`, { method: "DELETE" }),
  updateMarketplaceRequest: (requestId, payload) =>
    apiRequest(`/marketplace/requests/${encodeURIComponent(requestId)}`, { method: "PATCH", body: payload }),
  reofferMarketplaceRequest: (requestId, payload) =>
    apiRequest(`/marketplace/requests/${encodeURIComponent(requestId)}/reoffer`, { method: "PATCH", body: payload }),
  decideMarketplaceRequest: (requestId, payload) =>
    apiRequest(`/marketplace/requests/${encodeURIComponent(requestId)}/decision`, { method: "PATCH", body: payload }),
  deleteMarketplaceRequest: (requestId) =>
    apiRequest(`/marketplace/requests/${encodeURIComponent(requestId)}`, { method: "DELETE" }),
};
