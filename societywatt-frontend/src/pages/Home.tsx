import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { UploadCloud, Cpu, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { impactAPI, leaderboardAPI } from '../services/api';
import MetricCard from '../components/MetricCard';
import LeaderboardTable from '../components/LeaderboardTable';
import { formatINR, formatCO2, formatINRShort } from '../utils/format';
import type { ImpactAggregate, LeaderboardEntry } from '../types';

export default function Home() {
    const isAuth = useAppStore(s => s.isAuthenticated());
    const [impact, setImpact] = useState<ImpactAggregate | null>(null);
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [lbLoading, setLbLoading] = useState(true);

    useEffect(() => {
        impactAPI.getAggregate().then(r => setImpact(r.data)).catch(() => { });
        leaderboardAPI.getList({ level: 'national' }).then(r => {
            setEntries(r.data.entries.slice(0, 8));
            setLbLoading(false);
        }).catch(() => setLbLoading(false));
    }, []);

    if (isAuth) return <Navigate to="/dashboard" replace />;

    return (
        <div>
            {/* Header */}
            <header style={{ position: 'sticky', top: 0, height: 64, background: 'var(--surface)', borderBottom: '1px solid var(--border-strong)', zIndex: 50, display: 'flex', alignItems: 'center', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(21, 26, 35, 0.8)' }}>
                <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to="/" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none', fontFamily: 'Outfit' }}>Vidyut AI</Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Link to="/leaderboard" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Leaderboard</Link>
                        <Link to="/impact" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Impact</Link>
                        <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', marginLeft: 8 }}>Sign in</Link>
                        <Link to="/register" className="btn-primary" style={{ fontSize: 14, padding: '8px 20px' }}>Register</Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px 64px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 16 }}>
                    LOCAL <span style={{ color: 'var(--brand)' }}>AI</span> × <span style={{ color: 'var(--amd-red)' }}>AMD</span> CPU × SUSTAINABILITY
                </div>
                <h1 style={{ fontSize: 52, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.15, maxWidth: 700 }}>
                    India's buildings waste 20–35% of their electricity spend. Vidyut AI proves it from your bill.
                </h1>
                <p style={{ fontSize: 20, color: 'var(--text-2)', maxWidth: 540, marginTop: 20, lineHeight: 1.5 }}>
                    Upload your bill. Local AI reads it, finds every rupee of waste, and tells you exactly what to do — in your language. Works for any building in India.
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                    <Link to="/register" className="btn-primary">Register your building</Link>
                    <Link to="/leaderboard" className="btn-secondary">View leaderboard →</Link>
                </div>
                <div style={{ marginTop: 16 }}>
                    <span style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 999, fontSize: 11, color: 'var(--text-2)' }}>
                        Local Phi-3 Mini on AMD CPU + AOCL | Gemini fallback | CEA 2023-24 emission data
                    </span>
                </div>

            </section>

            {/* Impact Bar */}
            <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
                <div className="grid-4">
                    <MetricCard label="CO₂e Avoided" value={impact ? formatCO2(impact.total_co2e_kg) : '--'} />
                    <MetricCard label="kWh Saved" value={impact ? `${Math.round(impact.total_kwh_avoided).toLocaleString('en-IN')}` : '--'} unit="kWh" />
                    <MetricCard label="₹ Saved" value={impact ? formatINRShort(impact.total_inr_saved) : '--'} />
                    <MetricCard label="Active Societies" value={impact ? String(impact.societies_count) : '--'} />
                </div>
            </section>

            {/* Leaderboard Preview */}
            <section style={{ maxWidth: 1100, margin: '56px auto 0', padding: '0 20px' }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Top Societies This Month</h2>
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>Verified from electricity bill data</p>
                <LeaderboardTable entries={entries} loading={lbLoading} onRowClick={(id) => window.location.href = `/leaderboard/${id}`} />
                <Link to="/leaderboard" style={{ display: 'inline-block', marginTop: 12, fontSize: 14, color: 'var(--info)' }}>See full leaderboard →</Link>
            </section>

            {/* How It Works */}
            <section style={{ maxWidth: 1100, margin: '56px auto 0', padding: '0 20px' }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 32 }}>How Vidyut AI Works</h2>
                <div className="grid-3">
                    {[
                        { icon: UploadCloud, title: 'Upload your bill', desc: 'PDF or photo. Any DISCOM in India. No manual data entry.' },
                        { icon: Cpu, title: 'Local AI on your hardware', desc: 'Phi-3 Mini runs entirely on the server — your bill data never leaves. Gemini handles Indian language output. AMD CPU + AOCL accelerates every ML calculation.' },
                        { icon: CheckCircle, title: 'Get your action plan', desc: '3 specific actions in your language. Share on WhatsApp. Show at your AGM.' },
                    ].map(item => (
                        <div key={item.title} style={{ textAlign: 'center' }}>
                            <item.icon size={32} style={{ color: 'var(--base)' }} />
                            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>{item.title}</div>
                            <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8 }}>{item.desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer style={{ background: 'var(--base)', color: 'white', padding: '32px 20px', marginTop: 64 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>Vidyut AI — AI energy intelligence for India</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 12 }}>Local AI: Phi-3 Mini on AMD CPU + AOCL</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Cloud fallback: Gemini 1.5 Flash (non-English)</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Emissions data: CEA 2023-24</div>
                </div>
            </footer>
        </div>
    );
}
