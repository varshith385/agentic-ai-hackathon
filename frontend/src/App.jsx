import { useState, useEffect, useRef } from 'react'
import dataset from './data.json'
import './App.css'

const FormattedText = ({ text }) => {
  if (!text) return null;
  const lines = typeof text === 'string' ? text.replace(/\\n/g, '\n').split('\n') : String(text).split('\n');
  const blocks = [];
  let currentList = null;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (!currentList) {
        currentList = [];
        blocks.push({ type: 'list', items: currentList, key: i });
      }
      currentList.push({ content: trimmed.substring(2).trim(), key: i });
    } else {
      if (currentList) {
        currentList = null;
      }
      if (trimmed) {
        blocks.push({ type: 'text', content: trimmed, key: i });
      } else {
        blocks.push({ type: 'break', key: i });
      }
    }
  });

  return (
    <div className="space-y-4 text-[15px] md:text-base font-light leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === 'list') {
          return (
            <ul key={block.key} className="list-none space-y-3">
              {block.items.map(item => (
                <li key={item.key} className="flex gap-4 items-start">
                  <span className="opacity-50 text-xs mt-1.5 font-mono">/</span>
                  <span className="flex-1">{item.content}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'text') {
          return <p key={block.key}>{block.content}</p>;
        }
        if (block.type === 'break' && i > 0 && i < blocks.length - 1 && blocks[i-1].type !== 'break') {
          return <div key={block.key} className="h-3"></div>;
        }
        return null;
      })}
    </div>
  );
}

function App() {
  const [query, setQuery] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [investigating, setInvestigating] = useState(false)
  const [paused, setPaused] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)
  const [trace, setTrace] = useState([])
  const [answer, setAnswer] = useState(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  const traceRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

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
    
    setTimeout(() => traceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    
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
    
    setTimeout(() => traceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    
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
           answer: "CONFIRMED EVIDENCE:\n- INC-1042 (incident_report, orders-api, 2026-09-16, version v2.8.1): P95 latency increased significantly, and the incident began shortly after the latest deployment.\n- DEP-882 (deployment_note, orders-api, 2026-09-15): Version v2.8.1 was deployed to production at 18:10 UTC.\n- PM-211 (postmortem, orders-api, 2026-05-03, version v2.6.0): A previous, unrelated latency incident was caused by database connection saturation during a schema migration.\n\nSUPPORTED HYPOTHESIS:\n- The latency spike on September 16 is definitively linked to the recent deployment of orders-api v2.8.1, given the temporal correlation.\n\nUNRESOLVED:\n- It is not fully established if the database connection saturation from v2.6.0 is the exact mechanism, as PM-211 is historical context only.",
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
    }, 1200);
  }

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
  
  // Extract Live Search & Evidence state from trace
  const currentSearch = [...trace].reverse().find(t => t.type === 'tool_call');
  const allFoundDocsSet = new Set();
  trace.filter(t => t.type === 'tool_result').forEach(t => {
    const match = t.message.match(/Found documents: (.*)/);
    if (match) {
      match[1].split(',').map(d => d.trim()).forEach(d => allFoundDocsSet.add(d));
    }
  });
  const allFoundDocs = Array.from(allFoundDocsSet);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-dark)] font-sans flex flex-col relative selection:bg-[var(--color-accent-ai)] selection:text-[var(--color-bg-primary)]">
      
      {/* Decorative Network Background */}
      <div 
        className="bg-network"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />

      {/* TOP SYSTEM BAR */}
      <header className="fixed top-0 w-full z-50 border-b border-[var(--color-text-dark-muted)]/20 bg-[var(--color-bg-primary)]/90 backdrop-blur-md px-6 py-4 flex justify-between items-center text-[10px] font-mono tracking-widest uppercase anim-seq-1">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--color-text-dark)] opacity-80"></div>
            <span className="font-bold">SRE OPERATIONS CENTER</span>
          </div>
          <span className="text-[var(--color-text-dark-muted)] hidden sm:inline">AGENT: READY // MODEL: QWEN</span>
        </div>
        
        <div className="flex items-center gap-4 bg-[var(--color-bg-secondary)] border border-[var(--color-text-dark-muted)]/30 rounded-full p-1">
          <button 
            onClick={() => setIsDemoMode(false)}
            className={`px-4 py-1.5 rounded-full transition-colors duration-300 ${!isDemoMode ? 'bg-[var(--color-text-dark)] text-[var(--color-bg-primary)] font-bold' : 'text-[var(--color-text-dark-muted)] hover:text-[var(--color-text-dark)]'}`}
          >
            LIVE
          </button>
          <button 
            onClick={() => setIsDemoMode(true)}
            className={`px-4 py-1.5 rounded-full transition-colors duration-300 ${isDemoMode ? 'bg-[var(--color-text-dark)] text-[var(--color-bg-primary)] font-bold' : 'text-[var(--color-text-dark-muted)] hover:text-[var(--color-text-dark)]'}`}
          >
            REPLAY
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full relative z-10 pt-20">
        
        {/* SECTION 01 — ARRIVAL / HERO */}
        <section className="min-h-[85vh] flex flex-col justify-center items-center px-6 text-center">
          <div className="max-w-4xl w-full flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-tight anim-seq-2 mb-6">
              YOUR INCIDENT. <br/>
              <span className="text-[var(--color-text-dark-muted)]">OUR INVESTIGATION.</span>
            </h1>
            <p className="text-xl md:text-2xl text-[var(--color-text-dark-muted)] font-light max-w-2xl anim-seq-3 mb-16 leading-relaxed">
              An autonomous investigation agent that searches, connects and evaluates operational evidence.
            </p>

            <div className="w-full max-w-3xl anim-seq-4 relative">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className={`border border-[var(--color-text-dark-muted)]/30 bg-[var(--color-bg-secondary)]/50 backdrop-blur-sm transition-all duration-500 ${investigating ? 'border-[var(--color-accent-ai)] shadow-[0_0_20px_rgba(85,214,190,0.15)]' : 'hover:border-[var(--color-text-dark-muted)]'}`}>
                  <div className="flex items-center border-b border-[var(--color-text-dark-muted)]/20 px-6 py-3 bg-[var(--color-bg-primary)]/50">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-dark-muted)]">
                      {investigating ? (
                        <span className="flex items-center gap-2 text-[var(--color-accent-ai)]"><span className="w-2 h-2 rounded-full bg-[var(--color-accent-ai)] animate-pulse"></span> INVESTIGATION ACTIVE</span>
                      ) : 'COMMAND INPUT'}
                    </span>
                  </div>
                  <div className="flex items-stretch">
                    <div className="px-6 py-6 text-[var(--color-accent-ai)] font-mono text-xl flex items-center">&gt;</div>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Why did the Order API become slow on Sept 16?"
                      className="flex-1 bg-transparent py-6 text-xl text-[var(--color-text-dark)] placeholder:text-[var(--color-text-dark-muted)] focus:outline-none font-mono"
                      disabled={investigating || paused}
                    />
                    {!investigating && !paused && (
                      <button 
                        type={isDemoMode ? "button" : "submit"}
                        onClick={isDemoMode ? runDemo : undefined}
                        disabled={!query.trim()}
                        className="px-8 text-[var(--color-text-dark)] font-mono text-xs font-bold tracking-widest hover:text-[var(--color-accent-ai)] transition-colors disabled:opacity-30 flex items-center border-l border-[var(--color-text-dark-muted)]/20"
                      >
                        INVESTIGATE &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* SECTION 02 — HOW THE AGENT THINKS */}
        {!investigating && !answer && trace.length === 0 && (
          <section className="bg-[var(--color-bg-light)] text-[var(--color-text-light)] py-32 px-6 border-y border-[var(--color-bg-warm)]">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-sm font-mono tracking-widest uppercase text-[var(--color-text-light-muted)] mb-4">HOW THE INVESTIGATION WORKS</h2>
                <p className="text-3xl md:text-4xl font-light">An elegant process of continuous discovery.</p>
              </div>
              
              <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 font-mono text-xs tracking-widest uppercase text-center relative">
                {/* Horizontal line connector */}
                <div className="hidden md:block absolute top-6 left-12 right-12 h-px bg-[var(--color-text-light-muted)]/20 z-0"></div>
                
                {['Question', 'Retrieve', 'Observe', 'Search Again', 'Evaluate', 'Conclude'].map((step, idx) => (
                  <div key={step} className="flex flex-col items-center gap-6 relative z-10 group">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-bg-light-alt)] border border-[var(--color-text-light-muted)]/20 flex items-center justify-center text-[var(--color-text-light-muted)] group-hover:bg-[var(--color-text-light)] group-hover:text-[var(--color-bg-light)] transition-colors duration-500">
                      0{idx + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* LIVE INVESTIGATION WORKSPACE */}
        {(investigating || trace.length > 0 || paused || answer) && (
          <section ref={traceRef} className="py-24 px-6 max-w-[1400px] mx-auto w-full min-h-[80vh]">
            <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 relative">
              
              {/* LEFT COLUMN: INVESTIGATION TRACE (~42%) */}
              <div className="lg:w-[42%] flex flex-col z-10 relative">
                <h2 className="font-mono text-sm tracking-widest text-[var(--color-text-dark-muted)] uppercase mb-12 opacity-70">Investigation Trace</h2>
                
                <div className="flex flex-col gap-0 relative">
                  {trace.map((item, idx) => {
                    const stepNum = (idx + 1).toString().padStart(2, '0')
                    const isLast = idx === trace.length - 1 && investigating
                    const isWarning = item.type === 'warning'
                    const isResult = item.type === 'tool_result'
                    
                    return (
                      <div key={idx} className={`relative flex gap-6 pb-10 trace-node-enter ${!isLast && 'opacity-40 transition-opacity hover:opacity-100'}`}>
                        {idx !== trace.length - 1 && (
                          <div className="absolute left-[9px] top-8 bottom-0 w-px bg-[var(--color-text-dark-muted)]/30"></div>
                        )}
                        
                        <div className="flex flex-col items-center gap-4 relative z-10 pt-1">
                          <span className="font-mono text-[10px] text-[var(--color-text-dark-muted)] tracking-widest">{stepNum}</span>
                          <div className={`w-2 h-2 rounded-full bg-[var(--color-bg-primary)] border-2 ${isWarning ? 'border-[var(--color-status-warn)]' : isLast ? 'border-[var(--color-accent-ai)] animate-[pulse-node_2s_infinite]' : 'border-[var(--color-text-dark-muted)]'}`}></div>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-2">
                          <span className={`font-mono text-[10px] uppercase tracking-widest ${isWarning ? 'text-[var(--color-status-warn)]' : 'text-[var(--color-text-dark-muted)]'}`}>
                            {item.type === 'tool_call' ? 'SEARCHING' : item.type === 'tool_result' ? 'RETRIEVED' : item.type === 'warning' ? 'KNOWLEDGE CONFLICT' : item.type}
                          </span>
                          <div className={`text-base font-light ${isResult ? 'font-mono text-[13px] text-[var(--color-accent-sec)]' : 'text-[var(--color-text-dark)]'}`}>
                            {formatTraceMessage(item)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {investigating && (
                    <div className="relative flex gap-6 pt-2 trace-node-enter">
                      <div className="flex flex-col items-center gap-4 relative z-10 pt-1">
                        <span className="font-mono text-[10px] text-[var(--color-text-dark-muted)] opacity-0">XX</span>
                        <div className="w-2 h-2 rounded-full border-2 border-[var(--color-accent-ai)] animate-[pulse-node_1.5s_infinite] bg-[var(--color-bg-primary)]"></div>
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-accent-ai)]">AGENT REASONING</span>
                        <div className="h-2 w-32 bg-[var(--color-accent-ai)]/10 rounded overflow-hidden relative mt-1">
                          <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-[var(--color-accent-ai)]/40 animate-[scan_1.5s_ease-in-out_infinite_alternate]"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {paused && (
                    <div className="mt-8 bg-[var(--color-bg-secondary)] border-l-4 border-[var(--color-status-crit)] p-6 trace-node-enter w-full max-w-sm">
                      <div className="flex flex-col gap-2 mb-4">
                        <span className="font-mono text-xs font-bold text-[var(--color-status-crit)] tracking-widest uppercase">Investigation Paused</span>
                        <span className="text-sm text-[var(--color-text-dark-muted)]">Rate limit. State preserved.</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] tracking-widest text-[var(--color-text-dark-muted)]">RETRY: <span className="text-[var(--color-status-crit)] text-sm">{retryAfter > 0 ? `00:${retryAfter.toString().padStart(2, '0')}` : 'READY'}</span></span>
                        <button 
                          type="button" onClick={handleResume} disabled={retryAfter > 0}
                          className="px-4 py-2 bg-[var(--color-text-dark)] text-[var(--color-bg-primary)] font-mono text-[10px] font-bold tracking-widest hover:bg-[var(--color-status-crit)] hover:text-white transition-colors disabled:opacity-30"
                        >
                          RESUME
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE INVESTIGATION / CONCLUSION (~58%) */}
              <div className="lg:w-[58%] relative">
                <div className="sticky top-32 z-10 flex flex-col transition-all duration-500 ease-out transform">
                  
                  {/* PENDING INVESTIGATION STATE */}
                  {!answer && investigating && (
                    <div className="anim-seq-1 bg-[var(--color-bg-secondary)]/50 border border-[var(--color-text-dark-muted)]/20 p-8 min-h-[400px]">
                      <h2 className="font-mono text-sm tracking-widest text-[var(--color-accent-ai)] uppercase mb-10 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-accent-ai)] animate-pulse"></span> LIVE INVESTIGATION
                      </h2>
                      
                      <div className="space-y-12">
                        {currentSearch && (
                          <div className="trace-node-enter">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-dark-muted)] block mb-3">CURRENT SEARCH</span>
                            <div className="text-xl font-light text-[var(--color-text-dark)] border-l border-[var(--color-accent-ai)]/50 pl-4 py-1">
                              {formatTraceMessage(currentSearch)}
                            </div>
                          </div>
                        )}
                        
                        {allFoundDocs.length > 0 && (
                          <div className="trace-node-enter">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-dark-muted)] block mb-4">DOCUMENTS FOUND</span>
                            <div className="flex flex-wrap gap-3">
                              {allFoundDocs.map(docId => (
                                <span key={docId} className="font-mono text-xs px-3 py-1.5 bg-[var(--color-accent-sec)]/10 text-[var(--color-accent-sec)] border border-[var(--color-accent-sec)]/30 trace-node-enter">
                                  {docId}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-8 border-t border-[var(--color-text-dark-muted)]/20">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-dark-muted)] block mb-2">INVESTIGATION STATUS</span>
                          <span className="text-[var(--color-text-dark-muted)] font-light italic">Evidence is being evaluated...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COMPLETED INVESTIGATION CONCLUSION */}
                  {answer && (
                    <div className="anim-seq-1 transition-all duration-500">
                      <h2 className="font-mono text-sm tracking-widest text-[var(--color-text-dark)] uppercase mb-8 pb-4 border-b border-[var(--color-text-dark-muted)]/30">
                        INVESTIGATION CONCLUSION
                      </h2>
                      
                      {(answer.status === 'insufficient' || answer.status === 'out_of_scope') ? (
                        <div className={`p-8 border-l-4 ${answer.status === 'insufficient' ? 'border-[var(--color-status-warn)] bg-[var(--color-bg-secondary)]' : 'border-[var(--color-text-dark-muted)] bg-[var(--color-bg-secondary)]'} answer-reveal-1`}>
                          <h3 className={`font-mono text-sm tracking-widest uppercase mb-6 ${answer.status === 'insufficient' ? 'text-[var(--color-status-warn)]' : 'text-[var(--color-text-dark-muted)]'}`}>
                            {answer.status === 'insufficient' ? 'EVIDENCE GAP DETECTED' : 'OUTSIDE INVESTIGATION SCOPE'}
                          </h3>
                          <p className="text-xl font-light leading-relaxed mb-8">
                            {answer.status === 'insufficient' ? 'The knowledge base does not contain enough evidence to establish this claim.' : 'This system investigates operational incidents, service failures and internal engineering evidence.'}
                          </p>
                          <div className="font-mono text-xs text-[var(--color-text-dark-muted)] whitespace-pre-wrap pl-6 border-l border-[var(--color-text-dark-muted)]/30">
                            {answer.status === 'insufficient' ? answer.reason : answer.answer}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-12">
                          {sections?.evidence && (
                            <div className="answer-reveal-1">
                              <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-accent-ai)] mb-4 flex items-center gap-3">
                                <span className="w-4 h-px bg-[var(--color-accent-ai)]"></span> 01 — CONFIRMED EVIDENCE
                              </h3>
                              <div className="text-[var(--color-accent-ai)]/90 bg-[var(--color-bg-secondary)]/30 p-6 border border-[var(--color-accent-ai)]/10">
                                <FormattedText text={sections.evidence} />
                              </div>
                            </div>
                          )}

                          {sections?.hypothesis && (
                            <div className="answer-reveal-2">
                              <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-accent-hyp)] mb-4 flex items-center gap-3">
                                <span className="w-4 h-px bg-[var(--color-accent-hyp)]"></span> 02 — SUPPORTED HYPOTHESIS
                              </h3>
                              <div className="text-[var(--color-accent-hyp)]/90 bg-[var(--color-bg-secondary)]/30 p-6 border border-[var(--color-accent-hyp)]/10">
                                <FormattedText text={sections.hypothesis} />
                              </div>
                            </div>
                          )}

                          {sections?.unresolved && (
                            <div className="answer-reveal-3">
                              <h3 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-status-warn)] mb-4 flex items-center gap-3">
                                <span className="w-4 h-px bg-[var(--color-status-warn)]"></span> 03 — UNRESOLVED
                              </h3>
                              <div className="text-[var(--color-status-warn)]/90 bg-[var(--color-bg-secondary)]/30 p-6 border border-[var(--color-status-warn)]/10">
                                <FormattedText text={sections.unresolved} />
                              </div>
                            </div>
                          )}

                          {!sections?.evidence && !sections?.unresolved && answer.answer && (
                            <div className="answer-reveal-1 bg-[var(--color-bg-secondary)] p-6">
                              <FormattedText text={answer.answer} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 04 — EVIDENCE BOARD */}
        {answer && answer.status === 'complete' && answer.citations && answer.citations.length > 0 && (
          <section className="bg-[var(--color-bg-light)] text-[var(--color-text-light)] py-24 px-6 border-y border-[var(--color-bg-warm)] mt-12 relative z-20">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-center font-mono text-sm tracking-widest uppercase text-[var(--color-text-light-muted)] mb-16 opacity-70">Evidence Board</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {answer.citations.map((cid, i) => {
                  const doc = dataset.find(d => d.id === cid)
                  if (!doc) return <div key={cid} className="font-mono">{cid}</div>
                  
                  let relation = null;
                  if (i > 0) {
                    const prevDoc = dataset.find(d => d.id === answer.citations[i-1]);
                    if (prevDoc) {
                      if (prevDoc.service === doc.service && prevDoc.version === doc.version) relation = "same service & version";
                      else if (prevDoc.service === doc.service) relation = "same service";
                      else if (doc.type === 'postmortem') relation = "historical context";
                    }
                  }
                  
                  return (
                    <div key={cid} className="flex flex-col relative answer-reveal-1">
                      {relation && (
                        <div className="absolute -left-4 -top-8 flex flex-col items-center h-8 w-px bg-[var(--color-text-light-muted)]/30 hidden lg:flex">
                          <span className="absolute top-2 left-2 text-[8px] font-mono uppercase tracking-widest text-[var(--color-text-light-muted)] whitespace-nowrap bg-[var(--color-bg-light)] px-1">{relation}</span>
                        </div>
                      )}
                      <div className="bg-[var(--color-bg-light-alt)] border border-[var(--color-text-light-muted)]/20 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 shadow-sm hover:shadow-md">
                        <div className="p-6 border-b border-[var(--color-text-light-muted)]/10 flex justify-between items-center">
                          <span className="font-mono font-bold text-base">{doc.id}</span>
                          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-text-light-muted)] bg-[var(--color-bg-light)] px-2 py-1 border border-[var(--color-text-light-muted)]/10">{doc.type.replace('_', ' ')}</span>
                        </div>
                        <div className="p-6 flex flex-col gap-6 flex-1">
                          <div className="flex flex-wrap gap-x-6 gap-y-4 font-mono text-[10px] text-[var(--color-text-light-muted)] uppercase tracking-widest border-b border-[var(--color-text-light-muted)]/10 pb-4">
                            {doc.service && <div className="flex flex-col"><span>Service</span><span className="text-[var(--color-text-light)] mt-1">{doc.service}</span></div>}
                            {doc.date && <div className="flex flex-col"><span>Date</span><span className="text-[var(--color-text-light)] mt-1">{doc.date}</span></div>}
                            {doc.version && <div className="flex flex-col"><span>Version</span><span className="text-[var(--color-text-light)] mt-1">{doc.version}</span></div>}
                          </div>
                          <p className="text-sm font-light leading-relaxed text-[var(--color-text-light)] border-l-2 border-[var(--color-text-light-muted)]/20 pl-4 mt-2">
                            {doc.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 06 — EVIDENCE CONFIDENCE SUMMARY */}
        {answer && answer.status === 'complete' && (
          <section className="bg-[var(--color-bg-primary)] py-12 px-6 relative z-20">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-dark-muted)] answer-reveal-3">
              <div className="flex flex-wrap justify-center gap-8 text-center md:text-left">
                <div><span className="text-[var(--color-accent-ai)] block text-xl mb-1">{answer.citations ? answer.citations.length : 0}</span> DOCUMENTS</div>
                <div><span className="text-[var(--color-text-dark)] block text-xl mb-1">{trace.filter(t=>t.type==='tool_call').length}</span> SEARCHES</div>
                <div><span className="text-[var(--color-text-dark)] block text-xl mb-1">{trace.filter(t=>t.type==='warning').length}</span> CONFLICTS</div>
              </div>
              <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-[var(--color-text-dark-muted)]/20 pt-6 md:pt-0 md:pl-8">
                INVESTIGATION COMPLETE <br/> <span className="text-[var(--color-text-dark)]">{new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
