# backend/crud.py
from sqlalchemy.orm import Session
import models, schemas, auth
import uuid
def get_all_documents(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Document).offset(skip).limit(limit).all()

def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        id=user.id,
        name=user.name,
        department=user.department,
        role=user.role,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_documents_by_department(db: Session, department: str, skip: int = 0, limit: int = 100):
    return db.query(models.Document).filter(models.Document.department == department).offset(skip).limit(limit).all()

def create_document(db: Session, document: schemas.DocumentCreate, file_path: str, user_id: str):
    db_document = models.Document(
        id=uuid.uuid4(),
        title=document.title,
        department=document.department,
        summary=document.summary,             # <-- ADDED
        deadlines=document.deadlines,         # <-- ADDED
        financial_terms=document.financial_terms, # <-- ADDED
        file_path=file_path,
        uploader_id=user_id
        # The 'status' is 'completed' by default now
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document