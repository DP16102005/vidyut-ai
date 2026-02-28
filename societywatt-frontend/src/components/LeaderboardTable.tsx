import React from 'react';
import type { LeaderboardEntry } from '../types';
import VerificationBadge from './VerificationBadge';
import { formatPct, getBuildingTypeUnit } from '../utils/format';

interface LeaderboardTableProps {
    entries: LeaderboardEntry[];
    loading: boolean;
    onRowClick: (societyId: string) => void;
}

export default function LeaderboardTable({ entries, loading, onRowClick }: LeaderboardTableProps) {
    if (loading) {
        return (
            <div>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ height: 48, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                        <div className="skeleton" style={{ height: 14, width: '100%' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (entries.length === 0) {
        return <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 40, fontSize: 14 }}>No societies in this category yet</div>;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table>
                <thead>
                    <tr>
                        <th style={{ width: 50 }}>Rank</th>
                        <th style={{ width: 70 }}>Badge</th>
                        <th>Society</th>
                        <th>City</th>
                        <th style={{ width: 80 }}>Score</th>
                        <th style={{ width: 100 }}>Intensity</th>
                        <th style={{ width: 100 }}>Improvement</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(e => (
                        <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => onRowClick(e.society_id)}>
                            <td style={{ fontWeight: 700, fontSize: 18 }}>{e.rank_position}</td>
                            <td><VerificationBadge tier={e.verification_tier} /></td>
                            <td style={{ fontWeight: 500 }}>{e.display_name || e.society_name}</td>
                            <td style={{ color: 'var(--text-2)' }}>{e.city}</td>
                            <td style={{ fontWeight: e.composite_score >= 70 ? 700 : 400 }}>{e.composite_score}</td>
                            <td style={{ color: 'var(--text-2)' }}>
                                {e.energy_intensity} {getBuildingTypeUnit(e.building_type)}
                            </td>
                            <td>
                                <span style={{ color: e.improvement_pct >= 0 ? 'var(--positive)' : 'var(--danger)' }}>
                                    {formatPct(e.improvement_pct)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
