import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAppStore } from '../store/appStore';
import { billsAPI } from '../services/api';
import { formatINR } from '../utils/format';
import type { Bill } from '../types';

export default function BillHistory() {
    const { societyId } = useAppStore();
    const navigate = useNavigate();
    const [bills, setBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!societyId) return;
        billsAPI.list(societyId).then(r => {
            setBills(r.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [societyId]);

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main style={{ marginLeft: 220, flex: 1, padding: 28, minHeight: '100vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 600 }}>Bill History</h1>
                    <Link to="/bills/upload" className="btn-primary">Upload New Bill</Link>
                </div>

                <div className="card">
                    {loading ? (
                        <div style={{ padding: 20 }}>Loading history...</div>
                    ) : bills.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
                            No bills found. Upload your first bill to see history.
                        </div>
                    ) : (
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-2)', fontWeight: 500 }}>Month</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-2)', fontWeight: 500 }}>Total Bill</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-2)', fontWeight: 500 }}>Score</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-2)', fontWeight: 500 }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bills.map(b => (
                                    <tr
                                        key={b.id}
                                        onClick={() => navigate(`/bills/${b.id}`)}
                                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                                            {b.billing_period_from ? new Date(b.billing_period_from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Unknown'}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>{b.total_bill ? formatINR(b.total_bill) : '—'}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {b.composite_score ? (
                                                <span className={`pill pill-${b.composite_score >= 70 ? 'positive' : b.composite_score < 50 ? 'danger' : 'warning'}`}>
                                                    {b.composite_score}/100
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span className={`pill pill-${b.processing_status === 'complete' ? 'positive' : 'default'}`} style={{ textTransform: 'capitalize' }}>
                                                {b.processing_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
            </main>
        </div>
    );
}
