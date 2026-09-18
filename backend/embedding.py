from chromadb.utils import embedding_functions

def get_embedding_function():
    # Uses sentence-transformers/all-MiniLM-L6-v2 by default
    # Runs locally, zero API costs, extremely fast.
    return embedding_functions.DefaultEmbeddingFunction()
