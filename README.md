# DocuSphere - Intelligent Document Hub for KMRL 🚀

An AI-driven platform designed to transform document overload into clear, actionable knowledge for Kochi Metro Rail Limited (KMRL). This project provides a unified system to manage, summarize, and route thousands of documents, empowering stakeholders with faster decisions and preserved institutional memory.

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [1. Cloud Services Setup](#1-cloud-services-setup)
    - [2. Backend Setup](#2-backend-setup)
    - [3. Frontend Setup](#3-frontend-setup)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [Next Steps](#next-steps)

## Project Overview

Kochi Metro Rail Limited (KMRL) generates a massive volume of diverse documents daily. This information overload creates operational bottlenecks and compliance risks. **DocuSphere** tackles this challenge by providing an intelligent ecosystem with a powerful backend, a responsive frontend, and a decoupled ML service for document processing.

## System Architecture

DocuSphere uses a modern, decoupled architecture with distinct services for the frontend, backend, database, file storage, and ML processing.


## Tech Stack

- **Frontend:**
    - [Next.js](https://nextjs.org/) (React Framework) & TypeScript
    - [Tailwind CSS](https://tailwindcss.com/)

- **Backend:**
    - [FastAPI](https://fastapi.tiangolo.com/) (Python API Framework)
    - [SQLAlchemy](https://www.sqlalchemy.org/) (ORM for PostgreSQL)

- **Database (Cloud):**
    - [Neon](https://neon.tech/): Serverless PostgreSQL for metadata and user info.

- **File Storage (Cloud):**
    - [Supabase Storage](https://supabase.com/storage): For storing all user-uploaded documents (PDFs, etc.).

- **ML Pipeline:**
    - **Summarization:** Google Gemini 1.5 Flash via LangChain
    - **Embeddings:** `sentence-transformer/all-MiniLM-L6-v2`
    - **Vector Database:** [Pinecone](https://www.pinecone.io/)

## Getting Started

Follow these steps to set up and run the entire project locally.

### Prerequisites

You must have the following software installed:
- [Node.js](https://nodejs.org/) (v18 or later)
- [Python](https://www.python.org/) (v3.10 or later) & `pip`

### 1. Cloud Services Setup

This project relies on two free cloud services. You must set these up first to get the required API keys.

**a. Neon (PostgreSQL Database):**
1.  Sign up for a free account at [Neon.tech](https://neon.tech/).
2.  Create a new project.
3.  From your project dashboard, click **"Connect"**.
4.  Copy the **psql** connection string (make sure "Pooled connection" is unchecked). This will be your `DATABASE_URL`.

**b. Supabase (File Storage):**
1.  Sign up for a free account at [Supabase.com](https://supabase.com/).
2.  Create a new project.
3.  Go to the **Storage** section, create a new **public bucket** (e.g., name it `documents`).
4.  Go to **Settings > API**. Here you will find:
    - The **Project URL** (your `SUPABASE_URL`).
    - The **`service_role` secret key** (your `SUPABASE_KEY`).

### 2. Backend Setup

1.  **Navigate to the `backend` directory:**
    ```bash
    cd backend
    ```
2.  **Create the `.env` File:**
    Create a file named `.env` and fill it with the credentials from the cloud setup step. See the [Environment Variables](#environment-variables) section for a template.

3.  **Install Dependencies:**
    Create and activate a Python virtual environment, then install packages.
    ```bash
    # Create venv
    python -m venv venv

    # Activate (Windows)
    .\venv\Scripts\activate
    # Activate (macOS/Linux)
    # source venv/bin/activate

    # Install
    pip install "fastapi[all]" sqlalchemy psycopg2-binary passlib[bcrypt] python-dotenv python-multipart supabase
    ```

### 3. Frontend Setup

1.  **Navigate to the `frontend` directory:**
    ```bash
    cd frontend
    ```
2.  **Create the `.env.local` File:**
    Create a file named `.env.local` and add the required environment variables. See the [Environment Variables](#environment-variables) section for a template.

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

## Running the Application

You need **two separate terminals** to run the full application.

**Terminal 1: Start the Backend**
```bash
# In the /backend directory
# Make sure your virtual environment is active
uvicorn main:app --reload

The backend will be running at http://127.0.0.1:8000.
Terminal 2: Start the Frontend
code
Bash
# In the /frontend directory
npm run dev
The frontend will be available at http://localhost:3000.