"""
routers/leaderboard.py — Public leaderboard with filters.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import LeaderboardEntry, Society, User
from routers.auth import get_current_user

router = APIRouter(tags=["leaderboard"])


@router.get("")
def get_leaderboard(
    level: str = "national",
    building_type: str = None,
    city: str = None,
    db: Session = Depends(get_db)
):
    from models import LeaderboardEntry, Society
    
    q = (db.query(LeaderboardEntry, Society)
           .join(Society, 
                 LeaderboardEntry.society_id == Society.id)
           .filter(
               LeaderboardEntry.ranking_level == level,
               Society.leaderboard_opt_in == True,
           ))
    
    if building_type and building_type != 'all':
        q = q.filter(
            Society.building_type == building_type)
    
    if city and level == 'city':
        q = q.filter(
            LeaderboardEntry.scope_value == city)
    
    results = (q.order_by(
        LeaderboardEntry.rank_position.asc())
        .all())
    
    entries = []
    for entry, soc in results:
        entries.append({
            "id": entry.id,
            "society_id": entry.society_id,
            "society_name": soc.display_name or soc.name,
            "city": soc.city,
            "state": soc.state,
            "building_type": soc.building_type,
            "rank_position": entry.rank_position,
            "total_in_category": entry.total_in_category,
            "composite_score": entry.composite_score,
            "verification_tier": entry.verification_tier,
            "energy_intensity": entry.energy_intensity,
            "improvement_pct": entry.improvement_pct,
            "co2e_avoided_kg": entry.co2e_avoided_kg,
            "ranking_level": entry.ranking_level,
            "scope_value": entry.scope_value,
        })
    
    return {
        "entries": entries,
        "total": len(entries),
        "level": level,
        "scope": city or level,
    }


@router.get("/society/{society_id}")
def get_society_ranking(society_id: str,
                        db: Session = Depends(get_db)):
    society = db.query(Society).filter(Society.id == society_id).first()
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")

    if not society.leaderboard_opt_in:
        raise HTTPException(status_code=404, detail="Society data is private")

    national = (db.query(LeaderboardEntry)
                .filter(LeaderboardEntry.society_id == society_id,
                        LeaderboardEntry.ranking_level == "national")
                .first())
    city = (db.query(LeaderboardEntry)
            .filter(LeaderboardEntry.society_id == society_id,
                    LeaderboardEntry.ranking_level == "city")
            .first())
    state = (db.query(LeaderboardEntry)
             .filter(LeaderboardEntry.society_id == society_id,
                     LeaderboardEntry.ranking_level == "state")
             .first())

    def format_entry(entry):
        if not entry:
            return None
        return {
            "id": entry.id,
            "society_id": entry.society_id,
            "rank_position": entry.rank_position,
            "total_in_category": entry.total_in_category,
            "composite_score": entry.composite_score,
            "verification_tier": entry.verification_tier,
            "energy_intensity": entry.energy_intensity,
            "improvement_pct": entry.improvement_pct,
            "co2e_avoided_kg": entry.co2e_avoided_kg,
            "ranking_level": entry.ranking_level,
            "scope_value": entry.scope_value,
        }

    return {
        "society": {
            "id": society.id,
            "name": society.name,
            "display_name": society.display_name or society.name,
            "city": society.city,
            "state": society.state,
            "building_type": society.building_type,
        },
        "national": format_entry(national),
        "city": format_entry(city),
        "state": format_entry(state),
    }
