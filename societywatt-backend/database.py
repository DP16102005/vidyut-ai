from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.environ.get(
    'DATABASE_URL', 'sqlite:///./vidyutai.db')
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 15})

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
