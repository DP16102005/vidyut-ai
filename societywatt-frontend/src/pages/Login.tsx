import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { authAPI } from '../services/api';

export default function Login() {
    const isAuth = useAppStore(s => s.isAuthenticated());
    const setAuth = useAppStore(s => s.setAuth);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (isAuth) return <Navigate to="/dashboard" replace />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await authAPI.login(email, password);
            setAuth({
                token: data.access_token,
                societyId: data.society_id,
                societyName: data.society_name,
                city: data.city,
                tier: data.tier,
                preferredLanguage: data.preferred_language,
                userName: data.user_name,
                userRole: data.user_role,
            });
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 20px' }}>
            <div style={{ textAlign: 'center' }}>
                <Link to="/" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}>Vidyut AI</Link>
                <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>AI energy intelligence for every building</div>
            </div>
            <div className="card" style={{ marginTop: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 600 }}>Sign in</h1>
                <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4, marginBottom: 20 }}>Enter your registered email and password</p>
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="demo@vidyutai.in" />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="Demo@2024"
                                style={{ width: '100%', paddingRight: 40 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
            </div>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-3)' }}>
                Demo: demo@vidyutai.in / Demo@2024
            </p>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-2)' }}>
                New building? <Link to="/register">Register here</Link>
            </p>
        </div>
    );
}
