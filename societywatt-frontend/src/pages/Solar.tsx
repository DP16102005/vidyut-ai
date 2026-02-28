import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
import SolarChart from '../components/SolarChart';
import { useAppStore } from '../store/appStore';
import { solarAPI } from '../services/api';
import { formatINR, formatKwh } from '../utils/format';
import type { SolarSummary } from '../types';

export default function Solar() {
    const { societyId } = useAppStore();
    const [data, setData] = useState<SolarSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!societyId) return;
        solarAPI.getSummary(societyId)
            .then(r => { setData(r.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [societyId]);

    const renderContent = () => {
        if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 8 }} />;
        if (!data) return <div style={{ color: 'var(--danger)' }}>Failed to load solar data.</div>;

        // State A: Not installed
        if (!data.solar_installed) {
            return (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Solar Not Configured</div>
                    <p style={{ color: 'var(--text-2)', maxWidth: 400, margin: '0 auto 24px' }}>
                        {data.message || 'Enable Solar Monitoring in Settings after installing rooftop PV and connecting your inverter portal.'}
                    </p>
                    <button className="btn-primary" onClick={() => window.location.href = '/settings'}>Go to Settings</button>
                </div>
            );
        }

        // State B: Installed but no data yet
        if (!data.data_available) {
            return (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--positive)' }}>PV System Registered</div>
                    <p style={{ color: 'var(--text-2)', maxWidth: 400, margin: '0 auto' }}>
                        {data.message || 'Connecting to inverter... Waiting for first data sync. No chart data available yet.'}
                    </p>
                </div>
            );
        }

        // State C: Full dashboard
        return (
            <>
                <div className="grid-4" style={{ marginBottom: 20 }}>
                    <MetricCard label="Self-Consumption" value={`${(data.self_consumption_ratio * 100).toFixed(1)}%`} variant={data.self_consumption_ratio > 0.65 ? 'positive' : 'warning'} />
                    <MetricCard label="Generated" value={formatKwh(data.total_generation_kwh)} variant="positive" />
                    <MetricCard label="Exported" value={formatKwh(data.exported_kwh)} sublabel={`Loss: ${formatINR(data.arbitrage_loss_inr)}`} />
                    <MetricCard label="Shift Savings" value={formatINR(data.shifting_savings_estimate_inr)} variant="info" sublabel="if loads shifted" />
                </div>

                <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>30-Day Generation ({data.capacity_kwp} kWp)</div>
                    {data.chart_data && data.chart_data.length > 0 ? <SolarChart chartData={data.chart_data} /> : <div style={{ color: 'var(--text-3)' }}>No chart data</div>}
                </div>

                <div className="grid-2">
                    <div className="card">
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Optimal Load Window</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{data.optimal_window_start} — {data.optimal_window_end}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                            Run heavy loads (pumps, HVAC, EV charging) during this window to maximise self-consumption based on your local climate zone.
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Performance vs Capacity</div>
                        {data.performance_vs_capacity_pct !== null && data.performance_vs_capacity_pct !== undefined ? (
                            <>
                                <div style={{ fontSize: 28, fontWeight: 700, color: data.performance_vs_capacity_pct < 80 ? 'var(--warning)' : 'var(--positive)' }}>
                                    {data.performance_vs_capacity_pct}%
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                                    {data.performance_vs_capacity_pct < 80
                                        ? 'Below expected baseline for this region. Check panels for dust or shading issues.'
                                        : 'Meeting or exceeding expected generation baseline.'}
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Not enough data to benchmark capacity performance.</div>
                        )}
                    </div>
                </div>
            </>
        );
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
            <Sidebar />
            <main style={{ marginLeft: 220, flex: 1, padding: '32px 40px' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Solar Rooftop Monitoring</h1>
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 32 }}>Track PV generation and optimise self-consumption against peak tariffs.</p>
                {renderContent()}
                <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; padding: 20px !important; } }`}</style>
            </main>
        </div>
    );
}
