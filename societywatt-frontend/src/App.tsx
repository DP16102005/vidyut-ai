import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { aiAPI } from './services/api';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BillUpload from './pages/BillUpload';
import BillDetail from './pages/BillDetail';
import DGMonitor from './pages/DGMonitor';
import Solar from './pages/Solar';
import BillHistory from './pages/BillHistory';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import Leaderboard from './pages/Leaderboard';
import Impact from './pages/Impact';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuth = useAppStore(s => s.isAuthenticated());
    if (!isAuth) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

export default function App() {
    const setAiStatus = useAppStore(s => s.setAiStatus);

    useEffect(() => {
        aiAPI.getStatus().then(res => setAiStatus(res.data)).catch(console.error);
    }, [setAiStatus]);

    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/leaderboard/:societyId" element={<Leaderboard />} />
                <Route path="/impact" element={<Impact />} />

                {/* Protected */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/bills" element={<ProtectedRoute><BillHistory /></ProtectedRoute>} />
                <Route path="/bills/upload" element={<ProtectedRoute><BillUpload /></ProtectedRoute>} />
                <Route path="/bills/:billId" element={<ProtectedRoute><BillDetail /></ProtectedRoute>} />
                <Route path="/dg" element={<ProtectedRoute><DGMonitor /></ProtectedRoute>} />
                <Route path="/solar" element={<ProtectedRoute><Solar /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
