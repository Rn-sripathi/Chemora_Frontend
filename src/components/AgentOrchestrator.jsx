import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Loader2, Zap } from 'lucide-react';

const AGENTS = [
  { name: 'Intent Parser', desc: 'Parse query and constraints', icon: '🧬' },
  { name: 'Canonicalizer', desc: 'Resolve molecular identity', icon: '🔬' },
  { name: 'Literature Search', desc: 'Retrieve scientific precedents', icon: '📚' },
  { name: 'Reaction Search', desc: 'Fetch reaction analogs', icon: '⚗️' },
  { name: 'Retrosynthesis', desc: 'Generate candidate routes', icon: '🧪' },
  { name: 'Yield Prediction', desc: 'Estimate feasibility', icon: '📊' },
  { name: 'Safety Check', desc: 'Flag hazards and controls', icon: '🛡️' },
  { name: 'Procurement', desc: 'Price and sourcing check', icon: '💰' },
  { name: 'Route Scoring', desc: 'Rank route quality', icon: '🏆' },
  { name: 'Protocol Gen', desc: 'Generate bench-ready protocol', icon: '📋' },
  { name: 'Data Curation', desc: 'Persist context and outputs', icon: '💾' },
];

const A2A_TYPE_STYLES = {
  discovery: { color: 'var(--chem-cyan)', label: 'Discovery' },
  handoff: { color: 'var(--green)', label: 'Handoff' },
  request: { color: 'var(--chem-amber)', label: 'Request' },
  insight: { color: '#a78bfa', label: 'Insight' },
  warning: { color: 'var(--warn)', label: 'Warning' },
  validation: { color: '#34d399', label: 'Validated' },
  enrichment: { color: '#60a5fa', label: 'Enrichment' },
};

const AgentOrchestrator = ({
  isActive,
  activeIndex = -1,
  completedIndices = [],
  a2aMessages = [],
}) => {
  const [visibleMessages, setVisibleMessages] = useState([]);
  const feedRef = useRef(null);
  const revealCursorRef = useRef(0);

  useEffect(() => {
    if (a2aMessages.length <= revealCursorRef.current) return;
    const start = revealCursorRef.current;
    revealCursorRef.current = a2aMessages.length;
    const newMsgs = a2aMessages.slice(start);
    newMsgs.forEach((msg, i) => {
      setTimeout(() => {
        setVisibleMessages((prev) => [...prev, msg]);
      }, i * 180);
    });
  }, [a2aMessages]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  if (!isActive && completedIndices.length === 0) return null;

  const completionPct = Math.round((completedIndices.length / AGENTS.length) * 100);

  return (
    <section className="pipeline-surface" aria-live="polite">
      <div className="section-header compact">
        <h2 className="section-title section-title-accent">
          <Zap className="w-4 h-4" /> Agent Pipeline
        </h2>
        <div className="pipeline-header-meta">
          <div className="pipeline-progress-bar">
            <div
              className="pipeline-progress-fill"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="pipeline-meta">
            {completedIndices.length}/{AGENTS.length} complete
          </span>
        </div>
      </div>

      <div className="pipeline-grid-enhanced">
        {AGENTS.map((agent, index) => {
          const isCompleted = completedIndices.includes(index);
          const isCurrent = activeIndex === index;
          const statusClass = isCurrent
            ? 'is-current'
            : isCompleted
              ? 'is-complete'
              : activeIndex === -1
                ? 'is-idle'
                : 'is-pending';

          return (
            <React.Fragment key={agent.name}>
              <article className={`pipeline-step-enhanced ${statusClass}`}>
                <div className="pipeline-step-number">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                <div className="pipeline-step-body">
                  <div className="pipeline-step-name">
                    <span className="pipeline-step-emoji">{agent.icon}</span>
                    <h3>{agent.name}</h3>
                  </div>
                  <p>{isCurrent ? 'Processing...' : isCompleted ? 'Done' : agent.desc}</p>
                </div>
                {isCurrent && <div className="pipeline-step-pulse" />}
              </article>
              {index < AGENTS.length - 1 && (
                <div className={`pipeline-connector ${isCompleted ? 'is-active' : ''}`}>
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {visibleMessages.length > 0 && (
        <div className="a2a-section">
          <div className="a2a-header">
            <h3>
              <Zap className="w-3.5 h-3.5" /> Agent-to-Agent Communication
            </h3>
            <span className="a2a-count">{visibleMessages.length} messages</span>
          </div>
          <div className="a2a-feed" ref={feedRef}>
            {visibleMessages.map((msg, idx) => {
              const typeStyle = A2A_TYPE_STYLES[msg.type] || A2A_TYPE_STYLES.handoff;
              return (
                <div key={idx} className="a2a-message" style={{ '--a2a-color': typeStyle.color }}>
                  <div className="a2a-message-header">
                    <span className="a2a-sender">{msg.sender}</span>
                    <span className="a2a-arrow">→</span>
                    <span className="a2a-receiver">{msg.receiver === '*' ? 'All Agents' : msg.receiver}</span>
                    <span className="a2a-type-badge" style={{ borderColor: typeStyle.color, color: typeStyle.color }}>
                      {typeStyle.label}
                    </span>
                  </div>
                  <p className="a2a-content">{msg.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default AgentOrchestrator;
