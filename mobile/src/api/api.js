const BASE_URL = "http://localhost:5000/api/study-areas";

async function request(url, options = {}) {
  console.log("Request URL:", url);
  console.log("Request options:", options);

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const text = await response.text();
  console.log("Raw response:", text);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server returned invalid JSON");
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const studyAreaApi = {
  getAll: () => request(BASE_URL),

  getById: (id) => request(`${BASE_URL}/${id}`),

  create: (payload) =>
    request(BASE_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  update: (id, payload) =>
    request(`${BASE_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  delete: (id) =>
    request(`${BASE_URL}/${id}`, {
      method: "DELETE"
    }),

  updateCount: (id, action) =>
    request(`${BASE_URL}/update-count/${id}`, {
      method: "POST",
      body: JSON.stringify({ action })
    })
};