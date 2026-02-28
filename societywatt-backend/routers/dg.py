"""
routers/dg.py — DG avoidable hours calculator, operator letter, history.
"""
import uuid
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, extract
from pydantic import BaseModel
from typing import List, Optional

from database import get_db
from models import DGEvent, Society, User
from routers.auth import get_current_user
from services import llm_service

router = APIRouter(tags=["dg"])


class TimeEvent(BaseModel):
    date: str
    start_time: str
    end_time: str


class DGCalcRequest(BaseModel):
    society_id: str
    dg_events: List[TimeEvent]
    outage_events: List[TimeEvent]
    diesel_rate: float
    fuel_lph: float


class OperatorLetterRequest(BaseModel):
    society_id: str
    language: str = 'en'
    operator_name: str
    avoidable_hours: float
    avoidable_cost: float


@router.post("/calculate")
def calculate_dg(req: DGCalcRequest,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    society = db.query(Society).filter(Society.id == req.society_id).first()
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")

    classified_events = []
    total_minutes = 0
    necessary_minutes = 0
    avoidable_minutes = 0

    for dg_ev in req.dg_events:
        dg_start = datetime.strptime(f"{dg_ev.date} {dg_ev.start_time}", "%Y-%m-%d %H:%M")
        dg_end = datetime.strptime(f"{dg_ev.date} {dg_ev.end_time}", "%Y-%m-%d %H:%M")
        if dg_end <= dg_start:
            dg_end += timedelta(days=1)

        duration = int((dg_end - dg_start).total_seconds() / 60)
        total_minutes += duration

        # Find overlapping outage
        overlap_found = False
        for outage in req.outage_events:
            out_start = datetime.strptime(f"{outage.date} {outage.start_time}", "%Y-%m-%d %H:%M")
            out_end = datetime.strptime(f"{outage.date} {outage.end_time}", "%Y-%m-%d %H:%M")
            if out_end <= out_start:
                out_end += timedelta(days=1)

            # Check overlap
            if out_start <= dg_start <= out_end or dg_start <= out_start <= dg_end:
                overlap_found = True
                overlap_start = max(dg_start, out_start)
                overlap_end = min(dg_end, out_end)
                nec_mins = max(0, int((overlap_end - overlap_start).total_seconds() / 60))
                avoid_mins = duration - nec_mins

                necessary_minutes += nec_mins
                avoidable_minutes += max(0, avoid_mins)

                classification = "necessary" if avoid_mins <= 0 else "avoidable"
                cost = round(max(0, avoid_mins) / 60 * req.fuel_lph * req.diesel_rate, 2)

                classified_events.append({
                    "date": dg_ev.date,
                    "start_time": dg_ev.start_time,
                    "end_time": dg_ev.end_time,
                    "duration_minutes": duration,
                    "classification": classification,
                    "avoidable_cost_inr": cost,
                })

                # Save to DB
                dg_record = DGEvent(
                    id=str(uuid.uuid4()),
                    society_id=req.society_id,
                    event_start=dg_start,
                    event_end=dg_end,
                    duration_minutes=duration,
                    classification=classification,
                    avoidable_cost_inr=cost,
                    source='manual',
                )
                db.add(dg_record)
                break

        if not overlap_found:
            avoidable_minutes += duration
            cost = round(duration / 60 * req.fuel_lph * req.diesel_rate, 2)
            classified_events.append({
                "date": dg_ev.date,
                "start_time": dg_ev.start_time,
                "end_time": dg_ev.end_time,
                "duration_minutes": duration,
                "classification": "avoidable",
                "avoidable_cost_inr": cost,
            })
            dg_record = DGEvent(
                id=str(uuid.uuid4()),
                society_id=req.society_id,
                event_start=dg_start,
                event_end=dg_end,
                duration_minutes=duration,
                classification='avoidable',
                avoidable_cost_inr=cost,
                source='manual',
            )
            db.add(dg_record)

    db.commit()

    total_hours = round(total_minutes / 60, 2)
    nec_hours = round(necessary_minutes / 60, 2)
    avoid_hours = round(avoidable_minutes / 60, 2)
    avoid_cost = round(avoid_hours * req.fuel_lph * req.diesel_rate, 2)
    avoid_pct = round(avoid_hours / max(total_hours, 0.01) * 100, 1)

    summary = {
        "total_hours": total_hours,
        "necessary_hours": nec_hours,
        "avoidable_hours": avoid_hours,
        "avoidable_cost": avoid_cost,
        "avoidable_pct": avoid_pct,
    }

    # LLM explanation
    explanation = ""
    try:
        explanation = llm_service.generate_bill_explanation(
            {
                "total_bill": 0,
                "dg_avoidable_hours": avoid_hours,
                "dg_avoidable_cost": avoid_cost,
                "dg_total_hours": total_hours,
                "total_avoidable": avoid_cost,
                "avoidable_pct": avoid_pct,
            },
            society.name, society.city,
            society.preferred_language or 'en'
        )
    except Exception:
        explanation = f"DG ran for {total_hours:.1f} hours total. {avoid_hours:.1f} hours ({avoid_pct:.0f}%) were avoidable, costing ₹{avoid_cost:,.0f}."

    return {
        "events": classified_events,
        "summary": summary,
        "llm_explanation": explanation,
    }


@router.post("/operator-letter")
def operator_letter(req: OperatorLetterRequest,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    society = db.query(Society).filter(Society.id == req.society_id).first()
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")

    letter = llm_service.generate_operator_letter(
        society.name, req.avoidable_hours, req.avoidable_cost,
        req.operator_name, req.language)

    return {"letter_text": letter}


@router.get("/history/{society_id}")
def dg_history(society_id: str,
               user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    three_months_ago = datetime.utcnow() - timedelta(days=90)
    events = (db.query(DGEvent)
              .filter(DGEvent.society_id == society_id,
                      DGEvent.event_start >= three_months_ago)
              .order_by(DGEvent.event_start)
              .all())

    # Group by month
    months = {}
    for e in events:
        month_key = e.event_start.strftime("%Y-%m")
        if month_key not in months:
            months[month_key] = {
                "month": month_key,
                "total_hours": 0,
                "avoidable_hours": 0,
                "avoidable_cost": 0,
            }
        months[month_key]["total_hours"] += e.duration_minutes / 60
        if e.classification == 'avoidable':
            months[month_key]["avoidable_hours"] += e.duration_minutes / 60
            months[month_key]["avoidable_cost"] += e.avoidable_cost_inr or 0

    for m in months.values():
        m["total_hours"] = round(m["total_hours"], 2)
        m["avoidable_hours"] = round(m["avoidable_hours"], 2)
        m["avoidable_cost"] = round(m["avoidable_cost"], 2)

    return {"months": sorted(months.values(), key=lambda x: x["month"])}
