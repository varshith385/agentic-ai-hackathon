import json
from retrieval import RetrievalSystem

def test_retrieval(query):
    retrieval = RetrievalSystem()
    
    import re
    words = [w for w in re.split(r'\W+', query) if w and (w[0].isupper() or w.isdigit())]
    if words and words[0].lower() in ["why", "what", "how", "who", "when", "check"]:
        words = words[1:]
    entities = " ".join(words) if words else query
    
    variants = [
        query,
        entities,
        f"{entities} deployment",
        f"{entities} troubleshooting"
    ]
    
    all_raw_docs = []
    seen_ids = set()
    
    for variant in variants:
        res = retrieval.search(variant, {}, top_k=5)
        for doc in res:
            if doc["id"] not in seen_ids:
                seen_ids.add(doc["id"])
                all_raw_docs.append(doc)
                
    query_lower = query.lower()

    def score_doc(doc):
        score = 0
        text = (doc.get("document", "") + " " + json.dumps(doc.get("metadata", {}))).lower()
        
        # Service mapping
        service = doc.get("metadata", {}).get("service", "")
        if service:
            if service in query_lower or service.replace("-", " ") in query_lower:
                score += 10
            # common alias
            elif service == "orders-api" and "order api" in query_lower:
                score += 10
                
        # Conditional certificate relevance
        if "certificate" in text or "cert " in text:
            if "cert" not in query_lower:
                score -= 20
            else:
                score += 20
                
        doc_type = doc.get("metadata", {}).get("type", "")
        if doc_type == "incident_report":
            score += 10
        elif doc_type == "deployment_note":
            score += 10
        elif doc_type == "postmortem":
            score += 3
            
        # Contextual term matching
        if ("latency" in text or "slow" in text or "performance" in text) and ("slow" in query_lower or "latency" in query_lower or "performance" in query_lower):
            score += 5
            
        if ("deploy" in text or "version" in text) and ("deploy" in query_lower or "version" in query_lower):
            score += 5
            
        return score
        
    for doc in all_raw_docs:
        pass
        
    all_raw_docs.sort(key=score_doc, reverse=True)
    print("Sorted:", [d['id'] for d in all_raw_docs][:3])

if __name__ == "__main__":
    print("--- Query 1: Order API slow ---")
    test_retrieval("Why did Order API become slow on September 16? Check whether the deployment was related.")
    
    print("\n--- Query 2: Certificate expiration ---")
    test_retrieval("Why did the Order API fail due to a certificate expiration?")
