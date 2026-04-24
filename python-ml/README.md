# Python ML Service

This service clusters student study queries into the most common support topics.

## Features

- Accepts a list of query objects with `id` and `text`
- Generates dense embeddings with `sentence-transformers` using `all-MiniLM-L6-v2`
- Falls back to TF-IDF if the transformer model is unavailable
- Clusters similar queries with K-Means using a fixed `random_state`
- Ranks clusters by frequency
- Generates topic labels with an optional OpenAI call or a local heuristic fallback
- Returns structured cluster summaries for the smart study dashboard

## Files

- `data_input.py`: input cleanup and normalization
- `embedding.py`: embedding generation
- `clustering.py`: K-Means clustering logic
- `topic_labeling.py`: topic label generation
- `main.py`: end-to-end orchestration
- `app.py`: FastAPI entrypoint

## Install

```bash
cd python-ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
cd python-ml
uvicorn app:app --reload --port 8001
```

## Optional Gemini Topic Labels

Set these environment variables before starting the service:

```bash
export GEMINI_API_KEY=your_key
export GEMINI_MODEL=gemini-1.5-flash
```

If they are not set, the service uses a local keyword-based labeler.

## Example Request

```bash
curl -X POST http://127.0.0.1:8001/ml/groups \
  -H "Content-Type: application/json" \
  -d '{
    "min_size": 2,
    "max_clusters": 5,
    "top_clusters": 3,
    "items": [
      {"id": "1", "text": "Explain pointers in C"},
      {"id": "2", "text": "How do pointers work in C programming?"},
      {"id": "3", "text": "What is normalization in databases?"},
      {"id": "4", "text": "Explain first normal form in DBMS"}
    ]
  }'
```

## Example Response

```json
{
  "groups": [
    {
      "cluster_id": 1,
      "group_id": "g_1",
      "topic": "Pointers C Programming",
      "keywords": ["pointers", "programming", "work"],
      "size": 2,
      "queries": [
        "Explain pointers in C",
        "How do pointers work in C programming?"
      ],
      "request_ids": ["1", "2"]
    }
  ],
  "cluster_labels": [
    {"id": "1", "text": "Explain pointers in C", "cluster_id": 1}
  ],
  "meta": {
    "total_queries": 4,
    "cluster_count": 2,
    "min_size": 2,
    "top_clusters": 3,
    "max_clusters": 5
  }
}
```
