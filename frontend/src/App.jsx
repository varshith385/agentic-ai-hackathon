import { useState, useEffect, useRef } from 'react'
import dataset from './data.json'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [investigating, setInvestigating] = useState(false)
  const [paused, setPaused] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)
  const [trace, setTrace] = useState([])
  const [answer, setAnswer] = useState(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const traceEndRef = useRef(null)

  const connectSSE = (sid) => {
    const eventSource = new EventSource(`http://127.0.0.1:8001/stream/${sid}`)
    
    eventSource.onmessage = (e) => {
      const eventData = JSON.parse(e.data)
      
      if (eventData.type === 'complete') {
        try {
          setAnswer(JSON.parse(eventData.message))
        } catch (err) {
          setAnswer({ answer: eventData.message })
        }
        eventSource.close()
        setInvestigating(false)
        setPaused(false)
      } else if (eventData.type === 'error' && eventData.message.includes('429')) {
        setTrace(prev => {
          const last = prev[prev.length - 1]
          if (last && last.message === eventData.message) return prev;
          return [...prev, { type: 'error', message: eventData.message }]
        })
        eventSource.close()
        setInvestigating(false)
        setPaused(true)
      } else if (eventData.type === 'rate_limit') {
        setTrace(prev => {
          const last = prev[prev.length - 1]
          if (last && last.message === eventData.message) return prev;
          return [...prev, { type: 'error', message: eventData.message }]
        })
        setRetryAfter(eventData.retry_after || 0)
        eventSource.close()
        setInvestigating(false)
        setPaused(true)
      } else if (eventData.type === 'error') {
        setTrace(prev => [...prev, { type: 'error', message: eventData.message }])
        eventSource.close()
        setInvestigating(false)
        setPaused(false)
      } else if (eventData.type === 'done') {
        eventSource.close()
        setInvestigating(false)
        setPaused(false)
      } else {
        setTrace(prev => {
          const exists = prev.some(item => item.message === eventData.message && item.type === eventData.type)
          if (exists) return prev;
          return [...prev, eventData]
        })
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    
    setInvestigating(true)
    setPaused(false)
    setTrace([])
    setAnswer(null)
    setIsDemoMode(false)
    
    try {
      const res = await fetch('http://127.0.0.1:8001/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      const data = await res.json()
      
      if (data.session_id) {
        setSessionId(data.session_id)
        connectSSE(data.session_id)
      }
    } catch (err) {
      console.error(err)
      setInvestigating(false)
    }
  }

  const handleResume = async () => {
    if (!sessionId) return
    setInvestigating(true)
    setPaused(false)
    
    try {
      await fetch(`http://127.0.0.1:8001/resume/${sessionId}`, { method: 'POST' })
      connectSSE(sessionId)
    } catch (err) {
      console.error(err)
      setInvestigating(false)
      setPaused(true)
    }
  }

  const runDemo = () => {
    setInvestigating(true)
    setPaused(false)
    setTrace([])
    setAnswer(null)
    setIsDemoMode(true)
    
    const isTestB = query.toLowerCase().includes("restart service a")
    
    let demoEvents = []
    
    if (isTestB) {
      demoEvents = [
        { type: 'info', message: 'Investigation started (VERIFIED DEMO MODE).' },
        { type: 'tool_call', message: "Searching for 'Service A latency restart procedure'..." },
        { type: 'tool_result', message: "Found documents: GUIDE-12, GUIDE-41" },
        { type: 'warning', message: "EVALUATOR INTERCEPT: GUIDE-12 (v1) contradicts newer document GUIDE-41 (v3). GUIDE-41 supersedes GUIDE-12." },
        { type: 'complete', message: JSON.stringify({
           answer: "You should NOT restart Service A. Although the older v1 runbook (GUIDE-12) recommended a restart, the newer v3 runbook (GUIDE-41) explicitly contradicts this. It instructs you to check dependency health first and avoid restarts during dependency failures.",
           citations: ["GUIDE-41", "GUIDE-12"]
        })}
      ]
    } else {
      demoEvents = [
        { type: 'info', message: 'Investigation started (VERIFIED DEMO MODE).' },
        { type: 'tool_call', message: "Searching for 'Order API slowness September 16'..." },
        { type: 'tool_result', message: "Found documents: INC-1042, DEP-882" },
        { type: 'tool_call', message: "Analyzing deployment history for v2.8.1..." },
        { type: 'tool_result', message: "Found documents: PM-211" },
        { type: 'info', message: "Comparing versions and dates... (v2.8.1 vs v2.6.0)" },
        { type: 'complete', message: JSON.stringify({
           answer: "The latency spike on September 16 is definitively linked to the recent deployment of orders-api v2.8.1. According to historical postmortem PM-211, a highly similar latency incident occurred in v2.6.0 due to database connection saturation during a schema migration. It is likely the v2.8.1 deployment re-introduced database connection pooling issues.",
           citations: ["INC-1042", "DEP-882", "PM-211"]
        })}
      ]
    }

    let i = 0;
    const interval = setInterval(() => {
       const ev = demoEvents[i];
       if (ev.type === 'complete') {
           setAnswer(JSON.parse(ev.message));
           setInvestigating(false);
           clearInterval(interval);
       } else {
           setTrace(prev => [...prev, ev]);
       }
       i++;
    }, 1500);
  }

  useEffect(() => {
    traceEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [trace])

  useEffect(() => {
    if (retryAfter > 0) {
      const timer = setInterval(() => {
        setRetryAfter(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [retryAfter])

  const formatTraceMessage = (item) => {
    if (item.type === 'tool_call') {
      const match = item.message.match(/Searching for '(.*)'\.\.\./)
      if (match) return `"${match[1]}"`
      return item.message
    }
    if (item.type === 'warning' && item.message.includes('EVALUATOR INTERCEPT:')) {
       return item.message.replace('EVALUATOR INTERCEPT: ', '')
    }
    return item.message
  }

  const parseAnswerSections = (rawText) => {
    if (!rawText) return null;
    let text = typeof rawText === 'string' ? rawText : String(rawText);
    
    const evidenceMatch = text.match(/CONFIRMED EVIDENCE:([\s\S]*?)(?=SUPPORTED HYPOTHESIS:|UNRESOLVED:|$)/i);
    const hypothesisMatch = text.match(/SUPPORTED HYPOTHESIS:([\s\S]*?)(?=UNRESOLVED:|$)/i);
    const unresolvedMatch = text.match(/UNRESOLVED:([\s\S]*?)$/i);
    
    return {
      evidence: evidenceMatch ? evidenceMatch[1].trim() : null,
      hypothesis: hypothesisMatch ? hypothesisMatch[1].trim() : null,
      unresolved: unresolvedMatch ? unresolvedMatch[1].trim() : (evidenceMatch ? null : text)
    };
  }

  const sections = answer ? parseAnswerSections(answer.answer) : null;

  return (
    <div className="min-h-screen bg-[var(--color-bb-bg)] text-[var(--color-bb-text-primary)] font-sans selection:bg-[#D4B856]/30 flex flex-col relative overflow-hidden">
      
      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      
      {/* TOP NAVIGATION */}
      <header className="border-b border-[var(--color-bb-border-strong)] bg-[var(--color-bb-surface)] px-8 py-5 flex justify-between items-center text-xs font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="font-bold text-[var(--color-bb-text-primary)] tracking-widest uppercase">SRE OPERATIONS</span>
          <span className="text-[var(--color-bb-text-secondary)] sm:border-l border-[var(--color-bb-border)] sm:pl-4 tracking-widest">INCIDENT INVESTIGATION SYSTEM</span>
        </div>
        <div className="flex items-center gap-10 text-[var(--color-bb-text-secondary)]">
          <span className="flex items-center gap-3">
            SYSTEM STATUS
            {investigating ? (
              <span className="text-[var(--color-bb-mustard)] flex items-center gap-2 font-bold"><span className="w-2 h-2 rounded-full bg-[var(--color-bb-mustard)] animate-pulse"></span> ACTIVE</span>
            ) : paused ? (
              <span className="text-[var(--color-bb-red)] flex items-center gap-2 font-bold"><span className="w-2 h-2 rounded-full bg-[var(--color-bb-red)] animate-pulse"></span> PAUSED</span>
            ) : isDemoMode ? (
              <span className="text-[var(--color-bb-green)] flex items-center gap-2 font-bold"><span className="w-2 h-2 rounded-full bg-[var(--color-bb-green)]"></span> DEMO</span>
            ) : (
              <span className="text-[var(--color-bb-text-secondary)] flex items-center gap-2 font-bold"><span className="w-2 h-2 rounded-full bg-[var(--color-bb-text-secondary)]"></span> OPERATIONAL</span>
            )}
          </span>
          <span className="hidden md:flex items-center gap-3 border-l border-[var(--color-bb-border)] pl-10">
            MODEL <span className="text-[var(--color-bb-text-primary)] font-bold">QWEN</span>
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 md:p-12 flex flex-col gap-16 relative z-10">
        
        {/* HERO / INVESTIGATION ENTRY */}
        <section className="flex flex-col gap-8 max-w-4xl pt-8">
          <h1 className="text-4xl md:text-6xl font-light tracking-tight text-[var(--color-bb-text-primary)] leading-tight">
            <span className="block font-bold text-[var(--color-bb-mustard)] text-xs font-mono tracking-widest mb-6">INCIDENT INVESTIGATION</span>
            Trace the evidence.<br />Find what actually happened.
          </h1>
          <p className="text-[var(--color-bb-text-secondary)] text-xl max-w-2xl font-light leading-relaxed">
            Investigate operational incidents across internal knowledge, connect related evidence, evaluate conflicting guidance, and separate confirmed facts from hypotheses.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
            <div className="relative group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter an incident investigation query..."
                className="w-full bg-[var(--color-bb-surface)] border-2 border-[var(--color-bb-border-strong)] py-6 px-8 text-xl text-[var(--color-bb-text-primary)] placeholder:text-[var(--color-bb-text-secondary)] focus:outline-none focus:border-[var(--color-bb-mustard)] transition-colors rounded-sm"
                disabled={investigating || paused}
              />
            </div>
            
            {paused ? (
              <div className="flex items-center justify-between p-6 bg-[var(--color-bb-surface)] border-l-4 border-[var(--color-bb-red)] rounded-sm mt-2">
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-sm font-bold text-[var(--color-bb-red)] uppercase tracking-widest">Investigation Paused</span>
                  <span className="text-sm text-[var(--color-bb-text-secondary)]">AI SERVICE RATE LIMITED. State has been preserved.</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <span className="font-mono text-[var(--color-bb-text-primary)] text-sm tracking-widest">RETRY AVAILABLE IN <br/> <span className="text-lg text-[var(--color-bb-red)] font-bold">{retryAfter > 0 ? `00:${retryAfter.toString().padStart(2, '0')}` : 'READY'}</span></span>
                  <button 
                    type="button" 
                    onClick={handleResume}
                    disabled={retryAfter > 0}
                    className="px-8 py-3 bg-[var(--color-bb-red)] text-white font-mono text-xs font-bold uppercase tracking-widest hover:bg-opacity-80 disabled:opacity-50 transition-colors rounded-sm"
                  >
                    RESUME INVESTIGATION
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 mt-2">
                <button 
                  type="submit" 
                  disabled={investigating || !query.trim()}
                  className="px-10 py-5 bg-[var(--color-bb-mustard)] text-[#1A1810] hover:bg-[#E2C665] transition-colors disabled:opacity-30 disabled:bg-[var(--color-bb-surface)] disabled:text-[var(--color-bb-text-secondary)] font-mono text-sm font-bold uppercase tracking-widest rounded-sm"
                >
                  START INVESTIGATION →
                </button>
                <button 
                  type="button" 
                  onClick={runDemo}
                  disabled={investigating || !query.trim()}
                  className="px-8 py-5 bg-transparent border-2 border-[var(--color-bb-border-strong)] text-[var(--color-bb-text-secondary)] hover:text-[var(--color-bb-text-primary)] hover:border-[var(--color-bb-text-secondary)] transition-colors disabled:opacity-30 rounded-sm font-mono text-sm uppercase tracking-widest"
                >
                  REPLAY DEMO
                </button>
              </div>
            )}
          </form>
        </section>

        {/* TRACE AND REPORT */}
        {(trace.length > 0 || answer || investigating) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 pt-8">
            
            {/* LEFT: INVESTIGATION TRACE */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="border-b border-[var(--color-bb-border-strong)] pb-4 mb-8">
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-bb-text-secondary)]">Investigation Trace</h3>
              </div>
              
              <div className="relative pl-6 space-y-12 border-l border-[var(--color-bb-border-strong)] ml-2 pb-12">
                {trace.map((item, idx) => {
                  const stepNum = (idx + 1).toString().padStart(2, '0')
                  const isLast = idx === trace.length - 1 && investigating
                  const isWarning = item.type === 'warning'
                  const isResult = item.type === 'tool_result'
                  
                  return (
                    <div key={idx} className={`relative animate-in fade-in slide-in-from-left-2 duration-300 ${!isLast && 'opacity-60 hover:opacity-100 transition-opacity'}`}>
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[30px] w-2.5 h-2.5 rounded-full top-1.5
                        ${isLast ? 'bg-[var(--color-bb-mustard)]' : 
                          isWarning ? 'bg-[var(--color-bb-red)]' : 'bg-[var(--color-bb-text-secondary)]'}`}
                      ></div>
                      
                      <div className="font-mono text-[10px] text-[var(--color-bb-text-secondary)] mb-2 tracking-widest">{stepNum}</div>
                      
                      <div className={`font-mono text-xs font-bold uppercase tracking-widest mb-2
                        ${isLast ? 'text-[var(--color-bb-mustard)]' : isWarning ? 'text-[var(--color-bb-red)]' : 'text-[var(--color-bb-text-primary)]'}`}
                      >
                        {item.type === 'tool_call' ? 'SEARCHING KNOWLEDGE BASE' : item.type === 'tool_result' ? 'DOCUMENTS RETRIEVED' : item.type === 'warning' ? 'KNOWLEDGE CONFLICT' : item.type}
                      </div>
                      
                      <div className={`text-base leading-relaxed ${isResult ? 'font-mono text-sm text-[var(--color-bb-text-secondary)]' : 'text-[var(--color-bb-text-primary)] font-light'}`}>
                        {formatTraceMessage(item)}
                      </div>
                    </div>
                  )
                })}
                
                {investigating && (
                  <div className="relative animate-pulse mt-12">
                    <div className="absolute -left-[30px] w-2.5 h-2.5 rounded-full top-1 bg-[var(--color-bb-green)]"></div>
                    <div className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-bb-green)] mb-3">INVESTIGATING</div>
                    <div className="flex items-center gap-4 font-mono text-[10px] text-[var(--color-bb-text-secondary)] tracking-widest">
                      <div className="w-20 h-[2px] bg-[#1A2510] relative overflow-hidden rounded-sm">
                        <div className="absolute top-0 bottom-0 w-8 bg-[var(--color-bb-green)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                      </div>
                      SEARCHING INTERNAL KNOWLEDGE BASE
                    </div>
                  </div>
                )}
                <div ref={traceEndRef} />
              </div>
            </div>

            {/* RIGHT: INVESTIGATION REPORT */}
            <div className="lg:col-span-7 flex flex-col">
              {answer && (
                <div className="animate-in fade-in duration-700">
                  <div className="border-b border-[var(--color-bb-border-strong)] pb-4 mb-10 flex justify-between items-end">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-bb-text-primary)]">Investigation Report</h3>
                    <span className="font-mono text-[10px] text-[var(--color-bb-text-secondary)] tracking-widest">STATUS // COMPLETE</span>
                  </div>
                  
                  {answer.status === 'insufficient' ? (
                    <div className="bg-[var(--color-bb-surface)] border border-[var(--color-bb-border-strong)] p-10 rounded-sm">
                      <h4 className="font-mono text-xl text-[var(--color-bb-text-primary)] mb-6 uppercase tracking-widest">INSUFFICIENT EVIDENCE</h4>
                      <p className="text-lg text-[var(--color-bb-text-secondary)] font-light leading-relaxed mb-8">The available knowledge base does not establish the requested fact.</p>
                      <div className="font-mono text-sm text-[var(--color-bb-text-secondary)] bg-[var(--color-bb-bg)] p-6 border border-[var(--color-bb-border)]">
                        {answer.reason}
                      </div>
                    </div>
                  ) : answer.status === 'out_of_scope' ? (
                    <div className="bg-[var(--color-bb-surface)] border border-[var(--color-bb-border-strong)] p-10 rounded-sm">
                      <h4 className="font-mono text-xl text-[var(--color-bb-text-primary)] mb-6 uppercase tracking-widest">OUTSIDE INVESTIGATION SCOPE</h4>
                      <p className="text-lg text-[var(--color-bb-text-secondary)] font-light leading-relaxed mb-8">This system investigates operational incidents, deployments, services, troubleshooting guidance, and related internal documentation.</p>
                      <div className="font-mono text-sm text-[var(--color-bb-text-secondary)] bg-[var(--color-bb-bg)] p-6 border border-[var(--color-bb-border)]">
                        {answer.answer}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-16">
                      {/* ROOT CAUSE SECTIONS */}
                      <div className="space-y-12">
                        {sections?.evidence && (
                          <div className="group">
                            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-bb-green)] mb-6">
                              01 — CONFIRMED EVIDENCE
                            </h4>
                            <div className="text-xl leading-relaxed text-[var(--color-bb-text-primary)] font-light whitespace-pre-wrap">
                              {sections.evidence.replace(/\\n/g, '\n')}
                            </div>
                          </div>
                        )}

                        {sections?.hypothesis && (
                          <div className="group border-t border-[var(--color-bb-border-strong)] pt-12">
                            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-bb-mustard)] mb-6">
                              02 — SUPPORTED HYPOTHESIS
                            </h4>
                            <div className="text-xl leading-relaxed text-[var(--color-bb-text-primary)] font-light whitespace-pre-wrap">
                              {sections.hypothesis.replace(/\\n/g, '\n')}
                            </div>
                          </div>
                        )}

                        {sections?.unresolved && (
                          <div className="group border-t border-[var(--color-bb-border-strong)] pt-12">
                            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-bb-text-secondary)] mb-6">
                              03 — UNRESOLVED
                            </h4>
                            <div className="text-xl leading-relaxed text-[var(--color-bb-text-secondary)] font-light whitespace-pre-wrap">
                              {sections.unresolved.replace(/\\n/g, '\n')}
                            </div>
                          </div>
                        )}

                        {!sections?.evidence && !sections?.unresolved && answer.answer && (
                          <div className="text-xl leading-relaxed text-[var(--color-bb-text-primary)] font-light whitespace-pre-wrap">
                            {typeof answer.answer === 'string' ? answer.answer.replace(/\\n/g, '\n') : answer.answer}
                          </div>
                        )}
                      </div>

                      {/* EVIDENCE CARDS */}
                      {answer.citations && answer.citations.length > 0 && (
                        <div className="pt-20 border-t border-[var(--color-bb-border-strong)]">
                          <div className="font-mono text-[10px] text-[var(--color-bb-text-secondary)] uppercase tracking-widest mb-10">
                            SUPPORTING EVIDENCE
                          </div>
                          
                          <div className="grid grid-cols-1 gap-8">
                            {answer.citations.map(cid => {
                              const doc = dataset.find(d => d.id === cid)
                              if (!doc) return <div key={cid} className="font-mono text-xs">{cid}</div>
                              
                              return (
                                <div key={cid} className="border border-[var(--color-bb-border-strong)] bg-[var(--color-bb-surface)] rounded-sm hover:border-[var(--color-bb-text-secondary)] transition-colors flex flex-col">
                                  
                                  <div className="flex items-center justify-between border-b border-[var(--color-bb-border)] px-6 py-4 bg-[var(--color-bb-elevated)]">
                                    <span className="font-mono text-sm font-bold text-[var(--color-bb-text-primary)]">EVIDENCE // {doc.id}</span>
                                    <span className="font-mono text-[10px] text-[var(--color-bb-text-secondary)] uppercase tracking-widest">{doc.type.replace('_', ' ')}</span>
                                  </div>
                                  
                                  <div className="p-6">
                                    <div className="grid grid-cols-3 gap-6 font-mono text-xs text-[var(--color-bb-text-secondary)] mb-8 border-b border-[var(--color-bb-border)] pb-6">
                                      <div>
                                        <div className="uppercase tracking-widest opacity-60 mb-2 text-[10px]">SERVICE</div>
                                        <div className="text-[var(--color-bb-text-primary)]">{doc.service || 'N/A'}</div>
                                      </div>
                                      <div>
                                        <div className="uppercase tracking-widest opacity-60 mb-2 text-[10px]">DATE</div>
                                        <div className="text-[var(--color-bb-text-primary)]">{doc.date || 'N/A'}</div>
                                      </div>
                                      <div>
                                        <div className="uppercase tracking-widest opacity-60 mb-2 text-[10px]">VERSION</div>
                                        <div className="text-[var(--color-bb-text-primary)]">{doc.version || 'N/A'}</div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-base font-light text-[var(--color-bb-text-primary)] leading-relaxed italic border-l-2 border-[var(--color-bb-border-strong)] pl-6">
                                      {doc.content}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* FOOTER METADATA */}
        <footer className="mt-32 pt-8 border-t border-[var(--color-bb-border)] flex flex-wrap gap-8 justify-between items-center text-[10px] font-mono text-[var(--color-bb-text-secondary)] tracking-widest uppercase">
          <div className="flex flex-wrap gap-10">
            <span>ENGINE <br/><span className="text-[var(--color-bb-text-primary)]">REACT INVESTIGATOR</span></span>
            <span>RETRIEVAL <br/><span className="text-[var(--color-bb-text-primary)]">CHROMADB</span></span>
            <span>STREAM <br/><span className="text-[var(--color-bb-text-primary)]">SSE</span></span>
            <span>EMBEDDINGS <br/><span className="text-[var(--color-bb-text-primary)]">LOCAL</span></span>
          </div>
          <div className="text-right">SESSION ID<br/><span className="text-[var(--color-bb-text-primary)]">{sessionId || 'INITIALIZING'}</span></div>
        </footer>
      </main>
    </div>
  )
}

export default App
