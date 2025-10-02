# Use a full-featured Debian "Bullseye" image.
FROM python:3.11-bullseye
# --- (1) INSTALL SYSTEM DEPENDENCIES AS ROOT ---
# This must be done before we switch to a non-root user.
RUN apt-get update && apt-get install -y --no-install-recommends --fix-missing \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-mal \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# --- (2) CREATE A NON-ROOT USER ---
# Create a new user 'appuser' and set /code as its home directory.
RUN useradd -ms /bin/bash -d /code appuser

# Set the working directory.
WORKDIR /code

# --- (3) SET ENVIRONMENT VARIABLES ---
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV HF_HOME="/code/.cache"
ENV TRANSFORMERS_CACHE="/code/.cache"

# --- (4) INSTALL PYTHON DEPENDENCIES ---
# Copy requirements first for caching.
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# --- (5) COPY THE APPLICATION CODE ---
# Copy the rest of the code.
COPY . /code/

# --- (6) CACHE MODELS AND SET FINAL PERMISSIONS ---
# These commands will run as root to download models into the cache.
RUN python -m spacy download en_core_web_md
RUN python -c "from transformers import pipeline; pipeline('ner', model='ai4bharat/IndicNER')"
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"
RUN python -c "from transformers import AutoModelForSequenceClassification; AutoModelForSequenceClassification.from_pretrained('Shrut04/Fine_tunned_indic_bert_on_documents')"
# CRITICAL: Change ownership of the entire /code directory to our new user.
RUN chown -R appuser:appuser /code

# --- (7) SWITCH TO THE NON-ROOT USER ---
# From this point on, the container will run as 'appuser'.
USER appuser

# --- (8) DEFINE THE RUN COMMAND ---
# This command will be executed by 'appuser', which now owns all the files.
CMD gunicorn -w 2 -k uvicorn.workers.UvicornWorker --timeout 120 --bind "0.0.0.0:${PORT:-7860}" main:app