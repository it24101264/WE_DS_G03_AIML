from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, List

from ml_logic import group_requests

app = FastAPI(title="Kuppi ML Service")


class Item(BaseModel):
    id: str
    text: str


class GroupReq(BaseModel):
    min_size: int = 5
    max_clusters: int = 8
    top_clusters: int = 3
    items: List[Item]


@app.post("/ml/groups")
def groups(req: GroupReq) -> Dict[str, Any]:
    groups_data = group_requests(
        items=[x.model_dump() for x in req.items],
        min_size=req.min_size,
        max_clusters=req.max_clusters,
        top_clusters=req.top_clusters,
    )
    return {"groups": groups_data}
