import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { dashboardAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
import WasteBreakdown from '../components/WasteBreakdown';
import BillTrendChart from '../components/BillTrendChart';
import BillExplanation from '../components/BillExplanation';
import PeerComparison from '../components/PeerComparison';
import AnomalyAlert from '../components/AnomalyAlert';
import LiveActivityFeed from '../components/LiveActivityFeed';
import DiscomAnalyser from '../components/DiscomAnalyser';
import { formatINR, formatCO2, formatRank } from '../utils/format';
import type { DashboardData } from '../types';

export default function Dashboard() {
    const { societyId, preferredLanguage } = useAppStore();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!societyId) return;
        dashboardAPI.get(societyId).then(r => { setData(r.data); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); });
    }, [societyId]);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const lb = data?.latest_bill;

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main style={{ marginLeft: 220, flex: 1, padding: 28, minHeight: '100vh', overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 8 }} />)}
                    </div>
                ) : error ? (
                    <div className="alert alert-danger">{error} <button className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => window.location.reload()}>Retry</button></div>
                ) : data && (
                    <>
                        {/* Greeting */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 18, color: 'var(--text-1)' }}>{greeting()}, {data.user_name}</div>
                            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{data.society.name}, {data.society.city}</div>
                            {!lb && <Link to="/bills/upload" className="btn-primary" style={{ marginTop: 12 }}>Upload this month's bill →</Link>}
                        </div>

                        {/* Metric Cards */}
                        <div className="grid-4" style={{ marginBottom: 24 }}>
                            <MetricCard label="This Month's Bill" value={lb ? formatINR(lb.total_bill) : '--'} />
                            <MetricCard label="Total Avoidable" value={lb ? formatINR(lb.total_avoidable) : '--'} variant={lb && lb.total_avoidable > 10000 ? 'danger' : 'default'} sublabel={lb ? `${lb.avoidable_pct}% of bill` : undefined} />
                            <MetricCard label="Composite Score" value={lb ? `${lb.composite_score}` : '--'} unit="/100" variant={lb && lb.composite_score >= 70 ? 'positive' : lb && lb.composite_score < 50 ? 'danger' : 'default'} />
                            <MetricCard label="City Rank" value={data.city_rank ? formatRank(data.city_rank) : '--'} variant="info" />
                        </div>

                        {/* Waste Breakdown */}
                        {lb && (
                            <div style={{ marginBottom: 24 }}>
                                <WasteBreakdown analytics={lb} />
                            </div>
                        )}

                        {/* Trend + Explanation */}
                        <div style={{ display: 'grid', gridTemplateColumns: '58% 1fr', gap: 16, marginBottom: 24 }}>
                            <div className="card">
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>12-Month Bill Trend</div>
                                {data.trend_12mo.length > 0 ? <BillTrendChart data={data.trend_12mo} /> : <div style={{ color: 'var(--text-3)', padding: 20 }}>No bill history yet</div>}
                            </div>
                            {lb ? (
                                <BillExplanation
                                    explanation={data.trend_12mo.length > 0 ? (lb as any).llm_explanation || `Total bill: ${formatINR(lb.total_bill)}. Avoidable waste: ${formatINR(lb.total_avoidable)} (${lb.avoidable_pct}%).` : ''}
                                    language={preferredLanguage}
                                    onCopyWhatsApp={() => { }}
                                    onChangeLanguage={() => { }}
                                    societyName={data.society.name}
                                />
                            ) : <div className="card" style={{ color: 'var(--text-3)' }}>Upload a bill to see AI analysis</div>}
                        </div>

                        {/* Peer + Actions + Sustainability */}
                        <div className="grid-3" style={{ marginBottom: 24 }}>
                            {lb && <PeerComparison yourValue={lb.energy_intensity} median={lb.peer_median_intensity} yourPercentile={lb.peer_percentile} label="kWh/res" scope={`${data.society.city} ${lb.peer_scope}`} />}
                            <div className="card">
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Sustainability</div>
                                {lb ? <>
                                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>CO₂e avoided this month: <strong>{formatCO2(lb.co2e_avoided_kg)}</strong></div>
                                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>Cumulative CO₂e: <strong>{formatCO2(data.cumulative_co2e_kg)}</strong></div>
                                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Cumulative savings: <strong>{formatINR(data.cumulative_savings_inr)}</strong></div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>{lb.emission_factor_source}</div>
                                </> : <div style={{ color: 'var(--text-3)' }}>Upload bills to track impact</div>}
                            </div>
                            {data.forecast.available && (
                                <div className="card">
                                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Next Month Forecast</div>
                                    <div className="grid-3" style={{ gap: 8 }}>
                                        <div style={{ textAlign: 'center' }}><div className="data-label">Lower</div><div style={{ fontWeight: 600 }}>{formatINR(data.forecast.lower_bound)}</div></div>
                                        <div style={{ textAlign: 'center' }}><div className="data-label">Expected</div><div style={{ fontWeight: 700, fontSize: 18 }}>{formatINR(data.forecast.point_estimate)}</div></div>
                                        <div style={{ textAlign: 'center' }}><div className="data-label">Upper</div><div style={{ fontWeight: 600 }}>{formatINR(data.forecast.upper_bound)}</div></div>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, textAlign: 'center' }}>{data.forecast.confidence_pct}% confidence interval</div>
                                </div>
                            )}
                        </div>

                        {/* Anomalies */}
                        {data.active_anomalies.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>Alerts</div>
                                {data.active_anomalies.map((a, i) => <AnomalyAlert key={i} anomaly={a} />)}
                            </div>
                        )}

                        {/* Live Activity Feed */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, marginBottom: 24 }}>
                            <DiscomAnalyser />
                            <LiveActivityFeed />
                        </div>
                    </>
                )}

                <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; padding: 16px !important; } .grid-4, .grid-3 { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
            </main>
        </div>
    );
}
