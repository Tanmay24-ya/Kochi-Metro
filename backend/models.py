# backend/models.py
import uuid
import datetime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    department = Column(String)
    role = Column(String, default="department")

    documents = relationship("Document", back_populates="uploader")
    # --- ADD THIS RELATIONSHIP ---
    questions = relationship("Question", back_populates="user")

class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, index=True)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    file_path = Column(String, unique=True)
    uploader_id = Column(String, ForeignKey("users.id"))
    department = Column(String, index=True)
    status = Column(String, default="completed", index=True)
    summary = Column(Text, nullable=True)
    deadlines = Column(ARRAY(String), nullable=True)
    financial_terms = Column(ARRAY(String), nullable=True)

    uploader = relationship("User", back_populates="documents")

class Question(Base):
    __tablename__ = "questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)
    asked_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(String, ForeignKey("users.id"))

    document = relationship("Document")
    # This relationship now correctly points to the 'questions' property in the User model
    user = relationship("User", back_populates="questions")