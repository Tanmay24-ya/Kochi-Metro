# backend/models.py
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import datetime

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
    file_path = Column(String, unique=True)
    uploader_id = Column(String, ForeignKey("users.id"))
    department = Column(String, index=True)
    uploader = relationship("User", back_populates="documents")