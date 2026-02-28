import React, { useState } from 'react';
import LanguageSelector from './LanguageSelector';
import { Copy, Check } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface BillExplanationProps {
    explanation: string;
    language: string;
    onCopyWhatsApp: () => void;
    onChangeLanguage: (lang: string) => void;
    loading?: boolean;
    societyName?: string;
}

export default function BillExplanation({ explanation, language, onCopyWhatsApp, onChangeLanguage, loading, societyName }: BillExplanationProps) {
    const aiStatus = useAppStore(s => s.aiStatus);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const text = societyName ? `${societyName}\n\n${explanation}` : explanation;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onCopyWhatsApp();
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                    Vidyut AI Analysis
                    {aiStatus && aiStatus.ollama_running && language === 'en' ? (
                        <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-3)', border: '1px solid var(--border)', fontWeight: 500 }}>Generated locally by Phi-3</span>
                    ) : aiStatus ? (
                        <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-3)', border: '1px solid var(--border)', fontWeight: 500 }}>Cloud fallback</span>
                    ) : null}
                </div>
                <LanguageSelector value={language} onChange={onChangeLanguage} compact />
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton" style={{ height: 14, width: `${85 - i * 10}%` }} />
                    ))}
                </div>
            ) : (
                <>
                    <div style={{
                        background: 'var(--surface-2)', borderRadius: '12px 12px 12px 2px',
                        padding: 16, fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                    }}>
                        {explanation}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={handleCopy}>
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied!' : 'Copy for WhatsApp'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
