"""
routers/bills.py — Bill upload, list, detail, and dashboard.
"""
import os
import uuid
import json
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import Bill, Society, DGEvent, SolarReading, User
from routers.auth import get_current_user
from services import bill_parser, analytics, anomaly_service, llm_service, forecast_service

router = APIRouter(tags=["bills"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/society/{society_id}")
def list_bills(society_id: str,
               user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    bills = (db.query(Bill)
             .filter(Bill.society_id == society_id)
             .order_by(desc(Bill.billing_period_from))
             .all())

    result = []
    for b in bills:
        ao = {}
        try:
            ao = json.loads(b.analytics_output or '{}')
        except Exception:
            pass
        result.append({
            "id": b.id,
            "billing_period_from": b.billing_period_from.isoformat() if b.billing_period_from else None,
            "billing_period_to": b.billing_period_to.isoformat() if b.billing_period_to else None,
            "total_bill": ao.get("total_bill", 0),
            "composite_score": ao.get("composite_score", 0),
            "processing_status": b.processing_status,
            "billing_days": b.billing_days,
        })
    return result


@router.post("/upload")
async def upload_bill(
    file: UploadFile = File(...),
    society_id: str = Form(...),
    discom_code: str = Form(...),
    month: int = Form(...),
    year: int = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    society = db.query(Society).filter(Society.id == society_id).first()
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")

    bill_id = str(uuid.uuid4())
    step = "uploading"

    try:
        # Step 1: Save file
        file_bytes = await file.read()
        ext = file.filename.split('.')[-1] if file.filename else 'pdf'
        file_path = os.path.join(UPLOAD_DIR, f"{bill_id}.{ext}")
        with open(file_path, 'wb') as f:
            f.write(file_bytes)

        # Step 2: Parse
        step = "parsing"
        parsed = bill_parser.parse_bill_file(
            file_bytes, file.content_type or 'pdf', discom_code)

        # Set billing period from form
        dt_from = date(year, month, 1)
        if month == 12:
            dt_to = date(year, 12, 31)
        else:
            dt_to = date(year, month + 1, 1) - timedelta(days=1)
        parsed['billing_period_from'] = dt_from.isoformat()
        parsed['billing_period_to'] = dt_to.isoformat()
        parsed['billing_days'] = (dt_to - dt_from).days + 1

        # Step 3: Analytics
        step = "analysing"
        thirty_days_ago = dt_from - timedelta(days=30)
        dg_events = (db.query(DGEvent)
                     .filter(DGEvent.society_id == society_id,
                             DGEvent.event_start >= thirty_days_ago)
                     .all())
        solar_readings = (db.query(SolarReading)
                         .filter(SolarReading.society_id == society_id,
                                 SolarReading.reading_date >= thirty_days_ago)
                         .all())
        bill_history = (db.query(Bill)
                       .filter(Bill.society_id == society_id,
                               Bill.processing_status == 'complete')
                       .order_by(desc(Bill.billing_period_from))
                       .limit(12)
                       .all())

        analytics_result = analytics.run_full_analytics(
            parsed, society, bill_history, solar_readings, dg_events, db)

        # Step 4: Anomaly detection
        anomaly_flags = anomaly_service.detect(parsed, bill_history)

        # Step 5: LLM explanation
        step = "explaining"
        explanation = llm_service.generate_bill_explanation(
            analytics_result, society.name, society.city,
            society.preferred_language or 'en')

        # Generate proactive insight
        proactive_insight = llm_service.generate_proactive_insight(
            analytics_result, society.name,
            society.preferred_language or 'en')

        # Step 6: Generate hash
        calc_hash = analytics.generate_calculation_hash(parsed, society_id)

        # Save bill
        bill = Bill(
            id=bill_id,
            society_id=society_id,
            billing_period_from=dt_from,
            billing_period_to=dt_to,
            billing_days=parsed['billing_days'],
            uploaded_by_user_id=user.id,
            raw_document_path=file_path,
            parsed_data=json.dumps(parsed),
            analytics_output=json.dumps(analytics_result),
            llm_explanation=explanation,
            anomaly_flags=json.dumps(anomaly_flags),
            processing_status='complete',
            extraction_method=parsed.get('extraction_method', 'pdf_regex'),
            extraction_confidence=parsed.get('extraction_confidence', 0),
            calculation_hash=calc_hash,
        )
        db.add(bill)
        db.commit()

        return {
            "bill_id": bill_id,
            "parsed_data": parsed,
            "analytics": analytics_result,
            "llm_explanation": explanation,
            "proactive_insight": proactive_insight,
            "anomaly_flags": anomaly_flags,
            "extraction_method": parsed.get('extraction_method'),
            "extraction_confidence": parsed.get('extraction_confidence'),
            "calculation_hash": calc_hash,
        }

    except Exception as e:
        # Save failed bill
        bill = Bill(
            id=bill_id,
            society_id=society_id,
            billing_period_from=date(year, month, 1),
            billing_period_to=date(year, month, 28),
            billing_days=30,
            uploaded_by_user_id=user.id,
            processing_status='failed',
            processing_error=str(e),
        )
        db.add(bill)
        db.commit()
        raise HTTPException(status_code=500, detail={
            "error": "Processing failed",
            "detail": str(e),
            "step": step,
        })


@router.get("/{bill_id}")
def get_bill(bill_id: str,
             user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    parsed = {}
    ao = {}
    anomalies = []
    try:
        parsed = json.loads(bill.parsed_data or '{}')
    except Exception:
        pass
    try:
        ao = json.loads(bill.analytics_output or '{}')
    except Exception:
        pass
    try:
        anomalies = json.loads(bill.anomaly_flags or '[]')
    except Exception:
        pass

    return {
        "id": bill.id,
        "society_id": bill.society_id,
        "billing_period_from": bill.billing_period_from.isoformat() if bill.billing_period_from else None,
        "billing_period_to": bill.billing_period_to.isoformat() if bill.billing_period_to else None,
        "billing_days": bill.billing_days,
        "upload_timestamp": bill.upload_timestamp.isoformat() if bill.upload_timestamp else None,
        "parsed_data": parsed,
        "analytics_output": ao,
        "llm_explanation": bill.llm_explanation or "",
        "anomaly_flags": anomalies,
        "processing_status": bill.processing_status,
        "processing_error": bill.processing_error,
        "extraction_method": bill.extraction_method,
        "extraction_confidence": bill.extraction_confidence,
        "calculation_hash": bill.calculation_hash,
    }


@router.get("/{bill_id}/explanation")
def get_explanation(bill_id: str, language: str = 'en',
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    society = db.query(Society).filter(Society.id == bill.society_id).first()
    ao = json.loads(bill.analytics_output or '{}')

    explanation = llm_service.generate_bill_explanation(
        ao, society.name if society else "Society",
        society.city if society else "", language)

    return {"explanation": explanation}
@router.post("/analyse-discom")
async def analyse_discom(
    text: str = Form(...),
    language: str = Form("en"),
    user: User = Depends(get_current_user)
):
    try:
        summary = llm_service.analyse_discom_document(text, language)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
