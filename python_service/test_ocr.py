import requests
import os

# Create a dummy image file to test the endpoint
with open("dummy_receipt.jpg", "wb") as f:
    f.write(b"dummy image content")

url = "http://localhost:8000/extract"
files = {'file': ('dummy_receipt.jpg', open('dummy_receipt.jpg', 'rb'), 'image/jpeg')}

try:
    print("Sending request to Python OCR service...")
    response = requests.post(url, files=files)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(response.json())
except Exception as e:
    print(f"Error: {e}")
finally:
    # Cleanup
    if os.path.exists("dummy_receipt.jpg"):
        os.remove("dummy_receipt.jpg")
