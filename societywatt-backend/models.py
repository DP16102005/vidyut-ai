import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date, Text,
    ForeignKey
)
from database import Base


def gen_id():
    return str(uuid.uuid4())


class Society(Base):
    __tablename__ = 'societies'
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String(200), nullable=False)
    display_name = Column(String(200))
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(10))
    discom_code = Column(String(50), nullable=False)
    tariff_category = Column(String(50), nullable=False)
    num_units = Column(Integer, nullable=False)
    total_area_sqm = Column(Float)
    building_type = Column(String(50), nullable=False)
    building_type_label = Column(String(50))
    climate_zone = Column(String(50))
    solar_installed = Column(Boolean, default=False)
    solar_capacity_kwp = Column(Float)
    dg_installed = Column(Boolean, default=False)
    dg_capacity_kva = Column(Float)
    dg_fuel_rate_per_litre = Column(Float)
    dg_fuel_consumption_lph = Column(Float)
    md_sanctioned_kva = Column(Float)
    tier_subscribed = Column(String(20), default='insight')
    preferred_language = Column(String(10), default='en')
    leaderboard_opt_in = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True, default=gen_id)
    society_id = Column(String, ForeignKey('societies.id'), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    phone = Column(String(20))
    name = Column(String(200), nullable=False)
    role = Column(String(30), nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Bill(Base):
    __tablename__ = 'bills'
    id = Column(String, primary_key=True, default=gen_id)
    society_id = Column(String, ForeignKey('societies.id'), nullable=False)
    billing_period_from = Column(Date, nullable=False)
    billing_period_to = Column(Date, nullable=False)
    billing_days = Column(Integer, nullable=False)
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    uploaded_by_user_id = Column(String, ForeignKey('users.id'))
    raw_document_path = Column(String)
    parsed_data = Column(Text)
    analytics_output = Column(Text)
    llm_explanation = Column(Text)
    anomaly_flags = Column(Text, default='[]')
    processing_status = Column(String(30), default='uploading')
    processing_error = Column(Text)
    extraction_method = Column(String(30))
    extraction_confidence = Column(Float, default=1.0)
    calculation_hash = Column(String(16))
    created_at = Column(DateTime, default=datetime.utcnow)


class DGEvent(Base):
    __tablename__ = 'dg_events'
    id = Column(String, primary_key=True, default=gen_id)
    society_id = Column(String, ForeignKey('societies.id'), nullable=False)
    event_start = Column(DateTime, nullable=False)
    event_end = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    classification = Column(String(30), nullable=False)
    avoidable_cost_inr = Column(Float, default=0)
    source = Column(String(20), default='manual')
    created_at = Column(DateTime, default=datetime.utcnow)


class SolarReading(Base):
    __tablename__ = 'solar_readings'
    id = Column(String, primary_key=True, default=gen_id)
    society_id = Column(String, ForeignKey('societies.id'), nullable=False)
    reading_date = Column(Date, nullable=False)
    generation_kwh = Column(Float, nullable=False)
    self_consumed_kwh = Column(Float, nullable=False)
    exported_kwh = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatConversation(Base):
    __tablename__ = 'chat_conversations'
    id = Column(String, primary_key=True, default=gen_id)
    society_id = Column(String, ForeignKey('societies.id'), nullable=False)
    title = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    id = Column(String, primary_key=True, default=gen_id)
    conversation_id = Column(String, ForeignKey('chat_conversations.id'), nullable=False)
    role = Column(String(10), nullable=False)
    content = Column(Text, nullable=False)
    language_detected = Column(String(10), default='en')
    created_at = Column(DateTime, default=datetime.utcnow)


class LeaderboardEntry(Base):
    __tablename__ = 'leaderboard_entries'
    id = Column(String, primary_key=True, default=gen_id)
    society_id = Column(String, ForeignKey('societies.id'), nullable=False)
    computed_at = Column(DateTime, default=datetime.utcnow)
    ranking_level = Column(String(20), nullable=False)
    scope_value = Column(String(100), nullable=False)
    building_type = Column(String(50))
    rank_position = Column(Integer, nullable=False)
    total_in_category = Column(Integer, nullable=False)
    composite_score = Column(Float, nullable=False)
    verification_tier = Column(String(10), nullable=False)
    energy_intensity = Column(Float)
    improvement_pct = Column(Float)
    co2e_avoided_kg = Column(Float, default=0)
