from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from main import analyze_study_queries

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
