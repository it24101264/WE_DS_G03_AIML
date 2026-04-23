import re
from typing import Any, Dict, List

from ml_logic import clean_text, cosine_similarity, embed_texts, token_overlap_score, tokenize


MARKETPLACE_EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def clean_marketplace_text(value: str) -> str:
    return clean_text(value)


def build_marketplace_search_text(
    title: str = "",
    description: str = "",
    seller_name: str = "",
) -> str:
    parts = [title, description, seller_name]
    return " ".join(clean_marketplace_text(part) for part in parts if clean_marketplace_text(part))


def embed_marketplace_texts(texts: List[str]) -> Dict[str, Any]:
    cleaned_texts = [clean_marketplace_text(text) for text in texts]
    vectors = embed_texts(cleaned_texts)
    return {
        "feature": "marketplace",
        "model": MARKETPLACE_EMBEDDING_MODEL,
        "embeddings": vectors.tolist(),
    }


def parse_budget(text: str) -> float:
    safe_text = clean_marketplace_text(text).lower().replace(",", "")
    patterns = [
        r"(?:under|below|less than|max|maximum|budget(?: is)?|around)\s*(?:rs\.?|lkr)?\s*(\d+(?:\.\d+)?)",
        r"(?:rs\.?|lkr)\s*(\d+(?:\.\d+)?)\s*(?:or less|max|budget)?",
    ]
    for pattern in patterns:
        match = re.search(pattern, safe_text)
        if match:
            try:
                value = float(match.group(1))
                return value if value > 0 else 0.0
            except ValueError:
                return 0.0
    return 0.0


def _price_score(query_text: str, candidate: Dict[str, Any]) -> Dict[str, Any]:
    budget = parse_budget(query_text)
    if budget <= 0:
        return {"score": 0.0, "budget": 0.0, "reason": ""}

    try:
        price = float(candidate.get("price", 0) or 0)
    except (TypeError, ValueError):
        price = 0.0

    if price <= 0:
        return {"score": 0.0, "budget": budget, "reason": ""}
    if price <= budget:
        return {"score": 1.0, "budget": budget, "reason": "Within budget"}
    if price <= budget * 1.25:
        return {"score": 0.55, "budget": budget, "reason": "Close to budget"}
    return {"score": 0.0, "budget": budget, "reason": "Above budget"}


def _title_keyword_reason(query_text: str, title: str) -> str:
    shared = sorted(set(tokenize(query_text)).intersection(set(tokenize(title))))
    return "Title keyword match" if shared else ""


def rank_marketplace_matches(
    query_text: str,
    candidates: List[Dict[str, Any]],
    limit: int = 8,
) -> Dict[str, Any]:
    safe_query = clean_marketplace_text(query_text)
    safe_candidates = [candidate for candidate in candidates if clean_marketplace_text(candidate.get("id", ""))]
    bounded_limit = max(1, min(20, int(limit or 8)))

    if not safe_query or not safe_candidates:
        return {"feature": "marketplace", "results": []}

    candidate_texts = [
        build_marketplace_search_text(
            title=candidate.get("title", ""),
            description=candidate.get("description", ""),
            seller_name=candidate.get("sellerName", "") or candidate.get("userName", ""),
        )
        for candidate in safe_candidates
    ]
    vectors = embed_texts([safe_query, *candidate_texts])
    query_vector = vectors[0]

    ranked = []
    for index, candidate in enumerate(safe_candidates):
        semantic = cosine_similarity(query_vector, vectors[index + 1])
        keyword = token_overlap_score(safe_query, candidate_texts[index])
        price = _price_score(safe_query, candidate)
        score = (semantic * 0.70) + (keyword["score"] * 0.20) + (price["score"] * 0.10)

        reasons = []
        if semantic >= 0.40:
            reasons.append("Matches your need")
        title_reason = _title_keyword_reason(safe_query, candidate.get("title", ""))
        if title_reason:
            reasons.append(title_reason)
        if price["reason"] and price["reason"] != "Above budget":
            reasons.append(price["reason"])
        if keyword["tokens"]:
            reasons.append(f"Shared keywords: {', '.join(keyword['tokens'][:4])}")
        if not reasons and semantic > 0:
            reasons.append("Possible product match")

        ranked.append({
            "id": clean_marketplace_text(candidate.get("id", "")),
            "similarityScore": round(max(0.0, min(1.0, score)), 4),
            "matchReasons": reasons[:4],
            "matchBreakdown": {
                "semantic": round(semantic, 4),
                "keyword": round(keyword["score"], 4),
                "price": round(price["score"], 4),
            },
        })

    ranked = [item for item in ranked if item["similarityScore"] > 0]
    ranked.sort(key=lambda item: item["similarityScore"], reverse=True)
    return {"feature": "marketplace", "results": ranked[:bounded_limit]}
