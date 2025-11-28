import React from 'react';
import { CheckCircle, Circle, Loader } from 'lucide-react';

const AgentOrchestrator = ({ isActive, activeIndex = -1, completedIndices = [] }) => {
    const agents = [
        { name: "Intent Parser", icon: "🔍", desc: "Understanding query" },
        { name: "Canonicalizer", icon: "⚗️", desc: "Validating structure" },
        { name: "Literature Search", icon: "📚", desc: "Finding precedents" },
        { name: "Reaction Search", icon: "🧪", desc: "Matching reactions" },
        { name: "Retrosynthesis", icon: "🔬", desc: "Planning routes" },
        { name: "Yield Prediction", icon: "📊", desc: "Estimating yields" },
        { name: "Safety Check", icon: "⚠️", desc: "Analyzing hazards" },
        { name: "Procurement", icon: "💰", desc: "Finding vendors" },
        { name: "Route Scoring", icon: "⭐", desc: "Ranking routes" },
        { name: "Protocol Gen", icon: "📝", desc: "Creating protocol" },
        { name: "Data Curation", icon: "💾", desc: "Logging data" }
    ];

    if (!isActive && completedIndices.length === 0) return null;

    return (
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Loader className={`w-4 h-4 ${activeIndex >= 0 ? 'animate-spin text-chemistry-accent' : 'text-slate-600'}`} />
                Real-Time Agent Pipeline
                {completedIndices.length === agents.length && (
                    <span className="ml-auto text-xs text-emerald-400">✓ Complete</span>
                )}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {agents.map((agent, index) => {
                    const isActiveAgent = activeIndex === index;
                    const isCompleted = completedIndices.includes(index);
                    const isPending = !isActiveAgent && !isCompleted && activeIndex !== -1;

                    return (
                        <div
                            key={index}
                            className={`
                                relative p-2 rounded-lg border transition-all duration-300
                                ${isActiveAgent ? 'bg-chemistry-accent/10 border-chemistry-accent/50 shadow-lg shadow-chemistry-accent/20' : ''}
                                ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30' : ''}
                                ${isPending ? 'bg-slate-800/50 border-slate-700' : ''}
                                ${!isActiveAgent && !isCompleted && !isPending ? 'bg-slate-900/30 border-slate-800' : ''}
                            `}
                        >
                            <div className="flex items-start gap-2">
                                <span className={`text-xl ${isCompleted ? 'opacity-60' : ''}`}>
                                    {agent.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate ${isActiveAgent ? 'text-chemistry-accent' :
                                        isCompleted ? 'text-emerald-400' :
                                            'text-slate-400'
                                        }`}>
                                        {agent.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate">
                                        {isActiveAgent ? agent.desc : isCompleted ? 'Done' : 'Pending'}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    {isCompleted ? (
                                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                                    ) : isActiveAgent ? (
                                        <Loader className="w-3 h-3 text-chemistry-accent animate-spin" />
                                    ) : (
                                        <Circle className="w-3 h-3 text-slate-700" />
                                    )}
                                </div>
                            </div>
                            {isActiveAgent && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-chemistry-accent/20">
                                    <div className="h-full bg-chemistry-accent animate-pulse" style={{ width: '100%' }}></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 text-[10px] text-slate-600 flex items-center justify-between">
                <span>
                    {completedIndices.length === agents.length
                        ? '🎉 All agents executed successfully'
                        : `⚡ ${completedIndices.length}/${agents.length} agents completed | LIVE from backend`
                    }
                </span>
                {activeIndex >= 0 && activeIndex < agents.length && (
                    <span className="text-chemistry-accent animate-pulse font-semibold">
                        {agents[activeIndex].name} executing...
                    </span>
                )}
            </div>
        </div>
    );
};

export default AgentOrchestrator;
