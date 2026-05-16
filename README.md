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
   python -m pip install cryptography firebase-admin google-generativeai flask
   ```
4. **Configuration (Firestore DB)**: 
   The app reads all configurations from Firestore dynamically. You can set them up in the Web UI (Settings page) or manually in Firestore. **No `.env` files are required** for keys or passwords!
   - **Gemini API Key**: Save to `settings/gemini` with field `key`.
   - **IMAP Config**: Save to `settings/imap` with fields `server`, `email`, `password`.
   - **Encryption Key**: Save to `settings/encryption` with field `key`.

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
3. Create a `.env` file in the `backend` directory (Optional):
   ```env
   PORT=5000
   ```
   *Note: The encryption key is now fetched from Firestore, so you don't need to put it here!*
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
3. Ensure your Firebase configuration is correctly set in `frontend/src/firebase.js`.

### 4. Mobile App Setup

The mobile app is built with React Native and Expo.

1. Navigate to the directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. **Firebase Setup**: We have added real Firebase Auth to the mobile app. Ensure `mobile/firebase.ts` has the correct config matching your `frontend/src/firebase.js`.
4. **Network Configuration**: The app is configured to connect to the backend at `http://192.168.1.9:5000` or similar. You **must** update this IP in the files inside `mobile/app/` to match your computer's actual local network IP so that physical devices or simulators can connect to it!


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

### Terminal 4: Mobile App
```bash
cd mobile
npx expo start
```
*This will open the Expo developer tool in your terminal.*

#### 🍏 Running on iOS:
- **Simulator**: Press `i` in the terminal to open the app in the iOS Simulator (Mac required).
- **Physical Device**: Download the **Expo Go** app from the App Store. Scan the QR code displayed in the terminal with your iPhone's camera.

#### 🤖 Running on Android:
- **Emulator**: Press `a` in the terminal to open the app in the Android Emulator.
- **Physical Device**: Download the **Expo Go** app from the Google Play Store. Scan the QR code displayed in the terminal using the Expo Go app.

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

