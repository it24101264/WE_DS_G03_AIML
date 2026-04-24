import json
import os
import re
import urllib.error
import urllib.request
from collections import Counter
from typing import Dict, List, Union

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_+-]{1,}")
_STOPWORDS = {
    "about", "after", "again", "also", "and", "any", "are", "been", "before", "being",
    "can", "could", "does", "each", "explain", "for", "from", "give", "help", "how",
    "into", "need", "please", "show", "tell", "that", "the", "their", "them", "there",
    "these", "this", "using", "want", "what", "when", "where", "which", "with", "would",
    "you", "availability", "available", "slot", "slots", "morning", "afternoon", "evening",
    "online", "physical", "meet", "link", "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday", "mon", "tue", "wed", "thu", "thur", "fri", "sat",
    "sun", "am", "pm",
}


def _tokenize(text: str) -> List[str]:
    tokens = [token.lower() for token in _WORD_RE.findall(text or "")]
    return [token for token in tokens if token not in _STOPWORDS and len(token) > 2]


def _heuristic_label(queries: List[str]) -> Dict[str, Union[List[str], str]]:
    all_tokens: List[str] = []
    all_bigrams: List[str] = []

    for query in queries:
        tokens = _tokenize(query)
        all_tokens.extend(tokens)
        all_bigrams.extend(f"{tokens[i]} {tokens[i + 1]}" for i in range(len(tokens) - 1))

    if not all_tokens:
        return {"topic": "General Student Support", "keywords": []}

    unigram_counts = Counter(all_tokens)
    bigram_counts = Counter(all_bigrams)

    # Bigrams that appear in at least 2 queries are more specific and preferred
    min_freq = max(2, len(queries) // 4)
    strong_bigrams = [phrase for phrase, count in bigram_counts.most_common(5) if count >= min_freq]
    top_unigrams = [word for word, _ in unigram_counts.most_common(5)]

    covered = set(" ".join(strong_bigrams).split())
    extra = [w for w in top_unigrams if w not in covered]

    keywords = (strong_bigrams[:2] + extra)[:5] or top_unigrams[:5]
    label_parts = ((strong_bigrams[:1] + extra) if strong_bigrams else top_unigrams)[:3]

    topic = " ".join(label_parts).title() + " Study Support" if label_parts else "General Student Support"
    return {"topic": topic, "keywords": keywords}


def _groq_label(queries: List[str]) -> str | None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    user_prompt = (
        "Given the following student study questions, generate ONE academic topic label "
        "that is 4 to 6 words long. It must be specific to the learning concept. "
        "Do NOT include days, times, or scheduling words. Return only the label, nothing else.\n\n"
        + "\n".join(f"- {query}" for query in queries[:20])
    )
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You generate short academic topic labels for university student support sessions. "
                    "Labels must be 4-6 words, specific, readable, and free of scheduling language. "
                    "Respond with only the label text."
                ),
            },
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 24,
    }

    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "KuppiMLService/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = json.loads(response.read().decode("utf-8"))
            content = body["choices"][0]["message"]["content"]
            label = str(content or "").strip().strip('"').strip("'")
            return label or None
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError):
        return None


def generate_topic_label(queries: List[str]) -> Dict[str, Union[List[str], str]]:
    heuristic = _heuristic_label(queries)
    llm_topic = _groq_label(queries)
    if llm_topic:
        heuristic["topic"] = llm_topic
    return heuristic
