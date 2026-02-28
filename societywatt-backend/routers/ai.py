from fastapi import APIRouter
from services.llm_service import is_ollama_running, USE_LOCAL_LLM, LOCAL_MODEL, _GEMINI_AVAILABLE

router = APIRouter(tags=["ai"])

@router.get("/status")
def get_ai_status():
    ollama_ok = is_ollama_running()
    return {
        "local_llm_enabled": USE_LOCAL_LLM,
        "local_model": LOCAL_MODEL,
        "ollama_running": ollama_ok,
        "gemini_available": _GEMINI_AVAILABLE,
        "routing_summary": "English -> Local (if running), else Gemini. Hindi/Vision -> Gemini."
    }
