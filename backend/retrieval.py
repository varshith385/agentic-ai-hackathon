import chromadb
from embedding import GeminiEmbeddingFunction

class RetrievalSystem:
    def __init__(self, db_path: str = "./chroma_db"):
        self.client = chromadb.PersistentClient(path=db_path)
        ef = GeminiEmbeddingFunction()
        self.collection = self.client.get_collection(name="incidents", embedding_function=ef)
        
    def search(self, query: str, filters: dict = None, top_k: int = 3) -> list[dict]:
        """
        Search for documents using semantic query and optional strict metadata filters.
        """
        search_args = {
            "query_texts": [query],
            "n_results": top_k
        }
        
        # Format filters for ChromaDB
        if filters:
            # Clean filters to remove empty strings/None
            filters = {k: v for k, v in filters.items() if v}
            
            # If multiple filters, we use $and
            if len(filters) > 1:
                where_clause = {"$and": []}
                for k, v in filters.items():
                    where_clause["$and"].append({k: {"$eq": v}})
                search_args["where"] = where_clause
            elif len(filters) == 1:
                k, v = list(filters.items())[0]
                search_args["where"] = {k: {"$eq": v}}
                
        results = self.collection.query(**search_args)
        
        formatted_results = []
        if results['ids'] and len(results['ids']) > 0:
            ids = results['ids'][0]
            documents = results['documents'][0]
            metadatas = results['metadatas'][0]
            
            for i in range(len(ids)):
                formatted_results.append({
                    "id": ids[i],
                    "document": documents[i],
                    "metadata": metadatas[i]
                })
                
        return formatted_results

# Simple test
if __name__ == "__main__":
    system = RetrievalSystem()
    print("Testing semantic search:")
    res = system.search(query="latency spike", top_k=2)
    for r in res:
        print(f"ID: {r['id']}, Meta: {r['metadata']}")
        
    print("\nTesting metadata filtered search:")
    res2 = system.search(query="deployment", filters={"service": "orders-api"}, top_k=2)
    for r in res2:
        print(f"ID: {r['id']}, Meta: {r['metadata']}")
