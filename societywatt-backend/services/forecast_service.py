# services/forecast_service.py
import os, json, pickle, time
import pandas as pd

_MODEL = None
_LOAD_ATTEMPTED = False

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    'ml_models', 'forecast_model.pkl')

def _load():
    global _MODEL, _LOAD_ATTEMPTED
    _LOAD_ATTEMPTED = True
    try:
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, 'rb') as f:
                _MODEL = pickle.load(f)
            print(f"Forecast model loaded from {MODEL_PATH}")
        else:
            print(f"WARNING: Forecast model not found at "
                  f"{MODEL_PATH}. "
                  f"Run python run_training.py first.")
    except Exception as e:
        print(f"WARNING: Could not load forecast model: {e}")
        _MODEL = None

def get_forecast(bill_history: list) -> dict:
    global _LOAD_ATTEMPTED
    if not _LOAD_ATTEMPTED:
        _load()
    
    # Always need at least 4 bills for any forecast
    valid_bills = []
    for b in bill_history:
        try:
            ao  = json.loads(b.analytics_output or '{}')
            val = ao.get('total_bill')
            if val and b.billing_period_from:
                valid_bills.append({
                    'ds':           pd.to_datetime(
                        b.billing_period_from),
                    'y':            float(val),
                    'cdd':          22.0,
                    'billing_days': int(
                        b.billing_days or 30),
                })
        except:
            pass
    
    if len(valid_bills) < 4:
        return {
            'available': False,
            'message': (
                f'Forecast needs at least 4 months of '
                f'bill data. You have {len(valid_bills)}.'),
            'months_of_data': len(valid_bills),
        }
    
    try:
        # Always retrain on actual society data
        # (pre-trained model is just a starting point)
        from prophet import Prophet
        df = (pd.DataFrame(valid_bills)
                .sort_values('ds')
                .reset_index(drop=True))
        
        model = Prophet(
            yearly_seasonality=(len(valid_bills) >= 12),
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.80,
            seasonality_mode='additive',
        )
        model.add_regressor('cdd')
        model.add_regressor('billing_days')
        model.fit(df)
        
        future = model.make_future_dataframe(
            periods=1, freq='MS')
        future['cdd']          = 22.0
        future['billing_days'] = 30
        
        fc   = model.predict(future)
        nxt  = fc.iloc[-1]
        
        return {
            'available':      True,
            'point_estimate': round(float(nxt['yhat']), 0),
            'lower_bound':    round(
                float(nxt['yhat_lower']), 0),
            'upper_bound':    round(
                float(nxt['yhat_upper']), 0),
            'confidence_pct': 80,
            'months_of_data': len(valid_bills),
        }
    except Exception as e:
        print(f"Forecast failed: {e}")
        # Simple fallback: 3-month moving average +5%
        recent = sorted(valid_bills, 
                        key=lambda x: x['ds'])[-3:]
        avg = sum(b['y'] for b in recent) / len(recent)
        estimate = round(avg * 1.05, 0)
        return {
            'available':      True,
            'point_estimate': estimate,
            'lower_bound':    round(estimate * 0.88, 0),
            'upper_bound':    round(estimate * 1.12, 0),
            'confidence_pct': 60,
            'months_of_data': len(valid_bills),
            'method':         'moving_average_fallback',
        }
