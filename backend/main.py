# backend/main.py

# --- Standard Imports ---
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from sqlalchemy import text

# --- Middleware Import ---
from fastapi.middleware.cors import CORSMiddleware

# --- Local Module Imports ---
import crud
import models
import schemas
from database import engine, get_db
from supabase_utils import upload_file_to_supabase # --- (1) IMPORT FOR SUPABASE ---

# This creates the database tables in your Neon database if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- (2) ROBUST CORS MIDDLEWARE ---
# This permissive setting is good for development.
# For production, you would restrict origins to your actual frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# --- Diagnostic Endpoints (Good to keep for testing) ---
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

# --- User Management Endpoints (No changes needed here) ---
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

    # --- (3) CORE LOGIC CHANGE: UPLOAD TO SUPABASE ---
    # The old local file saving logic has been completely replaced.
    public_url = upload_file_to_supabase(file.file, file.filename)
    if not public_url:
        raise HTTPException(status_code=500, detail="Could not upload file to cloud storage.")
    # --- END OF CORE LOGIC CHANGE ---

    # Save the PUBLIC URL from Supabase to your PostgreSQL database
    document_schema = schemas.DocumentBase(title=title, department=department)
    db_document = crud.create_document(
        db=db, document=document_schema, file_path=public_url, user_id=user_id
    )

    # The hook for your teammate now contains the public URL
    print(f"Triggering ML pipeline for document ID: {db_document.id} at URL: {public_url}")

    return {
        "message": "Document uploaded successfully to cloud storage.",
        "document_info": schemas.Document.model_validate(db_document)
    }

@app.get("/documents/", response_model=list[schemas.Document])
def read_all_documents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    documents = crud.get_all_documents(db, skip=skip, limit=limit)
    return documents

@app.get("/documents/{department}", response_model=list[schemas.Document])
def read_documents_for_department(department: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    documents = crud.get_documents_by_department(db, department=department, skip=skip, limit=limit)
    return documents