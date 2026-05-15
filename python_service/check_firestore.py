import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Checking inbox collection...")
docs = db.collection('inbox').stream()
for d in docs:
    data = d.to_dict()
    print(f"ID: {d.id} | Status: {data.get('status')} | Source: {data.get('source')}")
