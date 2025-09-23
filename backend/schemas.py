# backend/schemas.py
from pydantic import BaseModel
import uuid
import datetime

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

class Document(DocumentBase):
    id: uuid.UUID
    upload_date: datetime.datetime
    file_path: str
    uploader_id: str

    class Config:
        from_attributes = True