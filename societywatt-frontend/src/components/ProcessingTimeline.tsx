import React from 'react';
import { Loader, Check, X } from 'lucide-react';

interface Step {
    key: string;
    label: string;
}

interface ProcessingTimelineProps {
    steps: Step[];
    currentStep: string;
    error?: { step: string; message: string };
}

type Status = 'pending' | 'active' | 'done' | 'error';

export default function ProcessingTimeline({ steps, currentStep, error }: ProcessingTimelineProps) {
    const getStatus = (stepKey: string): Status => {
        if (error && error.step === stepKey) return 'error';
        const currentIdx = steps.findIndex(s => s.key === currentStep);
        const thisIdx = steps.findIndex(s => s.key === stepKey);
        if (thisIdx < currentIdx) return 'done';
        if (thisIdx === currentIdx) return error ? 'error' : 'active';
        return 'pending';
    };

    const iconStyle = (status: Status): React.CSSProperties => ({
        width: 24, height: 24, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: status === 'done' ? 'var(--positive)' : status === 'active' ? 'var(--info)' : status === 'error' ? 'var(--danger)' : 'transparent',
        border: status === 'pending' ? '2px solid var(--border)' : 'none',
        color: status === 'pending' ? 'var(--text-3)' : 'white',
    });

    return (
        <div>
            {steps.map((step, i) => {
                const status = getStatus(step.key);
                return (
                    <React.Fragment key={step.key}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={iconStyle(status)}>
                                {status === 'done' && <Check size={14} />}
                                {status === 'active' && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                {status === 'error' && <X size={14} />}
                            </div>
                            <div>
                                <div style={{
                                    fontSize: 14,
                                    fontWeight: status === 'active' ? 600 : 400,
                                    color: status === 'pending' ? 'var(--text-3)' : status === 'error' ? 'var(--danger)' : status === 'done' ? 'var(--text-2)' : 'var(--text-1)',
                                }}>
                                    {step.label}
                                </div>
                                {status === 'error' && error && (
                                    <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2 }}>{error.message}</div>
                                )}
                            </div>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ width: 1, height: 20, background: 'var(--border)', marginLeft: 12 }} />
                        )}
                    </React.Fragment>
                );
            })}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
