import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import WasteBreakdown from '../components/WasteBreakdown';
import BillExplanation from '../components/BillExplanation';
import PeerComparison from '../components/PeerComparison';
import AnomalyAlert from '../components/AnomalyAlert';
import MetricCard from '../components/MetricCard';
import { billsAPI } from '../services/api';
import { formatINR, formatDate, formatCO2 } from '../utils/format';
import { useAppStore } from '../store/appStore';
import type { Bill } from '../types';

export default function BillDetail() {
    const { billId } = useParams();
    const { preferredLanguage } = useAppStore();
    const [bill, setBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(true);
    const [lang, setLang] = useState(preferredLanguage);
    const [explanation, setExplanation] = useState('');
    const [loadingExpl, setLoadingExpl] = useState(false);

    useEffect(() => {
        if (!billId) return;
        billsAPI.get(billId).then(r => {
            setBill(r.data);
            setExplanation(r.data.llm_explanation);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [billId]);

    const handleLanguageChange = async (newLang: string) => {
        setLang(newLang);
        if (!billId) return;
        setLoadingExpl(true);
        try {
            const { data } = await billsAPI.getExplanation(billId, newLang);
            setExplanation(data.explanation);
        } catch { } finally { setLoadingExpl(false); }
    };

    const ao = bill?.analytics_output;

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main style={{ marginLeft: 220, flex: 1, padding: 28, minHeight: '100vh' }}>
                {loading ? (
                    <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
                ) : !bill ? (
                    <div className="alert alert-danger">Bill not found. <Link to="/dashboard">Back to dashboard</Link></div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: 22, fontWeight: 600 }}>
                                    Bill — {formatDate(bill.billing_period_from)} to {formatDate(bill.billing_period_to)}
                                </h1>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                                    Extraction: {bill.extraction_method} ({(bill.extraction_confidence * 100).toFixed(0)}% confidence) • Calc ID: {bill.calculation_hash}
                                </div>
                            </div>
                            <Link to="/dashboard" className="btn-secondary">← Dashboard</Link>
                        </div>

                        {bill.proactive_insight && (
                            <div className="card" style={{ marginBottom: 20, background: 'var(--brand-bg)', borderColor: 'var(--brand-bg)' }}>
                                <div style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-dark)' }}>
                                    💡 Proactive Insight
                                </div>
                                <div style={{ marginTop: 8, color: 'var(--text-1)' }}>{bill.proactive_insight}</div>
                            </div>
                        )}

                        <div className="grid-4" style={{ marginBottom: 20 }}>
                            <MetricCard label="Total Bill" value={ao ? formatINR(ao.total_bill) : '--'} />
                            <MetricCard label="Total Avoidable" value={ao ? formatINR(ao.total_avoidable) : '--'} variant="danger" sublabel={ao ? `${ao.avoidable_pct}% of bill` : ''} />
                            <MetricCard label="Composite Score" value={ao ? `${ao.composite_score}` : '--'} unit="/100" />
                            <MetricCard label="CO₂e Avoided" value={ao ? formatCO2(ao.co2e_avoided_kg) : '--'} variant="positive" />
                        </div>

                        {ao && <div style={{ marginBottom: 20 }}><WasteBreakdown analytics={ao} calculationHash={bill.calculation_hash} /></div>}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                            <BillExplanation
                                explanation={explanation}
                                language={lang}
                                onCopyWhatsApp={() => { }}
                                onChangeLanguage={handleLanguageChange}
                                loading={loadingExpl}
                            />
                            {ao && (
                                <PeerComparison
                                    yourValue={ao.energy_intensity}
                                    median={ao.peer_median_intensity}
                                    yourPercentile={ao.peer_percentile}
                                    label="kWh/res"
                                    scope={ao.peer_scope}
                                />
                            )}
                        </div>

                        {bill.anomaly_flags.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                                <div className="section-title" style={{ marginBottom: 8 }}>Alerts</div>
                                {bill.anomaly_flags.map((a, i) => <AnomalyAlert key={i} anomaly={a} />)}
                            </div>
                        )}

                        <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginTop: 24 }}>
                            Analysis by Vidyut AI • Advanced AI • {ao?.analysis_time_ms}ms
                        </div>
                    </>
                )}
                <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
            </main>
        </div>
    );
}
