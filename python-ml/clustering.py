import math
from typing import Any, Dict, List, Optional

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# Silhouette search is O(n^2) — skip it for very large datasets
_SILHOUETTE_MAX_ITEMS = 300


def _cohesion_score(embeddings: np.ndarray, member_indices: List[int]) -> float:
    """Average pairwise cosine similarity within a cluster (0 = scattered, 1 = identical)."""
    if len(member_indices) < 2:
        return 1.0
    vecs = embeddings[member_indices]
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms = np.where(norms < 1e-9, 1.0, norms)
    normed = vecs / norms
    sim_matrix = normed @ normed.T
    n = len(member_indices)
    off_diag = sim_matrix.sum() - n  # exclude self-similarity diagonal
    return float(np.clip(off_diag / max(n * (n - 1), 1), 0.0, 1.0))


def _pick_k_silhouette(embeddings: np.ndarray, upper: int, random_state: int) -> int:
    """Try every K from 2..upper and return the one with the best silhouette score."""
    best_k, best_score = 2, -1.0
    for k in range(2, upper + 1):
        model = KMeans(n_clusters=k, random_state=random_state, n_init=10)
        labels = model.fit_predict(embeddings)
        if len(set(labels)) < 2:
            continue
        score = float(silhouette_score(embeddings, labels))
        if score > best_score:
            best_score, best_k = score, k
    return best_k


def pick_cluster_count(
    embeddings: np.ndarray,
    item_count: int,
    max_clusters: int,
    requested_clusters: Optional[int] = None,
    random_state: int = 42,
) -> int:
    if item_count <= 1:
        return 1

    upper_bound = max(2, min(max_clusters, item_count - 1))

    if requested_clusters is not None and requested_clusters > 0:
        return max(2, min(requested_clusters, upper_bound))

    if item_count <= _SILHOUETTE_MAX_ITEMS:
        return _pick_k_silhouette(embeddings, upper_bound, random_state)

    # For large datasets: sqrt heuristic is fast enough
    return max(2, min(int(math.sqrt(item_count)), upper_bound))


def cluster_queries(
    embeddings: np.ndarray,
    items: List[Dict[str, str]],
    max_clusters: int,
    requested_clusters: Optional[int] = None,
    random_state: int = 42,
) -> Dict[str, Any]:
    item_count = len(items)
    if item_count == 0:
        return {"cluster_count": 0, "labels": [], "clusters": []}

    if item_count == 1:
        return {
            "cluster_count": 1,
            "labels": [0],
            "clusters": [{
                "cluster_id": 0,
                "request_ids": [items[0]["id"]],
                "queries": [items[0]["text"]],
                "size": 1,
                "cohesion": 1.0,
            }],
        }

    cluster_count = pick_cluster_count(embeddings, item_count, max_clusters, requested_clusters, random_state)
    model = KMeans(n_clusters=cluster_count, random_state=random_state, n_init=10)
    labels = model.fit_predict(embeddings)

    grouped: Dict[int, List[int]] = {}
    for index, cluster_label in enumerate(labels):
        grouped.setdefault(int(cluster_label), []).append(index)

    clusters = []
    for cluster_id, member_indexes in grouped.items():
        clusters.append({
            "cluster_id": cluster_id,
            "request_ids": [items[i]["id"] for i in member_indexes],
            "queries": [items[i]["text"] for i in member_indexes],
            "size": len(member_indexes),
            "cohesion": round(_cohesion_score(embeddings, member_indexes), 3),
        })

    clusters.sort(key=lambda c: c["size"], reverse=True)
    return {"cluster_count": cluster_count, "labels": labels.tolist(), "clusters": clusters}
