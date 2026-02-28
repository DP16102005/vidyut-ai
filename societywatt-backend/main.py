"""
main.py — Vidyut AI API server.
AMD AOCL activation, FastAPI app, CORS, startup seed.
"""
import os
import json
import psutil
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import engine, Base, get_db
from models import Society, Bill, LeaderboardEntry, User
import models

# AMD AOCL activation
AOCL_PATH = os.environ.get('AOCL_PATH', '')
AOCL_ACTIVE = bool(AOCL_PATH and os.path.exists(AOCL_PATH))
if AOCL_ACTIVE:
    os.environ['LD_PRELOAD'] = AOCL_PATH

app = FastAPI(title="Vidyut AI API", version="1.0.0")

cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)

    # Log AMD info
    cpu_model = 'Unknown'
    try:
        import platform
        cpu_model = platform.processor() or 'Unknown'
    except Exception:
        pass
    try:
        with open('/proc/cpuinfo') as f:
            cpu_model = next(
                (l.split(':')[1].strip()
                 for l in f if 'model name' in l),
                cpu_model)
    except Exception:
        pass

    from services.llm_service import is_ollama_running, USE_LOCAL_LLM, LOCAL_MODEL, _GEMINI_AVAILABLE
    ollama_ok = is_ollama_running()

    print("=" * 50)
    print("=== Vidyut AI Starting ===")
    print(f"AMD CPU: {cpu_model}")
    print(f"Cores: {psutil.cpu_count(logical=False)} physical, "
          f"{psutil.cpu_count()} logical")
    print(f"AOCL: {'ACTIVE' if AOCL_ACTIVE else 'not active'}")
    print(f"Local LLM Config: {'Enabled' if USE_LOCAL_LLM else 'Disabled'} ({LOCAL_MODEL})")
    print(f"Local LLM Status: {'Running' if ollama_ok else 'Not Running'}")
    print(f"Gemini Fallback: {'Configured' if _GEMINI_AVAILABLE else 'Missing API Key'}")
    print("=" * 50)

    # Auto-seed if empty
    with Session(engine) as db:
        if db.query(Society).count() == 0:
            print("Empty database — running seed...")
            from seed import run_seed
            run_seed(db)
            print("Seed complete")

    # Auto-train ML models if not found
    from pathlib import Path
    model_dir = Path(__file__).parent / 'ml_models'
    if not (model_dir / 'anomaly_model.pkl').exists():
        print("\nML models not found — training from seed data...")
        try:
            from ml_models.train import train_all
            train_all()
        except Exception as e:
            print(f"ML training failed: {e}")
    else:
        print(f"ML models found in {model_dir}")


# Import and register routers
from routers import auth, bills, chat, dg, solar, leaderboard, impact, ai

app.include_router(auth.router, prefix="/auth")
app.include_router(bills.router, prefix="/bills")
app.include_router(chat.router, prefix="/chat")
app.include_router(dg.router, prefix="/dg")
app.include_router(solar.router, prefix="/solar")
app.include_router(leaderboard.router, prefix="/leaderboard")
app.include_router(impact.router, prefix="/impact")
app.include_router(ai.router, prefix="/ai")


# Dashboard endpoint (in main.py as it spans multiple models)
from routers.auth import get_current_user
from services import forecast_service, anomaly_service


@app.get("/societies/{society_id}/dashboard")
def get_dashboard(society_id: str,
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    society = db.query(Society).filter(Society.id == society_id).first()
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")

    # Latest bill
    latest_bill = (db.query(Bill)
                   .filter(Bill.society_id == society_id,
                           Bill.processing_status == 'complete')
                   .order_by(desc(Bill.upload_timestamp), desc(Bill.billing_period_from))
                   .first())

    latest_analytics = None
    if latest_bill and latest_bill.analytics_output:
        try:
            latest_analytics = json.loads(latest_bill.analytics_output)
        except Exception:
            pass

    # 12-month trend
    bills_12 = (db.query(Bill)
                .filter(Bill.society_id == society_id,
                        Bill.processing_status == 'complete')
                .order_by(Bill.billing_period_from)
                .all())

    trend_12mo = []
    for b in bills_12:
        try:
            ao = json.loads(b.analytics_output or '{}')
            trend_12mo.append({
                "month": b.billing_period_from.isoformat() if b.billing_period_from else "",
                "total_bill": ao.get("total_bill", 0),
                "composite_score": ao.get("composite_score", 0),
            })
        except Exception:
            pass

    # Rankings
    city_entry = (db.query(LeaderboardEntry)
                  .filter(LeaderboardEntry.society_id == society_id,
                          LeaderboardEntry.ranking_level == "city")
                  .first())
    national_entry = (db.query(LeaderboardEntry)
                      .filter(LeaderboardEntry.society_id == society_id,
                              LeaderboardEntry.ranking_level == "national")
                      .first())

    # Cumulative savings and CO2e
    cumulative_savings = 0
    cumulative_co2e = 0
    for b in bills_12:
        try:
            ao = json.loads(b.analytics_output or '{}')
            cumulative_savings += ao.get("total_avoidable", 0)
            cumulative_co2e += ao.get("co2e_avoided_kg", 0)
        except Exception:
            pass

    # Forecast (real ML model)
    forecast = forecast_service.get_forecast(bills_12)

    # Anomaly detection (real ML model + rules)
    active_anomalies = []
    if latest_analytics:
        try:
            active_anomalies = anomaly_service.detect(latest_analytics, bills_12[:-1] if len(bills_12) > 1 else [])
        except Exception as e:
            print(f"Anomaly detection error: {e}")
            # Fallback to stored anomalies
            if latest_bill and latest_bill.anomaly_flags:
                try:
                    active_anomalies = json.loads(latest_bill.anomaly_flags)
                except Exception:
                    pass

    return {
        "society": {
            "id": society.id,
            "name": society.name,
            "display_name": society.display_name,
            "city": society.city,
            "state": society.state,
            "discom_code": society.discom_code,
            "tariff_category": society.tariff_category,
            "num_units": society.num_units,
            "solar_installed": society.solar_installed,
            "solar_capacity_kwp": society.solar_capacity_kwp,
            "dg_installed": society.dg_installed,
            "dg_capacity_kva": society.dg_capacity_kva,
            "tier_subscribed": society.tier_subscribed,
            "leaderboard_opt_in": society.leaderboard_opt_in,
            "preferred_language": society.preferred_language,
        },
        "latest_bill": latest_analytics,
        "trend_12mo": trend_12mo,
        "composite_score": latest_analytics.get("composite_score") if latest_analytics else None,
        "city_rank": city_entry.rank_position if city_entry else None,
        "national_rank": national_entry.rank_position if national_entry else None,
        "cumulative_savings_inr": round(cumulative_savings, 2),
        "cumulative_co2e_kg": round(cumulative_co2e, 2),
        "forecast": forecast,
        "active_anomalies": active_anomalies,
        "user_name": user.name,
        "user_role": user.role,
    }


@app.get("/health")
def health():
    return {"status": "ok", "aocl_active": AOCL_ACTIVE}
