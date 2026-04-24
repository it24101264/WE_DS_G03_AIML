from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from main import analyze_study_queries
from lost_found_ai import embed_lost_found_texts, rank_lost_found_matches
from marketplace_ai import embed_marketplace_texts, rank_marketplace_matches
from ml_logic import embed_texts, group_requests

app = FastAPI(title="Kuppi ML Service")


@app.get("/health")
def health():
    return {"status": "ok", "service": "Kuppi ML Service"}


class Item(BaseModel):
    id: str
    text: str


class GroupReq(BaseModel):
    min_size: int = 5
    max_clusters: int = 8
    top_clusters: int = 3
    num_clusters: Optional[int] = None
    random_state: int = 42
    items: List[Item]


class EmbedReq(BaseModel):
    texts: List[str]


class LostFoundRankReq(BaseModel):
    query_text: str
    query_metadata: Dict[str, Any] = Field(default_factory=dict)
    candidates: List[Dict[str, Any]] = Field(default_factory=list)
    limit: int = 8


class MarketplaceRankReq(BaseModel):
    query_text: str
    candidates: List[Dict[str, Any]] = Field(default_factory=list)
    limit: int = 8


@app.post("/ml/groups")
def groups(req: GroupReq) -> Dict[str, Any]:
    return analyze_study_queries(
        items=[x.model_dump() for x in req.items],
        min_size=req.min_size,
        max_clusters=req.max_clusters,
        top_clusters=req.top_clusters,
        num_clusters=req.num_clusters,
        random_state=req.random_state,
    )


@app.post("/ml/embed")
def embed(req: EmbedReq) -> Dict[str, Any]:
    vectors = embed_texts(req.texts or [])
    return {"embeddings": vectors.tolist()}


@app.post("/ml/lost-found/embed")
def embed_lost_found(req: EmbedReq) -> Dict[str, Any]:
    return embed_lost_found_texts(req.texts or [])


@app.post("/ml/marketplace/embed")
def embed_marketplace(req: EmbedReq) -> Dict[str, Any]:
    return embed_marketplace_texts(req.texts or [])


@app.post("/ml/lost-found/rank")
def rank_lost_found(req: LostFoundRankReq) -> Dict[str, Any]:
    return rank_lost_found_matches(
        query_text=req.query_text,
        query_metadata=req.query_metadata or {},
        candidates=req.candidates or [],
        limit=req.limit,
    )


@app.post("/ml/marketplace/rank")
def rank_marketplace(req: MarketplaceRankReq) -> Dict[str, Any]:
    return rank_marketplace_matches(
        query_text=req.query_text,
        candidates=req.candidates or [],
        limit=req.limit,
    )
