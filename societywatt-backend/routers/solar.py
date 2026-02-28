from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Society, SolarReading, Bill, User
from routers.auth import get_current_user
import json
from datetime import date, timedelta

router = APIRouter()

@router.get("/{society_id}/summary")
def get_solar_summary(
    society_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    society = db.query(Society).filter_by(
        id=society_id).first()
    if not society:
        raise HTTPException(404, "Society not found")
    
    if not society.solar_installed:
        return {
            "solar_installed": False,
            "message": (
                "Solar monitoring not enabled. "
                "Enable in Settings after installing "
                "rooftop PV and connecting your "
                "inverter portal."),
        }
    
    # Load last 30 days of solar readings
    thirty_days_ago = date.today() - timedelta(days=30)
    readings = (
        db.query(SolarReading)
        .filter(
            SolarReading.society_id == society_id,
            SolarReading.reading_date >= thirty_days_ago,
        )
        .order_by(SolarReading.reading_date.asc())
        .all()
    )
    
    # Build chart data regardless of reading count
    chart_data = [
        {
            "date": str(r.reading_date),
            "generation":    round(r.generation_kwh, 2),
            "self_consumed": round(r.self_consumed_kwh, 2),
            "exported":      round(r.exported_kwh, 2),
        }
        for r in readings
    ]
    
    # If no readings: return structure with zeros + message
    if not readings:
        return {
            "solar_installed":   True,
            "data_available":    False,
            "message": (
                "No solar readings in the last 30 days. "
                "Connect your inverter portal in Settings "
                "to enable automatic data collection."),
            "self_consumption_ratio":       0,
            "total_generation_kwh":         0,
            "self_consumed_kwh":            0,
            "exported_kwh":                 0,
            "arbitrage_loss_inr":           0,
            "optimal_window_start":         "10:00",
            "optimal_window_end":           "14:00",
            "shifting_savings_estimate_inr": 0,
            "chart_data":                   [],
            "performance_vs_capacity_pct":  None,
        }
    
    # Aggregate totals
    total_gen   = sum(r.generation_kwh   for r in readings)
    total_self  = sum(r.self_consumed_kwh for r in readings)
    total_export = sum(r.exported_kwh    for r in readings)
    
    # Self-consumption ratio (avoid div/0)
    scr = (total_self / total_gen) if total_gen > 0 else 0
    
    # Arbitrage loss from latest bill
    # (exported at low net-metering rate vs
    #  peak import rate)
    arbitrage_loss = 0.0
    shifting_savings = 0.0
    
    latest_bill = (
        db.query(Bill)
        .filter_by(society_id=society_id,
                   processing_status='complete')
        .order_by(Bill.billing_period_from.desc())
        .first()
    )
    
    if latest_bill:
        try:
            ao = json.loads(
                latest_bill.analytics_output or '{}')
            arbitrage_loss = float(
                ao.get('solar_arbitrage_loss', 0) or 0)
            shifting_savings = round(
                arbitrage_loss * 0.65, 0)
        except:
            pass
    
    # Optimal window: find hour block with most generation
    # Using simple heuristic based on available data
    # Real implementation would use 15-min interval data
    # For daily data: peak is typically 10am-2pm
    # But we compute from the readings available
    
    # Since we only have daily totals (not hourly),
    # use solar capacity and climate zone to estimate:
    climate = society.climate_zone or 'warm_humid'
    optimal_windows = {
        'hot_dry':    ('09:30', '13:30'),
        'warm_humid': ('10:00', '14:00'),
        'composite':  ('10:00', '14:00'),
        'temperate':  ('10:30', '14:30'),
        'cold':       ('11:00', '15:00'),
    }
    opt_start, opt_end = optimal_windows.get(
        climate, ('10:00', '14:00'))
    
    # Performance vs expected
    # Expected: capacity_kwp × 4.5 peak-sun-hours × 30 days
    perf_pct = None
    if society.solar_capacity_kwp:
        expected = society.solar_capacity_kwp * 4.5 * 30
        if expected > 0:
            perf_pct = round(
                (total_gen / expected) * 100, 1)
    
    return {
        "solar_installed":   True,
        "data_available":    True,
        "self_consumption_ratio":        round(scr, 3),
        "total_generation_kwh":          round(total_gen, 2),
        "self_consumed_kwh":             round(total_self, 2),
        "exported_kwh":                  round(total_export, 2),
        "arbitrage_loss_inr":            arbitrage_loss,
        "optimal_window_start":          opt_start,
        "optimal_window_end":            opt_end,
        "shifting_savings_estimate_inr": shifting_savings,
        "chart_data":                    chart_data,
        "performance_vs_capacity_pct":   perf_pct,
        "capacity_kwp":    society.solar_capacity_kwp,
        "reading_days":    len(readings),
    }
