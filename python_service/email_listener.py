import imaplib
import email
import os
import time
import json
import base64
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai
from privacy import mask, safe_log       # 🛡️ PII log masking
from encryption import encrypt_extracted_data  # 🔐 At-rest encryption

# Load environment variables
load_dotenv()

# Firebase Setup
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Gemini Setup
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-3.1-flash-lite')

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASS = os.getenv("GMAIL_PASS")

app = Flask(__name__)
CORS(app)

# Lock to prevent concurrent email checks (race condition prevention)
email_check_lock = threading.Lock()

def extract_data_with_gemini(image_data, mime_type):
    """
    🛡️ Privacy Note: Only the raw image binary is sent to Gemini.
    No email metadata (sender, subject, body text) is ever included
    in the prompt. The prompt itself contains zero PII.
    """
    prompt = """
    Extract transaction details from this receipt/invoice. 
    Return ONLY a JSON object with:
    {
        "vendor": "Name of the store",
        "amount": 0.00 (as float),
        "category": "One of: Meals & Entertainment, Software & SaaS, Marketing, Office Supplies, Travel, Other",
        "date": "YYYY-MM-DD",
        "confidence": 0.95
    }
    """
    try:
        response = model.generate_content([
            prompt,
            {'mime_type': mime_type, 'data': image_data}
        ])
        # Clean the response text to get valid JSON
        text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception as e:
        # Mask error message in case it echoes back any sensitive data
        print(f"Gemini Error: {mask(str(e))}", flush=True)
        return None

# --- Flask Routes ---

def run_manual_check():
    """Wrapper to run a single IMAP check cycle, protected by a lock."""
    print("Manual sync triggered via Web API...")
    if not email_check_lock.acquire(blocking=False):
        print("Sync skipped: email check already in progress.", flush=True)
        return True  # Return true so frontend gets a success, not an error
    try:
        check_email()
        return True
    except Exception as e:
        print(f"Manual check failed: {e}")
        return False
    finally:
        email_check_lock.release()

@app.route('/sync', methods=['POST'])
def sync_emails():
    """Endpoint to trigger an immediate email check."""
    success = run_manual_check()
    if success:
        return jsonify({"status": "success", "message": "Email sync completed"}), 200
    else:
        return jsonify({"status": "error", "message": "Sync failed"}), 500

@app.route('/extract', methods=['POST'])
def manual_extract():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
    
    file = request.files['file']
    content_type = file.content_type
    payload = file.read()
    
    print(f"Manual upload received: {file.filename} ({content_type})", flush=True)
    
    extracted = extract_data_with_gemini(payload, content_type)
    
    if extracted:
        return jsonify({"success": True, "data": extracted})
    else:
        return jsonify({"success": False, "error": "Failed to extract data"}), 500

# --- Email Listener Logic ---

def check_email():
    try:
        print("Connecting to Gmail IMAP...", flush=True)
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_USER, GMAIL_PASS)
        mail.select("inbox")

        # Search for unseen emails
        status, messages = mail.search(None, '(UNSEEN)')
        if status != "OK":
            return

        message_ids = messages[0].split()
        print(f"Found {len(message_ids)} unseen email(s).", flush=True)

        for msg_id in message_ids:
            status, data = mail.fetch(msg_id, "(RFC822)")
            if status != "OK": continue

            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            attachment_processed = False
            seen_filenames = set()  # Track filenames within this email to avoid duplicates

            # 🛡️ Mask sender info before logging
            sender = mask(msg.get('From', 'Unknown'))
            subject = mask(msg.get('Subject', '(no subject)'))
            print(f"Processing email — From: {sender} | Subject: {subject}", flush=True)
            
            for part in msg.walk():
                if part.get_content_maintype() == 'multipart': continue
                if part.get('Content-Disposition') is None: continue

                filename = part.get_filename()
                if filename:
                    # Skip if we already processed this filename in this email
                    if filename in seen_filenames:
                        print(f"Skipping duplicate attachment in same email: {filename}", flush=True)
                        continue
                    seen_filenames.add(filename)

                    content_type = part.get_content_type().lower()
                    ext = os.path.splitext(filename)[1].lower()
                    payload = part.get_payload(decode=True)
                    
                    if "image" in content_type or "pdf" in content_type or ext in ['.png', '.jpg', '.jpeg', '.pdf']:
                        print(f"Processing attachment: {filename}", flush=True)
                        
                        # Save local preview
                        safe_filename = f"{int(time.time())}-{filename.replace(' ', '_')}"
                        upload_path = os.path.join("..", "backend", "uploads", safe_filename)
                        try:
                            with open(upload_path, "wb") as f:
                                f.write(payload)
                            file_url = f"http://localhost:5000/uploads/{safe_filename}"
                        except Exception as e:
                            print(f"Error saving local preview: {e}", flush=True)
                            file_url = ""

                        extracted = extract_data_with_gemini(payload, content_type)
                        
                        if extracted:
                            # 🔐 Encrypt sensitive financial data before storing in Firestore
                            encrypted_token = encrypt_extracted_data(extracted)
                            # 🛡️ Mask vendor name in logs only — encrypted in DB
                            print(safe_log("Encrypted & saved", extracted.get('vendor', 'Unknown')), flush=True)
                            db.collection('inbox').add({
                                "status": "needs_review", 
                                "source": "Email Ingestion",
                                "timestamp": firestore.SERVER_TIMESTAMP,
                                "encrypted": True,          # flag for backend to decrypt
                                "ocrResults": [{
                                    "filename": filename,
                                    "fileUrl": file_url,
                                    "encryptedData": encrypted_token,  # 🔐 encrypted
                                    "confidence_score": extracted.get("confidence", 0.95)
                                }]
                            })
                            attachment_processed = True

            # ✅ Mark email as SEEN after processing so it's never reprocessed
            mail.store(msg_id, '+FLAGS', '\\Seen')
            if attachment_processed:
                print(f"Email {msg_id.decode()} marked as SEEN.", flush=True)

        mail.logout()
    except Exception as e:
        # 🛡️ Mask error output to prevent PII leaking into logs
        print(f"Email Listener Error: {mask(str(e))}", flush=True)

def email_worker():
    print(f"FinPilot Email Worker started for {GMAIL_USER}...", flush=True)
    while True:
        # Acquire lock before checking email to prevent race with manual sync
        with email_check_lock:
            check_email()
        time.sleep(15)

if __name__ == "__main__":
    # Start Email Worker in a separate thread
    threading.Thread(target=email_worker, daemon=True).start()
    
    # Start Flask Server
    print("FinPilot Manual Extraction Server started on port 8001...", flush=True)
    app.run(port=8001, host='0.0.0.0')
