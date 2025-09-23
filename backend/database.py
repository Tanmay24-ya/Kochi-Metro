# backend/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the database URL from the environment.
# If it's not set, the app will fail to start, which is what we want.
# Prefer DATABASE_URL if provided; otherwise fall back to local SQLite for development
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("FATAL ERROR: DATABASE_URL environment variable is not set. Please check your .env file.")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is now imported from models, so we remove it from here to avoid circular imports
# from sqlalchemy.ext.declarative import declarative_base
# Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()