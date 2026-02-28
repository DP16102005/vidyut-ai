import React, { useState } from 'react';
import type { AnalyticsOutput } from '../types';
import { formatINR } from '../utils/format';

interface WasteBreakdownProps {
    analytics: AnalyticsOutput;
    calculationHash?: string;
}

interface Dimension {
    key: string;
    label: string;
    value: number;
    severity: 'danger' | 'warning' | 'healthy';
    action: string;
}

export default function WasteBreakdown({ analytics, calculationHash }: WasteBreakdownProps) {
    const [expanded, setExpanded] = useState<string | null>(null);

    const dimensions: Dimension[] = [
        {
            key: 'md', label: 'MD Penalty', value: analytics.md_penalty,
            severity: analytics.md_penalty > 5000 ? 'danger' : analytics.md_penalty > 0 ? 'warning' : 'healthy',
            action: analytics.md_penalty > 0 ? 'Stagger heavy loads to stay under sanctioned demand.' : 'Demand discipline is healthy.',
        },
        {
            key: 'tod', label: 'ToD Premium', value: analytics.tod_premium,
            severity: analytics.tod_premium > 5000 ? 'danger' : analytics.tod_premium > 1000 ? 'warning' : 'healthy',
            action: 'Shift pump and HVAC schedules to off-peak hours.',
        },
        {
            key: 'pf', label: 'PF Penalty', value: analytics.pf_penalty,
            severity: analytics.pf_penalty > 5000 ? 'danger' : analytics.pf_penalty > 1000 ? 'warning' : 'healthy',
            action: analytics.pf_penalty > 0 ? 'Inspect capacitor bank and power factor correction.' : 'Power factor is healthy.',
        },
        {
            key: 'dg', label: 'DG Avoidable', value: analytics.dg_avoidable_cost,
            severity: analytics.dg_avoidable_cost > 5000 ? 'danger' : analytics.dg_avoidable_cost > 1000 ? 'warning' : 'healthy',
            action: 'Check grid before starting DG. Shut off within 5 min of restoration.',
        },
        {
            key: 'solar', label: 'Solar Loss', value: analytics.solar_arbitrage_loss,
            severity: analytics.solar_arbitrage_loss > 5000 ? 'danger' : analytics.solar_arbitrage_loss > 1000 ? 'warning' : 'healthy',
            action: 'Shift heavy loads to peak solar generation hours.',
        },
    ];

    const colorMap = { danger: 'var(--danger)', warning: 'var(--warning)', healthy: 'var(--positive)' };
    const bgMap = { danger: 'var(--danger-bg)', warning: 'var(--warning-bg)', healthy: 'var(--positive-bg)' };
    const tagMap = { danger: 'Avoidable', warning: 'At risk', healthy: null };

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                {dimensions.map(d => (
                    <div
                        key={d.key}
                        className="card"
                        style={{ cursor: 'pointer', padding: 16 }}
                        onClick={() => setExpanded(expanded === d.key ? null : d.key)}
                    >
                        <div className="data-label">{d.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: d.value === 0 ? 'var(--text-3)' : colorMap[d.severity], marginTop: 4 }}>
                            {formatINR(d.value)}
                        </div>
                        {tagMap[d.severity] && (
                            <span className="pill" style={{ background: bgMap[d.severity], color: colorMap[d.severity], marginTop: 6 }}>
                                {tagMap[d.severity]}
                            </span>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>{d.action}</div>
                    </div>
                ))}
            </div>

            {expanded && (
                <div style={{ background: 'var(--surface-2)', padding: 16, borderTop: '1px solid var(--border)', borderRadius: '0 0 8px 8px', marginTop: -1, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <strong>Calculation Detail</strong>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setExpanded(null)}>Close</button>
                    </div>
                    {expanded === 'md' && (
                        <div>
                            <div>MD Recorded: {analytics.md_recorded_kva} kVA</div>
                            <div>MD Sanctioned: {analytics.md_headroom_kva ? analytics.md_recorded_kva! + analytics.md_headroom_kva : '—'} kVA</div>
                            <div>Headroom: {analytics.md_headroom_kva} kVA</div>
                            <div>Risk Flag: {analytics.md_risk_flag ? 'Yes' : 'No'}</div>
                            <div style={{ fontWeight: 600, marginTop: 4 }}>MD Penalty = {formatINR(analytics.md_penalty)}</div>
                        </div>
                    )}
                    {expanded === 'tod' && (
                        <div>
                            <div>Peak Consumption: {analytics.peak_consumption_pct}%</div>
                            <div>ToD Premium = {formatINR(analytics.tod_premium)}</div>
                        </div>
                    )}
                    {expanded === 'pf' && (
                        <div>
                            <div>PF Recorded: {analytics.pf_recorded}</div>
                            <div>PF Risk: {analytics.pf_risk_score}</div>
                            <div>PF Penalty = {formatINR(analytics.pf_penalty)}</div>
                            <div>PF Incentive = {formatINR(analytics.pf_incentive)}</div>
                        </div>
                    )}
                    {expanded === 'dg' && (
                        <div>
                            <div>DG Total Hours: {analytics.dg_total_hours}h</div>
                            <div>Avoidable Hours: {analytics.dg_avoidable_hours}h</div>
                            <div>DG Avoidable Cost = {formatINR(analytics.dg_avoidable_cost)}</div>
                        </div>
                    )}
                    {expanded === 'solar' && (
                        <div>
                            <div>Self-Consumption Ratio: {analytics.solar_self_consumption_ratio ? (analytics.solar_self_consumption_ratio * 100).toFixed(1) + '%' : '—'}</div>
                            <div>Solar Arbitrage Loss = {formatINR(analytics.solar_arbitrage_loss)}</div>
                        </div>
                    )}
                    {calculationHash && (
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)', marginTop: 8 }}>Calc ID: {calculationHash}</div>
                    )}
                </div>
            )}
        </div>
    );
}
