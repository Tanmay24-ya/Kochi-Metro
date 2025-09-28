import re
import unicodedata
from collections import Counter
from pathlib import Path
import io
import argparse
import os
import pymupdf # fitz
from PIL import Image, ImageOps, ImageFilter
import pytesseract
import spacy
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Aapke local modules
from ner_functions import ner_extraction, get_deadline, get_financial_details
import gen_ai1

# ==================== CONFIGURATION ====================
MAX_CHUNK_TOKENS = 256
CHUNK_TOKEN_OVERLAP = 40
BASE_DIR = Path(r"D:\clony\Doc_Load_Automation").resolve()
LOCAL_CLF_DIR = BASE_DIR / "models" / "kmrl_final_model" # Fine-tuned model ka path

device = "cuda" if torch.cuda.is_available() else "cpu"
NLP_MODEL = spacy.load("en_core_web_md")


def clean_text(text):
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[^A-Za-z0-9\s.,;:!?()'\-\"@%$&]", " ", text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def chunk_text_tokenwise(text, tokenizer):
    token_ids = tokenizer.encode(text, add_special_tokens=False)
    chunks = []
    start = 0
    while start < len(token_ids):
        end = min(start + MAX_CHUNK_TOKENS, len(token_ids))
        chunk_ids = token_ids[start:end]
        chunk_text = tokenizer.decode(chunk_ids, skip_special_tokens=True)
        chunks.append(chunk_text)
        start += MAX_CHUNK_TOKENS - CHUNK_TOKEN_OVERLAP
    return chunks


def load_classification_model():
    print(f"[INFO] Loading classification model from: {LOCAL_CLF_DIR}")
    if not LOCAL_CLF_DIR.exists():
        raise FileNotFoundError(f"Model directory not found at {LOCAL_CLF_DIR}.")
    tokenizer = AutoTokenizer.from_pretrained(LOCAL_CLF_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(LOCAL_CLF_DIR).to(device)
    return tokenizer, model


def classify_text_chunk(chunk, tokenizer, model):
    inputs = tokenizer(chunk, padding=True, truncation=True, max_length=512, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model(**inputs)
    pred_index = outputs.logits.argmax(dim=-1).cpu().item()
    return model.config.id2label.get(pred_index, "Unknown")


def load_all_models():
    clf_tokenizer, clf_model = load_classification_model()
    nlp_model = NLP_MODEL
    return clf_tokenizer, clf_model, nlp_model

# ==================== EXTRACTION FUNCTIONS ====================

#//--- CHANGE START ---//
# Yeh naya master function hai jo digital text, tables, aur scanned images, teeno ko handle karta hai.

def extract_text_from_hybrid_pdf(pdf_path):
    doc = pymupdf.open(pdf_path)
    full_text_content = ""
    print(f"[INFO] Starting hybrid extraction for PDF: {pdf_path.name}")
    
    for page_num, page in enumerate(doc, start=1):
        page_text = ""
        # 1. Digital Text nikaalo
        page_text += page.get_text("text", sort=True)
        
        # 2. Digital Tables nikaalo
        tables = page.find_tables()
        if tables:
            for table in tables:
                try:
                    table_data = table.extract()
                    table_text = "\n".join([" | ".join(map(str, row)) for row in table_data])
                    page_text += f"\n--- TABLE START ---\n{table_text}\n--- TABLE END ---\n"
                except Exception:
                    continue
                    
        # 3. Scanned Images par OCR chalao (aapka original code)
        images = page.get_images(full=True)
        if images:
            print(f"  - Page {page_num}: Found {len(images)} image(s), trying OCR...")
            for img in images:
                xref = img[0]
                try:
                    img_data = doc.extract_image(xref)
                    image = Image.open(io.BytesIO(img_data["image"]))
                    # Image pre-processing (aapke code se)
                    filtered = image.filter(ImageFilter.MedianFilter(size=3))
                    gray = ImageOps.grayscale(filtered)
                    ocr_text = pytesseract.image_to_string(gray)
                    if ocr_text.strip():
                         page_text += f"\n--- OCR TEXT FROM IMAGE START ---\n{ocr_text.strip()}\n--- OCR TEXT FROM IMAGE END ---\n"
                except Exception:
                    continue # Agar image process na ho paaye to aage badho

        full_text_content += page_text + "\n"
        
    doc.close()
    return full_text_content

#//--- CHANGE END ---//


def extract_text_from_image(image_path):
    print(f"[INFO] Extracting text from Image via OCR: {image_path.name}")
    try:
        return pytesseract.image_to_string(Image.open(image_path))
    except Exception as e:
        print(f"[ERROR] Could not process image: {e}")
        return ""


def extract_text_from_txt(text_path):
    print(f"[INFO] Reading text from file: {text_path.name}")
    return text_path.read_text(encoding='utf-8')


# ==================== CORE PROCESSING PIPELINE (No Change) ====================

def process_extracted_text(full_text, file_id, clf_tokenizer, clf_model, nlp_model):
    if not full_text.strip():
        return {"department": "Unknown", "summary": "No text found.", "deadlines": [], "financials": []}
    cleaned_text = clean_text(full_text)
    ner_results = ner_extraction(cleaned_text, nlp_model)
    chunks = chunk_text_tokenwise(cleaned_text, clf_tokenizer)
    gen_ai1.encode(file_id, 1, chunks)
    dept_votes = [classify_text_chunk(chunk, clf_tokenizer, clf_model) for chunk in chunks]
    dominant_dept = Counter(dept_votes).most_common(1)[0][0] if dept_votes else "Unknown"
    summary = gen_ai1.create_summary(file_id)
    return {
        "department": dominant_dept, "summary": summary,
        "deadlines": ner_results.get("deadlines", []), "financials": ner_results.get("financials", []),
    }


# ==================== MAIN DISPATCHER (No Change) ====================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unified Document Processing Pipeline")
    parser.add_argument("input_file", help="Path to the input file")
    args = parser.parse_args()
    input_path = Path(args.input_file)
    
    if not input_path.exists():
        print(f"[ERROR] File not found: {input_path}")
    else:
        print("[INFO] Loading all models...")
        tokenizer, model, nlp_model = load_all_models()
        
        file_id = input_path.stem
        suffix = input_path.suffix.lower()
        extracted_text = ""
        
        if suffix == '.pdf':
            #//--- CHANGE START ---//
            # Yahan ab naya hybrid function call ho raha hai
            extracted_text = extract_text_from_hybrid_pdf(input_path)
            #//--- CHANGE END ---//
        elif suffix in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']:
            extracted_text = extract_text_from_image(input_path)
        elif suffix == '.txt':
            extracted_text = extract_text_from_txt(input_path)
        else:
            print(f"[ERROR] Unsupported file type: '{suffix}'")
            exit()
            
        print("\n[INFO] Text extracted. Starting core processing...")
        results = process_extracted_text(extracted_text, file_id, tokenizer, model, nlp_model)
        
        print("\n================ Pipeline Output ================\n")
        print(f"Dominant Department: {results.get('department', 'N/A')}")
        print(f"\nSummary:\n{results.get('summary', 'N/A')}")
        print(f"\nDeadlines found: {results.get('deadlines', [])}")
        print(f"\nFinancial terms found: {results.get('financials', [])}")