# backend/crud.py
from sqlalchemy.orm import Session
import models, schemas, auth
import uuid

# --- User Functions (Unchanged) ---
def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        id=user.id, name=user.name, department=user.department,
        role=user.role, hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Document Functions (Unchanged) ---
def get_document_by_id(db: Session, document_id: uuid.UUID):
    return db.query(models.Document).filter(models.Document.id == document_id).first()

def get_all_documents(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Document).offset(skip).limit(limit).all()

def get_documents_by_department(db: Session, department: str, skip: int = 0, limit: int = 100):
    return db.query(models.Document).filter(models.Document.department == department).offset(skip).limit(limit).all()

def create_document(db: Session, document: schemas.DocumentCreate, file_path: str, user_id: str):
    db_document = models.Document(
        id=uuid.uuid4(), title=document.title, department=document.department,
        summary=document.summary, deadlines=document.deadlines,
        financial_terms=document.financial_terms, file_path=file_path, uploader_id=user_id
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

# --- NEW Q&A Functions ---
def create_question(db: Session, document_id: uuid.UUID, user_id: str, question: schemas.QuestionCreate):
    """Saves a new question to the database. The answer will be null initially."""
    db_question = models.Question(
        document_id=document_id,
        user_id=user_id,
        question_text=question.question_text
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def get_questions_for_document(db: Session, document_id: uuid.UUID):
    """Retrieves all questions and answers for a specific document."""
    return db.query(models.Question).filter(models.Question.document_id == document_id).order_by(models.Question.asked_at.asc()).all()

def update_question_with_answer(db: Session, question_id: uuid.UUID, answer_text: str):
    """
    Finds a question by its ID and updates its answer_text field.
    """
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if db_question:
        db_question.answer_text = answer_text
        db.commit()
        db.refresh(db_question)
    return db_question