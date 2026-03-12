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

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_+-]{1,}")
_STOPWORDS = {
    "about", "after", "again", "also", "and", "any", "are", "been", "before", "being",
    "can", "could", "does", "for", "from", "help", "how", "into", "need", "please", "that",
    "the", "their", "them", "there", "these", "this", "using", "want", "with", "would", "you",
}


def _clean_text(value: str) -> str:
    return " ".join(str(value or "").strip().split())


def _vectorize(texts: List[str]) -> np.ndarray:
    if SentenceTransformer is not None:
        try:
            model = SentenceTransformer("all-MiniLM-L6-v2")
            return np.asarray(model.encode(texts, normalize_embeddings=True))
        except Exception:
            pass

    vectorizer = TfidfVectorizer(stop_words="english", max_features=2000, ngram_range=(1, 2))
    return vectorizer.fit_transform(texts).toarray()


def _pick_cluster_count(item_count: int, max_clusters: int) -> int:
    if item_count <= 1:
        return 1
    bounded_max = max(2, min(max_clusters, item_count))
    return max(2, min(bounded_max, int(math.sqrt(item_count)) + 1))


def _tokenize(text: str) -> List[str]:
    tokens = [t.lower() for t in _WORD_RE.findall(text)]
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 2]


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
