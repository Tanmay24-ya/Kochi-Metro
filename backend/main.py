# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import crud, models, schemas
from database import SessionLocal, engine, get_db
import os
import shutil

# This creates the database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Directory to save uploaded files
UPLOAD_DIRECTORY = "uploads"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user.id)
    if db_user:
        raise HTTPException(status_code=400, detail="User ID already registered")
    return crud.create_user(db=db, user=user)

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
        "document_info": schemas.Document.from_orm(db_document)
    }

@app.get("/documents/{department}", response_model=list[schemas.Document])
def read_documents_for_department(department: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    documents = crud.get_documents_by_department(db, department=department, skip=skip, limit=limit)
    return documents