import React, { useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../store/appStore';

export default function DiscomAnalyser() {
    const { preferredLanguage, token } = useAppStore();
    const [text, setText] = useState('');
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!text.trim()) return;
        setLoading(true);
        setError('');
        setSummary('');
        try {
            const formData = new FormData();
            formData.append('text', text);
            formData.append('language', preferredLanguage);
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/bills/analyse-discom`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data.summary);
        } catch (e: any) {
            setError(e.response?.data?.detail || e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>DISCOM Document Analyser</div>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste DISCOM tariff order or circular text here..."
                style={{ width: '100%', height: 100, padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text-1)', marginBottom: 12, resize: 'vertical' }}
            />
            <button onClick={handleAnalyze} disabled={loading || !text.trim()} className="btn-primary" style={{ width: '100%', marginBottom: summary || error ? 16 : 0 }}>
                {loading ? 'Analysing...' : 'Analyse Document'}
            </button>
            {error && <div className="alert alert-danger" style={{ marginTop: 12 }}>{error}</div>}
            {summary && (
                <div style={{ padding: 16, background: 'var(--brand-bg)', borderRadius: 8, border: '1px solid var(--brand)', marginTop: 12 }}>
                    <div style={{ fontWeight: 600, color: 'var(--brand-dark)', marginBottom: 8 }}>Analysis Summary</div>
                    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-1)', fontSize: 14 }}>{summary}</div>
                </div>
            )}
        </div>
    );
}
