"""
services/analytics.py — Pure arithmetic analytics engine.
No LLM, no ML. Every rupee traceable to a calculation.
"""
import json
import time
import hashlib
from pathlib import Path

# Load tariffs and emission factors at module init
_DATA_DIR = Path(__file__).parent.parent / 'data'
_TARIFFS = json.loads((_DATA_DIR / 'tariffs.json').read_text())
_EF = json.loads((_DATA_DIR / 'emission_factors.json').read_text())


def get_tariff(discom_code: str, tariff_category: str) -> dict:
    key = f"{discom_code}_{tariff_category}".upper()
    key = key.replace('-', '').replace(' ', '')
    for k, v in _TARIFFS.items():
        if k.upper().replace('-', '') == key:
            return v
    return {
        "demand_charge_per_kva": 250,
        "md_penalty_multiplier": 1.5,
        "min_billing_demand_pct": 75,
        "tod_peak_surcharge_pct": 20,
        "tod_offpeak_discount_pct": 10,
        "pf_penalty_threshold": 0.90,
        "pf_penalty_pct_per_point": 1.0,
        "pf_incentive_threshold": 0.95,
        "pf_incentive_pct_per_point": 0.5,
        "net_metering_export_rate": 2.25,
        "peak_import_rate": 9.0,
    }


def calculate_md_penalty(md_recorded, md_sanctioned,
                         demand_rate, penalty_mult):
    if not md_recorded or not md_sanctioned or md_sanctioned <= 0:
        return {'penalty': 0.0, 'risk_flag': False, 'headroom_kva': 0.0}

    headroom = md_sanctioned - md_recorded
    risk_flag = (md_recorded / md_sanctioned) > 0.92

    if md_recorded <= md_sanctioned:
        return {'penalty': 0.0, 'risk_flag': risk_flag,
                'headroom_kva': round(headroom, 1)}

    excess = md_recorded - md_sanctioned
    penalty = excess * demand_rate * penalty_mult
    return {'penalty': round(penalty, 2), 'risk_flag': True,
            'headroom_kva': round(headroom, 1)}


def calculate_tod_premium(peak_units, offpeak_units,
                          effective_rate, surcharge_pct, discount_pct):
    if not peak_units or not offpeak_units or not effective_rate:
        return {'premium': 0.0, 'peak_pct': 0.0}

    peak_rate = effective_rate * (1 + surcharge_pct / 100)
    offpeak_rate = effective_rate * (1 - discount_pct / 100)

    actual = peak_units * peak_rate + offpeak_units * offpeak_rate
    flat = (peak_units + offpeak_units) * effective_rate
    premium = max(0, actual - flat)

    total = peak_units + offpeak_units
    pct = (peak_units / total * 100) if total > 0 else 0

    return {'premium': round(premium, 2), 'peak_pct': round(pct, 1)}


def calculate_pf_adjustment(pf, energy_charge, threshold,
                            penalty_pct, incentive_threshold,
                            incentive_pct):
    if not pf or not energy_charge:
        return {'adjustment': 0.0, 'risk_score': 'unknown'}

    if pf < threshold:
        points = (threshold - pf) / 0.01
        penalty = -(energy_charge * (penalty_pct / 100) * points)
        risk = 'penalty_active' if pf < 0.87 else 'at_risk'
        return {'adjustment': round(penalty, 2), 'risk_score': risk}

    if pf >= incentive_threshold:
        points = (pf - incentive_threshold) / 0.01
        incentive = energy_charge * (incentive_pct / 100) * points
        return {'adjustment': round(incentive, 2), 'risk_score': 'healthy'}

    return {'adjustment': 0.0, 'risk_score': 'healthy'}


def calculate_dg_avoidable(dg_events: list, fuel_rate: float,
                           fuel_lph: float) -> dict:
    if not dg_events:
        return {'avoidable_hours': 0.0, 'avoidable_cost': 0.0,
                'total_hours': 0.0}

    avoidable = sum(
        e.duration_minutes / 60
        for e in dg_events
        if e.classification == 'avoidable')

    total = sum(e.duration_minutes / 60 for e in dg_events)
    cost = avoidable * fuel_lph * fuel_rate

    return {'avoidable_hours': round(avoidable, 2),
            'avoidable_cost': round(cost, 2),
            'total_hours': round(total, 2)}


def calculate_solar_arbitrage(export_units: float, export_rate: float,
                              peak_import_rate: float,
                              solar_readings: list) -> dict:
    if not export_units or export_units == 0:
        return {'arbitrage_loss': 0.0, 'self_consumption_ratio': None}

    credit = export_units * export_rate
    import_cost = export_units * peak_import_rate
    loss = max(0, import_cost - credit)

    ratio = None
    if solar_readings:
        total_gen = sum(r.generation_kwh for r in solar_readings)
        total_self = sum(r.self_consumed_kwh for r in solar_readings)
        ratio = (total_self / total_gen) if total_gen > 0 else None

    return {'arbitrage_loss': round(loss, 2),
            'self_consumption_ratio': round(ratio, 3) if ratio else None}


def get_peer_benchmark(society, db) -> dict:
    from models import Society, Bill
    import json as _json

    peers = (db.query(Bill)
             .join(Society)
             .filter(
                 Society.building_type == society.building_type,
                 Society.city == society.city,
                 Society.id != society.id,
                 Bill.processing_status == 'complete')
             .all())

    if len(peers) < 3:
        peers = (db.query(Bill)
                 .join(Society)
                 .filter(
                     Society.building_type == society.building_type,
                     Society.state == society.state,
                     Society.id != society.id,
                     Bill.processing_status == 'complete')
                 .all())

    if not peers:
        return {'percentile': 50, 'median': 2.2, 'scope': 'estimate'}

    intensities = []
    for b in peers:
        try:
            ao = _json.loads(b.analytics_output or '{}')
            ei = ao.get('energy_intensity')
            if ei:
                intensities.append(ei)
        except Exception:
            pass

    if not intensities:
        return {'percentile': 50, 'median': 2.2,
                'scope': 'national_estimate'}

    intensities.sort()
    median = intensities[len(intensities) // 2]

    latest = (db.query(Bill)
              .filter(Bill.society_id == society.id,
                      Bill.processing_status == 'complete')
              .order_by(Bill.billing_period_from.desc())
              .first())

    your_intensity = 2.2
    if latest:
        try:
            your_intensity = _json.loads(
                latest.analytics_output or '{}').get(
                'energy_intensity', 2.2)
        except Exception:
            pass

    worse_count = sum(1 for x in intensities if x > your_intensity)
    percentile = int(worse_count / len(intensities) * 100)

    return {'percentile': percentile, 'median': round(median, 2),
            'your_intensity': round(your_intensity, 2),
            'scope': 'city' if len(peers) >= 3 else 'state',
            'sample_count': len(intensities)}


def calculate_composite_score(
    md: dict,
    tod: dict,
    pf: dict,
    dg: dict,
    solar: dict,
    total_bill: float,
) -> float:
    """
    Score 0-100. Higher = better energy management.
    Each component scored 0-100, then weighted.
    
    Weights:
      MD discipline:      25%
      ToD management:     25%
      PF health:          15%
      DG efficiency:      20%
      Solar utilisation:  15%
    
    If a component is not applicable (no DG, no solar),
    its weight is redistributed to the remaining components
    proportionally.
    """
    
    scores = {}
    weights = {}
    
    # MD score: 100 if no penalty, degrades by penalty size
    # as % of total bill
    if total_bill > 0:
        md_pct = (md['penalty'] / total_bill) * 100
        # 0% penalty = 100, 10%+ penalty = 0
        scores['md'] = max(0.0, 100.0 - (md_pct * 10))
    else:
        scores['md'] = 100.0 if md['penalty'] == 0 else 50.0
    weights['md'] = 0.25
    
    # ToD score: based on peak consumption percentage
    # 30% peak or less = 100, 60%+ peak = 0
    peak_pct = tod.get('peak_pct', 0) or 0
    if peak_pct <= 30:
        scores['tod'] = 100.0
    elif peak_pct >= 60:
        scores['tod'] = 0.0
    else:
        scores['tod'] = 100.0 - ((peak_pct - 30) / 30) * 100
    weights['tod'] = 0.25
    
    # PF score
    pf_risk = pf.get('risk_score', 'unknown')
    pf_map = {
        'healthy': 100.0,
        'at_risk': 55.0,
        'penalty_active': 20.0,
        'unknown': 75.0,
    }
    scores['pf'] = pf_map.get(pf_risk, 75.0)
    weights['pf'] = 0.15
    
    # DG score: only if DG data exists
    total_dg_hours = dg.get('total_hours', 0) or 0
    avoidable_dg = dg.get('avoidable_hours', 0) or 0
    
    dg_applicable = total_dg_hours > 0
    if dg_applicable:
        avoidable_ratio = avoidable_dg / total_dg_hours
        # 0% avoidable = 100, 50%+ avoidable = 0
        scores['dg'] = max(0.0, 100.0 - (avoidable_ratio * 200))
        weights['dg'] = 0.20
    else:
        # DG not applicable — skip this component
        scores['dg'] = None
        weights['dg'] = 0.0
    
    # Solar score: only if solar data exists
    scr = solar.get('self_consumption_ratio')
    solar_applicable = scr is not None
    if solar_applicable:
        # 80%+ self-consumption = 100, 0% = 0
        scores['solar'] = min(100.0, (scr / 0.80) * 100)
        weights['solar'] = 0.15
    else:
        scores['solar'] = None
        weights['solar'] = 0.0
    
    # Redistribute weight from inapplicable components
    total_weight = sum(
        w for k, w in weights.items() 
        if scores.get(k) is not None)
    
    if total_weight == 0:
        return 50.0  # fallback
    
    composite = sum(
        scores[k] * (weights[k] / total_weight)
        for k in scores
        if scores[k] is not None
    )
    
    return round(min(100.0, max(0.0, composite)), 1)



def calculate_co2e(kwh_avoided: float, state: str) -> float:
    ef = _EF.get(state.lower().replace(' ', '_'), _EF['default'])
    return round(kwh_avoided * ef, 2)


def generate_calculation_hash(parsed: dict, society_id: str) -> str:
    payload = f"{society_id}:{sorted(parsed.items())}"
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def run_full_analytics(parsed: dict, society, bill_history: list,
                       solar_readings: list, dg_events: list,
                       db) -> dict:
    t0 = time.time()

    tariff = get_tariff(society.discom_code, society.tariff_category)

    effective_rate = (
        (parsed.get('energy_charge') or 0) /
        max(parsed.get('units_consumed_total') or 1, 1))
    if effective_rate <= 0:
        effective_rate = 8.5

    md = calculate_md_penalty(
        parsed.get('md_recorded_kva'),
        society.md_sanctioned_kva,
        tariff['demand_charge_per_kva'],
        tariff['md_penalty_multiplier'])

    tod = calculate_tod_premium(
        parsed.get('units_peak_slot'),
        parsed.get('units_offpeak_slot'),
        effective_rate,
        tariff['tod_peak_surcharge_pct'],
        tariff['tod_offpeak_discount_pct'])

    pf = calculate_pf_adjustment(
        parsed.get('power_factor'),
        parsed.get('energy_charge'),
        tariff['pf_penalty_threshold'],
        tariff['pf_penalty_pct_per_point'],
        tariff['pf_incentive_threshold'],
        tariff['pf_incentive_pct_per_point'])

    dg = calculate_dg_avoidable(
        dg_events,
        society.dg_fuel_rate_per_litre or 92.0,
        society.dg_fuel_consumption_lph or 25.0)

    solar = calculate_solar_arbitrage(
        parsed.get('net_metering_export_units', 0),
        tariff['net_metering_export_rate'],
        tariff['peak_import_rate'],
        solar_readings)

    peer = get_peer_benchmark(society, db)

    total_avoidable = (
        md['penalty'] +
        tod['premium'] +
        max(0, -pf['adjustment']) +
        dg['avoidable_cost'] +
        solar['arbitrage_loss'])

    total_bill = parsed.get('total_bill') or 0
    avoidable_pct = ((total_avoidable / total_bill * 100)
                     if total_bill > 0 else 0)

    units = parsed.get('units_consumed_total') or 0
    num_units = society.num_units or 1
    
    denom = (num_units / 100.0) if society.building_type == 'religious' else num_units
    if denom <= 0: denom = 1
    energy_intensity = units / denom

    labels_map = {
        'residential_society': 'kWh per flat per month',
        'office': 'kWh per employee per month',
        'school': 'kWh per student per month',
        'hospital': 'kWh per bed per month',
        'mall': 'kWh per tenant per month',
        'hotel': 'kWh per room per month',
        'factory': 'kWh per worker per month',
        'religious': 'kWh per 100 footfall per month',
        'government': 'kWh per staff member per month'
    }
    energy_intensity_label = labels_map.get(society.building_type, 'kWh per unit per month')

    kwh_avoided = total_avoidable / max(effective_rate, 1)
    co2e = calculate_co2e(kwh_avoided, society.state)

    score = calculate_composite_score(md, tod, pf, dg, solar, total_bill)

    elapsed = round((time.time() - t0) * 1000, 1)

    return {
        'total_bill': total_bill,
        'billing_period_from': parsed.get('billing_period_from'),
        'billing_period_to': parsed.get('billing_period_to'),
        'billing_days': parsed.get('billing_days', 30),
        'md_penalty': md['penalty'],
        'md_recorded_kva': parsed.get('md_recorded_kva'),
        'md_risk_flag': md['risk_flag'],
        'md_headroom_kva': md['headroom_kva'],
        'tod_premium': tod['premium'],
        'peak_consumption_pct': tod['peak_pct'],
        'pf_recorded': parsed.get('power_factor'),
        'pf_penalty': abs(pf['adjustment']) if pf['adjustment'] < 0 else 0,
        'pf_incentive': pf['adjustment'] if pf['adjustment'] > 0 else 0,
        'pf_risk_score': pf['risk_score'],
        'dg_avoidable_hours': dg['avoidable_hours'],
        'dg_avoidable_cost': dg['avoidable_cost'],
        'dg_total_hours': dg['total_hours'],
        'solar_arbitrage_loss': solar['arbitrage_loss'],
        'solar_self_consumption_ratio': solar['self_consumption_ratio'],
        'total_avoidable': round(total_avoidable, 2),
        'avoidable_pct': round(avoidable_pct, 1),
        'energy_intensity': round(energy_intensity, 2),
        'energy_intensity_label': energy_intensity_label,
        'composite_score': score,
        'peer_percentile': peer['percentile'],
        'peer_median_intensity': peer['median'],
        'peer_scope': peer.get('scope', 'estimate'),
        'co2e_avoided_kg': co2e,
        'emission_factor_source': f"CEA 2023-24, {society.state}",
        'analysis_time_ms': elapsed,
    }
