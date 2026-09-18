def evaluate_retrieved_documents(documents: list[dict]) -> tuple[list[dict], list[str]]:
    """
    Deterministically evaluates retrieved documents for contradictions based on metadata.
    Returns:
        (filtered_documents, warnings)
    """
    warnings = []
    
    # Group documents by service and type
    groups = {}
    for doc in documents:
        service = doc["metadata"].get("service", "global")
        doc_type = doc["metadata"].get("type", "unknown")
        
        key = (service, doc_type)
        if key not in groups:
            groups[key] = []
        groups[key].append(doc)
        
    filtered = []
    
    # Look for contradiction rules
    for key, docs in groups.items():
        if len(docs) > 1 and key[1] == "troubleshooting":
            # Sort by date/version to find the newest
            sorted_docs = sorted(docs, key=lambda x: (x["metadata"].get("date", ""), x["metadata"].get("version", "")), reverse=True)
            newest = sorted_docs[0]
            older_ids = [d["id"] for d in sorted_docs[1:]]
            
            warnings.append(f"WARNING: Retrieved contradictory troubleshooting guidance. Document {newest['id']} is newer and supersedes {', '.join(older_ids)}. Discard older guidance.")
            
            filtered.append(newest)
            for old in sorted_docs[1:]:
                filtered.append(old)
        else:
            filtered.extend(docs)
            
    return filtered, warnings
