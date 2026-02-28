import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import LeaderboardTable from '../components/LeaderboardTable';
import { leaderboardAPI } from '../services/api';
import { useAppStore } from '../store/appStore';
import type { LeaderboardEntry } from '../types';

export default function Leaderboard() {
    const { societyId } = useParams();
    const [level, setLevel] = useState<'national' | 'city'>('national');
    const [buildingType, setBuildingType] = useState<string>('all');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const isAuth = useAppStore(s => s.isAuthenticated());

    const BUILDING_FILTERS = [
        { id: 'all', label: 'All' },
        { id: 'residential_society', label: 'Residential' },
        { id: 'office', label: 'Office' },
        { id: 'school', label: 'School' },
        { id: 'hospital', label: 'Hospital' },
        { id: 'mall', label: 'Mall' },
        { id: 'hotel', label: 'Hotel' },
        { id: 'factory', label: 'Factory' },
    ];

    useEffect(() => {
        setLoading(true);
        const params: any = { level: 'national' };
        if (buildingType !== 'all') {
            params.building_type = buildingType;
        }
        // Always fetch national, the API supports city filtering but we'll group it on the frontend for now
        // to show a richer grouped UI.
        leaderboardAPI.getList(params).then(r => {
            setEntries(r.data.entries);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [buildingType]);

    // Group the entries by city for the new UI
    const groupedByCity = entries.reduce((acc, entry) => {
        const city = entry.city || 'Other';
        if (!acc[city]) acc[city] = [];
        acc[city].push(entry);
        return acc;
    }, {} as Record<string, LeaderboardEntry[]>);

    // Sort cities by number of societies participating
    const sortedCities = Object.keys(groupedByCity).sort((a, b) => groupedByCity[b].length - groupedByCity[a].length);

    return (
        <div>
            {/* Header */}
            <header style={{ position: 'sticky', top: 0, height: 64, borderBottom: '1px solid var(--border-strong)', zIndex: 50, display: 'flex', alignItems: 'center', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(21, 26, 35, 0.8)' }}>
                <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to="/" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none', fontFamily: 'Outfit' }}>Vidyut AI</Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Link to="/leaderboard" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Leaderboard</Link>
                        <Link to="/impact" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Impact</Link>
                        {isAuth ? (
                            <Link to="/dashboard" className="btn-primary" style={{ fontSize: 14, padding: '8px 20px', marginLeft: 8 }}>Dashboard</Link>
                        ) : (
                            <>
                                <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', marginLeft: 8 }}>Sign in</Link>
                                <Link to="/register" className="btn-primary" style={{ fontSize: 14, padding: '8px 20px' }}>Register</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
                <h1 style={{ fontSize: 28, fontWeight: 700 }}>Leaderboard</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
                    Verified from electricity bill data • Public and transparent
                </p>

                <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-strong)' }}>
                    {(['national', 'city'] as const).map(l => (
                        <button key={l}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: level === l ? '2px solid var(--accent)' : '2px solid transparent',
                                color: level === l ? 'var(--accent)' : 'var(--text-2)',
                                padding: '12px 16px',
                                fontWeight: level === l ? 600 : 500,
                                textTransform: 'capitalize',
                                fontSize: 15,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontFamily: 'Outfit'
                            }}
                            onClick={() => setLevel(l)}>
                            {l} Ranking
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                    {BUILDING_FILTERS.map(f => (
                        <button key={f.id}
                            style={{
                                background: buildingType === f.id ? 'var(--base)' : 'var(--surface)',
                                color: buildingType === f.id ? 'white' : 'var(--text-1)',
                                border: '1px solid',
                                borderColor: buildingType === f.id ? 'var(--base)' : 'var(--border)',
                                padding: '6px 12px',
                                borderRadius: 16,
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onClick={() => setBuildingType(f.id)}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {level === 'national' ? (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <LeaderboardTable entries={entries} loading={loading} onRowClick={(id) => window.location.href = `/leaderboard/${id}`} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {loading ? (
                            <div className="skeleton" style={{ height: 400, width: '100%' }} />
                        ) : sortedCities.map(city => (
                            <div key={city} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-strong)' }}>
                                    <h3 style={{ fontSize: 18, margin: 0 }}>{city} Region</h3>
                                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{groupedByCity[city].length} verified societies competing</div>
                                </div>
                                <LeaderboardTable entries={groupedByCity[city]} loading={false} onRowClick={(id) => window.location.href = `/leaderboard/${id}`} />
                            </div>
                        ))}
                        {sortedCities.length === 0 && !loading && (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No region data available.</div>
                        )}
                    </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 20, textAlign: 'center' }}>
                    Societies opt in to appear here • Only aggregated scores are public • Individual bill data is private
                </div>
            </div>

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
