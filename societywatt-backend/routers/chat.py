"""
routers/chat.py — AI chat with Gemini, conversation management.
"""
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import ChatConversation, ChatMessage, Bill, Society, User
from routers.auth import get_current_user
from services import llm_service

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    society_id: str
    message: str
    conversation_id: Optional[str] = None
    language: str = 'en'


@router.post("/message")
def send_message(req: ChatRequest,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    society = db.query(Society).filter(Society.id == req.society_id).first()
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")

    # Create or get conversation
    if req.conversation_id:
        conv = db.query(ChatConversation).filter(
            ChatConversation.id == req.conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = ChatConversation(
            id=str(uuid.uuid4()),
            society_id=req.society_id,
            title=req.message[:100],
        )
        db.add(conv)
        db.flush()

    # Load history
    messages = (db.query(ChatMessage)
                .filter(ChatMessage.conversation_id == conv.id)
                .order_by(ChatMessage.created_at)
                .all())
    history = [{"role": m.role, "content": m.content} for m in messages]

    # Build context from recent bills
    recent_bills = (db.query(Bill)
                    .filter(Bill.society_id == req.society_id,
                            Bill.processing_status == 'complete')
                    .order_by(desc(Bill.billing_period_from))
                    .limit(12)
                    .all())

    context_parts = [
        f"Society: {society.name}, {society.city}, {society.state}",
        f"Units/flats: {society.num_units}",
        f"DISCOM: {society.discom_code} | Tariff: {society.tariff_category}",
        f"Solar: {'Yes, ' + str(society.solar_capacity_kwp) + ' kWp' if society.solar_installed else 'No'}",
        f"DG: {'Yes, ' + str(society.dg_capacity_kva) + ' kVA' if society.dg_installed else 'No'}",
        f"MD Sanctioned: {society.md_sanctioned_kva} kVA",
        "",
        "RECENT BILLS (latest first):",
    ]
    for b in recent_bills:
        try:
            ao = json.loads(b.analytics_output or '{}')
            period = b.billing_period_from.isoformat() if b.billing_period_from else "?"
            context_parts.append(
                f"  {period}: Bill=₹{int(ao.get('total_bill', 0)):,} | "
                f"Avoidable=₹{int(ao.get('total_avoidable', 0)):,} ({ao.get('avoidable_pct', 0)}%) | "
                f"Score={ao.get('composite_score', 0)} | "
                f"MD Penalty=₹{int(ao.get('md_penalty', 0)):,} | "
                f"PF={ao.get('pf_recorded', 'N/A')} | "
                f"DG Avoidable={ao.get('dg_avoidable_hours', 0)}h (₹{int(ao.get('dg_avoidable_cost', 0)):,})"
            )
        except Exception:
            pass

    context_str = "\n".join(context_parts)

    # Generate response
    reply = llm_service.generate_chat_response(
        req.message, history, context_str, req.language)

    # Save messages
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role='user',
        content=req.message,
        language_detected=req.language,
    )
    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role='assistant',
        content=reply,
        language_detected=req.language,
    )
    db.add(user_msg)
    db.add(assistant_msg)
    db.commit()

    return {
        "reply": reply,
        "conversation_id": conv.id,
        "language_used": req.language,
    }


@router.get("/{society_id}/conversations")
def get_conversations(society_id: str,
                      user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    convs = (db.query(ChatConversation)
             .filter(ChatConversation.society_id == society_id)
             .order_by(desc(ChatConversation.created_at))
             .all())
    return [{
        "id": c.id,
        "title": c.title,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    } for c in convs]


@router.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: str,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    msgs = (db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at)
            .all())
    return [{
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "language_detected": m.language_detected,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    } for m in msgs]
