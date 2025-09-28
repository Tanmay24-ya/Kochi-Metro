# backend/main.py
from typing import List
import uuid
# --- Standard Imports ---
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
import os
import shutil # Important for file operations
from pipeline import pipeline_process_pdf # Your ML pipeline import

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

app = FastAPI()

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

def generate_simple_answer(question: str, document: models.Document) -> str:
    """
    A simple, rule-based engine to answer questions based on pre-processed data.
    """
    question_lower = question.lower()

    # Rule 1: Check for keywords related to deadlines
    if any(keyword in question_lower for keyword in ["deadline", "date", "when"]):
        if document.deadlines and len(document.deadlines) > 0:
            # Format the list of deadlines into a nice string
            deadlines_str = "\n".join([f"- {d}" for d in document.deadlines])
            return f"Based on the document, the following deadlines or key dates were identified:\n{deadlines_str}"
        else:
            return "No specific deadlines or key dates were extracted from this document."

    # Rule 2: Check for keywords related to financials
    if any(keyword in question_lower for keyword in ["financial", "money", "cost", "payment"]):
        if document.financial_terms and len(document.financial_terms) > 0:
            financial_str = "\n".join([f"- {f}" for f in document.financial_terms])
            return f"The following financial terms or figures were mentioned in the document:\n{financial_str}"
        else:
            return "No specific financial terms or figures were extracted from this document."

    # Rule 3: Default to providing the summary
    # This will catch "what is this about?", "summarize", etc.
    if document.summary:
        return f"Here is the summary of the document:\n\n{document.summary}"

    return "I could not find a specific answer, but this document has not yet been summarized."

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
        title: str = Form(...),
        department: str = Form(...), # Department from form is now a suggestion/fallback
        user_id: str = Form(...),
        file: UploadFile = File(...),
        db: Session = Depends(get_db)
):
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Uploader not found")

    # Save a temporary local copy of the file for processing
    local_file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
    try:
        with open(local_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file locally: {str(e)}")
    finally:
        file.file.seek(0) # Rewind the file stream for the next operation

    # (1) Run the ML Pipeline on the local file
    print("Starting ML pipeline processing...")
    result = pipeline_process_pdf(local_file_path)
    print("ML pipeline processing complete.")

    # (2) Upload the original file to Supabase for permanent storage
    print("Uploading original file to cloud storage...")
    public_url = upload_file_to_supabase(file.file, file.filename)
    if not public_url:
        raise HTTPException(status_code=500, detail="Could not upload file to cloud storage.")
    print("File uploaded to cloud successfully.")

    # (3) Assemble all data (from form and ML pipeline) into the correct schema
    # This prepares the complete data package for the database.
    document_data_to_save = schemas.DocumentCreate(
        title=title,
        department=result.get("department", department), # Use ML result, fallback to user input
        summary=result.get("summary"),
        deadlines=result.get("deadlines", []),
        financial_terms=result.get("financials", [])
    )

    # (4) Call the updated CRUD function to save everything to the database
    print("Saving document metadata and ML results to the database...")
    db_document = crud.create_document(
        db=db,
        document=document_data_to_save,
        file_path=public_url,
        user_id=user_id
    )
    print(f"All data saved for document ID: {db_document.id}")

    return {
        "message": "Document processed and all data saved successfully.",
        "document_info": schemas.Document.model_validate(db_document)
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

@app.post("/documents/{document_id}/questions", response_model=schemas.Question)
def ask_question_on_document(
        document_id: uuid.UUID,
        question: schemas.QuestionCreate,
        db: Session = Depends(get_db)
):
    # First, fetch the document to get its summary and other details
    document = crud.get_document_by_id(db, document_id=document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Use the original uploader's ID as the person asking the question
    user_id_who_asked = document.uploader_id

    # Create the question in the database with a NULL answer first
    db_question = crud.create_question(
        db=db,
        document_id=document_id,
        user_id=user_id_who_asked,
        question=question
    )
    print(f"New question received and saved with ID: {db_question.id}")

    # NOW, GENERATE AND SAVE THE ANSWER
    print("Generating simple answer...")
    answer_text = generate_simple_answer(question.question_text, document)

    # Update the question in the database with the answer we just generated
    updated_question = crud.update_question_with_answer(
        db=db,
        question_id=db_question.id,
        answer_text=answer_text
    )
    print("Answer generated and saved.")

    return updated_question


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