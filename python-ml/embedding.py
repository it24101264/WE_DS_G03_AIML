import os
import re
from typing import List, Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None


_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_+-]{1,}")
_GENERIC_STOPWORDS = {
    "about", "after", "again", "also", "and", "any", "are", "been", "before", "being",
    "can", "clear", "concept", "concepts", "could", "detail", "details", "does", "each",
    "example", "examples", "explain", "explanation", "for", "from", "give", "help", "how",
    "idea", "ideas", "into", "issue", "issues", "lecture", "learn", "module", "need",
    "please", "problem", "problems", "question", "session", "show", "student", "study",
    "support", "tell", "that", "the", "their", "them", "there", "these", "this", "topic",
    "topics", "understand", "using", "want", "what", "when", "where", "which", "with",
    "would", "you",
}
_MODULE_CODES = {
    "wmt", "ossa", "ps", "dcwm", "nma", "isp", "re", "np", "ics", "cmf", "tem", "ved",
}


def _normalize_token(token: str) -> str:
    token = token.lower()

    if token in _MODULE_CODES or token in _GENERIC_STOPWORDS:
        return ""

    if token.endswith("ies") and len(token) > 4:
        token = f"{token[:-3]}y"
    elif token.endswith("s") and len(token) > 4 and not token.endswith("ss"):
        token = token[:-1]

    return token if len(token) > 2 and token not in _GENERIC_STOPWORDS else ""


def _concept_text(text: str) -> str:
    tokens = []
    for raw_token in _WORD_RE.findall(text or ""):
        token = _normalize_token(raw_token)
        if token:
            tokens.append(token)

    return " ".join(tokens)


class QueryEmbedder:
    _model_cache = {}

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.vectorizer: Optional[TfidfVectorizer] = None

    def _load_transformer(self):
        if SentenceTransformer is None:
            return None

        if self.model_name not in self._model_cache:
            allow_download = str(os.getenv("ALLOW_MODEL_DOWNLOAD", "")).lower() in {"1", "true", "yes"}

            try:
                self._model_cache[self.model_name] = SentenceTransformer(
                    self.model_name,
                    local_files_only=True,
                )
            except TypeError:
                if allow_download:
                    self._model_cache[self.model_name] = SentenceTransformer(self.model_name)
                else:
                    return None
            except Exception:
                if allow_download:
                    self._model_cache[self.model_name] = SentenceTransformer(self.model_name)
                else:
                    return None

        return self._model_cache[self.model_name]

    def encode(self, texts: List[str]) -> np.ndarray:
        concept_texts = [_concept_text(text) or text for text in texts]

        model = None
        try:
            model = self._load_transformer()
        except Exception:
            model = None

        if model is not None:
            try:
                return np.asarray(model.encode(concept_texts, normalize_embeddings=True))
            except Exception:
                pass

        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=3000,
            ngram_range=(1, 2),
        )
        return self.vectorizer.fit_transform(concept_texts).toarray()
