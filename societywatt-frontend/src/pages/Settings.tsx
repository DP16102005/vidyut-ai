import React from 'react';
import Sidebar from '../components/Sidebar';

export default function Settings() {
    return (
        <div style={{ display: 'flex' }}>
            <Sidebar activePage="/settings" />
            <main style={{ marginLeft: 220, flex: 1, padding: 28, minHeight: '100vh' }}>
                <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Settings</h1>

                <div className="card" style={{ maxWidth: 600 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Building Configuration</div>
                    <p style={{ color: 'var(--text-3)', marginBottom: 24 }}>
                        Manage building profile, update capacity settings, and connect hardware integrations.
                    </p>

                    <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Coming Soon</div>
                        <p style={{ color: 'var(--text-2)' }}>
                            Configuration options such as Solar setup, DG rates, and API access are being moved here in a future update.
                        </p>
                    </div>
                </div>

                <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
            </main>
        </div>
    );
}
