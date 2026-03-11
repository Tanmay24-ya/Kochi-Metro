# backend/supabase_utils.py
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import mimetypes

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_KEY")  # Use service_role key for backend operations
BUCKET_NAME: str = os.getenv("SUPABASE_BUCKET_NAME")

# Use the service_role key for backend uploads
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def upload_file_to_supabase(file, filename: str):
    """
    Uploads a file to Supabase Storage and returns its public URL.
    """
    try:
        file_content = file.read()
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type is None:
            mime_type = 'application/octet-stream'

        # Upload with service_role key to bypass RLS
        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=file_content,
            file_options={
                "content-type": mime_type,
                "upsert": "true"
            }
        )

        # Get public URL
        response = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        return response
    except Exception as e:
        print(f"Error uploading to Supabase: {e}")
        return None
