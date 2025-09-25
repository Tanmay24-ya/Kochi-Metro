# backend/main.py

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

# --- ROBUST CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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