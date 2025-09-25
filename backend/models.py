# backend/models.py
import uuid
from sqlalchemy.ext.declarative import declarative_base # <-- This line is important
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID,ARRAY
from sqlalchemy.orm import relationship
# The incorrect import is now gone
import datetime


Base = declarative_base() # <-- This line correctly creates the Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    department = Column(String)
    role = Column(String, default="department") # 'admin' or 'department'
    documents = relationship("Document", back_populates="uploader")

class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, index=True)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    file_path = Column(String, unique=True) # Supabase URL
    uploader_id = Column(String, ForeignKey("users.id"))
    department = Column(String, index=True) # Now comes from the ML pipeline

    # --- ADD/MODIFY THESE COLUMNS ---
    status = Column(String, default="completed", index=True) # Default is now 'completed'
    summary = Column(Text, nullable=True) # To store the generated summary
    
    # Use ARRAY type for lists. This is a powerful PostgreSQL feature.
    deadlines = Column(ARRAY(String), nullable=True)
    financial_terms = Column(ARRAY(String), nullable=True)
    # --- END OF CHANGES ---

    uploader = relationship("User", back_populates="documents")