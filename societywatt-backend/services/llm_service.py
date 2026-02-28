"""
services/llm_service.py — Local LLM + Gemini Fallback
Routes English requests to local Ollama (phi3:mini).
Routes Indian languages and Vision tasks to Gemini 1.5 Flash.
Gracefully degrades if either is unavailable.
"""
import os
import re
import time
import json
import requests

try:
    import google.generativeai as genai
    from PIL import Image
    import io as _io
    genai.configure(api_key=os.environ.get('GEMINI_API_KEY', ''))
    _GEMINI_AVAILABLE = True
except Exception:
    _GEMINI_AVAILABLE = False

USE_LOCAL_LLM = os.environ.get('USE_LOCAL_LLM', 'true').lower() == 'true'
LOCAL_LLM_URL = os.environ.get('LOCAL_LLM_URL', 'http://localhost:11434/api/generate')
LOCAL_MODEL = os.environ.get('LOCAL_MODEL', 'phi3:mini')

SYSTEM_BILL = """You are Vidyut AI, energy advisor for Indian housing society managing committees. You explain electricity bills in plain language and help secretaries take action.

ABSOLUTE RULES:
1. Every rupee figure you write must come verbatim from analytics_context. Never calculate or estimate any number.
2. Give exactly 3 numbered action items.
3. Mention peer comparison ranking.
4. Max 280 words total.
5. Tone: warm, direct. Not corporate. Not alarming.
6. Respond entirely in the language specified. No mixing."""

SYSTEM_CHAT = """You are Vidyut AI energy advisor. Answer questions using ONLY the society data in context. Never invent or estimate numbers not in context. For scenario questions (what if we shift pump timing), calculate from context data and show reasoning briefly. Respond in the language of the user's message."""

LANG_MAP = {
    'en': 'English', 'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu',
    'kn': 'Kannada', 'mr': 'Marathi', 'bn': 'Bengali', 'gu': 'Gujarati',
    'pa': 'Punjabi', 'ml': 'Malayalam', 'or': 'Odia'
}

def is_ollama_running() -> bool:
    if not USE_LOCAL_LLM: return False
    try:
        r = requests.get(LOCAL_LLM_URL.replace('/generate', '/tags'), timeout=2)
        if r.status_code == 200:
            models = [m['name'] for m in r.json().get('models', [])]
            return any(LOCAL_MODEL in m for m in models)
        return False
    except Exception:
        return False

def _call_ollama(prompt: str, system: str = "") -> str:
    try:
        combined_prompt = f"System: {system}\n\nUser: {prompt}\n\nAssistant: " if system else prompt
        payload = {
            "model": LOCAL_MODEL,
            "prompt": combined_prompt,
            "stream": False,
            "options": {"temperature": 0.3}
        }
        r = requests.post(LOCAL_LLM_URL, json=payload, timeout=120)
        return r.json().get('response', '').strip()
    except Exception as e:
        print(f"Ollama failed: {e}")
        return None

def _call_gemini(prompt: str, system: str = "", image_bytes: bytes = None) -> str:
    if not _GEMINI_AVAILABLE:
        return None
    try:
        if image_bytes:
            img = Image.open(_io.BytesIO(image_bytes))
            model = genai.GenerativeModel('gemini-1.5-flash')
            resp = model.generate_content([prompt, img])
            return resp.text.strip()
        else:
            model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system)
            resp = model.generate_content(prompt)
            return resp.text.strip()
    except Exception as e:
        print(f"Gemini failed: {e}")
        return None

def generate_bill_explanation(analytics: dict, society_name: str, city: str, language: str = 'en') -> str:
    def fmt(v): return f"\u20b9{int(v):,}" if v else "\u20b90"
    lang_name = LANG_MAP.get(language, 'English')
    
    prompt = f"""Language to use exclusively: {lang_name}
Society: {society_name}, {city}

ANALYTICS (use ONLY these figures):
Total bill: {fmt(analytics.get('total_bill', 0))}
MD penalty: {fmt(analytics.get('md_penalty', 0))}
ToD peak premium: {fmt(analytics.get('tod_premium', 0))}
Power factor penalty: {fmt(analytics.get('pf_penalty', 0))}
DG avoidable cost: {fmt(analytics.get('dg_avoidable_cost', 0))}
Solar arbitrage loss: {fmt(analytics.get('solar_arbitrage_loss', 0))}
Total avoidable: {fmt(analytics.get('total_avoidable', 0))} ({analytics.get('avoidable_pct', 0):.1f}% of bill)
Peer percentile: {analytics.get('peer_percentile', 50)}th (1st = best, 100th = worst)
Energy intensity: {analytics.get('energy_intensity', 2.2):.1f} kWh/resident/month

Write the WhatsApp message now."""

    t0 = time.time()
    resp_text = None
    if language == 'en' and is_ollama_running():
        resp_text = _call_ollama(prompt, system=SYSTEM_BILL)
    
    if not resp_text:
        resp_text = _call_gemini(prompt, system=SYSTEM_BILL)

    if not resp_text:
        resp_text = _fallback_explanation(analytics, society_name)

    print(f"Bill explanation: {(time.time()-t0)*1000:.0f}ms")
    return resp_text

def _fallback_explanation(analytics: dict, society_name: str) -> str:
    return f"Bill Summary for {society_name}\n\nTotal bill: \u20b9{int(analytics.get('total_bill', 0)):,}\nTotal avoidable waste: \u20b9{int(analytics.get('total_avoidable', 0)):,} ({analytics.get('avoidable_pct', 0):.1f}%)\n\n1. Check MD penalty.\n2. Fix Power Factor.\n3. Optimise DG runtime."

def generate_chat_response(message: str, history: list, context_str: str, language: str = 'en') -> str:
    lang_instruction = "CRITICAL: Answer entirely in English." if language == 'en' else f"CRITICAL: Answer entirely in {LANG_MAP.get(language, 'English')}."
    system_prompt = SYSTEM_CHAT + f"\n\n{lang_instruction}\n\nSOCIETY DATA:\n{context_str}"
    
    # Format history for LLM
    hist_text = "\\n".join([f"{m['role']}: {m['content']}" for m in history[-5:]])
    prompt = f"Chat History:\\n{hist_text}\\n\\nUser new message: {message}"

    if language == 'en' and is_ollama_running():
        resp = _call_ollama(prompt, system=system_prompt)
        if resp: return resp

    # Fallback to pure gemini chat if available
    if _GEMINI_AVAILABLE:
        try:
            model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_prompt)
            gemini_history = [{'role': 'user' if m['role'] == 'user' else 'model', 'parts': [m['content']]} for m in history[-10:]]
            chat = model.start_chat(history=gemini_history)
            return chat.send_message(message).text
        except Exception as e:
            print(f"Gemini chat fallback failed: {e}")

    return "I'm sorry, both Local AI and Cloud fallback are unavailable right now."

def parse_bill_image(image_bytes: bytes) -> dict:
    if not _GEMINI_AVAILABLE:
        return {'extraction_method': 'failed', 'error': 'Gemini not available. Vision tasks require Gemini.'}
    t0 = time.time()
    prompt = """Extract bill data from this Indian electricity bill. Return ONLY valid JSON, no markdown fences. Use null for fields not visible.
{"total_bill": number, "billing_period_from": "YYYY-MM-DD or null", "billing_period_to": "YYYY-MM-DD or null", "billing_days": number, "units_consumed_total": number, "units_peak_slot": number, "units_offpeak_slot": number, "md_recorded_kva": number, "md_sanctioned_kva": number, "md_penalty_billed": number, "power_factor": number, "pf_penalty_billed": number, "energy_charge": number, "demand_charge": number, "fsa_fac_charge": number, "net_metering_export_units": number, "net_metering_import_units": number, "discom_detected": "string"}"""
    
    text = _call_gemini(prompt, image_bytes=image_bytes)
    if text:
        try:
            if '```' in text: text = text.split('```')[1]
            if text.startswith('json'): text = text[4:]
            result = json.loads(text.strip())
            result['extraction_method'] = 'gemini_vision'
            result['extraction_confidence'] = 0.82
            print(f"Vision OCR: {(time.time()-t0)*1000:.0f}ms")
            return result
        except BaseException as e:
            return {'extraction_method': 'failed', 'error': f"JSON parsing failed: {e}"}
    return {'extraction_method': 'failed', 'error': 'Vision OCR failed'}


def generate_operator_letter(society_name: str, avoidable_hours: float, avoidable_cost: float, operator_name: str, language: str) -> str:
    lang_name = LANG_MAP.get(language, 'English')
    prompt = f"""Write a formal accountability letter exclusively in {lang_name}. Details: Society: {society_name}, Operator name: {operator_name}, Last month avoidable DG runtime: {avoidable_hours:.1f} hours, Cost of this avoidable runtime: \u20b9{avoidable_cost:,.0f}. Required protocol: Check grid within 10m of DG start, shut down within 5m of grid restoration."""
    
    if language == 'en' and is_ollama_running():
        resp = _call_ollama(prompt)
        if resp: return resp

    resp = _call_gemini(prompt)
    if resp: return resp

    return f"Dear {operator_name},\nAvoidable runtime was {avoidable_hours:.1f}h costing \u20b9{avoidable_cost:,.0f}. Please follow protocols."


def explain_anomaly(anomaly: dict, society_name: str, language: str) -> str:
    prompt = f"""In {language}, write a brief 2-sentence WhatsApp alert for a housing society secretary. Alert type: {anomaly['type']}, message: {anomaly['message']}, Probable cause: {anomaly['probable_cause']}. Write only the alert message."""
    
    if language == 'en' and is_ollama_running():
        resp = _call_ollama(prompt)
        if resp: return resp

    resp = _call_gemini(prompt)
    if resp: return resp

    return f"Alert: {anomaly['message']}. {anomaly['probable_cause']}."


def generate_proactive_insight(analytics: dict, society_name: str, language: str = 'en') -> str:
    prompt = f"Based on this bill data for {society_name}, write exactly one short, punchy sentence highlighting the SINGLE biggest financial inefficiency or success. Data: {analytics}"
    if language == 'en' and is_ollama_running():
        resp = _call_ollama(prompt)
        if resp: return resp
    resp = _call_gemini(prompt)
    if resp: return resp
    return "No insights available right now."

def analyse_discom_document(text: str, language: str = 'en') -> str:
    prompt = f"Summarize this DISCOM document in simple {LANG_MAP.get(language, 'English')}, focusing on how it affects a typical residential society's bill. Max 3 bullet points.\n\nDOCUMENT:\n{text[:2000]}"
    if language == 'en' and is_ollama_running():
        resp = _call_ollama(prompt)
        if resp: return resp
    resp = _call_gemini(prompt)
    if resp: return resp
    return "Error analysing DISCOM document."
