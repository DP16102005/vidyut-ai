"""
ml_models/train.py — Train real ML models from seed/historical bill data.

Models trained:
1. IsolationForest for anomaly detection (AMD AOCL accelerated via numpy BLAS)
2. GradientBoostingRegressor for bill forecasting
3. StandardScaler for feature normalization

All models are saved as .pkl files and loaded by the services at runtime.
"""
import json
import os
import sys
import time
import numpy as np
import pandas as pd
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sklearn.ensemble import IsolationForest, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit
import joblib

MODEL_DIR = Path(__file__).parent
MODEL_DIR.mkdir(exist_ok=True)


def extract_features_from_bills(db):
    """Extract ML feature matrix from all completed bills."""
    from models import Bill, Society

    bills = (db.query(Bill, Society)
             .join(Society, Bill.society_id == Society.id)
             .filter(Bill.processing_status == 'complete')
             .order_by(Bill.billing_period_from)
             .all())

    rows = []
    for bill, soc in bills:
        try:
            ao = json.loads(bill.analytics_output or '{}')
            total_bill = ao.get('total_bill', 0)
            if total_bill <= 0:
                continue

            total_units = total_bill / 8.5  # approx from effective rate
            md_recorded = ao.get('md_recorded_kva', 0) or 0
            pf = ao.get('pf_recorded', 0.92) or 0.92
            peak_pct = ao.get('peak_consumption_pct', 35) / 100
            dg_hours = ao.get('dg_total_hours', 0) or 0
            dg_avoidable = ao.get('dg_avoidable_hours', 0) or 0
            billing_days = bill.billing_days or 30
            energy_intensity = ao.get('energy_intensity', 2.0) or 2.0
            md_sanctioned = soc.md_sanctioned_kva or 100
            md_ratio = md_recorded / max(md_sanctioned, 1)
            solar_ratio = ao.get('solar_self_consumption_ratio') or 0
            composite = ao.get('composite_score', 60) or 60
            avoidable_pct = ao.get('avoidable_pct', 15) or 15

            # Temporal features
            month = bill.billing_period_from.month if bill.billing_period_from else 6
            month_sin = np.sin(2 * np.pi * month / 12)
            month_cos = np.cos(2 * np.pi * month / 12)

            rows.append({
                'society_id': bill.society_id,
                'bill_date': bill.billing_period_from,
                'total_bill': total_bill,
                'total_units': total_units,
                'md_recorded': md_recorded,
                'md_ratio': md_ratio,
                'power_factor': pf,
                'peak_pct': peak_pct,
                'dg_hours': dg_hours,
                'dg_avoidable': dg_avoidable,
                'billing_days': billing_days,
                'energy_intensity': energy_intensity,
                'solar_ratio': solar_ratio,
                'composite_score': composite,
                'avoidable_pct': avoidable_pct,
                'month_sin': month_sin,
                'month_cos': month_cos,
                'num_units': soc.num_units or 100,
            })
        except Exception as e:
            print(f"  Skipping bill {bill.id}: {e}")
            continue

    return pd.DataFrame(rows)


def train_anomaly_model(df: pd.DataFrame):
    """
    Train IsolationForest for anomaly detection.
    AMD AOCL accelerates the numpy BLAS operations inside sklearn.
    """
    print("\n--- Training Anomaly Detection Model ---")
    t0 = time.time()

    feature_cols = [
        'total_units', 'md_ratio', 'power_factor', 'peak_pct',
        'dg_hours', 'billing_days', 'energy_intensity',
        'month_sin', 'month_cos',
    ]

    X = df[feature_cols].values

    # Fit scaler
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    # Train IsolationForest
    model = IsolationForest(
        n_estimators=200,
        contamination=0.08,  # ~8% of bills flagged as anomalous
        max_samples='auto',
        random_state=42,
        n_jobs=-1,  # Use all AMD CPU cores
    )
    model.fit(Xs)

    # Score all training samples to establish threshold
    scores = model.score_samples(Xs)
    threshold = np.percentile(scores, 8)  # bottom 8%

    # Validate
    predictions = model.predict(Xs)
    n_anomalies = (predictions == -1).sum()
    print(f"  Samples: {len(X)}")
    print(f"  Anomalies detected: {n_anomalies} ({n_anomalies/len(X)*100:.1f}%)")
    print(f"  Threshold: {threshold:.4f}")

    # Save
    joblib.dump(model, MODEL_DIR / 'anomaly_model.pkl')
    joblib.dump(scaler, MODEL_DIR / 'anomaly_scaler.pkl')
    joblib.dump({
        'threshold': threshold,
        'feature_cols': feature_cols,
        'n_samples': len(X),
        'contamination': 0.08,
    }, MODEL_DIR / 'anomaly_meta.pkl')

    elapsed = time.time() - t0
    print(f"  Trained in {elapsed:.2f}s (AMD AOCL BLAS)")
    return model, scaler


def train_forecast_model(df: pd.DataFrame):
    """
    Train GradientBoostingRegressor for next-month bill forecasting.
    Per-society model with lagged features.
    """
    print("\n--- Training Forecast Model ---")
    t0 = time.time()

    # Build lagged features per society
    all_rows = []
    for sid, group in df.groupby('society_id'):
        group = group.sort_values('bill_date').reset_index(drop=True)
        if len(group) < 4:
            continue

        for i in range(3, len(group)):
            row = {
                'bill_lag1': group.loc[i-1, 'total_bill'],
                'bill_lag2': group.loc[i-2, 'total_bill'],
                'bill_lag3': group.loc[i-3, 'total_bill'],
                'bill_mean3': group.loc[i-3:i-1, 'total_bill'].mean(),
                'bill_std3': group.loc[i-3:i-1, 'total_bill'].std(),
                'units_lag1': group.loc[i-1, 'total_units'],
                'intensity_lag1': group.loc[i-1, 'energy_intensity'],
                'md_ratio_lag1': group.loc[i-1, 'md_ratio'],
                'pf_lag1': group.loc[i-1, 'power_factor'],
                'month_sin': group.loc[i, 'month_sin'],
                'month_cos': group.loc[i, 'month_cos'],
                'num_units': group.loc[i, 'num_units'],
                'target': group.loc[i, 'total_bill'],
            }
            all_rows.append(row)

    if not all_rows:
        print("  Not enough data for forecast model")
        return None

    train_df = pd.DataFrame(all_rows)

    feature_cols = [
        'bill_lag1', 'bill_lag2', 'bill_lag3', 'bill_mean3', 'bill_std3',
        'units_lag1', 'intensity_lag1', 'md_ratio_lag1', 'pf_lag1',
        'month_sin', 'month_cos', 'num_units',
    ]

    X = train_df[feature_cols].fillna(0).values
    y = train_df['target'].values

    # Fit scaler
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    # Train GBR
    model = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
    )
    model.fit(Xs, y)

    # Evaluate
    train_preds = model.predict(Xs)
    mape = np.mean(np.abs((y - train_preds) / y)) * 100
    rmse = np.sqrt(np.mean((y - train_preds) ** 2))
    print(f"  Training samples: {len(X)}")
    print(f"  Train MAPE: {mape:.1f}%")
    print(f"  Train RMSE: ₹{rmse:,.0f}")

    # Feature importance
    importances = model.feature_importances_
    for feat, imp in sorted(zip(feature_cols, importances), key=lambda x: -x[1])[:5]:
        print(f"    {feat}: {imp:.3f}")

    # Save
    joblib.dump(model, MODEL_DIR / 'forecast_model.pkl')
    joblib.dump(scaler, MODEL_DIR / 'forecast_scaler.pkl')
    joblib.dump({
        'feature_cols': feature_cols,
        'n_samples': len(X),
        'train_mape': round(mape, 1),
        'train_rmse': round(rmse, 0),
    }, MODEL_DIR / 'forecast_meta.pkl')

    elapsed = time.time() - t0
    print(f"  Trained in {elapsed:.2f}s")
    return model, scaler


def train_all():
    """Main entry — train all models from current DB data."""
    from database import SessionLocal
    print("=" * 50)
    print("ML Model Training Pipeline")
    print("=" * 50)

    db = SessionLocal()
    try:
        df = extract_features_from_bills(db)
        print(f"\nExtracted {len(df)} bill records from {df['society_id'].nunique()} societies")

        if len(df) < 10:
            print("Not enough data to train models (need 10+ bills)")
            return

        # 1. Anomaly detection
        train_anomaly_model(df)

        # 2. Forecasting
        train_forecast_model(df)

        print("\n" + "=" * 50)
        print("All models trained and saved to ml_models/")
        print("=" * 50)
    finally:
        db.close()


if __name__ == '__main__':
    train_all()
