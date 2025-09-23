# backend/main.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import crud, models, schemas
from database import SessionLocal, engine, get_db
import os
import shutil

# This creates the database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "ok", "service": "kmrl-backend"}

@app.get("/health")
def health():
    return {"status": "ok"}

from sqlalchemy.exc import OperationalError
from sqlalchemy import text

@app.get("/ping-db")
def ping_db(db: Session = Depends(get_db)):
    try:
        # Try to run a simple query to test the connection
        db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Database connection successful."}
    except OperationalError as e:
        # If it fails, raise a detailed error
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # This allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # This allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # This allows all headers
)

# Directory to save uploaded files
UPLOAD_DIRECTORY = "uploads"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

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

@app.post("/documents/upload")
def upload_document(
    title: str = Form(...),
    department: str = Form(...),
    # This user_id would come from a real authentication system (JWT token)
    # For now, we'll pass it in the form.
    user_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # In a real app, verify the user exists
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Uploader not found")

    # Save the file to the 'uploads' directory
    file_path = os.path.join(UPLOAD_DIRECTORY, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create the document metadata in PostgreSQL
    document_schema = schemas.DocumentBase(title=title, department=department)
    db_document = crud.create_document(
        db=db, document=document_schema, file_path=file_path, user_id=user_id
    )

    # --- THIS IS THE HOOK FOR YOUR TEAMMATE ---
    # Here, you would trigger the ML/Chroma pipeline.
    # You can do this by calling another API, adding to a message queue, etc.
    print(f"Triggering ML pipeline for document ID: {db_document.id} at path: {file_path}")
    # teammate_ml_api.process_document(document_id=db_document.id, file_path=file_path)

    return {
        "message": "Document uploaded successfully",
        "document_info": schemas.Document.model_validate(db_document)
    }

@app.get("/documents/", response_model=list[schemas.Document])
def read_all_documents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # In a real app with JWT auth, you would add a dependency here
    # to ensure only an admin can call this.
    documents = crud.get_all_documents(db, skip=skip, limit=limit)
    return documents

@app.get("/documents/{department}", response_model=list[schemas.Document])
def read_documents_for_department(department: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    documents = crud.get_documents_by_department(db, department=department, skip=skip, limit=limit)
    return documents