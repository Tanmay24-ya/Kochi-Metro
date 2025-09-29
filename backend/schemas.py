# backend/schemas.py
from pydantic import BaseModel
import uuid
import datetime
from typing import Optional, List

# --- User Schemas (Unchanged) ---
class UserBase(BaseModel):
    id: str
    name: str
    department: str
    role: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    class Config:
        from_attributes = True

# --- Document Schemas (Unchanged) ---
class DocumentBase(BaseModel):
    title: str
    department: str

class DocumentCreate(DocumentBase):
    summary: Optional[str] = None
    deadlines: Optional[List[str]] = []
    financial_terms: Optional[List[str]] = []

class Document(DocumentBase):
    id: uuid.UUID
    upload_date: datetime.datetime
    file_path: str
    uploader_id: str
    status: str
    summary: Optional[str] = None
    deadlines: Optional[List[str]] = []
    financial_terms: Optional[List[str]] = []
    highlighted_file_path: Optional[str] = None

    class Config:
        from_attributes = True

# --- NEW Q&A Schemas ---
class QuestionCreate(BaseModel):
    question_text: str

class Question(BaseModel):
    id: uuid.UUID
    question_text: str
    answer_text: Optional[str] = None
    asked_at: datetime.datetime
    class Config:
        from_attributes = True

class Answer(BaseModel):
    answer_text: str