import React from 'react';
import { X } from 'lucide-react';
import type { AnomalyFlag } from '../types';
import { formatINR } from '../utils/format';

interface AnomalyAlertProps {
    anomaly: AnomalyFlag;
    onDismiss?: () => void;
}

const urgencyMap: Record<string, { color: string; bg: string; label: string }> = {
    immediate: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Action needed immediately' },
    this_week: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'Address this week' },
    next_cycle: { color: 'var(--info)', bg: 'var(--info-bg)', label: 'Review next billing cycle' },
};

export default function AnomalyAlert({ anomaly, onDismiss }: AnomalyAlertProps) {
    const u = urgencyMap[anomaly.urgency] || urgencyMap.next_cycle;
    return (
        <div style={{
            borderLeft: `3px solid ${u.color}`,
            background: u.bg,
            padding: '12px 16px',
            borderRadius: '0 6px 6px 0',
            fontSize: 14,
            position: 'relative',
            marginBottom: 8,
        }}>
            {onDismiss && (
                <button onClick={onDismiss} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={14} />
                </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="pill" style={{ background: u.bg, color: u.color, border: `1px solid ${u.color}`, fontWeight: 600 }}>
                    {anomaly.urgency.replace('_', ' ').toUpperCase()}
                </span>
                <strong>{anomaly.type.replace(/_/g, ' ')}</strong>
            </div>
            <div>{anomaly.message}</div>
            <div style={{ color: 'var(--text-2)', marginTop: 4 }}>Probable cause: {anomaly.probable_cause}</div>
            {anomaly.financial_risk_inr && anomaly.financial_risk_inr > 0 && (
                <div style={{ marginTop: 4, fontWeight: 500 }}>Financial risk: {formatINR(anomaly.financial_risk_inr)}</div>
            )}
            <div style={{ marginTop: 4, fontSize: 12, color: u.color }}>{u.label}</div>
        </div>
    );
}
