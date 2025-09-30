# backend/crud.py
from sqlalchemy.orm import Session
import models, schemas, auth
import uuid

# --- User Functions (Unchanged) ---
def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

# def create_user(db: Session, user: schemas.UserCreate):
#
#     # --- TEMPORARY FIX TO BYPASS THE BROKEN BCRYPT LIBRARY ---
#     # We will store the plain password directly.
#     # This is insecure for a real application but will get you unblocked.
#     print(f"[SECURITY WARNING] Storing plain text password for user: {user.id}")
#
#     if not user.password:
#         raise ValueError("Cannot create a user with an empty password.")
#
#     # Instead of calling the broken hash function, we just use the password as-is.
#     hashed_password = user.password
#     # --- END OF TEMPORARY FIX ---
#
#     db_user = models.User(
#         id=user.id,
#         name=user.name,
#         department=user.department,
#         role=user.role,
#         hashed_password=hashed_password # Storing the plain password here for now
#     )
#     db.add(db_user)
#     db.commit()
#     db.refresh(db_user)
#     return db_user

def create_user(db: Session, user: schemas.UserCreate):
    # This now works for ALL users, including 'automation_user' and real users.
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


# --- Document Functions (Unchanged) ---
def get_document_by_id(db: Session, document_id: uuid.UUID):
    return db.query(models.Document).filter(models.Document.id == document_id).first()

def get_all_documents(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Document).offset(skip).limit(limit).all()

def get_documents_by_department(db: Session, department: str, skip: int = 0, limit: int = 100):
    # This is now a case-INSENSITIVE comparison. It will match 'HR', 'hr', 'Hr', etc.
    return db.query(models.Document).filter(models.Document.department.ilike(department)).offset(skip).limit(limit).all()

def create_document(db: Session, document: schemas.DocumentCreate, file_path: str, user_id: str):
    db_document = models.Document(
        id=uuid.uuid4(),
        title=document.title,
        department=document.department,
        file_path=file_path,
        uploader_id=user_id,
        status="processing"
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

def update_document_with_ml_results(db: Session, document_id: uuid.UUID, ml_results: dict, highlighted_file_path: str = None):
    """
    Updates a document with the results from the ML pipeline.
    """
    db_document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if db_document:
        db_document.department = ml_results.get("department", db_document.department)
        db_document.summary = ml_results.get("summary")
        db_document.deadlines = ml_results.get("deadlines", [])
        db_document.financial_terms = ml_results.get("financials", [])

        # --- ADD THIS LINE ---
        # This checks if a URL was provided and assigns it to the database object.
        if highlighted_file_path:
            db_document.highlighted_file_path = highlighted_file_path

        db_document.status = "completed"
        db.commit()
        db.refresh(db_document)
    return db_document


def create_notification(db: Session, document_id: uuid.UUID, department: str, message: str):
    """Creates a new notification in the database."""
    db_notification = models.Notification(
        document_id=document_id,
        department=department,
        message=message
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_notifications_for_department(db: Session, department: str):
    """Retrieves all unread notifications for a specific department, case-insensitively."""
    return db.query(models.Notification).filter(
        models.Notification.department.ilike(department), # <--- THE FIX
        models.Notification.is_read == False
    ).order_by(models.Notification.created_at.desc()).all()