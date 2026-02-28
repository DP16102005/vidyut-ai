import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
import { useAppStore } from '../store/appStore';
import { dgAPI } from '../services/api';
import { formatINR, formatHours } from '../utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import LanguageSelector from '../components/LanguageSelector';

export default function DGMonitor() {
    const { societyId, preferredLanguage } = useAppStore();
    const [dgEvents, setDgEvents] = useState([{ date: '', start_time: '', end_time: '' }]);
    const [outageEvents, setOutageEvents] = useState([{ date: '', start_time: '', end_time: '' }]);
    const [dieselRate, setDieselRate] = useState(92.5);
    const [fuelLph, setFuelLph] = useState(25);
    const [result, setResult] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [letterText, setLetterText] = useState('');
    const [letterLang, setLetterLang] = useState(preferredLanguage || 'en');

    useEffect(() => {
        if (!societyId) return;
        dgAPI.getHistory(societyId).then(r => setHistory(r.data.months)).catch(() => { });
    }, [societyId]);

    const addEvent = (type: 'dg' | 'outage') => {
        const setter = type === 'dg' ? setDgEvents : setOutageEvents;
        setter(prev => [...prev, { date: '', start_time: '', end_time: '' }]);
    };

    const updateEvent = (type: 'dg' | 'outage', idx: number, field: string, val: string) => {
        const setter = type === 'dg' ? setDgEvents : setOutageEvents;
        setter(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
    };

    const handleCalc = async () => {
        if (!societyId) return;
        setLoading(true);
        try {
            const { data } = await dgAPI.calculate({
                society_id: societyId,
                dg_events: dgEvents.filter(e => e.date && e.start_time && e.end_time),
                outage_events: outageEvents.filter(e => e.date && e.start_time && e.end_time),
                diesel_rate: dieselRate,
                fuel_lph: fuelLph,
            });
            setResult(data);
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Calculation failed');
        } finally { setLoading(false); }
    };

    const handleLetter = async () => {
        if (!societyId || !result) return;
        const name = prompt('Operator name:');
        if (!name) return;
        try {
            const { data } = await dgAPI.getOperatorLetter({
                society_id: societyId, language: letterLang, operator_name: name,
                avoidable_hours: result.summary.avoidable_hours, avoidable_cost: result.summary.avoidable_cost,
            });
            setLetterText(data.letter_text);
        } catch { }
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <main style={{ marginLeft: 220, flex: 1, padding: 28, minHeight: '100vh' }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>DG Monitor</h1>
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>Compare DG runtime against grid outage windows to find avoidable diesel spend</p>

                {/* History Chart */}
                {history.length > 0 && (
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Monthly DG History</div>
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={history}>
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="total_hours" name="Total Hours" fill="var(--border)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="avoidable_hours" name="Avoidable" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* DG Events */}
                    <div className="card">
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>DG Run Events</div>
                        {dgEvents.map((ev, i) => (
                            <div key={i} className="grid-3" style={{ gap: 8, marginBottom: 6 }}>
                                <input type="date" value={ev.date} onChange={e => updateEvent('dg', i, 'date', e.target.value)} />
                                <input type="time" value={ev.start_time} onChange={e => updateEvent('dg', i, 'start_time', e.target.value)} placeholder="Start" />
                                <input type="time" value={ev.end_time} onChange={e => updateEvent('dg', i, 'end_time', e.target.value)} placeholder="End" />
                            </div>
                        ))}
                        <button className="btn-secondary" style={{ fontSize: 12, marginTop: 6 }} onClick={() => addEvent('dg')}>+ Add event</button>
                    </div>

                    {/* Outage Events */}
                    <div className="card">
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Grid Outage Windows</div>
                        {outageEvents.map((ev, i) => (
                            <div key={i} className="grid-3" style={{ gap: 8, marginBottom: 6 }}>
                                <input type="date" value={ev.date} onChange={e => updateEvent('outage', i, 'date', e.target.value)} />
                                <input type="time" value={ev.start_time} onChange={e => updateEvent('outage', i, 'start_time', e.target.value)} placeholder="Start" />
                                <input type="time" value={ev.end_time} onChange={e => updateEvent('outage', i, 'end_time', e.target.value)} placeholder="End" />
                            </div>
                        ))}
                        <button className="btn-secondary" style={{ fontSize: 12, marginTop: 6 }} onClick={() => addEvent('outage')}>+ Add outage</button>
                    </div>
                </div>

                <div className="grid-2" style={{ maxWidth: 400, marginTop: 16 }}>
                    <div><label className="data-label">Diesel ₹/litre</label><input type="number" value={dieselRate} onChange={e => setDieselRate(parseFloat(e.target.value) || 0)} /></div>
                    <div><label className="data-label">Consumption L/hour</label><input type="number" value={fuelLph} onChange={e => setFuelLph(parseFloat(e.target.value) || 0)} /></div>
                </div>

                <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleCalc} disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Avoidable Hours'}
                </button>

                {result && (
                    <div style={{ marginTop: 24 }}>
                        <div className="grid-3" style={{ marginBottom: 16 }}>
                            <MetricCard label="Total DG" value={formatHours(result.summary.total_hours)} />
                            <MetricCard label="Avoidable" value={formatHours(result.summary.avoidable_hours)} variant="danger" sublabel={`${result.summary.avoidable_pct}%`} />
                            <MetricCard label="Avoidable Cost" value={formatINR(result.summary.avoidable_cost)} variant="danger" />
                        </div>

                        {result.events.length > 0 && (
                            <div className="card" style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Classified Events</div>
                                <table>
                                    <thead><tr><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Class</th><th>Cost</th></tr></thead>
                                    <tbody>
                                        {result.events.map((ev: any, i: number) => (
                                            <tr key={i}>
                                                <td>{ev.date}</td><td>{ev.start_time}</td><td>{ev.end_time}</td>
                                                <td>{ev.duration_minutes}m</td>
                                                <td><span className={`pill pill-${ev.classification === 'avoidable' ? 'danger' : 'positive'}`}>{ev.classification}</span></td>
                                                <td>{ev.avoidable_cost_inr > 0 ? formatINR(ev.avoidable_cost_inr) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <button className="btn-secondary" onClick={handleLetter}>Generate Operator Letter</button>
                            <LanguageSelector value={letterLang} onChange={setLetterLang} compact />
                        </div>
                        {letterText && <div className="card" style={{ marginTop: 12, whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>{letterText}</div>}
                    </div>
                )}
                <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
            </main>
        </div>
    );
}
