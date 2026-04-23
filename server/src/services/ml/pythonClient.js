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

async function embedTextsInPython(texts = []) {
  const resp = await fetch(`${PYTHON_ML_URL}/ml/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Python ML error ${resp.status}: ${text}`);
  }

  return await resp.json();
}

async function embedLostFoundTextsInPython(texts = []) {
  const resp = await fetch(`${PYTHON_ML_URL}/ml/lost-found/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Python LostFound ML error ${resp.status}: ${text}`);
  }

  return await resp.json();
}

async function embedMarketplaceTextsInPython(texts = []) {
  const resp = await fetch(`${PYTHON_ML_URL}/ml/marketplace/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Python Marketplace ML error ${resp.status}: ${text}`);
  }

  return await resp.json();
}

async function rankLostFoundInPython({ queryText, queryMetadata = {}, candidates = [], limit = 8 }) {
  const resp = await fetch(`${PYTHON_ML_URL}/ml/lost-found/rank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_text: queryText,
      query_metadata: queryMetadata,
      candidates,
      limit,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Python LostFound rank error ${resp.status}: ${text}`);
  }

  return await resp.json();
}

async function rankMarketplaceInPython({ queryText, candidates = [], limit = 8 }) {
  const resp = await fetch(`${PYTHON_ML_URL}/ml/marketplace/rank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_text: queryText,
      candidates,
      limit,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Python Marketplace rank error ${resp.status}: ${text}`);
  }

  return await resp.json();
}

module.exports = {
  fetchGroupsFromPython,
  embedTextsInPython,
  embedLostFoundTextsInPython,
  embedMarketplaceTextsInPython,
  rankLostFoundInPython,
  rankMarketplaceInPython,
};
