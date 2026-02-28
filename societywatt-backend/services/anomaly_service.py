# services/anomaly_service.py
import os, json, time
import numpy as np

_MODEL  = None
_SCALER = None
_META   = None
_LOAD_ATTEMPTED = False

MODEL_PATH  = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    'ml_models', 'anomaly_model.pkl')
SCALER_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    'ml_models', 'anomaly_scaler.pkl')
META_PATH   = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    'ml_models', 'anomaly_meta.pkl')

def _load():
    global _MODEL, _SCALER, _META, _LOAD_ATTEMPTED
    _LOAD_ATTEMPTED = True
    try:
        import joblib
        if (os.path.exists(MODEL_PATH) and 
                os.path.exists(SCALER_PATH)):
            _MODEL  = joblib.load(MODEL_PATH)
            _SCALER = joblib.load(SCALER_PATH)
            _META   = joblib.load(META_PATH)
            print(f"Anomaly model loaded from {MODEL_PATH}")
        else:
            print(f"WARNING: Anomaly model files not found "
                  f"at {MODEL_PATH}. "
                  f"Run python run_training.py first.")
    except Exception as e:
        print(f"WARNING: Could not load anomaly model: {e}")
        _MODEL = None

def detect(parsed: dict, bill_history: list) -> list:
    global _LOAD_ATTEMPTED
    if not _LOAD_ATTEMPTED:
        _load()
    
    anomalies = []
    
    # --- Path 1: ML model (when available) ---
    if _MODEL is not None and _SCALER is not None:
        try:
            t0 = time.time()
            feats = np.array([[
                float(parsed.get('units_consumed_total') or 0),
                float(parsed.get('md_recorded_kva') or 0),
                float(parsed.get('power_factor') or 0.90),
                float(
                    (parsed.get('units_peak_slot') or 0) /
                    max(float(parsed.get(
                        'units_consumed_total') or 1), 1)
                ),
                28.0,
                float(parsed.get('billing_days') or 30),
            ]])
            Xs    = _SCALER.transform(feats)
            score = float(_MODEL.score_samples(Xs)[0])
            threshold = (_META.get('threshold', -0.1) 
                         if _META else -0.1)
            is_anomaly = score < threshold
            elapsed = (time.time() - t0) * 1000
            print(f"ML anomaly detection: {elapsed:.1f}ms "
                  f"score={score:.3f} "
                  f"anomaly={is_anomaly}")
        except Exception as e:
            print(f"ML anomaly detection failed: {e}, "
                  f"falling back to rules")
            is_anomaly = False
    else:
        is_anomaly = False
    
    # --- Path 2: Rule-based (always runs) ---
    # These rules run regardless of ML model status
    # They catch obvious issues the ML might miss
    
    pf = parsed.get('power_factor')
    if pf and isinstance(pf, (int, float)):
        if pf < 0.85:
            anomalies.append({
                'type': 'pf_degradation',
                'message': (f'Power factor is {pf:.2f} — '
                            f'below 0.85 penalty threshold'),
                'probable_cause': (
                    'Capacitor bank fault or heavy '
                    'inductive load. Inspect electrically.'),
                'urgency': 'this_week',
                'financial_risk_inr': round(
                    float(parsed.get('energy_charge', 0) 
                          or 0) * 0.05, 0),
            })
    
    total_bill = float(parsed.get('total_bill') or 0)
    if bill_history and total_bill > 0:
        recent_totals = []
        for b in bill_history[-3:]:
            try:
                ao  = json.loads(b.analytics_output or '{}')
                val = ao.get('total_bill')
                if val:
                    recent_totals.append(float(val))
            except:
                pass
        
        if recent_totals:
            avg = sum(recent_totals) / len(recent_totals)
            if total_bill > avg * 1.25:
                anomalies.append({
                    'type': 'bill_spike',
                    'message': (
                        f'Bill is '
                        f'{((total_bill/avg-1)*100):.0f}% '
                        f'above recent average'),
                    'probable_cause': (
                        'Possible DG overrun, MD spike, '
                        'or new high-load equipment'),
                    'urgency': 'immediate',
                    'financial_risk_inr': round(
                        total_bill - avg, 0),
                })
    
    # MD risk
    md_recorded = float(parsed.get('md_recorded_kva') or 0)
    md_penalty  = float(parsed.get('md_penalty_billed') or 0)
    if md_penalty > 0:
        anomalies.append({
            'type': 'md_penalty_active',
            'message': (f'MD penalty charged this month: '
                        f'₹{md_penalty:,.0f}'),
            'probable_cause': (
                'Peak demand exceeded sanctioned MD. '
                'Stagger high-load equipment start times.'),
            'urgency': 'next_cycle',
            'financial_risk_inr': round(md_penalty * 12, 0),
        })
    
    return anomalies
