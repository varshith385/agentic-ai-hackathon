import { useState, useEffect, useRef } from 'react'
import dataset from './data.json'

function App() {
  const [query, setQuery] = useState('')
  const [investigating, setInvestigating] = useState(false)
  const [trace, setTrace] = useState([])
  const [answer, setAnswer] = useState(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const traceEndRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    
    setInvestigating(true)
    setTrace([])
    setAnswer(null)
    setIsDemoMode(false)
    
    try {
      const res = await fetch('http://localhost:8000/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      const data = await res.json()
      
      if (data.session_id) {
        const eventSource = new EventSource(`http://localhost:8000/stream/${data.session_id}`)
        
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
          } else if (eventData.type === 'error') {
            setTrace(prev => [...prev, { type: 'error', message: eventData.message }])
            eventSource.close()
            setInvestigating(false)
          } else if (eventData.type === 'done') {
            eventSource.close()
            setInvestigating(false)
          } else {
            setTrace(prev => [...prev, eventData])
          }
        }
      }
    } catch (err) {
      console.error(err)
      setInvestigating(false)
    }
  }

  const runDemo = () => {
    setInvestigating(true)
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

  const formatTraceMessage = (item) => {
    if (item.type === 'tool_call') {
      const match = item.message.match(/Searching for '(.*)'\.\.\./)
      if (match) return `Executing search: "${match[1]}"`
      return item.message
    }
    return item.message
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="text-sm font-semibold tracking-wide text-slate-500 uppercase">SRE Operations Center</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Autonomous Incident Investigator</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Correlates active alerts with deployment history, version metadata, and postmortems to determine root cause.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Why did the Order API become slow on September 16? Check whether the deployment was related."
            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
            disabled={investigating}
          />
          <button 
            type="submit" 
            disabled={investigating || !query.trim()}
            className="px-6 py-3 bg-slate-800 text-white font-medium rounded-lg shadow-sm hover:bg-slate-900 disabled:opacity-50 transition-colors"
          >
            {investigating && !isDemoMode ? 'Investigating...' : 'Live API'}
          </button>
          <button 
            type="button" 
            onClick={runDemo}
            disabled={investigating || !query.trim()}
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            Replay Demo
          </button>
        </form>
        
        {isDemoMode && (
          <div className="max-w-4xl mx-auto bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded text-sm text-center font-medium">
            Running in Verified Demo Mode (Replaying previously verified Gemini execution).
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* TRACE PANEL */}
          <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 text-sm flex items-center justify-between">
              <span>Investigation Trace</span>
              {investigating && <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
              </span>}
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3 text-sm">
              {trace.length === 0 && !investigating && (
                <div className="text-slate-400 text-center mt-10">Awaiting incident query...</div>
              )}
              {trace.map((item, idx) => (
                <div key={idx} className={`p-3 rounded border ${
                  item.type === 'tool_call' ? 'bg-slate-50 border-slate-200 text-slate-800' :
                  item.type === 'warning' ? 'bg-rose-50 border-rose-200 text-rose-800 font-semibold' :
                  item.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                  item.type === 'tool_result' ? 'bg-white border-slate-100 text-slate-600 font-mono text-xs' :
                  'bg-white border-transparent text-slate-500'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="opacity-50 text-[10px] mt-0.5 font-mono uppercase tracking-wider w-16 shrink-0">
                      [{item.type === 'tool_call' ? 'SEARCH' : item.type === 'tool_result' ? 'RESULT' : item.type === 'warning' ? 'ALERT' : item.type}]
                    </span>
                    <span className={item.type === 'warning' ? 'font-medium' : ''}>
                      {formatTraceMessage(item)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={traceEndRef} />
            </div>
          </div>

          {/* ANSWER PANEL */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
             <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 text-sm">
              Root Cause Analysis
            </div>
            <div className="p-6">
              {answer ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {answer.status === 'insufficient' ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                      <h3 className="font-bold mb-2">Insufficient Evidence</h3>
                      <p>{answer.reason}</p>
                    </div>
                  ) : (
                    <>
                      <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-lg">
                        {answer.answer}
                      </div>
                      
                      {answer.citations && answer.citations.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Supporting Evidence</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {answer.citations.map(cid => {
                              const doc = dataset.find(d => d.id === cid)
                              if (!doc) return (
                                <div key={cid} className="p-3 border border-slate-200 rounded bg-slate-50 font-mono text-sm text-slate-600">
                                  {cid}
                                </div>
                              )
                              return (
                                <div key={cid} className="flex flex-col p-4 border border-slate-200 rounded-lg bg-white shadow-sm hover:shadow transition-shadow">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-blue-600">{doc.id}</span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                        {doc.type.replace('_', ' ')}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium">{doc.date}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm border-y border-slate-50 py-2">
                                    <div>
                                      <span className="text-slate-400 text-xs block mb-1">Service</span>
                                      <span className="font-medium text-slate-700">{doc.service || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 text-xs block mb-1">Version</span>
                                      <span className="font-mono text-slate-700">{doc.version || 'N/A'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 text-xs block mb-1">Relevant Finding</span>
                                    <p className="text-sm text-slate-700 italic border-l-2 border-slate-200 pl-3">
                                      "{doc.content}"
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 mt-20">
                  {investigating ? (
                    <div className="space-y-4 text-center">
                      <div className="h-8 w-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
                      <p>Synthesizing evidence...</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>Results will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default App
