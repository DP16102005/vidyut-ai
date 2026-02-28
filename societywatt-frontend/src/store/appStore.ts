import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AiStatus {
    local_llm_enabled: boolean;
    local_model: string;
    ollama_running: boolean;
    gemini_available: boolean;
}

interface AuthState {
    token: string | null;
    societyId: string | null;
    societyName: string | null;
    city: string | null;
    tier: string | null;
    preferredLanguage: string;
    userName: string | null;
    userRole: string | null;
}

interface AppState extends AuthState {
    aiStatus: AiStatus | null;
    setAuth: (data: {
        token: string;
        societyId: string;
        societyName: string;
        city: string;
        tier: string;
        preferredLanguage: string;
        userName: string;
        userRole: string;
    }) => void;
    clearAuth: () => void;
    isAuthenticated: () => boolean;
    setLanguage: (lang: string) => void;
    setAiStatus: (status: AiStatus) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            token: null,
            societyId: null,
            societyName: null,
            city: null,
            tier: null,
            preferredLanguage: 'en',
            userName: null,
            userRole: null,
            aiStatus: null,

            setAuth: (data) => {
                localStorage.setItem('vidyutai_token', data.token);
                set({
                    token: data.token,
                    societyId: data.societyId,
                    societyName: data.societyName,
                    city: data.city,
                    tier: data.tier,
                    preferredLanguage: data.preferredLanguage,
                    userName: data.userName,
                    userRole: data.userRole,
                });
            },

            clearAuth: () => {
                localStorage.removeItem('vidyutai_token');
                set({
                    token: null, societyId: null,
                    societyName: null, city: null, tier: null,
                    userName: null, userRole: null,
                });
            },

            isAuthenticated: () => get().token !== null,

            setLanguage: (lang) => set({ preferredLanguage: lang }),

            setAiStatus: (status) => set({ aiStatus: status }),
        }),
        {
            name: 'vidyutai-auth',
            partialize: (s) => ({
                token: s.token,
                societyId: s.societyId,
                societyName: s.societyName,
                city: s.city,
                tier: s.tier,
                preferredLanguage: s.preferredLanguage,
                userName: s.userName,
                userRole: s.userRole,
            }),
        }
    )
);
