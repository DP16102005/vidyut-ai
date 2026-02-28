import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
    AuthResponse, Bill, AnalyticsOutput, AnomalyFlag,
    DGCalculationResult, SolarSummary, LeaderboardEntry,
    ChatMessage, ChatConversation, ForecastResult,
    ImpactAggregate, DashboardData, Society,
} from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client: AxiosInstance = axios.create({
    baseURL: BASE,
    timeout: 60000,
});

client.interceptors.request.use(config => {
    const token = localStorage.getItem('vidyutai_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

import { useAppStore } from '../store/appStore';

client.interceptors.response.use(
    res => res,
    (err: AxiosError<{ error: string; detail?: string }>) => {
        if (err.response?.status === 401) {
            useAppStore.getState().clearAuth();
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export const authAPI = {
    login: (email: string, password: string) =>
        client.post<AuthResponse>('/auth/login', { email, password }),
    register: (data: Record<string, unknown>) =>
        client.post<AuthResponse>('/auth/register', data),
};

export const dashboardAPI = {
    get: (societyId: string) =>
        client.get<DashboardData>(`/societies/${societyId}/dashboard`),
};

export const billsAPI = {
    list: (societyId: string) =>
        client.get<Bill[]>(`/bills/society/${societyId}`),
    get: (billId: string) =>
        client.get<Bill>(`/bills/${billId}`),
    upload: (formData: FormData) =>
        client.post<{
            bill_id: string;
            parsed_data: Record<string, unknown>;
            analytics: AnalyticsOutput;
            llm_explanation: string;
            anomaly_flags: AnomalyFlag[];
            extraction_method: string;
            extraction_confidence: number;
            calculation_hash: string;
        }>('/bills/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 90000,
        }),
    getExplanation: (billId: string, language: string) =>
        client.get<{ explanation: string }>(`/bills/${billId}/explanation?language=${language}`),
};

export const chatAPI = {
    sendMessage: (data: {
        society_id: string;
        message: string;
        conversation_id?: string;
        language: string;
    }) => client.post<{
        reply: string;
        conversation_id: string;
        language_used: string;
    }>('/chat/message', data),
    getConversations: (societyId: string) =>
        client.get<ChatConversation[]>(`/chat/${societyId}/conversations`),
    getMessages: (conversationId: string) =>
        client.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`),
};

export const dgAPI = {
    calculate: (data: {
        society_id: string;
        dg_events: { date: string; start_time: string; end_time: string }[];
        outage_events: { date: string; start_time: string; end_time: string }[];
        diesel_rate: number;
        fuel_lph: number;
    }) => client.post<DGCalculationResult>('/dg/calculate', data),
    getHistory: (societyId: string) =>
        client.get<{ months: { month: string; total_hours: number; avoidable_hours: number; avoidable_cost: number }[] }>(`/dg/history/${societyId}`),
    getOperatorLetter: (data: {
        society_id: string;
        language: string;
        operator_name: string;
        avoidable_hours: number;
        avoidable_cost: number;
    }) => client.post<{ letter_text: string }>('/dg/operator-letter', data),
};

export const solarAPI = {
    getSummary: (societyId: string) =>
        client.get<SolarSummary>(`/solar/${societyId}/summary`),
};

export const leaderboardAPI = {
    getList: (params: { level?: string; building_type?: string; city?: string }) =>
        client.get<{
            entries: LeaderboardEntry[];
            total: number;
            level: string;
            scope: string;
        }>('/leaderboard', { params }),
    getSociety: (societyId: string) =>
        client.get<{
            society: { id: string; name: string; display_name: string; city: string; state: string; building_type: string };
            national: LeaderboardEntry | null;
            city: LeaderboardEntry | null;
            state: LeaderboardEntry | null;
        }>(`/leaderboard/society/${societyId}`),
};

export const impactAPI = {
    getAggregate: () =>
        client.get<ImpactAggregate>('/impact/aggregate'),
};

import type { AiStatus } from '../store/appStore';
export const aiAPI = {
    getStatus: () => client.get<AiStatus>('/ai/status'),
};
