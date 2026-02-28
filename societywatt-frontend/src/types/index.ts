export interface Society {
    id: string;
    name: string;
    display_name: string;
    city: string;
    state: string;
    discom_code: string;
    tariff_category: string;
    num_units: number;
    solar_installed: boolean;
    solar_capacity_kwp?: number;
    dg_installed: boolean;
    dg_capacity_kva?: number;
    tier_subscribed: 'insight' | 'optimize' | 'certify';
    leaderboard_opt_in: boolean;
    preferred_language: string;
}

export interface AnalyticsOutput {
    total_bill: number;
    md_penalty: number;
    md_recorded_kva?: number;
    md_risk_flag: boolean;
    md_headroom_kva: number;
    tod_premium: number;
    peak_consumption_pct: number;
    pf_recorded?: number;
    pf_penalty: number;
    pf_incentive: number;
    pf_risk_score: string;
    dg_avoidable_hours: number;
    dg_avoidable_cost: number;
    dg_total_hours: number;
    solar_arbitrage_loss: number;
    solar_self_consumption_ratio?: number;
    total_avoidable: number;
    avoidable_pct: number;
    energy_intensity: number;
    composite_score: number;
    peer_percentile: number;
    peer_median_intensity: number;
    peer_scope: string;
    co2e_avoided_kg: number;
    emission_factor_source: string;
    analysis_time_ms: number;
    billing_period_from?: string;
    billing_period_to?: string;
    billing_days?: number;
}

export interface Bill {
    id: string;
    society_id: string;
    billing_period_from: string;
    billing_period_to: string;
    billing_days: number;
    upload_timestamp: string;
    parsed_data: string;
    analytics_output: AnalyticsOutput;
    llm_explanation: string;
    proactive_insight?: string;
    anomaly_flags: AnomalyFlag[];
    processing_status: 'uploading' | 'parsing' | 'analysing' | 'complete' | 'failed';
    processing_error?: string;
    extraction_method: string;
    extraction_confidence: number;
    calculation_hash: string;
}

export interface AnomalyFlag {
    type: string;
    message: string;
    probable_cause: string;
    urgency: 'immediate' | 'this_week' | 'next_cycle';
    financial_risk_inr?: number;
}

export interface DGEvent {
    id: string;
    society_id: string;
    event_start: string;
    event_end: string;
    duration_minutes: number;
    classification: 'necessary' | 'avoidable' | 'idle' | 'unclassified';
    avoidable_cost_inr: number;
    source: 'manual' | 'sensor';
}

export interface SolarReading {
    reading_date: string;
    generation_kwh: number;
    self_consumed_kwh: number;
    exported_kwh: number;
}

export interface LeaderboardEntry {
    id: string;
    society_id: string;
    society_name: string;
    display_name: string;
    city: string;
    state: string;
    building_type: string;
    rank_position: number;
    total_in_category: number;
    composite_score: number;
    verification_tier: 'bronze' | 'silver' | 'gold';
    energy_intensity: number;
    improvement_pct: number;
    co2e_avoided_kg: number;
    ranking_level: string;
    scope_value: string;
}

export interface ChatMessage {
    id: string;
    conversation_id?: string;
    role: 'user' | 'assistant';
    content: string;
    language_detected: string;
    created_at: string;
}

export interface ChatConversation {
    id: string;
    title: string;
    created_at: string;
}

export interface ForecastResult {
    available: boolean;
    message?: string;
    point_estimate?: number;
    lower_bound?: number;
    upper_bound?: number;
    confidence_pct?: number;
    months_of_data?: number;
}

export interface ImpactAggregate {
    total_kwh_avoided: number;
    total_co2e_kg: number;
    total_inr_saved: number;
    societies_count: number;
    city_breakdown: {
        city: string;
        co2e_kg: number;
        inr_saved: number;
        count: number;
    }[];
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    society_id: string;
    society_name: string;
    city: string;
    tier: string;
    preferred_language: string;
    user_name: string;
    user_role: string;
}

export interface DGCalculationResult {
    events: {
        date: string;
        start_time: string;
        end_time: string;
        duration_minutes: number;
        classification: string;
        avoidable_cost_inr: number;
    }[];
    summary: {
        total_hours: number;
        necessary_hours: number;
        avoidable_hours: number;
        avoidable_cost: number;
        avoidable_pct: number;
    };
    llm_explanation: string;
}

export interface SolarSummary {
    solar_installed: boolean;
    data_available: boolean;
    available?: boolean;
    message?: string;
    self_consumption_ratio: number;
    total_generation_kwh: number;
    self_consumed_kwh: number;
    exported_kwh: number;
    arbitrage_loss_inr: number;
    optimal_window_start: string;
    optimal_window_end: string;
    shifting_savings_estimate_inr: number;
    capacity_kwp?: number;
    performance_vs_capacity_pct?: number;
    chart_data: {
        date: string;
        generation: number;
        self_consumed: number;
        exported: number;
    }[];
}

export interface DashboardData {
    society: Society;
    latest_bill: AnalyticsOutput | null;
    trend_12mo: { month: string; total_bill: number; composite_score: number }[];
    composite_score: number | null;
    city_rank: number | null;
    national_rank: number | null;
    cumulative_savings_inr: number;
    cumulative_co2e_kg: number;
    forecast: ForecastResult;
    active_anomalies: AnomalyFlag[];
    user_name: string;
    user_role: string;
}
