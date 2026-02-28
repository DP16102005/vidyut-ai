import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
    label: string;
    value: string | number;
    unit?: string;
    trend?: number;
    trendLabel?: string;
    variant?: 'default' | 'positive' | 'warning' | 'danger' | 'info' | 'accent';
    sublabel?: string;
    onClick?: () => void;
}

const variantBorder: Record<string, string> = {
    positive: 'var(--positive)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    info: 'var(--info)',
    accent: 'var(--accent)',
};

export default function MetricCard({ label, value, unit, trend, trendLabel, variant = 'default', sublabel, onClick }: MetricCardProps) {
    const borderStyle = variant !== 'default' ? { borderLeft: `3px solid ${variantBorder[variant]}` } : {};

    return (
        <div className="card" style={{ ...borderStyle, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
            <div className="data-label">{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
                <span className="metric-value">{value}</span>
                {unit && <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{unit}</span>}
            </div>
            {trend !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12 }}>
                    {trend >= 0 ? (
                        <TrendingUp size={14} style={{ color: 'var(--positive)' }} />
                    ) : (
                        <TrendingDown size={14} style={{ color: 'var(--danger)' }} />
                    )}
                    <span style={{ color: trend >= 0 ? 'var(--positive)' : 'var(--danger)' }}>
                        {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                    </span>
                    {trendLabel && <span style={{ color: 'var(--text-3)' }}>{trendLabel}</span>}
                </div>
            )}
            {sublabel && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{sublabel}</div>}
        </div>
    );
}
