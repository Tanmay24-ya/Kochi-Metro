import re
import unicodedata
from collections import Counter
from pathlib import Path
import io
import argparse
import os
import pymupdf
from PIL import Image, ImageOps, ImageFilter
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'D:\Softwares\tesseract\tesseract.exe'
import spacy
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from ner_functions import ner_extraction, get_deadline, get_financial_details
import gen_ai1

# ==================== CONFIGURATION ====================
MAX_CHUNK_TOKENS = 256
CHUNK_TOKEN_OVERLAP = 40
CURRENT_DIR = Path(__file__).resolve().parent
CLASSIFICATION_MODEL_PATH = CURRENT_DIR / "models" / "Fine_Tunned_Classi"

# CLASSIFICATION_MODEL_NAME = "models/Fine_Tunned_Classi"  # Updated model path
#
# BASE_DIR = Path(r"D:\clony\Doc_Load_Automation").resolve()
# LOCAL_CLF_DIR = BASE_DIR / "models" / "classifier"

classification_dept_map = {
    0: "Finance",
    1: "Operations",
    2: "HR",
    3: "Engineering"
}

device = "cuda" if torch.cuda.is_available() else "cpu"
NLP_MODEL = spacy.load("en_core_web_md")


def clean_text_english(text):
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[^A-Za-z0-9\s.,;:!?()'\-\"@%$&]", " ", text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_page_text(page, doc):
    raw_text = ""
    for block in page.get_text("blocks"):
        txt = block[4].strip()
        if txt:
            raw_text += " " + txt

    images = page.get_images(full=True)
    for img in images:
        xref = img[0]
        try:
            img_data = doc.extract_image(xref)
            image = Image.open(io.BytesIO(img_data["image"]))
        except Exception:
            continue

        filtered = image.filter(ImageFilter.MedianFilter(size=3))
        gray = ImageOps.grayscale(filtered)
        scale = 300 / 72
        base_w = min(int(gray.width * scale), 2500)
        base_h = min(int(gray.height * scale), 2500)
        gray_resized = gray.resize((base_w, base_h), Image.LANCZOS)

        try:
            ocr_text = pytesseract.image_to_string(gray_resized)
            raw_text += " " + ocr_text
        except Exception:
            continue

    return raw_text.strip()


def chunk_text_tokenwise(text, tokenizer, max_tokens=MAX_CHUNK_TOKENS, overlap=CHUNK_TOKEN_OVERLAP):
    token_ids = tokenizer.encode(text, add_special_tokens=False)
    chunks = []
    start = 0
    while start < len(token_ids):
        end = min(start + max_tokens, len(token_ids))
        chunk_ids = token_ids[start:end]
        chunk_text = tokenizer.decode(chunk_ids, skip_special_tokens=True, clean_up_tokenization_spaces=True)
        chunks.append(chunk_text)
        start += max_tokens - overlap
    return chunks


def load_classification_model():
    """
    Loads the classification model using a hybrid approach:
    - The TOKENIZER is loaded from the original base model on the Hub.
    - The fine-tuned MODEL WEIGHTS are loaded from the local directory.
    """
    # Based on your config.json, the original base model is almost certainly this:
    ORIGINAL_BASE_MODEL_NAME = "bert-base-uncased"

    print(f"[INFO] Loading tokenizer for '{ORIGINAL_BASE_MODEL_NAME}' from Hugging Face Hub...")
    try:
        # Load the tokenizer from the public, original BERT model
        tokenizer = AutoTokenizer.from_pretrained(ORIGINAL_BASE_MODEL_NAME)
    except Exception as e:
        print(f"ERROR: Could not download the tokenizer '{ORIGINAL_BASE_MODEL_NAME}'. Check your internet connection.")
        raise e

    print(f"[INFO] Loading fine-tuned model weights from local path: {CLASSIFICATION_MODEL_PATH}")
    if CLASSIFICATION_MODEL_PATH.exists():
        # Load your fine-tuned model from the local path
        model = AutoModelForSequenceClassification.from_pretrained(CLASSIFICATION_MODEL_PATH).to(device)
    else:
        raise FileNotFoundError(
            f"Classification model not found at path: {CLASSIFICATION_MODEL_PATH}. "
            f"Please ensure the 'Fine_Tunned_Classi' folder is inside 'backend/models/'."
        )

    return tokenizer, model


def classify_text_chunk(chunk, tokenizer, model):
    inputs = tokenizer(chunk, padding=True, truncation=True, max_length=256, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model(**inputs)
    pred = outputs.logits.argmax(dim=-1).cpu().item()
    return classification_dept_map.get(pred, "Unknown")


def load_all_models():
    clf_tokenizer, clf_model = load_classification_model()
    nlp_model = NLP_MODEL
    return clf_tokenizer, clf_model, nlp_model

tokenizer, model, nlp_model = load_all_models()

def pipeline_process_pdf(pdf_path, clf_tokenizer=tokenizer, clf_model=model, nlp_model=nlp_model):
    pdf_id = os.path.splitext(os.path.basename(pdf_path))[0]
    doc = pymupdf.open(pdf_path)

    dept_votes = []
    deadlines_all = []
    financials_all = []

    for page_number, page in enumerate(doc, start=1):
        raw_text = extract_page_text(page, doc)
        if not raw_text:
            continue
        cleaned_text = clean_text_english(raw_text)
        if not cleaned_text:
            continue

        ner_results = ner_extraction(cleaned_text, nlp_model)
        deadlines_all.extend(ner_results.get("deadlines", []))
        financials_all.extend(ner_results.get("financials", []))

        chunks = chunk_text_tokenwise(cleaned_text, tokenizer=clf_tokenizer)
        gen_ai1.encode(pdf_id, page_number,chunks)

        for chunk in chunks:
            dept = classify_text_chunk(chunk, clf_tokenizer, clf_model)
            dept_votes.append(dept)

    dominant_dept = Counter(dept_votes).most_common(1)[0][0] if dept_votes else "Unknown"

    summary = gen_ai1.create_summary(pdf_id)

    return {
        "department": dominant_dept,
        "summary": summary,
        "deadlines": deadlines_all,
        "financials": financials_all,
    }


# if _name_ == "_main_":
#     parser = argparse.ArgumentParser(description="Unified PDF Processing Pipeline")
#     parser.add_argument("pdf_file", help="Path to input PDF file")
#     args = parser.parse_args()

#     print("[INFO] Loading all models...")
#     tokenizer, model, nlp_model = load_all_models()

#     print("[INFO] Processing PDF through pipeline...")
#     results = pipeline_process_pdf(args.pdf_file, tokenizer, model, nlp_model)

#     print("\n================ Pipeline Output ================\n")
#     print(f"Dominant Department: {results['department']}")
#     print(f"\nSummary:\n{results['summary']}")
#     print(f"\nDeadlines found: {results['deadlines']}")
#     print(f"\nFinancial terms found: {results['financials']}")