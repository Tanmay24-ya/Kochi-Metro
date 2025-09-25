# backend/schemas.py
from pydantic import BaseModel
import uuid
import datetime
from typing import Optional , List

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

class DocumentBase(BaseModel):
    title: str
    department: str
    summary: Optional[str] = None
    deadlines: Optional[List[str]] = []
    financial_terms: Optional[List[str]] = []

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: uuid.UUID
    upload_date: datetime.datetime
    file_path: str
    uploader_id: str
    status: str

    class Config:
        from_attributes = True