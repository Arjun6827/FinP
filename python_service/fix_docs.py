import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Updating pending docs to needs_review...")
docs = db.collection('inbox').where('status', '==', 'pending').stream()
for d in docs:
    data = d.to_dict()
    # Check if it has the flat structure and convert it
    if 'vendor' in data and 'ocrResults' not in data:
        print(f"Fixing structure for {d.id}")
        db.collection('inbox').document(d.id).update({
            'status': 'needs_review',
            'ocrResults': [{
                'filename': data.get('filename', 'Unknown'),
                'data': {
                    'vendor': data.get('vendor'),
                    'amount': data.get('amount'),
                    'category': data.get('category'),
                    'date': data.get('date'),
                    'confidence': data.get('confidence', 0.95)
                },
                'confidence_score': data.get('confidence', 0.95)
            }]
        })
    else:
        print(f"Updating status for {d.id}")
        db.collection('inbox').document(d.id).update({'status': 'needs_review'})

print("Done!")
