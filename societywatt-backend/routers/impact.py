"""
routers/impact.py — Public aggregate impact dashboard.
"""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Bill, Society, User
from routers.auth import get_current_user

router = APIRouter(tags=["impact"])


@router.get("/aggregate")
def get_aggregate(
    db: Session = Depends(get_db)
):
    bills = (db.query(Bill)
             .filter(Bill.processing_status == 'complete')
             .all())

    total_co2e = 0
    total_inr_saved = 0
    city_data = {}
    society_ids = set()

    for b in bills:
        try:
            ao = json.loads(b.analytics_output or '{}')
            co2e = ao.get('co2e_avoided_kg', 0)
            saved = ao.get('total_avoidable', 0)
            total_co2e += co2e
            total_inr_saved += saved
            society_ids.add(b.society_id)

            # Get city
            soc = db.query(Society).filter(Society.id == b.society_id).first()
            if soc:
                city = soc.city
                if city not in city_data:
                    city_data[city] = {
                        "city": city,
                        "co2e_kg": 0,
                        "inr_saved": 0,
                        "count": 0,
                        "society_ids": set(),
                    }
                city_data[city]["co2e_kg"] += co2e
                city_data[city]["inr_saved"] += saved
                city_data[city]["society_ids"].add(b.society_id)
        except Exception:
            pass

    # Approximate kWh from CO2e (average EF ~0.82)
    total_kwh = total_co2e / 0.82 if total_co2e > 0 else 0

    # Clean city data
    city_breakdown = []
    for cd in city_data.values():
        city_breakdown.append({
            "city": cd["city"],
            "co2e_kg": round(cd["co2e_kg"], 2),
            "inr_saved": round(cd["inr_saved"], 2),
            "count": len(cd["society_ids"]),
        })
    city_breakdown.sort(key=lambda x: -x["co2e_kg"])

    return {
        "total_kwh_avoided": round(total_kwh, 2),
        "total_co2e_kg": round(total_co2e, 2),
        "total_inr_saved": round(total_inr_saved, 2),
        "societies_count": len(society_ids),
        "city_breakdown": city_breakdown[:10],
    }
