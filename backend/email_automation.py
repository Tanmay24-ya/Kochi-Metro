# import imaplib
# import email
# import os
# import time
# import requests
# from dotenv import load_dotenv
#
# load_dotenv()
#
# MAIL_SERVER = 'imap.gmail.com'
# # EMAIL_USER = 'shrutj2104@gmail.com'
# # EMAIL_PASS = 'aymw wxrh fmea bxfz'
# EMAIL_USER = os.environ.get("EMAIL_USER")
# EMAIL_PASS = os.environ.get("EMAIL_PASS")
#
# MAIL_BOX = 'INBOX'
# DOWNLOAD_FOLDER = "./downloaded_pdfs"
# BACKEND_UPLOAD_URL = "https://yashita13-kochi-metro-backend.hf.space/documents/upload"
#
# os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)
#
# def upload_file_to_backend(file_path):
#     """
#     Uploads a PDF to the backend. The server will handle setting the defaults.
#     """
#     print(f"--- Uploading {os.path.basename(file_path)} to the server... ---")
#     try:
#         with open(file_path, "rb") as f:
#             # We ONLY need to send the file now. No more payload.
#             files = {"file": (os.path.basename(file_path), f, "application/pdf")}
#             response = requests.post(BACKEND_UPLOAD_URL, files=files) # The 'data' parameter is removed
#             response.raise_for_status()
#
#             print(f"✅ Successfully uploaded and processed {os.path.basename(file_path)}.")
#             return True
#
#     except requests.exceptions.RequestException as e:
#         print(f"❌ ERROR: Failed to upload {os.path.basename(file_path)}.")
#         print(f"Reason: {e}")
#         if e.response:
#             print(f"--- Server's Detailed Error Response ---")
#             try: print(e.response.json())
#             except ValueError: print(e.response.text)
#             print(f"------------------------------------")
#         return False
#
#
# def download_and_process_attachments(mail):
#     """
#     Searches for UNSEEN emails, downloads PDF attachments, and uploads them.
#     """
#     mail.select(MAIL_BOX)
#     # IMPORTANT: Changed to 'UNSEEN' to only process new emails
#     status, mails = mail.search(None, 'UNSEEN')
#     if status != 'OK':
#         print("Error searching for emails.")
#         return
#
#     email_ids = mails[0].split()
#
#     if not email_ids:
#         print("No new emails found.")
#         return
#
#     print(f"Found {len(email_ids)} new emails to process.")
#     for eid in email_ids:
#         _, msg_data = mail.fetch(eid, "(RFC822)")
#         msg = email.message_from_bytes(msg_data[0][1])
#
#         for part in msg.walk():
#             # Skip container parts and parts without a filename
#             if part.get_content_maintype() == 'multipart' or part.get('Content-Disposition') is None:
#                 continue
#
#             filename = part.get_filename()
#             # Check if there is a filename and it ends with .pdf
#             if filename and filename.lower().endswith(".pdf"):
#
#                 # 1. DOWNLOAD the file to a temporary location
#                 filepath = os.path.join(DOWNLOAD_FOLDER, filename)
#                 with open(filepath, 'wb') as f:
#                     f.write(part.get_payload(decode=True))
#                 print(f"Downloaded temporary file: {filepath}")
#
#                 # 2. UPLOAD the file to the backend
#                 upload_success = upload_file_to_backend(filepath)
#
#                 # 3. CLEAN UP the temporary file after processing
#                 try:
#                     os.remove(filepath)
#                     print(f"Cleaned up temporary file: {filepath}")
#                 except OSError as e:
#                     print(f"Error during file cleanup: {e}")
#
#
# if __name__ == "__main__":
#     while True:
#         try:
#             mail = imaplib.IMAP4_SSL(MAIL_SERVER)
#             mail.login(EMAIL_USER, EMAIL_PASS)
#             print("✅ Logged in successfully. Starting to monitor for new emails...")
#
#             while True:
#                 download_and_process_attachments(mail)
#                 print("--- Waiting for 10 seconds before next check... ---")
#                 time.sleep(10)
#
#         except Exception as e:
#             print(f"An unexpected error occurred: {e}")
#             print("--- Attempting to reconnect in 60 seconds... ---")
#             time.sleep(60)

# In: backend/email_automation.py

import imaplib
import email
import os
import requests
from dotenv import load_dotenv

# This loads variables from a local .env file for testing, but uses GitHub Secrets in production
load_dotenv()

MAIL_SERVER = 'imap.gmail.com'
MAIL_BOX = 'INBOX'
DOWNLOAD_FOLDER = "./downloaded_pdfs"

# These are now loaded securely from environment variables (GitHub Secrets)
EMAIL_USER = os.environ.get("EMAIL_USER")
EMAIL_PASS = os.environ.get("EMAIL_PASS")
BACKEND_UPLOAD_URL = os.environ.get("BACKEND_URL") + "/documents/upload"

def upload_file_to_backend(file_path):
    """ Uploads a PDF to the backend. """
    print(f"--- Uploading {os.path.basename(file_path)} to the server... ---")
    try:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, "application/pdf")}
            response = requests.post(BACKEND_UPLOAD_URL, files=files)
            response.raise_for_status()
            print(f"✅ Successfully uploaded and processed {os.path.basename(file_path)}.")
            return True
    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Failed to upload {os.path.basename(file_path)}.")
        print(f"Reason: {e}")
        if e.response:
            try: print(e.response.json())
            except ValueError: print(e.response.text)
        return False

def download_and_process_attachments(mail):
    """ Searches for UNSEEN emails, downloads PDF attachments, and uploads them. """
    mail.select(MAIL_BOX)
    status, mails = mail.search(None, 'UNSEEN')
    if status != 'OK':
        print("Error searching for emails.")
        return

    email_ids = mails[0].split()
    if not email_ids:
        print("No new emails found.")
        return

    print(f"Found {len(email_ids)} new emails to process.")
    for eid in email_ids:
        _, msg_data = mail.fetch(eid, "(RFC822)")
        msg = email.message_from_bytes(msg_data[0][1])

        for part in msg.walk():
            if part.get_content_maintype() == 'multipart' or part.get('Content-Disposition') is None:
                continue
            filename = part.get_filename()
            if filename and filename.lower().endswith(".pdf"):
                filepath = os.path.join(DOWNLOAD_FOLDER, filename)
                with open(filepath, 'wb') as f:
                    f.write(part.get_payload(decode=True))
                print(f"Downloaded: {filepath}")

                upload_file_to_backend(filepath) # Upload the file

                try: # Clean up the file
                    os.remove(filepath)
                    print(f"Cleaned up: {filepath}")
                except OSError as e:
                    print(f"Error during cleanup: {e}")

def main():
    """ The main function that runs the email check once. """
    if not all([EMAIL_USER, EMAIL_PASS, BACKEND_UPLOAD_URL]):
        print("❌ ERROR: Missing one or more required environment variables.")
        return

    os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)
    try:
        mail = imaplib.IMAP4_SSL(MAIL_SERVER)
        mail.login(EMAIL_USER, EMAIL_PASS)
        print("✅ Logged in successfully. Checking for new emails...")
        download_and_process_attachments(mail)
        mail.logout()
        print("--- Email check complete. ---")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()