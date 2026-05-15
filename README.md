# FinPilot

FinPilot is an AI-powered revenue and expense tracking platform designed for freelancers and small businesses. It automates financial data ingestion by listening to emails, extracting transaction details from invoices and receipts using Google Gemini, and presenting them in a beautiful, interactive dashboard.

## 🌟 Key Features

- **Automated Email Ingestion**: Listens to a dedicated Gmail inbox for invoices and receipts.
- **AI-Powered OCR**: Uses Google Gemini (gemini-3.1-flash-lite) to extract vendor, amount, category, and date from receipt images and PDFs.
- **Privacy Shield**: Automatically masks PII (Personally Identifiable Information) like emails, phone numbers, and credit cards in logs.
- **At-Rest Encryption**: Encrypts sensitive financial data before storing it in Firestore using Fernet (AES-128-CBC + HMAC-SHA256).
- **Interactive Dashboard**: Premium UI with real-time stats, review queue, ledger, and CSV export.

---

## 🏗️ Architecture

- **Frontend**: React (Vite), Tailwind CSS, Firebase Firestore (Real-time sync).
- **Backend**: Node.js, Express, Firebase Admin SDK (Decryption & API proxy).
- **Python Service**: Python 3, Flask, IMAP access, Google Generative AI SDK (Ingestion & AI Extraction).

---

## 📋 Prerequisites

Before running the app, ensure you have:
- **Node.js** (v18+ recommended)
- **Python** (v3.10+ recommended)
- **Firebase Project**: A Firestore database and a Service Account Key JSON file.
- **Gemini API Key**: From Google AI Studio.
- **Gmail Account**: With IMAP enabled and an **App Password** generated (if using 2FA).

---

## ⚙️ Installation & Setup

Clone the repository and follow the steps below for each service.

### 1. Python Service Setup

The Python service handles email polling, attachment extraction, and sending images to Gemini.

1. Navigate to the directory:
   ```bash
   cd python_service
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   # Ensure cryptography is installed
   python -m pip install cryptography
   ```
4. Create a `.env` file in the `python_service` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GMAIL_USER=your_email@gmail.com
   GMAIL_PASS=your_gmail_app_password_here
   FINPILOT_ENCRYPTION_KEY=gqI8zWlPULejy4RRP5bkWrWWfQjRuBY5i-TjOVN4dso=
   ```
   *Note: You can generate a new Fernet key with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`*

5. Place your Firebase `serviceAccountKey.json` in the `python_service` directory.

### 2. Backend Setup

The Node.js backend handles API requests, serves static files, and decrypts data for the frontend.

1. Navigate to the directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
   FINPILOT_ENCRYPTION_KEY=gqI8zWlPULejy4RRP5bkWrWWfQjRuBY5i-TjOVN4dso=
   ```
   *Note: The `FINPILOT_ENCRYPTION_KEY` must match the one in the Python service.*

4. Place the same Firebase `serviceAccountKey.json` in the `backend` directory.

### 3. Frontend Setup

The frontend is a Vite-powered React application.

1. Navigate to the directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure your Firebase configuration is correctly set in `frontend/src/firebase.js` (if applicable, or use environment variables if configured).

---

## 🚀 Running the Application

You need to run all three services simultaneously. Open three separate terminal windows or tabs:

### Terminal 1: Python Service
```bash
cd python_service
python email_listener.py
```
*Runs on `http://localhost:8001`*

### Terminal 2: Backend
```bash
cd backend
npm run dev
```
*Runs on `http://localhost:5000`*

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```
*Runs on `http://localhost:5173` (or the port specified by Vite)*

---

## 📱 Offline Mode / PWA Testing

FinPilot is designed with an offline-first architecture. To test the Progressive Web App (PWA) capabilities (which are disabled by default in development mode):

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Build the production application:
   ```bash
   npm run build
   ```
3. Preview the production build:
   ```bash
   npm run preview
   ```
4. Open the URL provided by Vite (usually `http://localhost:4173` or similar).
5. You should now see an "Install" icon in your browser's address bar.
6. **Testing Offline**: Once loaded, you can disconnect your internet or toggle "Offline" in the browser DevTools Network tab. The app will still load, and previously opened receipt files will be served from the service worker cache!

---

## 🛡️ Security Notes

- **Data at Rest**: Extracted data is stored in Firestore as an encrypted string. It is only decrypted by the backend when requested by the Review Queue or Ledger pages.
- **Credentials**: Never commit `.env` files or `serviceAccountKey.json` to version control.

