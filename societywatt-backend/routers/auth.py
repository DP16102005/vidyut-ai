"""
routers/auth.py — Login, Register, JWT authentication.
"""
import os
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User, Society

router = APIRouter(tags=["auth"])

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-replace-in-production-minimum-64-characters-long')
ALGORITHM = os.environ.get('ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    society_name: str
    city: str
    state: str
    pincode: Optional[str] = None
    discom_code: str
    tariff_category: str
    num_units: int
    building_type: str = 'residential_society'
    solar_installed: bool = False
    solar_capacity_kwp: Optional[float] = None
    dg_installed: bool = False
    dg_capacity_kva: Optional[float] = None
    dg_fuel_rate_per_litre: Optional[float] = None
    dg_fuel_consumption_lph: Optional[float] = None
    md_sanctioned_kva: Optional[float] = None
    tier_subscribed: str = 'insight'
    preferred_language: str = 'en'
    leaderboard_opt_in: bool = False
    secretary_name: str
    email: str
    phone: Optional[str] = None
    password: str


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401,
                            detail="Invalid credentials")

    society = db.query(Society).filter(Society.id == user.society_id).first()
    token = create_access_token({
        "sub": user.id,
        "society_id": user.society_id
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "society_id": user.society_id,
        "society_name": society.name if society else "",
        "city": society.city if society else "",
        "tier": society.tier_subscribed if society else "insight",
        "preferred_language": society.preferred_language if society else "en",
        "user_name": user.name,
        "user_role": user.role,
    }


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400,
                            detail="Email already registered")

    society_id = str(uuid.uuid4())
    society = Society(
        id=society_id,
        name=req.society_name,
        display_name=req.society_name,
        city=req.city,
        state=req.state,
        pincode=req.pincode,
        discom_code=req.discom_code,
        tariff_category=req.tariff_category,
        num_units=req.num_units,
        building_type=req.building_type,
        solar_installed=req.solar_installed,
        solar_capacity_kwp=req.solar_capacity_kwp,
        dg_installed=req.dg_installed,
        dg_capacity_kva=req.dg_capacity_kva,
        dg_fuel_rate_per_litre=req.dg_fuel_rate_per_litre,
        dg_fuel_consumption_lph=req.dg_fuel_consumption_lph,
        md_sanctioned_kva=req.md_sanctioned_kva,
        tier_subscribed=req.tier_subscribed,
        preferred_language=req.preferred_language,
        leaderboard_opt_in=req.leaderboard_opt_in,
    )
    db.add(society)

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        society_id=society_id,
        email=req.email,
        phone=req.phone,
        name=req.secretary_name,
        role='secretary',
        password_hash=pwd_context.hash(req.password),
    )
    db.add(user)
    db.commit()

    token = create_access_token({
        "sub": user_id,
        "society_id": society_id
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "society_id": society_id,
        "society_name": society.name,
        "city": society.city,
        "tier": society.tier_subscribed,
        "preferred_language": society.preferred_language,
        "user_name": user.name,
        "user_role": user.role,
    }
