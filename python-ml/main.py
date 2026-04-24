from typing import Any, Dict, List, Optional

from clustering import cluster_queries
from data_input import normalize_items, to_positive_int
from embedding import QueryEmbedder
from topic_labeling import generate_topic_label


def analyze_study_queries(
    items: List[Dict[str, Any]],
    min_size: int = 5,
    max_clusters: int = 8,
    top_clusters: int = 3,
    num_clusters: Optional[int] = None,
    random_state: int = 42,
) -> Dict[str, Any]:
    normalized_items = normalize_items(items)
    if not normalized_items:
        return {
            "groups": [],
            "cluster_labels": [],
            "meta": {
                "total_queries": 0,
                "cluster_count": 0,
                "min_size": min_size,
                "top_clusters": top_clusters,
                "max_clusters": max_clusters,
            },
        }

    safe_min_size = to_positive_int(min_size, default=5)
    safe_max_clusters = to_positive_int(max_clusters, default=8)
    safe_top_clusters = to_positive_int(top_clusters, default=3)
    safe_num_clusters = None if num_clusters is None else to_positive_int(num_clusters, default=safe_max_clusters)

    texts = [item["text"] for item in normalized_items]
    embeddings = QueryEmbedder().encode(texts)
    clustered = cluster_queries(
        embeddings=embeddings,
        items=normalized_items,
        max_clusters=safe_max_clusters,
        requested_clusters=safe_num_clusters,
        random_state=random_state,
    )

    groups = []
    for cluster in clustered["clusters"]:
        if cluster["size"] < safe_min_size:
            continue
        if len(groups) >= safe_top_clusters:
            break

        label_data = generate_topic_label(cluster["queries"])
        groups.append(
            {
                "cluster_id": cluster["cluster_id"],
                "group_id": f"g_{len(groups) + 1}",
                "topic": label_data["topic"],
                "keywords": label_data["keywords"],
                "size": cluster["size"],
                "cohesion": cluster.get("cohesion", 0.0),
                "queries": cluster["queries"],
                "request_ids": cluster["request_ids"],
            }
        )

    cluster_labels = [
        {
            "id": normalized_items[index]["id"],
            "text": normalized_items[index]["text"],
            "cluster_id": cluster_id,
        }
        for index, cluster_id in enumerate(clustered["labels"])
    ]

    return {
        "groups": groups,
        "cluster_labels": cluster_labels,
        "meta": {
            "total_queries": len(normalized_items),
            "cluster_count": clustered["cluster_count"],
            "min_size": safe_min_size,
            "top_clusters": safe_top_clusters,
            "max_clusters": safe_max_clusters,
        },
    }
