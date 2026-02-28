import React from 'react';

interface VerificationBadgeProps {
    tier: 'bronze' | 'silver' | 'gold';
    size?: 'sm' | 'md';
}

const tierStyles: Record<string, React.CSSProperties> = {
    bronze: { background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid #fcd34d' },
    silver: { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' },
    gold: { background: 'var(--positive-bg)', color: 'var(--positive)', border: '1px solid #86efac' },
};

export default function VerificationBadge({ tier, size = 'sm' }: VerificationBadgeProps) {
    const sizeStyles: React.CSSProperties = size === 'sm'
        ? { fontSize: 10, padding: '1px 6px' }
        : { fontSize: 12, padding: '3px 10px' };

    return (
        <span style={{
            ...tierStyles[tier],
            ...sizeStyles,
            borderRadius: 999,
            fontWeight: 600,
            textTransform: 'uppercase',
            display: 'inline-block',
            lineHeight: 1.6,
        }}>
            {tier}
        </span>
    );
}
