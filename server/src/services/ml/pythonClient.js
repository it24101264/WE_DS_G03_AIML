const PYTHON_ML_URL = process.env.PYTHON_ML_URL || "http://127.0.0.1:8001";

async function fetchGroupsFromPython({ items, minSize = 5, maxClusters = 8, topClusters = 3 }) {
  const resp = await fetch(`${PYTHON_ML_URL}/ml/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      min_size: minSize,
      max_clusters: maxClusters,
      top_clusters: topClusters,
      items,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Python ML error ${resp.status}: ${text}`);
  }

  return await resp.json();
}

module.exports = { fetchGroupsFromPython };
