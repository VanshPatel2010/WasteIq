"""Database configuration and session management."""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
# from dotenv import load_dotenv

# # Load backend/.env when running the app locally.
# load_dotenv()

# Force load the .env variables (helps when terminal environments don't auto-inject)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./wasteiq.db")

# Use check_same_thread=False for SQLite
# For PostgreSQL (Supabase), use connection pooling parameters
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,             # Standard pool size
        max_overflow=10,         # Allow up to 10 extra connections if spiked
        pool_pre_ping=True,      # Checks if connection is alive before using it
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
