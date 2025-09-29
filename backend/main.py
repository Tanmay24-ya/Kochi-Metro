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

from pipeline import highlight_text
from ml_qna import qna as generate_ml_answer

from email_automation import download_attached_file
import imaplib
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
    print("[INFO] Server starting up. Loading ML models...")
    tokenizer, model, nlp_model = load_all_models()
    ml_models["tokenizer"] = tokenizer
    ml_models["model"] = model
    ml_models["nlp_model"] = nlp_model
    print("[INFO] ML models loaded successfully and are ready.")
    yield
    # This code runs when the server shuts down
    ml_models.clear()
    print("[INFO] Server shutting down.")


app = FastAPI(lifespan=lifespan)

# This list now includes the new port your frontend is using
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3003", # <-- ADD THIS LINE
    "http://127.0.0.1:3003", # <-- And this one for good measure
    # "http://localhost:3003", # <-- ADD THIS LINE
    # "http://127.0.0.1:3003", # <-- And this one for good measure
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

# def generate_simple_answer(question: str, document: models.Document) -> str:
#     """
#     A simple, rule-based engine to answer questions based on pre-processed data.
#     """
#     question_lower = question.lower()
#
#     # Rule 1: Check for keywords related to deadlines
#     if any(keyword in question_lower for keyword in ["deadline", "date", "when"]):
#         if document.deadlines and len(document.deadlines) > 0:
#             # Format the list of deadlines into a nice string
#             deadlines_str = "\n".join([f"- {d}" for d in document.deadlines])
#             return f"Based on the document, the following deadlines or key dates were identified:\n{deadlines_str}"
#         else:
#             return "No specific deadlines or key dates were extracted from this document."
#
#     # Rule 2: Check for keywords related to financials
#     if any(keyword in question_lower for keyword in ["financial", "money", "cost", "payment"]):
#         if document.financial_terms and len(document.financial_terms) > 0:
#             financial_str = "\n".join([f"- {f}" for f in document.financial_terms])
#             return f"The following financial terms or figures were mentioned in the document:\n{financial_str}"
#         else:
#             return "No specific financial terms or figures were extracted from this document."
#
#     # Rule 3: Default to providing the summary
#     # This will catch "what is this about?", "summarize", etc.
#     if document.summary:
#         return f"Here is the summary of the document:\n\n{document.summary}"
#
#     return "I could not find a specific answer, but this document has not yet been summarized."

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
        department: str = Form(...),
        user_id: str = Form(...),
        file: UploadFile = File(...),
        db: Session = Depends(get_db)
):
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Uploader not found")

    # --- (1) UPLOAD TO CLOUD FIRST ---
    print("Uploading original file to cloud storage...")
    public_url = upload_file_to_supabase(file.file, file.filename)
    if not public_url:
        raise HTTPException(status_code=500, detail="Could not upload file to cloud storage.")
    print("File uploaded successfully. Public URL:", public_url)

    # Rewind file for local saving
    file.file.seek(0)

    # --- (2) CREATE INITIAL DATABASE RECORD ---
    # Create the document with a 'processing' status
    document_data = schemas.DocumentCreate(title=title, department=department)


    db_document = crud.create_document(db=db, document=document_data, file_path=public_url, highlighted_file_path=None, user_id=user_id)
    # Set status to processing
    db_document.status = "processing"
    db.commit()
    db.refresh(db_document)
    print(f"Initial document record created in DB with ID: {db_document.id}")

    # --- (3) SAVE LOCAL COPY & RUN PIPELINE ---
    local_file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
    with open(local_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print("Starting ML pipeline processing...")
    # Pass the DATABASE UUID to the pipeline
    ml_results = pipeline_process_pdf(
        pdf_path=local_file_path,
        document_id=str(db_document.id),
        clf_tokenizer=ml_models["tokenizer"],
        clf_model=ml_models["model"],
        nlp_model=ml_models["nlp_model"]
    )
    print("ML pipeline processing complete.")

    highlighted_pdf_path = ml_results.get("highlighted_pdf")
    highlighted_public_url = None
    if highlighted_pdf_path and os.path.exists(highlighted_pdf_path):
        print("Uploading highlighted file to cloud storage...")
        with open(highlighted_pdf_path, "rb") as f:
            # Use the filename from the path for uploading
            highlighted_filename = os.path.basename(highlighted_pdf_path)
            highlighted_public_url = upload_file_to_supabase(f, highlighted_filename)
        print("Highlighted PDF uploaded successfully.")

    # --- (4) UPDATE THE RECORD WITH ML RESULTS ---
    print("Updating database record with ML results...")
    final_document = crud.update_document_with_ml_results(db, document_id=db_document.id, ml_results=ml_results, highlighted_file_path=highlighted_public_url)
    print("Database record updated successfully.")

    try:
        if os.path.exists(local_file_path):
            os.remove(local_file_path)
        if highlighted_pdf_path and os.path.exists(highlighted_pdf_path):
            os.remove(highlighted_pdf_path)
    except OSError as e:
        print(f"Error during file cleanup: {e}")

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

def run_ml_qna_in_background(question_id: uuid.UUID, document_id: uuid.UUID, question_text: str, db: Session):
    """
    This function is executed in the background after the user gets their response.
    It runs the ML pipeline and updates the answer in the database.
    """
    print(f"[BACKGROUND TASK] Starting ML RAG pipeline for question ID: {question_id}")

    # Call the ML function to get the answer
    answer_text = generate_ml_answer(
        pdf_id=str(document_id),
        query=question_text
    )
    print(f"[BACKGROUND TASK] Answer generated: {answer_text[:100]}...")

    # Use the CRUD function to save the answer to the database
    crud.update_question_with_answer(
        db=db,
        question_id=question_id,
        answer_text=answer_text
    )
    print(f"[BACKGROUND TASK] Answer saved to database for question ID: {question_id}")


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


    background_tasks.add_task(
        run_ml_qna_in_background,
        db_question.id,
        document_id,
        question.question_text,
        db
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
@app.post("/emails/process-attachments")
def process_email_attachments(db: Session = Depends(get_db)):
    """
    Connects to the email server, downloads new PDF attachments,
    and processes them through the ML pipeline.
    """
    print("[INFO] Checking for new email attachments...")
    EMAIL_USER = os.getenv("EMAIL_USER")
    EMAIL_PASS = os.getenv("EMAIL_PASS")

    if not EMAIL_USER or not EMAIL_PASS:
        raise HTTPException(status_code=500, detail="Email credentials not configured in .env file.")

    try:
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(EMAIL_USER, EMAIL_PASS)

        # This function comes from your email_automation.py
        downloaded_files = download_attached_file(mail, 'INBOX', UPLOAD_DIRECTORY)

        mail.logout()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect or download from email: {e}")

    processed_count = 0
    if downloaded_files:
        print(f"[INFO] Found {len(downloaded_files)} new PDFs to process.")
        for pdf_path in downloaded_files:
            # We need a placeholder user for automated uploads
            user_id = "automation_user"
            # Check if the user exists, if not, create it
            user = crud.get_user(db, user_id=user_id)
            if not user:
                user_data = schemas.UserCreate(id=user_id, name="Automation Service", department="System", role="system", password="---")
                crud.create_user(db, user_data)

            # Simulate a file upload for the pipeline
            with open(pdf_path, "rb") as f:
                file = UploadFile(file=f, filename=os.path.basename(pdf_path))
                # Re-use the existing upload logic
                upload_document(title=file.filename, department="auto-detected", user_id=user_id, file=file, db=db)
            processed_count += 1

    return {"message": "Email check complete.", "new_pdfs_processed": processed_count}


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