import React from 'react';

interface PeerComparisonProps {
    yourValue: number;
    median: number;
    yourPercentile: number;
    label: string;
    scope: string;
    sampleCount?: number;
}

export default function PeerComparison({ yourValue, median, yourPercentile, label, scope, sampleCount }: PeerComparisonProps) {
    const topQuartile = median * 0.75;
    const outperforms = yourPercentile < 50;

    return (
        <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Peer Comparison</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                vs {scope} societies{sampleCount ? ` (${sampleCount} samples)` : ''}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                <div><strong>Your intensity:</strong> {yourValue.toFixed(1)} {label}</div>
                <div style={{ color: 'var(--text-2)' }}>Peer median: {median.toFixed(1)} {label}</div>
                <div style={{ color: 'var(--text-2)' }}>Top quartile: {topQuartile.toFixed(1)} {label}</div>
            </div>

            <div style={{ marginTop: 12 }}>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, position: 'relative' }}>
                    <div style={{
                        position: 'absolute', left: 0, top: 0, height: '100%',
                        width: `${Math.min(100, yourPercentile)}%`,
                        background: 'var(--positive-bg)', borderRadius: 2,
                    }} />
                    <div style={{
                        position: 'absolute', top: -3,
                        left: `${Math.min(95, yourPercentile)}%`,
                        width: 10, height: 10, borderRadius: '50%',
                        background: 'var(--base)',
                    }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
                    You — {yourPercentile}th percentile
                </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 13, color: outperforms ? 'var(--positive)' : 'var(--warning)' }}>
                {outperforms
                    ? `You outperform ${100 - yourPercentile}% of similar societies`
                    : `${yourPercentile}% of similar societies do better`}
            </div>
        </div>
    );
}
