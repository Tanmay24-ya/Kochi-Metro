# backend/supabase_utils.py
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import mimetypes

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

BUCKET_NAME = os.environ.get("SUPABASE_BUCKET_NAME")

def upload_file_to_supabase(file, filename: str):
    """
    Uploads a file to Supabase Storage and returns its public URL.
    """
    try:
        # Supabase needs the file content as bytes
        file_content = file.read()
        # It also needs the mime type
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type is None:
            mime_type = 'application/octet-stream' # Default fallback

        # Upload the file
        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=file_content,
            file_options={"content-type": mime_type}
        )

        # Get the public URL
        response = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        return response
    except Exception as e:
        # Check if the error is because the file already exists
        if "Duplicate" in str(e):
            print(f"File '{filename}' already exists. Getting its public URL.")
            response = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
            return response
        print(f"Error uploading to Supabase: {e}")
        return None