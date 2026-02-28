import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import LanguageSelector from '../components/LanguageSelector';
import { useAppStore } from '../store/appStore';
import { chatAPI } from '../services/api';
import { Send, Loader } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; }

export default function Chat() {
    const { societyId, preferredLanguage, aiStatus } = useAppStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [lang, setLang] = useState(preferredLanguage);
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = async () => {
        if (!input.trim() || !societyId) return;
        const msg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);

        try {
            const { data } = await chatAPI.sendMessage({ society_id: societyId, message: msg, conversation_id: conversationId, language: lang });
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            setConversationId(data.conversation_id);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally { setLoading(false); }
    };

    const suggestions = [
        'What was our highest avoidable cost this year?',
        'How can we reduce MD penalty?',
        'What if we shift pump timing to off-peak?',
        'Compare our performance to peers',
        'Explain our power factor trend',
    ];

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Vidyut AI Chat</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            {aiStatus?.ollama_running ? (
                                <>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--positive)' }} />
                                    Local Phi-3 Mini | AMD CPU + AOCL
                                </>
                            ) : (
                                <>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)' }} />
                                    Cloud fallback: Gemini 1.5 Flash
                                </>
                            )}
                        </div>
                    </div>
                    <LanguageSelector value={lang} onChange={setLang} compact />
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {messages.length === 0 && (
                        <div style={{ marginTop: 'auto', marginBottom: 'auto', textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, color: 'var(--text-2)' }}>
                                Ask me anything about your society's energy data
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 500, margin: '0 auto' }}>
                                {suggestions.map(s => (
                                    <button key={s} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                                        onClick={() => { setInput(s); }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} style={{
                            maxWidth: '72%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                            background: m.role === 'user' ? 'var(--base)' : 'var(--surface-2)',
                            color: m.role === 'user' ? 'white' : 'var(--text-1)',
                            borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            padding: '10px 16px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                        }}>
                            {m.content}
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', gap: 4, padding: '8px 16px' }}>
                            <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
                            <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', animationDelay: '150ms' }} />
                            <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', animationDelay: '300ms' }} />
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                        placeholder="Type your question..."
                        style={{ flex: 1, borderRadius: 20, padding: '10px 18px' }}
                        disabled={loading}
                    />
                    <button className="btn-primary" style={{ borderRadius: 20, padding: '10px 16px' }} onClick={send} disabled={loading || !input.trim()}>
                        {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                    </button>
                </div>

                <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
            </main>
        </div>
    );
}
