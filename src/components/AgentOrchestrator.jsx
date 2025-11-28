import React, { useState, useEffect } from 'react';
import { Brain, Database, Search, FlaskConical, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

const AgentStep = ({ icon: Icon, title, status, delay }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShow(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    if (!show) return null;

    return (
        <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${status === 'completed'
                ? 'bg-chemistry-success/10 border-chemistry-success/30 text-chemistry-success'
                : status === 'active'
                    ? 'bg-chemistry-accent/10 border-chemistry-accent/30 text-chemistry-accent scale-105 shadow-lg shadow-chemistry-accent/10'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500'
            }`}>
            <div className={`p-2 rounded-lg ${status === 'completed' ? 'bg-chemistry-success/20' :
                    status === 'active' ? 'bg-chemistry-accent/20 animate-pulse' : 'bg-slate-800'
                }`}>
                {status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
            </div>
            <div className="flex-1">
                <h3 className="font-medium">{title}</h3>
                {status === 'active' && (
                    <p className="text-xs opacity-80 animate-pulse">Processing...</p>
                )}
            </div>
            {status === 'active' && <Loader2 className="w-5 h-5 animate-spin" />}
        </div>
    );
};

const AgentOrchestrator = ({ loading, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);

    // Simulation steps
    const steps = [
        { icon: Brain, title: "Agent 1: Parsing User Intent", duration: 1500 },
        { icon: Database, title: "Agent 2: Resolving Chemical Structure", duration: 1500 },
        { icon: Search, title: "Agent 3: Retrieving Literature", duration: 2000 },
        { icon: FlaskConical, title: "Agent 4: Analyzing Reaction Pathways", duration: 2000 },
    ];

    useEffect(() => {
        if (loading) {
            setCurrentStep(0);
            let totalDelay = 0;

            steps.forEach((step, index) => {
                setTimeout(() => {
                    setCurrentStep(index);
                }, totalDelay);
                totalDelay += step.duration;
            });

            // Finish after all steps
            setTimeout(() => {
                setCurrentStep(steps.length); // All done
            }, totalDelay);
        }
    }, [loading]);

    if (!loading) return null;

    return (
        <div className="space-y-4 max-w-2xl mx-auto my-8">
            {steps.map((step, index) => (
                <AgentStep
                    key={index}
                    icon={step.icon}
                    title={step.title}
                    status={
                        index < currentStep ? 'completed' :
                            index === currentStep ? 'active' : 'pending'
                    }
                    delay={index * 200} // Stagger entrance slightly
                />
            ))}
        </div>
    );
};

export default AgentOrchestrator;
