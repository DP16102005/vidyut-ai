import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { authAPI } from '../services/api';
import LanguageSelector from '../components/LanguageSelector';

const STATES = ['maharashtra', 'karnataka', 'haryana', 'telangana', 'tamil_nadu', 'west_bengal', 'delhi', 'uttar_pradesh', 'rajasthan', 'gujarat', 'madhya_pradesh', 'andhra_pradesh', 'kerala', 'punjab', 'odisha', 'jharkhand', 'chhattisgarh', 'assam', 'bihar', 'goa'];
const DISCOMS = ['MSEDCL', 'BESCOM', 'DHBVN', 'TSSPDCL', 'TANGEDCO', 'CESC', 'BSES_RAJDHANI', 'BSES_YAMUNA', 'TPDDL', 'JVVNL', 'UGVCL', 'KSEB', 'PSPCL'];
import { Home, Briefcase, GraduationCap, Activity, ShoppingBag, Hotel, Factory, Heart, Landmark } from 'lucide-react';
import { getBuildingLabel } from '../utils/buildingLabel';

const BUILDING_TYPES = [
    { value: 'residential_society', label: 'Housing Society', icon: Home },
    { value: 'office', label: 'Office', icon: Briefcase },
    { value: 'school', label: 'School / College', icon: GraduationCap },
    { value: 'hospital', label: 'Hospital', icon: Activity },
    { value: 'mall', label: 'Mall / Retail', icon: ShoppingBag },
    { value: 'hotel', label: 'Hotel', icon: Hotel },
    { value: 'factory', label: 'Factory', icon: Factory },
    { value: 'religious', label: 'Religious', icon: Heart },
    { value: 'government', label: 'Government', icon: Landmark },
];

export default function Register() {
    const navigate = useNavigate();
    const setAuth = useAppStore(s => s.setAuth);
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        society_name: '', city: '', state: 'maharashtra', pincode: '', discom_code: 'MSEDCL', tariff_category: '',
        num_units: 100, building_type: 'residential_society', total_area_sqm: 0,
        solar_installed: false, solar_capacity_kwp: 0, dg_installed: false, dg_capacity_kva: 0,
        dg_fuel_rate_per_litre: 92.5, dg_fuel_consumption_lph: 25, md_sanctioned_kva: 100,
        secretary_name: '', email: '', phone: '', password: '', confirm_password: '',
        tier_subscribed: 'insight', preferred_language: 'en', leaderboard_opt_in: true,
    });

    const update = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = async () => {
        if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
        setError(''); setLoading(true);
        try {
            const { data } = await authAPI.register(form);
            setAuth({ token: data.access_token, societyId: data.society_id, societyName: data.society_name, city: data.city, tier: data.tier, preferredLanguage: data.preferred_language, userName: data.user_name, userRole: data.user_role });
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally { setLoading(false); }
    };

    return (
        <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 20px' }}>
            <Link to="/" style={{ fontSize: 18, fontWeight: 600, color: 'var(--base)', textDecoration: 'none' }}>Vidyut AI</Link>
            {/* Progress bar */}
            <div style={{ display: 'flex', gap: 4, margin: '20px 0 24px' }}>
                {[1, 2, 3, 4].map(s => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? 'var(--base)' : 'var(--border)' }} />
                ))}
            </div>
            {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="card">
                {step === 1 && (
                    <>
                        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Society Details</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div><label className="data-label">Society Name *</label><input value={form.society_name} onChange={e => update('society_name', e.target.value)} required /></div>
                            <div className="grid-2">
                                <div><label className="data-label">City *</label><input value={form.city} onChange={e => update('city', e.target.value)} required /></div>
                                <div><label className="data-label">State *</label><select value={form.state} onChange={e => update('state', e.target.value)}>{STATES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select></div>
                            </div>
                            <div className="grid-2">
                                <div><label className="data-label">Pincode</label><input value={form.pincode} onChange={e => update('pincode', e.target.value)} /></div>
                                <div><label className="data-label">Tariff Category *</label><input value={form.tariff_category} onChange={e => update('tariff_category', e.target.value)} placeholder="e.g. LT-III" /></div>
                            </div>
                            <div><label className="data-label">DISCOM *</label><select value={form.discom_code} onChange={e => update('discom_code', e.target.value)}>{DISCOMS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        </div>
                    </>
                )}
                {step === 2 && (
                    <>
                        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Building Profile</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {BUILDING_TYPES.map(bt => {
                                const Icon = bt.icon;
                                const lbl = getBuildingLabel(bt.value);
                                return (
                                    <div key={bt.value} onClick={() => update('building_type', bt.value)} style={{
                                        border: `2px solid ${form.building_type === bt.value ? 'var(--base)' : 'var(--border)'}`,
                                        background: form.building_type === bt.value ? 'var(--surface-2)' : 'var(--surface)',
                                        borderRadius: 8, padding: '16px 8px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                                    }}>
                                        <Icon size={24} color={form.building_type === bt.value ? 'var(--base)' : 'var(--text-2)'} />
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{bt.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.2 }}>Count {lbl.unitsLabel}</div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="grid-2" style={{ marginTop: 16 }}>
                            <div><label className="data-label">Number of {getBuildingLabel(form.building_type).unitsLabel} *</label><input type="number" value={form.num_units} onChange={e => update('num_units', parseInt(e.target.value) || 0)} /></div>
                            <div><label className="data-label">Total Area (sqm)</label><input type="number" value={form.total_area_sqm} onChange={e => update('total_area_sqm', parseFloat(e.target.value) || 0)} /></div>
                        </div>
                    </>
                )}
                {step === 3 && (
                    <>
                        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Equipment</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.solar_installed} onChange={e => update('solar_installed', e.target.checked)} /> Solar installed
                                </label>
                                {form.solar_installed && <div style={{ marginTop: 8 }}><label className="data-label">Capacity (kWp)</label><input type="number" value={form.solar_capacity_kwp} onChange={e => update('solar_capacity_kwp', parseFloat(e.target.value) || 0)} /></div>}
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.dg_installed} onChange={e => update('dg_installed', e.target.checked)} /> DG installed
                                </label>
                                {form.dg_installed && (
                                    <div className="grid-3" style={{ marginTop: 8 }}>
                                        <div><label className="data-label">Capacity (kVA)</label><input type="number" value={form.dg_capacity_kva} onChange={e => update('dg_capacity_kva', parseFloat(e.target.value) || 0)} /></div>
                                        <div><label className="data-label">Diesel ₹/L</label><input type="number" value={form.dg_fuel_rate_per_litre} onChange={e => update('dg_fuel_rate_per_litre', parseFloat(e.target.value) || 0)} /></div>
                                        <div><label className="data-label">L/hour</label><input type="number" value={form.dg_fuel_consumption_lph} onChange={e => update('dg_fuel_consumption_lph', parseFloat(e.target.value) || 0)} /></div>
                                    </div>
                                )}
                            </div>
                            <div><label className="data-label">MD Sanctioned (kVA)</label><input type="number" value={form.md_sanctioned_kva} onChange={e => update('md_sanctioned_kva', parseFloat(e.target.value) || 0)} /><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Find on your electricity bill or DISCOM portal</div></div>
                        </div>
                    </>
                )}
                {step === 4 && (
                    <>
                        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Account</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div><label className="data-label">Secretary Name *</label><input value={form.secretary_name} onChange={e => update('secretary_name', e.target.value)} required /></div>
                            <div className="grid-2">
                                <div><label className="data-label">Email *</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} required /></div>
                                <div><label className="data-label">Phone</label><input value={form.phone} onChange={e => update('phone', e.target.value)} /></div>
                            </div>
                            <div className="grid-2">
                                <div><label className="data-label">Password *</label><input type="password" value={form.password} onChange={e => update('password', e.target.value)} minLength={8} required /></div>
                                <div><label className="data-label">Confirm Password *</label><input type="password" value={form.confirm_password} onChange={e => update('confirm_password', e.target.value)} required /></div>
                            </div>
                            <div><label className="data-label">Language</label><LanguageSelector value={form.preferred_language} onChange={v => update('preferred_language', v)} /></div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.leaderboard_opt_in} onChange={e => update('leaderboard_opt_in', e.target.checked)} />
                                Show on public leaderboard (name and score only)
                            </label>
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                {step > 1 ? <button className="btn-secondary" onClick={() => setStep(step - 1)}>Back</button> : <div />}
                {step < 4 ? <button className="btn-primary" onClick={() => setStep(step + 1)}>Continue</button>
                    : <button className="btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>}
            </div>
        </div>
    );
}
