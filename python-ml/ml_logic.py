import math
import re
from collections import Counter
from typing import Any, Dict, List

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer

# Optional semantic embeddings via sentence-transformers.
# The service gracefully falls back to TF-IDF if unavailable.
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

_EMBED_MODEL = None

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_+-]{1,}")
_STOPWORDS = {
    "about", "after", "again", "also", "and", "any", "are", "been", "before", "being",
    "can", "could", "does", "for", "from", "help", "how", "into", "need", "please", "that",
    "the", "their", "them", "there", "these", "this", "using", "want", "with", "would", "you",
}


def _clean_text(value: str) -> str:
    return " ".join(str(value or "").strip().split())


def clean_text(value: str) -> str:
    return _clean_text(value)


def _get_embed_model():
    global _EMBED_MODEL
    if SentenceTransformer is None:
        return None
    if _EMBED_MODEL is None:
        _EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return _EMBED_MODEL


def embed_texts(texts: List[str]) -> np.ndarray:
    cleaned_texts = [_clean_text(text) for text in texts]
    if not cleaned_texts:
        return np.empty((0, 0))

    model = _get_embed_model()
    if model is not None:
        try:
            return np.asarray(model.encode(cleaned_texts, normalize_embeddings=True))
        except Exception:
            pass

    vectorizer = TfidfVectorizer(stop_words="english", max_features=2000, ngram_range=(1, 2))
    try:
        vectors = vectorizer.fit_transform(cleaned_texts).toarray()
    except ValueError:
        return np.zeros((len(cleaned_texts), 1))
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


def _vectorize(texts: List[str]) -> np.ndarray:
    return embed_texts(texts)


def _pick_cluster_count(item_count: int, max_clusters: int) -> int:
    if item_count <= 1:
        return 1
    bounded_max = max(2, min(max_clusters, item_count))
    return max(2, min(bounded_max, int(math.sqrt(item_count)) + 1))


def _tokenize(text: str) -> List[str]:
    tokens = [t.lower() for t in _WORD_RE.findall(text)]
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 2]


def tokenize(text: str) -> List[str]:
    return _tokenize(text)


def clamp01(value: float) -> float:
    if not math.isfinite(value):
        return 0.0
    return max(0.0, min(1.0, float(value)))


def cosine_similarity(left, right) -> float:
    left_vec = np.asarray(left, dtype=float)
    right_vec = np.asarray(right, dtype=float)
    if left_vec.size == 0 or right_vec.size == 0 or left_vec.shape != right_vec.shape:
        return 0.0

    left_norm = float(np.linalg.norm(left_vec))
    right_norm = float(np.linalg.norm(right_vec))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return clamp01(float(np.dot(left_vec, right_vec) / (left_norm * right_norm)))


def token_overlap_score(query_text: str, candidate_text: str) -> Dict[str, Any]:
    query_tokens = set(_tokenize(query_text))
    candidate_tokens = set(_tokenize(candidate_text))
    if not query_tokens or not candidate_tokens:
        return {"score": 0.0, "tokens": []}

    shared = sorted(query_tokens.intersection(candidate_tokens))
    score = len(shared) / max(1, min(len(query_tokens), len(candidate_tokens)))
    return {"score": clamp01(score), "tokens": shared}


def _label_cluster(texts: List[str]) -> Dict[str, Any]:
    tokens = []
    for text in texts:
        tokens.extend(_tokenize(text))

    if not tokens:
        return {"topic": "General Discussion", "keywords": []}

    top = [token for token, _count in Counter(tokens).most_common(5)]
    topic = " ".join(top[:3]).title()
    return {"topic": topic, "keywords": top}


def group_requests(items, min_size=5, max_clusters=8, top_clusters=3):
    if not items:
        return []

    normalized_items = [
        {"id": str(item.get("id")), "text": _clean_text(item.get("text", ""))}
        for item in items
        if str(item.get("id", "")).strip()
    ]

    if not normalized_items:
        return []

    texts = [item["text"] for item in normalized_items]
    ids = [item["id"] for item in normalized_items]

    if len(ids) < max(2, min_size):
        label = _label_cluster(texts)
        return [{
            "group_id": "g_1",
            "request_ids": ids,
            "size": len(ids),
            "topic": label["topic"],
            "keywords": label["keywords"],
        }]

    embeddings = _vectorize(texts)
    cluster_count = _pick_cluster_count(len(ids), max_clusters)

    model = KMeans(n_clusters=cluster_count, random_state=42, n_init="auto")
    labels = model.fit_predict(embeddings)

    grouped: Dict[int, List[int]] = {}
    for idx, cluster_label in enumerate(labels):
        grouped.setdefault(int(cluster_label), []).append(idx)

    ordered_groups = sorted(grouped.values(), key=len, reverse=True)

    results = []
    gcount = 0
    for member_indexes in ordered_groups:
        if len(member_indexes) < min_size:
            continue
        if len(results) >= max(1, int(top_clusters)):
            break

        member_texts = [texts[i] for i in member_indexes]
        member_ids = [ids[i] for i in member_indexes]
        label = _label_cluster(member_texts)
        gcount += 1
        results.append({
            "group_id": f"g_{gcount}",
            "request_ids": member_ids,
            "size": len(member_ids),
            "topic": label["topic"],
            "keywords": label["keywords"],
        })

    return results
