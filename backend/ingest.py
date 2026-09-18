import json
import os
import chromadb
from embedding import GeminiEmbeddingFunction

def ingest_data(file_path: str = "../data/test_cases.json", db_path: str = "./chroma_db"):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, "r") as f:
        data = json.load(f)
    
    client = chromadb.PersistentClient(path=db_path)
    
    # Try to delete the collection if it exists to ensure a clean state
    try:
        client.delete_collection("incidents")
    except Exception:
        pass
        
    ef = GeminiEmbeddingFunction()
    collection = client.create_collection(name="incidents", embedding_function=ef)
    
    ids = []
    documents = []
    metadatas = []
    
    for item in data:
        ids.append(item["id"])
        
        # We store the title and content as the document for semantic search
        document_text = f"Title: {item['title']}\nContent: {item['content']}"
        documents.append(document_text)
        
        # Build metadata explicitly
        meta = {
            "type": item.get("type", ""),
            "date": item.get("date", ""),
            "title": item.get("title", "")
        }
        if "service" in item:
            meta["service"] = item["service"]
        if "version" in item:
            meta["version"] = item["version"]
            
        metadatas.append(meta)
        
    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    
    print(f"Successfully ingested {len(data)} documents into ChromaDB.")

if __name__ == "__main__":
    ingest_data()
