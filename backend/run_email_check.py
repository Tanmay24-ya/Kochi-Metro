# backend/run_email_check.py
import requests
import time

API_URL = "http://127.0.0.1:8000/emails/process-attachments"

def check_emails():
    print("--- Triggering email check... ---")
    try:
        response = requests.post(API_URL)
        response.raise_for_status() # Raise an exception for bad status codes
        print(f"Response: {response.json()}")
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Could not connect to the backend: {e}")

if __name__ == "__main__":
    while True:
        check_emails()
        # Wait for 60 seconds before checking again
        print("--- Waiting for 60 seconds... ---")
        time.sleep(60)