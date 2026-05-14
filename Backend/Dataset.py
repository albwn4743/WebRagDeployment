from langchain_community.embeddings import HuggingFaceEmbeddings

# Module-level cache for the embeddings instance to avoid re-loading the model on every request
_embeddings_cache = None
import weaviate
from weaviate.classes.query import Filter
from weaviate.classes.init import Auth
import os
from dotenv import load_dotenv
load_dotenv()

def connect_weaviate():
    return weaviate.connect_to_weaviate_cloud(
    cluster_url=os.getenv("WEAVIATE_CLUSTER_URL"),
    auth_credentials=Auth.api_key(os.getenv("WEAVIATE_API_KEY")),
    skip_init_checks=True
    # print("Connected to:", WEAVIATE_URL)
)
    
def get_embeddings():
    global _embeddings_cache
    if _embeddings_cache is None:
        _embeddings_cache = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    return _embeddings_cache

# -------- GET COLLECTION --------
def get_collection(client):
    return client.collections.get("WebDocument")

def search_query(query, client, embeddings, domain=None):
    query_vector = embeddings.embed_query(query)
    collection = client.collections.get("WebDocument")
    filters = None
    if domain:
        filters = Filter.by_property("domain").equal(domain)
        
    # Use Hybrid Search combining Keyword (BM25) and Vector Search
    response = collection.query.hybrid(
        query=query,
        vector=query_vector,
        alpha=0.5, # 0.5 means equal weight to keyword and vector searches
        limit=5,
        filters=filters,
        return_metadata=["score"]
    )
    results = []
    for obj in response.objects:
        # Hybrid search returns a combined score where higher is better
        hybrid_score = obj.metadata.score if obj.metadata.score else 0.0
        item = {
            "text": obj.properties.get("content", ""),
            "source": obj.properties.get("url", ""),
            "title": obj.properties.get("title", ""),
            "score": round(hybrid_score, 4),
        }
        results.append(item)
    # Sort by hybrid score in descending order
    results = sorted(results, key=lambda x: x["score"], reverse=True)

    return results
