"""
FinPilot Encryption Shield
--------------------------
Encrypts extracted financial data (vendor, amount, category, date)
BEFORE writing to Firestore, and decrypts when serving to the frontend.

Algorithm: Fernet (AES-128-CBC + HMAC-SHA256) — symmetric, authenticated.
Key:       Loaded from FINPILOT_ENCRYPTION_KEY in .env
           Never committed to source control.

Flow:
    Gemini extracts data
        ↓
    encrypt_extracted_data(data)   ← stored in Firestore as ciphertext
        ↓
    Firestore (data is unreadable at rest)
        ↓
    decrypt_extracted_data(token)  ← called by Node.js backend API
        ↓
    Frontend receives plaintext JSON
"""

import os
import json
import base64
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv()

_fernet_instance = None

def get_fernet():
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance
        
    # Try Firestore
    try:
        from firebase_admin import firestore
        db = firestore.client()
        doc = db.collection('settings').document('encryption').get()
        if doc.exists:
            key = doc.to_dict().get('key')
            if key:
                print("Using Encryption Key from Firestore", flush=True)
                _fernet_instance = Fernet(key.encode())
                return _fernet_instance
    except Exception as e:
        print(f"Error loading encryption key from Firestore: {e}", flush=True)
        
    # Fallback to env
    key = os.getenv("FINPILOT_ENCRYPTION_KEY")
    if key:
        print("Using Encryption Key from Environment", flush=True)
        _fernet_instance = Fernet(key.encode())
        return _fernet_instance
        
    raise EnvironmentError(
        "No encryption key found! Please set FINPILOT_ENCRYPTION_KEY in .env "
        "or create a 'settings/encryption' document in Firestore with a 'key' field."
    )


def encrypt_extracted_data(data: dict) -> str:
    """
    Accepts the raw dict returned by Gemini, serialises it to JSON,
    and returns a Fernet-encrypted base64 token (safe to store in Firestore).
    """
    plaintext = json.dumps(data, ensure_ascii=False).encode("utf-8")
    token = get_fernet().encrypt(plaintext)
    return token.decode("utf-8")   # store as string in Firestore


def decrypt_extracted_data(token: str) -> dict:
    """
    Accepts the Fernet token stored in Firestore and returns the original dict.
    Raises InvalidToken if the token has been tampered with.
    """
    plaintext = get_fernet().decrypt(token.encode("utf-8"))
    return json.loads(plaintext.decode("utf-8"))


def is_encrypted(value) -> bool:
    """Helper to check if a Firestore field is an encrypted token."""
    return isinstance(value, str) and value.startswith("gAAA")


# ── Self-test ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sample = {"vendor": "Nexus Corp", "amount": 2500.00, "category": "Software & SaaS", "date": "2026-05-15", "confidence": 0.97}
    print("Original  :", sample)
    token = encrypt_extracted_data(sample)
    print("Encrypted :", token[:60], "...")
    recovered = decrypt_extracted_data(token)
    print("Decrypted :", recovered)
    assert recovered == sample, "Encryption/Decryption mismatch!"
    print("\n✅ Encryption round-trip successful.")
