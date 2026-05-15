import requests
import os

with open("fake_receipt.jpg", "wb") as f:
    f.write(b"this is another fake receipt")

url = "http://localhost:5000/api/webhooks/email"
data = {
    'from': 'vendor@example.com',
    'subject': 'Your recent purchase'
}
files = {'attachment1': ('fake_receipt.jpg', open('fake_receipt.jpg', 'rb'), 'image/jpeg')}

print("Sending simulated email webhook to Node.js backend...")
try:
    response = requests.post(url, data=data, files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response Text: {response.text}")
except Exception as e:
    print(f"Error: {e}")
finally:
    if os.path.exists("fake_receipt.jpg"):
        os.remove("fake_receipt.jpg")
