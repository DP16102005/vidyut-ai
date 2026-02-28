"""
seed.py — Idempotent seed script for Vidyut AI demo data.
Creates 8 societies, 1 demo user, 12 months of bills per society,
DG events, solar readings, and leaderboard entries.
"""
import json
import uuid
import hashlib
import numpy as np
from datetime import datetime, date, timedelta
from passlib.context import CryptContext
from models import (
    Society, User, Bill, DGEvent, SolarReading, LeaderboardEntry
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fixed UUIDs
S1 = "a1b2c3d4-0001-0001-0001-000000000001"
S2 = "a1b2c3d4-0001-0001-0001-000000000002"
S3 = "a1b2c3d4-0001-0001-0001-000000000003"
S4 = "a1b2c3d4-0001-0001-0001-000000000004"
S5 = "a1b2c3d4-0001-0001-0001-000000000005"
S6 = "a1b2c3d4-0001-0001-0001-000000000006"
S7 = "a1b2c3d4-0001-0001-0001-000000000007"
S8 = "a1b2c3d4-0001-0001-0001-000000000008"
DEMO_USER_ID = "a1b2c3d4-0002-0002-0002-000000000001"

SOCIETIES = [
    {
        "id": S1, "name": "Vasant Gardens CHS", "display_name": "Vasant Gardens",
        "city": "Mumbai", "state": "maharashtra", "pincode": "400053",
        "discom_code": "MSEDCL", "tariff_category": "LT-I Residential",
        "num_units": 186, "total_area_sqm": 12400,
        "building_type": "residential_society", "climate_zone": "warm_humid",
        "solar_installed": True, "solar_capacity_kwp": 40.0,
        "dg_installed": True, "dg_capacity_kva": 150.0,
        "dg_fuel_rate_per_litre": 92.50, "dg_fuel_consumption_lph": 28.0,
        "md_sanctioned_kva": 120.0, "tier_subscribed": "optimize",
        "leaderboard_opt_in": True,
    },
    {
        "id": S2, "name": "TechPark Innovators", "display_name": "TechPark Innovators",
        "city": "Bengaluru", "state": "karnataka", "pincode": "560034",
        "discom_code": "BESCOM", "tariff_category": "HT-2 Commercial",
        "num_units": 850, "total_area_sqm": 18600,
        "building_type": "office", "climate_zone": "composite",
        "solar_installed": False, "solar_capacity_kwp": None,
        "dg_installed": True, "dg_capacity_kva": 200.0,
        "dg_fuel_rate_per_litre": 91.80, "dg_fuel_consumption_lph": 35.0,
        "md_sanctioned_kva": 180.0, "tier_subscribed": "optimize",
        "leaderboard_opt_in": True,
    },
    {
        "id": S3, "name": "DPS Sector 45", "display_name": "DPS Sector 45",
        "city": "Gurugram", "state": "haryana", "pincode": "122002",
        "discom_code": "DHBVN", "tariff_category": "HT-Educational",
        "num_units": 1200, "total_area_sqm": 24000,
        "building_type": "school", "climate_zone": "composite",
        "solar_installed": True, "solar_capacity_kwp": 80.0,
        "dg_installed": True, "dg_capacity_kva": 500.0,
        "dg_fuel_rate_per_litre": 93.20, "dg_fuel_consumption_lph": 82.0,
        "md_sanctioned_kva": 400.0, "tier_subscribed": "certify",
        "leaderboard_opt_in": True,
    },
    {
        "id": S4, "name": "City Care Hospital", "display_name": "City Care Hospital",
        "city": "Mumbai", "state": "maharashtra", "pincode": "400028",
        "discom_code": "MSEDCL", "tariff_category": "LT-Public Services",
        "num_units": 350, "total_area_sqm": 6200,
        "building_type": "hospital", "climate_zone": "warm_humid",
        "solar_installed": False, "solar_capacity_kwp": None,
        "dg_installed": True, "dg_capacity_kva": 62.5,
        "dg_fuel_rate_per_litre": 92.50, "dg_fuel_consumption_lph": 14.0,
        "md_sanctioned_kva": 60.0, "tier_subscribed": "insight",
        "leaderboard_opt_in": True,
    },
    {
        "id": S5, "name": "Koramangala Forum Mall", "display_name": "Koramangala Mall",
        "city": "Bengaluru", "state": "karnataka", "pincode": "560047",
        "discom_code": "BESCOM", "tariff_category": "HT Commercial",
        "num_units": 120, "total_area_sqm": 10800,
        "building_type": "mall", "climate_zone": "composite",
        "solar_installed": True, "solar_capacity_kwp": 25.0,
        "dg_installed": True, "dg_capacity_kva": 125.0,
        "dg_fuel_rate_per_litre": 91.80, "dg_fuel_consumption_lph": 22.0,
        "md_sanctioned_kva": 100.0, "tier_subscribed": "optimize",
        "leaderboard_opt_in": True,
    },
    {
        "id": S6, "name": "Taj Bengal Hotel", "display_name": "Taj Bengal Hotel",
        "city": "Kolkata", "state": "west_bengal", "pincode": "700064",
        "discom_code": "CESC", "tariff_category": "General Purpose",
        "num_units": 200, "total_area_sqm": 7400,
        "building_type": "hotel", "climate_zone": "warm_humid",
        "solar_installed": False, "solar_capacity_kwp": None,
        "dg_installed": True, "dg_capacity_kva": 100.0,
        "dg_fuel_rate_per_litre": 91.20, "dg_fuel_consumption_lph": 19.0,
        "md_sanctioned_kva": 80.0, "tier_subscribed": "insight",
        "leaderboard_opt_in": False,
    },
    {
        "id": S7, "name": "Madhapur Manufacturing Works", "display_name": "Madhapur Mfg",
        "city": "Hyderabad", "state": "telangana", "pincode": "500081",
        "discom_code": "TSSPDCL", "tariff_category": "HT-Industrial",
        "num_units": 50, "total_area_sqm": 12600,
        "building_type": "factory", "climate_zone": "hot_dry",
        "solar_installed": True, "solar_capacity_kwp": 35.0,
        "dg_installed": True, "dg_capacity_kva": 150.0,
        "dg_fuel_rate_per_litre": 92.80, "dg_fuel_consumption_lph": 28.0,
        "md_sanctioned_kva": 120.0, "tier_subscribed": "optimize",
        "leaderboard_opt_in": True,
    },
    {
        "id": S8, "name": "Sri Parthasarathy Temple", "display_name": "Parthasarathy Temple",
        "city": "Chennai", "state": "tamil_nadu", "pincode": "600040",
        "discom_code": "TANGEDCO", "tariff_category": "LT-Religious",
        "num_units": 1000, "total_area_sqm": 8400,
        "building_type": "religious", "climate_zone": "warm_humid",
        "solar_installed": False, "solar_capacity_kwp": None,
        "dg_installed": True, "dg_capacity_kva": 100.0,
        "dg_fuel_rate_per_litre": 91.60, "dg_fuel_consumption_lph": 19.0,
        "md_sanctioned_kva": 80.0, "tier_subscribed": "insight",
        "leaderboard_opt_in": True,
    },
]

# Seasonal multipliers by city (Jan=0 .. Dec=11)
SEASONAL = {
    "Mumbai":    [0.78, 0.82, 0.92, 1.08, 1.22, 1.18, 1.02, 0.98, 0.96, 0.92, 0.86, 0.76],
    "Bengaluru": [0.82, 0.88, 1.08, 1.12, 1.04, 0.95, 0.90, 0.88, 0.92, 0.96, 0.90, 0.84],
    "Gurugram":  [1.06, 0.94, 0.88, 1.02, 1.22, 1.28, 1.10, 1.06, 0.98, 0.88, 0.86, 1.04],
    "Kolkata":   [0.80, 0.84, 0.94, 1.06, 1.18, 1.14, 1.06, 1.02, 1.00, 0.94, 0.86, 0.78],
    "Hyderabad": [0.84, 0.90, 1.02, 1.18, 1.20, 1.08, 0.96, 0.94, 0.94, 0.96, 0.88, 0.82],
    "Chennai":   [0.80, 0.84, 0.94, 1.08, 1.20, 1.16, 1.04, 1.00, 0.98, 1.10, 1.12, 0.86],
}

# Base bill amounts per society
BASE_BILLS = {
    S1: 184000, S2: 240000, S3: 420000, S4: 82000,
    S5: 148000, S6: 96000,  S7: 172000, S8: 104000,
}

# DG avoidable percentages
DG_AVOID_PCT = {
    S1: 0.22, S2: 0.34, S3: 0.12, S4: 0.47,
    S5: 0.28, S7: 0.19, S8: 0.38,
}

EMISSION_FACTORS = {
    "maharashtra": 0.82, "karnataka": 0.78, "haryana": 0.91,
    "telangana": 0.91, "tamil_nadu": 0.71, "west_bengal": 0.94,
}


def _make_hash(society_id, month):
    payload = f"{society_id}:{month}"
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def _generate_bill_analytics(soc, month_idx, base_bill, rng):
    """Generate realistic analytics_output for a given month."""
    city = soc["city"]
    seasonal = SEASONAL.get(city, SEASONAL["Mumbai"])
    mult = seasonal[month_idx]

    total_bill = round(base_bill * mult + rng.normal(0, base_bill * 0.04), 0)
    total_units = round(total_bill / 8.5, 0)
    energy_intensity = round(total_units / soc["num_units"], 2)

    md_sanctioned = soc["md_sanctioned_kva"] or 100
    md_recorded = round(md_sanctioned * (0.82 + rng.uniform(-0.12, 0.22)), 1)
    md_penalty = 0.0
    md_risk_flag = (md_recorded / md_sanctioned) > 0.92
    if md_recorded > md_sanctioned:
        excess = md_recorded - md_sanctioned
        md_penalty = round(excess * 250 * 1.5, 2)

    pf_recorded = round(float(np.clip(rng.normal(0.91, 0.025), 0.82, 0.98)), 2)
    pf_penalty = 0.0
    pf_incentive = 0.0
    if pf_recorded < 0.90:
        pts = (0.90 - pf_recorded) / 0.01
        pf_penalty = round(total_bill * 0.72 * 0.01 * pts, 2)
    elif pf_recorded >= 0.95:
        pts = (pf_recorded - 0.95) / 0.01
        pf_incentive = round(total_bill * 0.72 * 0.005 * pts, 2)

    peak_pct = round(float(np.clip(rng.normal(0.35, 0.05), 0.18, 0.55)), 2)
    peak_units = round(total_units * peak_pct)
    offpeak_units = round(total_units * (1 - peak_pct))
    effective_rate = 8.5
    tod_premium = round(peak_units * effective_rate * 0.20 +
                        offpeak_units * effective_rate * (-0.10) -
                        (peak_units + offpeak_units) * effective_rate * 0, 2)
    if tod_premium < 0:
        tod_premium = 0

    # DG
    sid = soc["id"]
    avoid_pct = DG_AVOID_PCT.get(sid, 0.25)
    dg_total_hours = round(float(rng.uniform(8, 28)), 1)
    dg_avoidable_hours = round(dg_total_hours * avoid_pct, 1)
    fuel_rate = soc.get("dg_fuel_rate_per_litre") or 92.0
    fuel_lph = soc.get("dg_fuel_consumption_lph") or 25.0
    dg_avoidable_cost = round(dg_avoidable_hours * fuel_lph * fuel_rate, 2)

    # Solar
    solar_arbitrage_loss = 0.0
    solar_self_consumption = None
    if soc["solar_installed"]:
        solar_self_consumption = round(float(rng.uniform(0.52, 0.74)), 3)
        cap = soc["solar_capacity_kwp"] or 25
        daily_gen = cap * rng.uniform(3.5, 5.0)
        export_units = round(daily_gen * 30 * (1 - solar_self_consumption), 1)
        solar_arbitrage_loss = round(export_units * (9.50 - 2.25), 2)

    total_avoidable = round(md_penalty + tod_premium + pf_penalty +
                            dg_avoidable_cost + solar_arbitrage_loss, 2)
    avoidable_pct = round(total_avoidable / max(total_bill, 1) * 100, 1)

    ef = EMISSION_FACTORS.get(soc["state"], 0.82)
    kwh_avoided = total_avoidable / max(effective_rate, 1)
    co2e = round(kwh_avoided * ef, 2)

    # Composite score
    md_score = 100 if md_penalty == 0 else max(0, 100 - md_penalty / 1000 * 8)
    tod_score = max(0, 100 - peak_pct * 100 * 0.8)
    pf_map = {"healthy": 100, "at_risk": 65, "penalty_active": 30}
    pf_risk = "healthy" if pf_recorded >= 0.95 else ("at_risk" if pf_recorded >= 0.88 else "penalty_active")
    pf_score = pf_map.get(pf_risk, 75)
    dg_ratio = dg_avoidable_hours / max(dg_total_hours, 1)
    dg_score = max(0, 100 - dg_ratio * 100)
    solar_score = (solar_self_consumption * 100) if solar_self_consumption else 75
    composite = round(md_score * 0.25 + tod_score * 0.25 + pf_score * 0.15 +
                      dg_score * 0.20 + solar_score * 0.15, 1)
    # Clamp to realistic range
    composite = round(float(np.clip(composite, 42, 81)), 1)

    peer_percentile = int(np.clip(rng.normal(50, 14), 28, 74))

    dt_from = date(2024, month_idx + 1, 1)
    if month_idx == 11:
        dt_to = date(2024, 12, 31)
    else:
        dt_to = date(2024, month_idx + 2, 1) - timedelta(days=1)
    billing_days = (dt_to - dt_from).days + 1

    return {
        "total_bill": total_bill,
        "billing_period_from": dt_from.isoformat(),
        "billing_period_to": dt_to.isoformat(),
        "billing_days": billing_days,
        "md_penalty": md_penalty,
        "md_recorded_kva": md_recorded,
        "md_risk_flag": md_risk_flag,
        "md_headroom_kva": round(md_sanctioned - md_recorded, 1),
        "tod_premium": tod_premium,
        "peak_consumption_pct": round(peak_pct * 100, 1),
        "pf_recorded": pf_recorded,
        "pf_penalty": pf_penalty,
        "pf_incentive": pf_incentive,
        "pf_risk_score": pf_risk,
        "dg_avoidable_hours": dg_avoidable_hours,
        "dg_avoidable_cost": dg_avoidable_cost,
        "dg_total_hours": dg_total_hours,
        "solar_arbitrage_loss": solar_arbitrage_loss,
        "solar_self_consumption_ratio": solar_self_consumption,
        "total_avoidable": total_avoidable,
        "avoidable_pct": avoidable_pct,
        "energy_intensity": energy_intensity,
        "composite_score": composite,
        "peer_percentile": peer_percentile,
        "peer_median_intensity": round(energy_intensity * rng.uniform(0.85, 1.15), 2),
        "peer_scope": "city",
        "co2e_avoided_kg": co2e,
        "emission_factor_source": f"CEA 2023-24, {soc['state']}",
        "analysis_time_ms": round(rng.uniform(120, 380), 1),
    }


def run_seed(db):
    """Insert all seed data. Idempotent — check before inserting."""
    if db.query(Society).count() > 0:
        print("Seed: societies already exist, skipping.")
        return

    rng = np.random.default_rng(42)

    # 1. Societies
    for s in SOCIETIES:
        soc = Society(**s)
        db.add(soc)
    db.flush()

    # 2. Demo user
    demo_user = User(
        id=DEMO_USER_ID,
        society_id=S1,
        email="demo@vidyutai.in",
        phone="+919876543210",
        name="Ramesh Sharma",
        role="secretary",
        password_hash=pwd_context.hash("Demo@2024"),
    )
    db.add(demo_user)
    db.flush()

    # 3. Bills — 12 months per society
    for soc_data in SOCIETIES:
        sid = soc_data["id"]
        base = BASE_BILLS[sid]
        for month_idx in range(12):
            analytics = _generate_bill_analytics(soc_data, month_idx, base, rng)
            dt_from = date(2024, month_idx + 1, 1)
            if month_idx == 11:
                dt_to = date(2024, 12, 31)
            else:
                dt_to = date(2024, month_idx + 2, 1) - timedelta(days=1)

            bill = Bill(
                id=str(uuid.uuid4()),
                society_id=sid,
                billing_period_from=dt_from,
                billing_period_to=dt_to,
                billing_days=analytics["billing_days"],
                parsed_data=json.dumps({"seed": True, "total_bill": analytics["total_bill"]}),
                analytics_output=json.dumps(analytics),
                llm_explanation=f"Your {dt_from.strftime('%B %Y')} bill for {soc_data['display_name']} is ₹{int(analytics['total_bill']):,}. "
                                f"Total avoidable waste: ₹{int(analytics['total_avoidable']):,} ({analytics['avoidable_pct']}% of bill). "
                                f"Top actions: 1) {'Reduce MD to avoid ₹' + str(int(analytics['md_penalty'])) + ' penalty.' if analytics['md_penalty'] > 0 else 'Maintain demand discipline.'} "
                                f"2) {'Improve power factor above 0.90 to eliminate ₹' + str(int(analytics['pf_penalty'])) + ' penalty.' if analytics['pf_penalty'] > 0 else 'Power factor is healthy.'} "
                                f"3) {'Reduce avoidable DG runtime (' + str(analytics['dg_avoidable_hours']) + 'h) to save ₹' + str(int(analytics['dg_avoidable_cost'])) + '.' if analytics['dg_avoidable_cost'] > 0 else 'Optimise peak-hour usage.'}",
                anomaly_flags='[]',
                processing_status='complete',
                extraction_method='pdf_regex',
                extraction_confidence=0.92,
                calculation_hash=_make_hash(sid, month_idx),
                uploaded_by_user_id=DEMO_USER_ID if sid == S1 else None,
            )
            db.add(bill)
    db.flush()

    # 4. DG Events — last 3 months (Oct, Nov, Dec 2024) for societies with DG
    dg_societies = [S1, S2, S3, S4, S5, S7, S8]
    for sid in dg_societies:
        soc_data = next(s for s in SOCIETIES if s["id"] == sid)
        avoid_pct = DG_AVOID_PCT.get(sid, 0.25)
        fuel_rate = soc_data.get("dg_fuel_rate_per_litre") or 92.0
        fuel_lph = soc_data.get("dg_fuel_consumption_lph") or 25.0

        for month_offset in range(3):
            base_month = 10 + month_offset  # Oct, Nov, Dec
            num_events = int(rng.integers(4, 10))
            for _ in range(num_events):
                day = int(rng.integers(1, 28))
                start_hour = int(rng.integers(6, 22))
                duration = int(rng.integers(20, 180))
                dt_start = datetime(2024, base_month, day, start_hour, int(rng.integers(0, 59)))
                dt_end = dt_start + timedelta(minutes=duration)

                is_avoidable = rng.random() < avoid_pct
                classification = "avoidable" if is_avoidable else "necessary"
                cost = round(duration / 60 * fuel_lph * fuel_rate, 2) if is_avoidable else 0

                dg = DGEvent(
                    id=str(uuid.uuid4()),
                    society_id=sid,
                    event_start=dt_start,
                    event_end=dt_end,
                    duration_minutes=duration,
                    classification=classification,
                    avoidable_cost_inr=cost,
                    source="manual"
                )
                db.add(dg)
    db.flush()

    # 5. Solar Readings — 30 days for solar societies
    solar_societies = [S1, S3, S5, S7]
    for sid in solar_societies:
        soc_data = next(s for s in SOCIETIES if s["id"] == sid)
        cap = soc_data["solar_capacity_kwp"] or 25
        for day_offset in range(30):
            dt = date(2024, 12, 1) + timedelta(days=day_offset)
            daily_gen = round(cap * float(rng.uniform(3.2, 5.2)), 2)
            self_ratio = float(rng.uniform(0.52, 0.74))
            self_consumed = round(daily_gen * self_ratio, 2)
            exported = round(daily_gen - self_consumed, 2)
            sr = SolarReading(
                id=str(uuid.uuid4()),
                society_id=sid,
                reading_date=dt,
                generation_kwh=daily_gen,
                self_consumed_kwh=self_consumed,
                exported_kwh=exported,
            )
            db.add(sr)
    db.flush()

    # 6. Leaderboard Entries — only opt-in societies (not S6)
    leaderboard_data = {
        "national": [
            (S3, 1, 78.4, "gold",   1.52, 8.2,  420),
            (S1, 2, 74.1, "silver", 1.78, 5.4,  310),
            (S5, 3, 71.8, "silver", 1.86, 4.1,  280),
            (S2, 4, 68.3, "silver", 2.12, 2.8,  220),
            (S7, 5, 66.2, "silver", 2.24, 1.6,  190),
            (S4, 6, 52.7, "bronze", 2.84, -3.2, 80),
            (S8, 7, 49.3, "bronze", 3.02, -5.1, 60),
        ],
    }
    total_national = 7

    for sid, rank, score, tier, intensity, improvement, co2e in leaderboard_data["national"]:
        soc_data = next(s for s in SOCIETIES if s["id"] == sid)
        entry = LeaderboardEntry(
            id=str(uuid.uuid4()),
            society_id=sid,
            ranking_level="national",
            scope_value="India",
            building_type=soc_data["building_type"],
            rank_position=rank,
            total_in_category=total_national,
            composite_score=score,
            verification_tier=tier,
            energy_intensity=intensity,
            improvement_pct=improvement,
            co2e_avoided_kg=co2e,
        )
        db.add(entry)

    # City-level leaderboards
    city_groups = {}
    for sid, rank, score, tier, intensity, improvement, co2e in leaderboard_data["national"]:
        soc_data = next(s for s in SOCIETIES if s["id"] == sid)
        city = soc_data["city"]
        if city not in city_groups:
            city_groups[city] = []
        city_groups[city].append((sid, score, tier, intensity, improvement, co2e, soc_data["building_type"]))

    for city, entries in city_groups.items():
        entries.sort(key=lambda x: -x[1])
        for rank, (sid, score, tier, intensity, improvement, co2e, btype) in enumerate(entries, 1):
            entry = LeaderboardEntry(
                id=str(uuid.uuid4()),
                society_id=sid,
                ranking_level="city",
                scope_value=city,
                building_type=btype,
                rank_position=rank,
                total_in_category=len(entries),
                composite_score=score,
                verification_tier=tier,
                energy_intensity=intensity,
                improvement_pct=improvement,
                co2e_avoided_kg=co2e,
            )
            db.add(entry)

    # State-level leaderboards
    state_groups = {}
    for sid, rank, score, tier, intensity, improvement, co2e in leaderboard_data["national"]:
        soc_data = next(s for s in SOCIETIES if s["id"] == sid)
        state = soc_data["state"]
        if state not in state_groups:
            state_groups[state] = []
        state_groups[state].append((sid, score, tier, intensity, improvement, co2e, soc_data["building_type"]))

    for state, entries in state_groups.items():
        entries.sort(key=lambda x: -x[1])
        for rank, (sid, score, tier, intensity, improvement, co2e, btype) in enumerate(entries, 1):
            entry = LeaderboardEntry(
                id=str(uuid.uuid4()),
                society_id=sid,
                ranking_level="state",
                scope_value=state,
                building_type=btype,
                rank_position=rank,
                total_in_category=len(entries),
                composite_score=score,
                verification_tier=tier,
                energy_intensity=intensity,
                improvement_pct=improvement,
                co2e_avoided_kg=co2e,
            )
            db.add(entry)

    db.commit()
    print(f"Seeded {len(SOCIETIES)} societies, 1 demo user, "
          f"{len(SOCIETIES) * 12} bills, DG events, solar readings, "
          f"leaderboard entries.")
