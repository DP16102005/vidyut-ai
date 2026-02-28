import * as React from 'react';
import { useEffect, useState } from 'react';
import { Activity, Cpu, Zap, Eye, CheckCircle } from 'lucide-react';

const EVENTS = [
    { type: 'compute', text: 'Analyzing demand limits for Vasant Gardens', icon: Cpu, color: 'var(--info)' },
    { type: 'alert', text: 'Anomaly detected: Late-night power spike in Tower B', icon: Zap, color: 'var(--warning)' },
    { type: 'ai', text: 'Generating bilingual Secretary report (English/Marathi)', icon: Eye, color: 'var(--accent)' },
    { type: 'success', text: 'Forecast model updated with latest historical data', icon: CheckCircle, color: 'var(--positive)' },
    { type: 'compute', text: 'Optimising tariff combinations for Koramangala Heights', icon: Cpu, color: 'var(--info)' },
    { type: 'alert', text: 'Diesel Generator triggered during grid availability', icon: Zap, color: 'var(--danger)' },
    { type: 'ai', text: 'Extracting nested billing tables using Vision AI', icon: Eye, color: 'var(--accent)' },
    { type: 'success', text: 'Identified ₹14,500 avoidable waste this billing cycle', icon: CheckCircle, color: 'var(--positive)' },
    { type: 'compute', text: 'Running peak-load simulations via High-Performance cluster', icon: Cpu, color: 'var(--info)' },
];

export default function LiveActivityFeed() {
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        // Initialize with a few events
        const initial = Array.from({ length: 4 }).map((_, i) => ({
            ...EVENTS[Math.floor(Math.random() * EVENTS.length)],
            id: Date.now() - i * 1000,
            time: new Date(Date.now() - i * 10000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }));
        setActivities(initial);

        // Add a new event every 3-6 seconds
        const interval = setInterval(() => {
            const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            const newActivity = {
                ...event,
                id: Date.now(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };

            setActivities(prev => [newActivity, ...prev].slice(0, 5));
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="card" style={{ background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Activity size={18} color="var(--positive)" className="pulse-icon" />
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Live Platform Intelligence</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                {activities.map((act, i) => {
                    const Icon = act.icon;
                    return (
                        <div
                            key={act.id}
                            style={{
                                display: 'flex',
                                gap: 12,
                                padding: 12,
                                background: 'var(--surface-2)',
                                borderRadius: 8,
                                border: `1px solid ${act.color}30`,
                                animation: i === 0 ? 'slideDown 0.4s ease-out' : 'none',
                                opacity: 1 - (i * 0.15),
                                transform: `scale(${1 - (i * 0.02)})`,
                                transformOrigin: 'top center',
                                transition: 'all 0.4s ease'
                            }}
                        >
                            <div style={{
                                width: 32, height: 32, borderRadius: 16,
                                background: `${act.color}20`, color: act.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Icon size={16} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {act.text}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{act.time}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .pulse-icon {
                    animation: pulseOp 2s infinite;
                }
                @keyframes pulseOp {
                    0% { opacity: 1; text-shadow: 0 0 10px var(--positive); }
                    50% { opacity: 0.5; text-shadow: none; }
                    100% { opacity: 1; text-shadow: 0 0 10px var(--positive); }
                }
            `}</style>
        </div>
    );
}
