import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

const ChatInterface = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '👋 Hi! I\'m Chemora, your AI chemistry assistant. Ask me anything about synthesis, safety, mechanisms, or general chemistry!',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([
        'How do I synthesize aspirin?',
        'What safety precautions for acetylation?',
        'Explain nucleophilic substitution'
    ]);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (messageText) => {
        if (!messageText.trim() || loading) return;

        const userMessage = {
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            const data = await response.json();

            const aiMessage = {
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);

            if (data.suggestions) {
                setSuggestions(data.suggestions);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleSuggestionClick = (suggestion) => {
        sendMessage(suggestion);
    };

    const formatMessage = (content) => {
        // Basic markdown-like formatting
        return content
            .split('\n')
            .map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-bold text-chemistry-accent mt-3 mb-1">{line.slice(2, -2)}</p>;
                } else if (line.startsWith('- ')) {
                    return <li key={i} className="ml-4 text-slate-300">{line.slice(2)}</li>;
                } else if (line.trim() === '') {
                    return <br key={i} />;
                } else {
                    return <p key={i} className="text-slate-300">{line}</p>;
                }
            });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto bg-slate-900/50 rounded-xl border border-slate-700">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user'
                                ? 'bg-chemistry-accent text-slate-900'
                                : 'bg-chemistry-success/20 text-chemistry-success'
                            }`}>
                            {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>

                        {/* Message Bubble */}
                        <div className={`max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-chemistry-accent text-slate-900'
                                    : 'bg-slate-800/80 border border-slate-700'
                                }`}>
                                <div className="text-sm leading-relaxed">
                                    {formatMessage(msg.content)}
                                </div>
                            </div>
                            <span className="text-xs text-slate-600">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-chemistry-success/20 text-chemistry-success flex items-center justify-center">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3">
                            <Loader2 className="w-5 h-5 animate-spin text-chemistry-accent" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && !loading && (
                <div className="px-4 py-2 border-t border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-chemistry-accent rounded-full border border-slate-700 transition-colors"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything about chemistry..."
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-chemistry-accent transition-colors disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="px-4 py-3 bg-chemistry-accent hover:bg-chemistry-accent/90 text-slate-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatInterface;
