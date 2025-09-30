# backend/main.py
from urllib.parse import unquote
from typing import List, Optional
import uuid
import auth
# --- Standard Imports ---
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from database import engine, get_db, SessionLocal
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
import os
import shutil # Important for file operations

from pipeline import highlight_text
from ml_qna import qna as generate_ml_answer

# from email_automation import download_attached_file
# import imaplib
from contextlib import asynccontextmanager
from pipeline import pipeline_process_pdf, load_all_models
from fastapi import BackgroundTasks

# --- Middleware Import ---
from fastapi.middleware.cors import CORSMiddleware

# --- Local Module Imports ---
import crud
import models
import schemas
from database import engine, get_db
from supabase_utils import upload_file_to_supabase

# This creates/updates the database tables in your Neon database
# based on your models.py file.
models.Base.metadata.create_all(bind=engine)

# --- (3) SETUP FOR LOADING MODELS ON STARTUP ---
# This dictionary will hold our loaded models so we don't reload them on every request
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # This code runs ONCE when the server starts up
    print("[INFO] Server starting up...")

    # --- ADD THIS ENTIRE BLOCK ---
    print("[INFO] Ensuring system 'automation_user' exists...")
    db = SessionLocal()
    try:
        # Check if the user already exists
        automation_user = crud.get_user(db, user_id="automation_user")
        if not automation_user:
            # If not, create it
            print("[INFO] 'automation_user' not found. Creating it now...")
            user_data = schemas.UserCreate(
                id="automation_user",
                name="Automation Service",
                department="System",
                role="system",
                password="automation_pass" # A placeholder password
            )
            crud.create_user(db, user_data)
            print("[INFO] 'automation_user' created successfully.")
        else:
            print("[INFO] 'automation_user' already exists.")
    finally:
        db.close() # Always close the database session
    # --- END OF BLOCK ---

    print("[INFO] Loading ML models...")
    tokenizer, model, nlp_model = load_all_models()
    ml_models["tokenizer"] = tokenizer
    ml_models["model"] = model
    ml_models["nlp_model"] = nlp_model
    print("[INFO] ML models loaded successfully and are ready.")

    yield

    ml_models.clear()
    print("[INFO] Server shutting down.")


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # This code runs ONCE when the server starts up
#     print("[INFO] Server starting up. Loading ML models...")
#     tokenizer, model, nlp_model = load_all_models()
#     ml_models["tokenizer"] = tokenizer
#     ml_models["model"] = model
#     ml_models["nlp_model"] = nlp_model
#     print("[INFO] ML models loaded successfully and are ready.")
#     yield
#     # This code runs when the server shuts down
#     ml_models.clear()
#     print("[INFO] Server shutting down.")


app = FastAPI(lifespan=lifespan)

# This list now includes the new port your frontend is using
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3003", # <-- ADD THIS LINE
    "http://127.0.0.1:3003", # <-- And this one for good measure
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Use the updated list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOCAL UPLOAD DIRECTORY for temporary storage ---
UPLOAD_DIRECTORY = "uploads"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

# --- Diagnostic Endpoints ---
@app.get("/")
def read_root():
    return {"status": "ok", "service": "kmrl-backend-service"}

@app.get("/ping-db")
def ping_db(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database connection successful."}
    except OperationalError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )

# --- User Management Endpoints ---
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user.id)
    if db_user:
        raise HTTPException(status_code=400, detail="User ID already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: str, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# --- Document Management Endpoints ---

@app.post("/documents/upload")
def upload_document(
        # Optional fields for email automation, but required for frontend
        title: Optional[str] = Form(None),
        department: Optional[str] = Form(None),
        user_id: Optional[str] = Form(None),
        # The file is always required
        file: UploadFile = File(...),
        db: Session = Depends(get_db)
):
    # --- 1. Set Default Values & Validate User ---
    # If a title wasn't provided (from email), create a default one.
    final_title = title or f"Email Attachment - {file.filename}"

    # If a user_id wasn't provided, it MUST be the automation user.
    final_user_id = user_id or "automation_user"

    # If a department wasn't provided, set it to be auto-detected by the pipeline.
    final_department = department or "auto-detected"

    # Now, use these final variables to validate the user
    user = crud.get_user(db, user_id=final_user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"Uploader '{final_user_id}' not found")

    # --- 2. Upload Original File to Cloud ---
    print("Uploading original file to cloud storage...")
    public_url = upload_file_to_supabase(file.file, file.filename)
    if not public_url:
        raise HTTPException(status_code=500, detail="Could not upload file to cloud storage.")
    print("File uploaded successfully. Public URL:", public_url)

    file.file.seek(0) # Rewind file for local processing

    # --- 3. Create Initial Database Record ---
    # This now correctly matches the function in crud.py (which should not take highlighted_file_path)
    document_data = schemas.DocumentCreate(title=final_title, department=final_department)
    db_document = crud.create_document(db=db, document=document_data, file_path=public_url, user_id=final_user_id)
    print(f"Initial document record created in DB with ID: {db_document.id}")

    # --- 4. Save Local Copy & Run ML Pipeline ---
    local_file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
    with open(local_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print("Starting ML pipeline processing...")
    ml_results = pipeline_process_pdf(
        pdf_path=local_file_path,
        clf_tokenizer=ml_models["tokenizer"],
        clf_model=ml_models["model"],
        nlp_model=ml_models["nlp_model"]
    )
    print("ML pipeline processing complete.")

    # --- 5. Upload Highlighted PDF (if created) ---
    highlighted_pdf_path = ml_results.get("highlighted_pdf")
    highlighted_public_url = None
    if highlighted_pdf_path and os.path.exists(highlighted_pdf_path):
        print("Uploading highlighted file to cloud storage...")
        with open(highlighted_pdf_path, "rb") as f:
            highlighted_filename = os.path.basename(highlighted_pdf_path)
            highlighted_public_url = upload_file_to_supabase(f, highlighted_filename)
        print("Highlighted PDF uploaded successfully.")

    # ... (after the ML pipeline runs) ...

    # --- (6) UPDATE THE DATABASE RECORD WITH ML RESULTS ---
    print("Updating database record with ML results...")
    final_document = crud.update_document_with_ml_results(
        db,
        document_id=db_document.id,
        ml_results=ml_results,
        highlighted_file_path=highlighted_public_url
    )
    print("Database record updated successfully.")

    # --- (7) CREATE NOTIFICATION FOR THE DEPARTMENT ---
    # The ML results contain the department the document was routed to.
    routed_department = final_document.department
    if routed_department and routed_department != "Unknown":
        notification_message = f"New document '{final_document.title}' has been assigned to your department."
        crud.create_notification(
            db=db,
            document_id=final_document.id,
            department=routed_department,
            message=notification_message
        )
        print(f"Notification created for department: {routed_department}")


    # --- 8. Cleanup Local Files ---
    try:
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
        if highlighted_pdf_path and os.path.exists(highlighted_pdf_path):
            os.remove(highlighted_pdf_path)
    except OSError as e:
        print(f"Error during file cleanup: {e}")

    # --- 9. Return Final Response ---
    return {
        "message": "Document processed and all data saved successfully.",
        "document_info": schemas.Document.model_validate(final_document),
        "highlighted_pdf_url": highlighted_public_url
    }

# --- Read Endpoints ---
@app.get("/documents/", response_model=list[schemas.Document])
def read_all_documents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    documents = crud.get_all_documents(db, skip=skip, limit=limit)
    return documents

@app.get("/documents/{department}", response_model=list[schemas.Document])
def read_documents_for_department(department: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    documents = crud.get_documents_by_department(db, department=department, skip=skip, limit=limit)
    return documents

# --- ADD THESE NEW ENDPOINTS FOR Q&A ---

def run_ml_qna_in_background(question_id: uuid.UUID, pinecone_pdf_id: str, question_text: str):
    print(f"[BACKGROUND TASK] Starting ML RAG pipeline for question ID: {question_id}")

    # Call the ML function to get the answer
    answer_text = generate_ml_answer(
        pdf_id=pinecone_pdf_id, # <--- This now uses the correct filename ID
        query=question_text
    )
    print(f"[BACKGROUND TASK] Answer generated: {answer_text[:100]}...")

    # Use the CRUD function to save the answer to the database
    db = SessionLocal()
    try:
        # Use the new 'db' session to update the database
        crud.update_question_with_answer(
            db=db,
            question_id=question_id,
            answer_text=answer_text
        )
        print(f"[BACKGROUND TASK] Answer saved to database for question ID: {question_id}")
    finally:
        db.close()

@app.post("/documents/{document_id}/questions", response_model=schemas.Question)
def ask_question_on_document(
        document_id: uuid.UUID,
        question: schemas.QuestionCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db)
):
    """
    Endpoint for the frontend to submit a new question.
    It saves the question, calls the ML RAG pipeline to generate a real answer,
    and saves the answer to the database.
    """
    # First, fetch the document to get its uploader's ID
    document = crud.get_document_by_id(db, document_id=document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    user_id_who_asked = document.uploader_id

    # Create the question in the database with a NULL answer first
    db_question = crud.create_question(
        db=db,
        document_id=document_id,
        user_id=user_id_who_asked,
        question=question
    )
    print(f"New question saved with ID: {db_question.id}. Triggering background ML task.")


    pinecone_pdf_id = os.path.splitext(os.path.basename(unquote(document.file_path)))[0]

    background_tasks.add_task(
        run_ml_qna_in_background,
        db_question.id,
        pinecone_pdf_id, # <--- Pass the correct filename ID
        question.question_text,
    )
    # --- END OF KEY CHANGE ---

    # Return the new question object to the frontend immediately.
    # The frontend will see that `answer_text` is still null.
    return db_question


@app.get("/documents/{document_id}/questions", response_model=List[schemas.Question])
def get_document_questions(
        document_id: uuid.UUID,
        db: Session = Depends(get_db) # Ensure there are no typos like 'get_d b'
):
    """
    Endpoint for the frontend to retrieve the full conversation history
    (all questions and their answers) for a document.
    """
    return crud.get_questions_for_document(db=db, document_id=document_id)


# --- ADD THIS NEW ENDPOINT FOR EMAIL AUTOMATION ---


@app.patch("/questions/{question_id}/answer")
def submit_answer(
        question_id: uuid.UUID,
        answer: schemas.Answer,
        db: Session = Depends(get_db)
):
    """
    INTERNAL ENDPOINT for the ML service to submit its generated answer
    for a question that has already been created.
    """
    updated_question = crud.update_question_with_answer(
        db=db,
        question_id=question_id,
        answer_text=answer.answer_text
    )
    if not updated_question:
        raise HTTPException(status_code=404, detail="Question not found")

    print(f"Answer submitted for question ID: {question_id}")
    return {"status": "success", "question": updated_question}


# --- NEW ENDPOINT FOR NOTIFICATIONS ---
@app.get("/notifications/{department}", response_model=List[schemas.Notification])
def read_notifications(department: str, db: Session = Depends(get_db)):
    """Fetches unread notifications for a given department."""
    notifications = crud.get_notifications_for_department(db, department=department)
    return notifications
