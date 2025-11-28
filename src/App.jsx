import React, { useState } from 'react';
import { Send, FlaskConical, Atom, BookOpen, Activity, Loader2, Paperclip, X, MessageSquare, Beaker } from 'lucide-react';
import { processQueryStream } from './api';
import AgentOrchestrator from './components/AgentOrchestrator';
import ChatInterface from './components/ChatInterface';


function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [agentProgress, setAgentProgress] = useState({ activeIndex: -1, completedIndices: [] });
  const [activeView, setActiveView] = useState('planner'); // 'planner' or 'chat'

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAgentProgress({ activeIndex: -1, completedIndices: [] });

    try {
      // Use streaming API with real-time agent updates
      const data = await processQueryStream(query, selectedFile, (agentUpdate) => {
        // Real-time callback for each agent
        setAgentProgress(prev => {
          const newState = { ...prev, activeIndex: agentUpdate.index };

          if (agentUpdate.status === 'complete' && !prev.completedIndices.includes(agentUpdate.index)) {
            newState.completedIndices = [...prev.completedIndices, agentUpdate.index];
          }

          return newState;
        });
      });

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Failed to connect to the server. Please ensure the backend is running.");
      console.error("API Error:", err);
    } finally {
      setLoading(false);
      setAgentProgress({ activeIndex: -1, completedIndices: [] });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-chemistry-accent via-chemistry-success to-chemistry-highlight bg-clip-text text-transparent mb-2">
            CHEMORA
          </h1>
          <p className="text-slate-400 text-sm">AI-Powered Chemical Synthesis Platform</p>
        </div>

        {/* View Switcher */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setActiveView('planner')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${activeView === 'planner'
              ? 'bg-chemistry-accent text-slate-900 shadow-lg shadow-chemistry-accent/30'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 border border-slate-700'
              }`}
          >
            <Beaker className="w-5 h-5" />
            <span className="font-semibold">Synthesis Planner</span>
          </button>
          <button
            onClick={() => setActiveView('chat')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${activeView === 'chat'
              ? 'bg-chemistry-accent text-slate-900 shadow-lg shadow-chemistry-accent/30'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 border border-slate-700'
              }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-semibold">Chat Assistant</span>
          </button>
        </div>

        {/* Content */}
        {activeView === 'chat' ? (
          <ChatInterface />
        ) : (
          <>
            {/* Synthesis Planner View */}
            <div className="bg-chemistry-secondary/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700 shadow-xl">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., I need the synthesis of Aspirin cheaply..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-4 pl-6 pr-24 text-lg focus:outline-none focus:border-chemistry-accent focus:ring-1 focus:ring-chemistry-accent transition-all placeholder-slate-500"
                />

                <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`p-3 rounded-lg transition-colors cursor-pointer ${selectedFile ? 'bg-chemistry-accent/20 text-chemistry-accent' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                    title="Upload Image"
                  >
                    <Paperclip className="w-6 h-6" />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="p-3 bg-chemistry-accent hover:bg-chemistry-accent/90 text-chemistry-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  </button>
                </div>
              </form>

              {selectedFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-chemistry-accent bg-chemistry-accent/10 w-fit px-3 py-1 rounded-full border border-chemistry-accent/20">
                  <Paperclip className="w-3 h-3" />
                  <span>{selectedFile.name}</span>
                  <button onClick={clearFile} className="hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center backdrop-blur-sm">
                {error}
              </div>
            )}

            {/* Agent Orchestration Visualization */}
            {loading && <AgentOrchestrator isActive={loading} activeIndex={agentProgress.activeIndex} completedIndices={agentProgress.completedIndices} />}

            {/* Results Section */}
            {!loading && result && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Intent & Canonicalization */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Intent Card */}
                  <div className="bg-chemistry-secondary/60 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                    <div className="flex items-center gap-2 mb-4 text-chemistry-highlight">
                      <Activity className="w-5 h-5" />
                      <h2 className="text-xl font-semibold">Parsed Intent</h2>
                    </div>
                    <div className="space-y-2 text-slate-300">
                      <p><span className="text-slate-500">Target:</span> <span className="text-white font-medium">{result.intent.target || "N/A"}</span></p>
                      <p><span className="text-slate-500">Mode:</span> {result.intent.mode}</p>
                      <p><span className="text-slate-500">Priority:</span> {result.intent.priority}</p>
                      <div className="flex gap-2 mt-2">
                        {result.intent.constraints.map(c => (
                          <span key={c} className="px-2 py-1 bg-chemistry-accent/10 text-chemistry-accent text-xs rounded-full border border-chemistry-accent/20">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Molecule Card */}
                  <div className="bg-chemistry-secondary/60 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-chemistry-success">
                        <Atom className="w-5 h-5" />
                        <h2 className="text-xl font-semibold">Molecule Data</h2>
                      </div>
                      {result.canonical_data?.source && (
                        <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-600">
                          via {result.canonical_data.source}
                        </span>
                      )}
                    </div>
                    {result.canonical_data && !result.canonical_data.error ? (
                      <div className="space-y-3 text-slate-300">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Chemical Name</p>
                            <p className="font-medium">{result.canonical_data.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Molecular Formula</p>
                            <p className="font-medium text-lg">
                              {result.canonical_data.formula?.replace(/(\d+)/g, (match) => {
                                const subscriptMap = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
                                return match.split('').map(d => subscriptMap[d] || d).join('');
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Molecular Weight</p>
                            <p className="font-medium">
                              {result.canonical_data.molecular_weight} <span className="text-slate-500 text-sm">g/mol</span>
                            </p>
                          </div>
                          {result.canonical_data.inchi && (
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">InChI Available</p>
                              <button
                                onClick={() => navigator.clipboard.writeText(result.canonical_data.inchi)}
                                className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 transition-colors"
                                title="Click to copy InChI"
                              >
                                📋 Copy InChI
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Canonical SMILES</p>
                            <button
                              onClick={() => navigator.clipboard.writeText(result.canonical_data.canonical_smiles)}
                              className="text-xs text-chemistry-accent hover:underline"
                            >
                              Copy
                            </button>
                          </div>
                          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 break-all font-mono text-xs text-green-400">
                            {result.canonical_data.canonical_smiles}
                          </div>
                        </div>

                        {result.canonical_data.inchi && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-slate-500 hover:text-slate-400 select-none">
                              Show Full InChI
                            </summary>
                            <div className="mt-2 p-2 bg-slate-900/30 rounded border border-slate-800 break-all font-mono text-slate-500">
                              {result.canonical_data.inchi}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">No molecule data found.</p>
                    )}
                  </div>
                </div>

                {/* Synthetic Routes Section */}
                {result.routes && result.routes.length > 0 && (
                  <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-chemistry-accent">
                      <Activity className="w-5 h-5" />
                      Synthetic Routes
                    </h2>
                    <div className="space-y-4">
                      {result.routes.map((route, idx) => (
                        <div key={idx} className="bg-slate-900/50 rounded-lg p-5 border border-slate-700/50 hover:border-chemistry-accent/30 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-slate-200 text-lg">Route {idx + 1}</h3>
                              {route.source && (
                                <span className="text-[10px] font-bold text-slate-400 border border-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  {route.source}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {route.score && (
                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                                  Score: {typeof route.score === 'number' ? route.score.toFixed(1) : route.score}
                                </span>
                              )}
                              {route.cost?.total_estimated_cost && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                                  ${route.cost.total_estimated_cost}
                                </span>
                              )}
                              {route.confidence && (
                                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                  {(route.confidence * 100).toFixed(0)}% conf
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Algorithm and Model Info */}
                          {(route.algorithm || route.model || route.models_used) && (
                            <div className="mb-3 p-2 bg-slate-800/50 rounded border border-slate-700/50 text-xs text-slate-400">
                              <div className="flex flex-wrap gap-3">
                                {route.algorithm && (
                                  <span>
                                    <span className="text-slate-500">Algorithm:</span> <span className="text-chemistry-highlight">{route.algorithm}</span>
                                  </span>
                                )}
                                {route.model && (
                                  <span>
                                    <span className="text-slate-500">Model:</span> <span className="text-chemistry-highlight">{route.model}</span>
                                  </span>
                                )}
                                {route.models_used && Array.isArray(route.models_used) && (
                                  <span>
                                    <span className="text-slate-500">Models:</span> <span className="text-chemistry-highlight">{route.models_used.join(', ')}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Steps */}
                          <div className="space-y-2 mt-3">
                            {route.steps.map((step, sIdx) => (
                              <div key={sIdx} className="text-sm text-slate-400 pl-4 border-l-2 border-slate-700 hover:border-chemistry-accent/50 transition-colors relative group">
                                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-600 group-hover:bg-chemistry-accent transition-colors"></div>
                                <p className="text-slate-300 font-medium">{step.reaction}</p>
                                <div className="flex flex-wrap gap-3 mt-1 text-xs">
                                  {step.prediction?.predicted_yield && (
                                    <span className="opacity-80">
                                      Yield: <span className="text-emerald-400 font-semibold">{step.prediction.predicted_yield}%</span>
                                    </span>
                                  )}
                                  {step.prediction?.feasibility && (
                                    <span className="opacity-80">
                                      Feasibility: <span className="text-blue-400">{step.prediction.feasibility}</span>
                                    </span>
                                  )}
                                  {step.conditions && (
                                    <span className="opacity-70 text-slate-500">
                                      {step.conditions}
                                    </span>
                                  )}
                                  {step.predicted_by && (
                                    <span className="text-slate-600">
                                      • {step.predicted_by}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Safety Flags */}
                          {route.safety?.hazards?.length > 0 && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <div className="flex items-start gap-2">
                                <span className="text-lg">⚠️</span>
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-red-400 mb-1">Safety Alerts</p>
                                  <div className="text-xs text-red-300 space-y-1">
                                    {route.safety.hazards.map((h, i) => (
                                      <div key={i} className="flex items-start gap-2">
                                        <span className="text-red-500">•</span>
                                        <span>{h.hazard || h.code || h}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Route Metrics */}
                          {route.weights_used && (
                            <details className="mt-3 text-xs">
                              <summary className="cursor-pointer text-slate-500 hover:text-slate-400 select-none">
                                Show Scoring Details
                              </summary>
                              <div className="mt-2 p-2 bg-slate-900/30 rounded border border-slate-800 space-y-1">
                                {Object.entries(route.weights_used).map(([key, weight]) => (
                                  <div key={key} className="flex justify-between text-slate-400">
                                    <span className="capitalize">{key.replace('_', ' ')}:</span>
                                    <span>{(weight * 100).toFixed(0)}%</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Protocol Section */}
                {result.protocol && (
                  <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2 text-chemistry-accent">
                        <BookOpen className="w-5 h-5" />
                        Generated Protocol
                      </h2>
                      <button
                        onClick={() => navigator.clipboard.writeText(result.protocol)}
                        className="text-xs px-3 py-1.5 bg-chemistry-accent/20 hover:bg-chemistry-accent/30 text-chemistry-accent rounded border border-chemistry-accent/30 transition-colors"
                      >
                        📋 Copy Protocol
                      </button>
                    </div>
                    <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700/50 overflow-x-auto">
                      <pre className="whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed">
                        {result.protocol}
                      </pre>
                    </div>
                    <div className="mt-3 text-xs text-slate-500 italic flex items-center gap-2">
                      <span>📝</span>
                      <span>Generated using Jinja2 templates + GPT4o-mini NLG + RDKit stoichiometry</span>
                    </div>
                  </div>
                )}

                {/* Literature Results */}
                <div className="bg-chemistry-secondary/60 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-2 mb-4 text-chemistry-warning">
                    <BookOpen className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">Literature Precedents</h2>
                  </div>
                  <div className="space-y-3">
                    {result.literature_results?.map((doc, i) => (
                      <div key={i} className="p-4 bg-slate-900/30 rounded-lg border border-slate-700 hover:border-chemistry-warning/30 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-chemistry-warning/80 border border-chemistry-warning/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {doc.source || "Unknown"}
                          </span>
                          {doc.score && <span className="text-xs text-slate-500">Score: {doc.score.toFixed(2)}</span>}
                        </div>
                        <p className="text-slate-200 mt-1">{doc.text}</p>
                        <div className="mt-2 flex justify-between items-center text-sm text-slate-500">
                          <span>Yield: <span className="text-chemistry-success">{doc.yield}</span></span>
                        </div>
                      </div>
                    ))}
                    {(!result.literature_results || result.literature_results.length === 0) && (
                      <p className="text-slate-500 italic">No literature found.</p>
                    )}
                  </div>
                </div>

                {/* Reaction Results */}
                <div className="bg-chemistry-secondary/60 backdrop-blur-md rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-2 mb-4 text-chemistry-accent">
                    <FlaskConical className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">Reaction Pathways</h2>
                  </div>
                  <div className="space-y-3">
                    {result.reaction_results?.map((rxn, i) => (
                      <div key={i} className="p-4 bg-slate-900/30 rounded-lg border border-slate-700 hover:border-chemistry-accent/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-chemistry-accent">{rxn.name}</h3>
                            <span className="text-[10px] font-bold text-slate-400 border border-slate-600 px-1 py-0.5 rounded uppercase">
                              {rxn.source || "DB"}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-400">
                              Sim: {rxn.similarity?.toFixed(2)}
                            </span>
                            {rxn.method && <span className="text-[10px] text-slate-600 mt-0.5">{rxn.method}</span>}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-slate-400 break-all">
                          {rxn.smiles}
                        </div>
                      </div>
                    ))}
                    {(!result.reaction_results || result.reaction_results.length === 0) && (
                      <p className="text-slate-500 italic">No reactions found.</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div >
  );
}

export default App;
