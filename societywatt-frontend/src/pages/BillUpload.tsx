import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Camera } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ProcessingTimeline from '../components/ProcessingTimeline';
import { useAppStore } from '../store/appStore';
import { billsAPI, dashboardAPI } from '../services/api';

const STEPS = [
    { key: 'uploading', label: 'Uploading document' },
    { key: 'parsing', label: 'Extracting data from bill' },
    { key: 'analysing', label: 'Running analytics engine (AMD AOCL)' },
    { key: 'explaining', label: 'AI generating explanation' },
    { key: 'complete', label: 'Complete' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function BillUpload() {
    const navigate = useNavigate();
    const { societyId } = useAppStore();
    const fileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());
    const [processing, setProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState('');
    const [error, setError] = useState<{ step: string; message: string } | undefined>();
    const [dragActive, setDragActive] = useState(false);
    const [discomCode, setDiscomCode] = useState('MSEDCL');

    useEffect(() => {
        if (societyId) {
            dashboardAPI.get(societyId).then((r: any) => {
                if (r.data?.society?.discom_code) {
                    setDiscomCode(r.data.society.discom_code);
                }
            }).catch(() => { });
        }
    }, [societyId]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragActive(false);
        const f = e.dataTransfer.files[0];
        if (f) setFile(f);
    };

    const handleUpload = async () => {
        if (!file || !societyId) return;
        setProcessing(true); setError(undefined);

        // Simulate step progression
        setCurrentStep('uploading');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('society_id', societyId);
        formData.append('discom_code', discomCode);
        formData.append('month', String(month + 1));
        formData.append('year', String(year));

        // Simulate parsing step
        setTimeout(() => setCurrentStep('parsing'), 1000);
        setTimeout(() => setCurrentStep('analysing'), 3000);
        setTimeout(() => setCurrentStep('explaining'), 5000);

        try {
            const { data } = await billsAPI.upload(formData);
            setCurrentStep('complete');
            setTimeout(() => navigate(`/bills/${data.bill_id}`), 1500);
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            setError({ step: detail?.step || 'uploading', message: detail?.detail || detail?.error || 'Upload failed' });
            setProcessing(false);
        }
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main style={{ marginLeft: 220, flex: 1, padding: 28, minHeight: '100vh' }}>
                <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Upload Bill</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>PDF or photographed electricity bill</p>

                {!processing ? (
                    <>
                        {/* Drop zone */}
                        <div
                            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragActive ? 'var(--info)' : 'var(--border)'}`,
                                borderRadius: 8, padding: 48, textAlign: 'center', cursor: 'pointer',
                                background: dragActive ? 'var(--info-bg)' : 'var(--surface-2)',
                                transition: 'all 150ms',
                            }}
                        >
                            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                                onChange={e => setFile(e.target.files?.[0] || null)} />
                            {file ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <FileText size={20} />
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>{file.name}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>({(file.size / 1024).toFixed(0)} KB)</span>
                                </div>
                            ) : (
                                <>
                                    <Upload size={28} style={{ color: 'var(--text-3)', marginBottom: 8 }} />
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>Drag & drop or click to upload</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>PDF (any DISCOM) or photo of bill</div>
                                </>
                            )}
                        </div>

                        {/* Period selector */}
                        <div className="grid-2" style={{ maxWidth: 400, marginTop: 20 }}>
                            <div>
                                <label className="data-label">Billing Month</label>
                                <select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="data-label">Year</label>
                                <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <button className="btn-primary" style={{ marginTop: 20 }} onClick={handleUpload} disabled={!file}>
                            <Upload size={16} /> Process Bill
                        </button>
                    </>
                ) : (
                    <div className="card" style={{ maxWidth: 400 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Processing</div>
                        <ProcessingTimeline steps={STEPS} currentStep={currentStep} error={error} />
                        {currentStep !== 'complete' && !error && (
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 16 }}>
                                Powered by High-Performance Compute • Advanced AI Analysis
                            </div>
                        )}
                    </div>
                )}

                <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
            </main>
        </div>
    );
}
