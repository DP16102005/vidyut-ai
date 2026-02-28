import * as React from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, Zap, Sun, MessageCircle, Trophy, Leaf, LogOut, Menu, X, Settings as SettingsIcon } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface SidebarProps {
    activePage?: string;
}

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/bills', label: 'Bill History', icon: FileText },
    { path: '/dg', label: 'DG Monitor', icon: Zap },
    { path: '/solar', label: 'Solar', icon: Sun },
    { path: '/chat', label: 'AI Chat', icon: MessageCircle },
    { divider: true },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/impact', label: 'Impact', icon: Leaf },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
] as const;

export default function Sidebar({ activePage }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { societyName, city, tier, clearAuth } = useAppStore();
    const [mobileOpen, setMobileOpen] = useState(false);

    const current = activePage || location.pathname;

    const handleLogout = () => {
        clearAuth();
        navigate('/');
    };

    const sidebar = (
        <div style={{
            width: 240, height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100,
            background: 'var(--surface)', borderRight: '1px solid var(--border-strong)',
            display: 'flex', flexDirection: 'column',
        }}>
            <div style={{ padding: '20px 16px 4px' }}>
                <Link to="/dashboard" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)', textDecoration: 'none', fontFamily: 'Outfit, sans-serif' }}>
                    Vidyut AI
                </Link>
            </div>
            <div style={{ padding: '0 16px 12px', fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>{societyName}</div>
            {city && <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--text-3)' }}>{city}</div>}
            {tier && (
                <div style={{ padding: '0 16px 12px' }}>
                    <span className="pill pill-info" style={{ textTransform: 'capitalize' }}>{tier}</span>
                </div>
            )}
            <div style={{ borderBottom: '1px solid var(--border-strong)' }} />

            <nav style={{ flex: 1, paddingTop: 8, overflowY: 'auto' }}>
                {navItems.map((item, i) => {
                    if ('divider' in item) return <div key={i} style={{ borderBottom: '1px solid var(--border-strong)', margin: '8px 16px' }} />;
                    const Icon = item.icon;
                    const active = current === item.path || current.startsWith(item.path + '/');
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileOpen(false)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 16px', margin: '4px 12px', borderRadius: 8,
                                fontSize: 14, fontWeight: active ? 600 : 500, textDecoration: 'none',
                                background: active ? 'var(--accent-glow)' : 'transparent',
                                color: active ? 'var(--accent)' : 'var(--text-2)',
                                transition: 'all 0.2s ease',
                                border: active ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
                            }}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div style={{ borderTop: '1px solid var(--border-strong)', padding: '16px 16px 8px' }}>
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }} onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
                    Vidyut AI
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{
                    display: 'none', position: 'fixed', top: 12, left: 12, zIndex: 200,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: 6, cursor: 'pointer',
                }}
                className="mobile-menu-btn"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Desktop sidebar */}
            <div className="sidebar-desktop">{sidebar}</div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div onClick={() => setMobileOpen(false)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99,
                }} />
            )}
            {mobileOpen && <div className="sidebar-mobile">{sidebar}</div>}

            <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
        @media (min-width: 769px) {
          .sidebar-mobile { display: none !important; }
        }
      `}</style>
        </>
    );
}
