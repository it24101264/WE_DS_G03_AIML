from typing import Any, Dict, List

from ml_logic import clean_text, cosine_similarity, embed_texts, token_overlap_score


LOST_FOUND_EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def clean_lost_found_text(value: str) -> str:
    return clean_text(value)


def build_lost_found_search_text(
    title: str = "",
    description: str = "",
    category: str = "",
    location: str = "",
    item_type: str = "",
) -> str:
    parts = [title, description, category, location, item_type]
    return " ".join(clean_lost_found_text(part) for part in parts if clean_lost_found_text(part))


def embed_lost_found_texts(texts: List[str]) -> Dict[str, Any]:
    cleaned_texts = [clean_lost_found_text(text) for text in texts]
    vectors = embed_texts(cleaned_texts)
    return {
        "feature": "lost_found",
        "model": LOST_FOUND_EMBEDDING_MODEL,
        "embeddings": vectors.tolist(),
    }


def _metadata_score(query_metadata: Dict[str, Any], candidate: Dict[str, Any]) -> Dict[str, Any]:
    checks = []
    reasons = []

    query_category = clean_lost_found_text(query_metadata.get("category", "")).lower()
    candidate_category = clean_lost_found_text(candidate.get("category", "")).lower()
    if query_category:
        matched = query_category == candidate_category
        checks.append(1.0 if matched else 0.0)
        if matched:
            reasons.append("Same category")

    query_location = clean_lost_found_text(query_metadata.get("location", "")).lower()
    candidate_location = clean_lost_found_text(candidate.get("location", "")).lower()
    if query_location:
        matched = query_location == candidate_location
        checks.append(1.0 if matched else 0.0)
        if matched:
            reasons.append("Same location")

    if not checks:
        return {"score": 0.0, "reasons": reasons}
    return {"score": sum(checks) / len(checks), "reasons": reasons}


def rank_lost_found_matches(
    query_text: str,
    query_metadata: Dict[str, Any],
    candidates: List[Dict[str, Any]],
    limit: int = 8,
) -> Dict[str, Any]:
    safe_query = clean_lost_found_text(query_text)
    safe_candidates = [candidate for candidate in candidates if clean_lost_found_text(candidate.get("id", ""))]
    bounded_limit = max(1, min(20, int(limit or 8)))

    if not safe_query or not safe_candidates:
        return {"feature": "lost_found", "results": []}

    candidate_texts = [
        build_lost_found_search_text(
            title=candidate.get("title", ""),
            description=candidate.get("description", ""),
            category=candidate.get("category", ""),
            location=candidate.get("location", ""),
            item_type=candidate.get("type", ""),
        )
        for candidate in safe_candidates
    ]
    vectors = embed_texts([safe_query, *candidate_texts])
    query_vector = vectors[0]

    ranked = []
    for index, candidate in enumerate(safe_candidates):
        semantic = cosine_similarity(query_vector, vectors[index + 1])
        keyword = token_overlap_score(safe_query, candidate_texts[index])
        metadata = _metadata_score(query_metadata or {}, candidate)
        score = (semantic * 0.70) + (keyword["score"] * 0.20) + (metadata["score"] * 0.10)

        reasons = []
        if semantic >= 0.45:
            reasons.append("Similar description")
        reasons.extend(metadata["reasons"])
        if keyword["tokens"]:
            reasons.append(f"Shared keywords: {', '.join(keyword['tokens'][:4])}")
        if not reasons and semantic > 0:
            reasons.append("Possible semantic match")

        ranked.append({
            "id": clean_lost_found_text(candidate.get("id", "")),
            "similarityScore": round(max(0.0, min(1.0, score)), 4),
            "matchReasons": reasons[:4],
            "matchBreakdown": {
                "semantic": round(semantic, 4),
                "keyword": round(keyword["score"], 4),
                "metadata": round(metadata["score"], 4),
            },
        })

    ranked = [item for item in ranked if item["similarityScore"] > 0]
    ranked.sort(key=lambda item: item["similarityScore"], reverse=True)
    return {"feature": "lost_found", "results": ranked[:bounded_limit]}
