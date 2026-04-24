from main import analyze_study_queries


def group_requests(items, min_size=5, max_clusters=8, top_clusters=3, num_clusters=None, random_state=42):
    result = analyze_study_queries(
        items=items,
        min_size=min_size,
        max_clusters=max_clusters,
        top_clusters=top_clusters,
        num_clusters=num_clusters,
        random_state=random_state,
    )
    return result["groups"]
