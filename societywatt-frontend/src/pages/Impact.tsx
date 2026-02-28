import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, TreePine, Car, BatteryCharging, Info, Globe2, ShieldCheck } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { useAppStore } from '../store/appStore';
import { impactAPI } from '../services/api';
import { formatCO2, formatINRShort, formatKwh } from '../utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ImpactAggregate } from '../types';

export default function Impact() {
    const [data, setData] = useState<ImpactAggregate | null>(null);
    const [loading, setLoading] = useState(true);
    const isAuth = useAppStore(s => s.isAuthenticated());

    useEffect(() => {
        impactAPI.getAggregate()
            .then(r => { setData(r.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Conversions for equivalencies
    const treesEquivalent = data ? Math.round(data.total_co2e_kg / 21) : 0; // Approx 21kg CO2 per tree per year
    const carsOffRoad = data ? Math.round(data.total_co2e_kg / 4600) : 0; // Approx 4.6 metric tons per passenger vehicle per year
    const smartphoneCharges = data ? Math.round(data.total_co2e_kg / 0.00822) : 0; // Approx 8.22g CO2 per full charge

    return (
        <div>
            {/* Header */}
            <header style={{ position: 'sticky', top: 0, height: 64, borderBottom: '1px solid var(--border-strong)', zIndex: 50, display: 'flex', alignItems: 'center', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(21, 26, 35, 0.8)' }}>
                <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to="/" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none', fontFamily: 'Outfit' }}>Vidyut AI</Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Link to="/leaderboard" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Leaderboard</Link>
                        <Link to="/impact" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>Impact</Link>
                        {isAuth ? (
                            <Link to="/dashboard" className="btn-primary" style={{ fontSize: 14, padding: '8px 20px', marginLeft: 8 }}>Dashboard</Link>
                        ) : (
                            <>
                                <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', marginLeft: 8 }}>Sign in</Link>
                                <Link to="/register" className="btn-primary" style={{ fontSize: 14, padding: '8px 20px' }}>Register</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px 80px' }}>
                {/* Header Section */}
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 32, background: 'var(--positive-glow)', color: 'var(--positive)', marginBottom: 20 }}>
                        <Globe2 size={32} />
                    </div>
                    <h1 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-1)' }}>
                        Sustainability Impact
                    </h1>
                    <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 600, margin: '0 auto', lineHeight: 1.5 }}>
                        Aggregating the environmental and financial benefits of AI-driven energy optimization across all verified societies on Vidyut AI.
                    </p>
                </div>

                {loading ? (
                    <div className="grid-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
                    </div>
                ) : data && (
                    <>
                        {/* Primary Metrics */}
                        <div className="grid-4" style={{ marginBottom: 40 }}>
                            <MetricCard label="CO₂e Avoided" value={formatCO2(data.total_co2e_kg)} variant="positive" sublabel="Verified Carbon Reduction" />
                            <MetricCard label="Energy Saved" value={formatKwh(data.total_kwh_avoided)} variant="info" sublabel="Avoided Grid Demand" />
                            <MetricCard label="Financial Savings" value={formatINRShort(data.total_inr_saved)} variant="accent" sublabel="Total community savings" />
                            <MetricCard label="Green Societies" value={String(data.societies_count)} variant="default" sublabel="Active on platform" />
                        </div>

                        {/* Educational / Explanatory Section */}
                        <div className="grid-2" style={{ gap: 24, marginBottom: 40 }}>
                            <div className="card" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <Info size={24} color="var(--accent)" />
                                    <h3 style={{ fontSize: 18, margin: 0, color: 'var(--text-1)' }}>What is this?</h3>
                                </div>
                                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
                                    <strong>Sustainability Impact</strong> represents the measurable environmental benefit of eliminating energy waste.
                                    In India, electricity generation relies heavily on coal. Every unit (kWh) of power drawn from the grid,
                                    and every litre of diesel burned in a generator, releases Carbon Dioxide equivalent (CO₂e) into the atmosphere.
                                </p>
                                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                                    When Vidyut AI's AI identifies and helps a society fix Maximum Demand overshoot, power factor penalties, or
                                    avoidable Diesel Generator (DG) usage, it directly reduces the amount of fossil fuels burned to sustain that society.
                                </p>
                            </div>

                            <div className="card" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <ShieldCheck size={24} color="var(--positive)" />
                                    <h3 style={{ fontSize: 18, margin: 0, color: 'var(--text-1)' }}>Why it matters</h3>
                                </div>
                                <ul style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, paddingLeft: 20, margin: 0 }}>
                                    <li style={{ marginBottom: 10 }}>
                                        <strong style={{ color: 'var(--text-1)' }}>Climate Action:</strong> High-density urban housing is a major contributor to urban carbon footprints. Optimizing it is crucial for India's Net Zero goals.
                                    </li>
                                    <li style={{ marginBottom: 10 }}>
                                        <strong style={{ color: 'var(--text-1)' }}>Grid Stability:</strong> By flattening peak consumption (ToD optimization) and keeping power factors healthy, societies reduce strain on the fragile local electrical grid.
                                    </li>
                                    <li>
                                        <strong style={{ color: 'var(--text-1)' }}>Financial Reinvestment:</strong> The millions of rupees saved from DISCOM penalties can be redirected into capital investments like Solar Rooftops or EV charging stations.
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Real-world Equivalencies */}
                        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-1)', marginBottom: 20 }}>Real-world Equivalencies</h2>
                        <div className="grid-3" style={{ marginBottom: 48 }}>
                            <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                                <TreePine size={40} color="var(--positive)" style={{ margin: '0 auto 16px' }} />
                                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                                    {treesEquivalent.toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Tree seedlings grown for 10 years</div>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                                <Car size={40} color="var(--info)" style={{ margin: '0 auto 16px' }} />
                                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                                    {carsOffRoad.toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Gasoline-powered vehicles driven for one year</div>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                                <BatteryCharging size={40} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
                                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                                    {smartphoneCharges.toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Smartphones fully charged</div>
                            </div>
                        </div>

                        {/* Regional Impact Chart */}
                        {data.city_breakdown.length > 0 && (
                            <div className="card">
                                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: 'var(--text-1)' }}>Regional Impact Contribution</div>
                                <div style={{ height: 300, width: '100%', marginBottom: 32 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.city_breakdown} layout="vertical" margin={{ left: 100, right: 20 }}>
                                            <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="city" type="category" tick={{ fontSize: 13, fill: 'var(--text-2)', fontWeight: 500 }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'var(--surface-2)' }}
                                                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 13, color: 'var(--text-1)' }}
                                                itemStyle={{ color: 'var(--positive)' }}
                                            />
                                            <Bar dataKey="co2e_kg" name="CO₂e Avoided (kg)" fill="var(--positive)" radius={[0, 4, 4, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="table-responsive">
                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-strong)', color: 'var(--text-3)', fontSize: 13 }}>
                                                <th style={{ padding: '12px 16px', fontWeight: 500 }}>City/Region</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Active Societies</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 500 }}>CO₂e Avoided</th>
                                                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Community Savings</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.city_breakdown.map((c, i) => (
                                                <tr key={c.city} style={{ borderBottom: i === data.city_breakdown.length - 1 ? 'none' : '1px solid var(--border)', fontSize: 14 }}>
                                                    <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-1)' }}>{c.city}</td>
                                                    <td style={{ padding: '16px', color: 'var(--text-2)' }}>{c.count}</td>
                                                    <td style={{ padding: '16px', color: 'var(--positive)', fontWeight: 500 }}>{formatCO2(c.co2e_kg)}</td>
                                                    <td style={{ padding: '16px', color: 'var(--text-2)' }}>{formatINRShort(c.inr_saved)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div style={{ textAlign: 'center', marginTop: 40, padding: '24px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                            <strong>Transparency Note:</strong> All data is aggregated anonymously from verified society electricity bills.
                            Carbon conversions are based on the <span style={{ color: 'var(--text-2)' }}>Central Electricity Authority (CEA) National Emission Factor Database 2023-24</span> and EPA equivalency models.
                        </div>
                    </>
                )}
            </div>

            <footer style={{ background: 'var(--base)', color: 'white', padding: '32px 20px', marginTop: 64 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>Vidyut AI — AI energy intelligence for India</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 12 }}>Local AI: Phi-3 Mini on AMD CPU + AOCL</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Cloud fallback: Gemini 1.5 Flash (non-English)</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Emissions data: CEA 2023-24</div>
                </div>
            </footer>
        </div>
    );
}
