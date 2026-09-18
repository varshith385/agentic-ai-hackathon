import os
from chromadb import Documents, EmbeddingFunction, Embeddings
from google import genai
from dotenv import load_dotenv

load_dotenv()

class GeminiEmbeddingFunction(EmbeddingFunction):
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("WARNING: GEMINI_API_KEY is not set. Embeddings will fail.")
        self.client = genai.Client(api_key=api_key)

    def __call__(self, input: Documents) -> Embeddings:
        if not input:
            return []
            
        try:
            embeddings = []
            for text in input:
                response = self.client.models.embed_content(
                    model="gemini-embedding-2", 
                    contents=text
                )
                embeddings.append(response.embeddings[0].values)
            return embeddings
        except Exception as e:
            print(f"Error calling Gemini embeddings: {e}")
            raise
