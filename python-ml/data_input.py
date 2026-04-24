from typing import Any, Dict, List


def clean_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def normalize_items(items: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    normalized: List[Dict[str, str]] = []

    for item in items or []:
        item_id = str((item or {}).get("id", "")).strip()
        if not item_id:
            continue

        text = clean_text((item or {}).get("text", ""))
        if not text:
            text = "General study support question"

        normalized.append({"id": item_id, "text": text})

    return normalized


def to_positive_int(value: Any, default: int, minimum: int = 1) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    return max(minimum, parsed)
