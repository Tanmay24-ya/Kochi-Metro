# backend/run_deadline_checker.py
import time
import re
from datetime import datetime, timedelta
import dateparser

# These imports are necessary to talk to your database
from database import SessionLocal
import crud

def check_upcoming_deadlines():
    """
    Scans documents for deadlines using a flexible date parser and creates notifications.
    """
    print("--- Checking for upcoming deadlines... ---")
    db = SessionLocal()
    try:
        all_documents = crud.get_all_documents(db)
        today = datetime.now().date()
        reminder_days = {10, 5, 2, 1}

        for doc in all_documents:
            if not doc.deadlines:
                continue

            # --- THIS IS THE NEW, SMARTER LOGIC ---
            unique_deadline_dates = set()

            # First, extract and parse all unique dates from the deadline strings
            for deadline_str in doc.deadlines:
                # dateparser can find and parse dates like "October 15, 2025", "next Tuesday", "10/15/25"
                parsed_date = dateparser.parse(deadline_str, settings={'PREFER_DATES_FROM': 'future'})

                if parsed_date:
                    unique_deadline_dates.add(parsed_date.date())

            # Now, check each unique date
            for deadline_date in unique_deadline_dates:
                days_until = (deadline_date - today).days

                if days_until in reminder_days:
                    # Check if a reminder for this document was already created today
                    existing_notifs = crud.get_notifications_for_department(db, doc.department)
                    already_notified_today = any(
                        f"deadline is approaching" in n.message and n.document_id == doc.id
                        for n in existing_notifs if n.created_at.date() == today
                    )

                    if not already_notified_today:
                        message = f"REMINDER: A deadline for '{doc.title}' is in {days_until} day(s) on {deadline_date.strftime('%Y-%m-%d')}."
                        crud.create_notification(db, doc.id, doc.department, message)
                        print(f"✅ Created deadline reminder for '{doc.title}' in department: {doc.department}")
            # --- END OF NEW LOGIC ---

    finally:
        db.close()

# --- MAIN LOOP ---
if __name__ == "__main__":
    print("✅ Starting Deadline Checker Service...")
    while True:
        try:
            check_upcoming_deadlines()
            print("--- Deadline check complete. Waiting for 30 seconds... ---")
            time.sleep(30)
        except Exception as e:
            print(f"An error occurred in the deadline checker: {e}. Retrying in 5 minutes...")
            time.sleep(300)