import re

domain_keywords = [
    # Standard generic SRE concepts
    r"\bincident\b", r"\boutage\b", r"\blatency\b", r"\bdeployment\b", r"\bservice\b", r"\bapi\b",
    r"\berror\b", r"\bfailure\b", r"\bversion\b", r"\bpostmortem\b", r"\bproduction\b",
    r"\btroubleshooting\b", r"\broot cause\b", r"\bdatabase\b", r"\balert\b", r"\blogs\b",
    r"\binfrastructure\b", r"\brollback\b", r"\brelease\b", r"\bproblem\b", r"\bslow\b", r"\bdown\b",
    r"\bhappened before\b",
    # Internal document identifiers (case-insensitive due to query_lower)
    r"\binc-\d+\b", r"\bdep-\d+\b", r"\bpm-\d+\b", r"\bguide-\d+\b",
    # Internal service/version identifiers
    r"\bv\d+\.\d+\.\d+\b", r"\b\w+-api\b"
]

def check_scope(query):
    query_lower = query.lower()
    return any(re.search(k, query_lower) for k in domain_keywords)

print("=== DOCUMENT-ID TESTS ===")
doc_tests = [
    "What evidence connects INC-1042 with DEP-882?",
    "How are INC-1042 and PM-211 related?",
    "What does DEP-882 say?",
    "Compare INC-1042 with INC-301.",
    "Is PM-211 relevant to INC-1042?",
    "What happened in INC-1042?",
    "What deployment is associated with INC-1042?",
    "Does GUIDE-12 conflict with GUIDE-41?"
]
for q in doc_tests:
    print(f"[{'PASS' if check_scope(q) else 'FAIL'}] {q}")

print("\n=== NORMAL VALID QUESTIONS ===")
valid_tests = [
    "Why did the Order API become slow on September 16?",
    "Order API latency",
    "Did v2.8.1 cause the latency?",
    "Was the latest deployment related to the incident?",
    "Has this happened before?",
    "Why was the API slow?"
]
for q in valid_tests:
    print(f"[{'PASS' if check_scope(q) else 'FAIL'}] {q}")

print("\n=== OUT-OF-SCOPE TESTS ===")
out_tests = [
    "What is the capital of India?",
    "What is 2 + 2?",
    "Who is Virat Kohli?",
    "Write a Python program.",
    "Tell me a joke.",
    "What is the weather today?"
]
for q in out_tests:
    print(f"[{'PASS' if not check_scope(q) else 'FAIL'}] {q}")
