import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { db } from './firebaseAdmin.js';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * 🔐 Fernet Decryption (Node.js implementation)
 * Fernet = AES-128-CBC + HMAC-SHA256
 * Key is base64url-encoded 32-byte secret stored in FINPILOT_ENCRYPTION_KEY
 */
function decryptFernet(token) {
  try {
    const keyBase64 = process.env.FINPILOT_ENCRYPTION_KEY;
    const keyBytes = Buffer.from(keyBase64, 'base64');    // 32 bytes
    const signingKey  = keyBytes.slice(0, 16);
    const encryptionKey = keyBytes.slice(16, 32);

    const tokenBytes = Buffer.from(token, 'base64');
    // Fernet token layout: version(1) + timestamp(8) + iv(16) + ciphertext(N) + hmac(32)
    const iv         = tokenBytes.slice(9, 25);
    const ciphertext = tokenBytes.slice(25, tokenBytes.length - 32);

    const decipher = crypto.createDecipheriv('aes-128-cbc', encryptionKey, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

// Serve uploads folder statically so frontend can display images
app.use('/uploads', express.static('uploads'));

// Middleware
// We need raw body for Stripe webhooks to verify signatures
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/stripe') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(cors());

// Configure multer for parsing multipart/form-data (email attachments)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- Routes ---

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'FinPilot Backend is running' });
});

// 🔐 GET /api/inbox  — Read Firestore inbox, decrypt sensitive fields, return plaintext
app.get('/api/inbox', async (req, res) => {
  try {
    const snapshot = await db.collection('inbox').orderBy('timestamp', 'desc').get();
    const items = snapshot.docs.map(doc => {
      const d = doc.data();
      const ocrResult = d.ocrResults?.[0] || {};

      let data = null;
      if (d.encrypted && ocrResult.encryptedData) {
        // 🔓 Decrypt the financial data on the server before sending to frontend
        data = decryptFernet(ocrResult.encryptedData);
      } else {
        // Legacy docs (before encryption was added)
        data = ocrResult.data || {};
      }

      return {
        id: doc.id,
        status: d.status,
        source: d.source,
        timestamp: d.timestamp,
        encrypted: d.encrypted || false,
        ocrResults: [{
          filename: ocrResult.filename,
          fileUrl: ocrResult.fileUrl,
          confidence_score: ocrResult.confidence_score,
          data: data,   // ✅ decrypted plaintext
        }]
      };
    });
    res.json({ success: true, items });
  } catch (err) {
    console.error('GET /api/inbox error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Stripe Webhook Endpoint
// Uses express.raw to preserve the raw body needed for signature verification
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const rawBody = req.body;
    
    // TODO: Verify Stripe signature using stripe.webhooks.constructEvent
    console.log('Received Stripe Webhook!');
    
    // Placeholder parsing (In real app, we use constructed event)
    const event = JSON.parse(rawBody.toString());
    
    if (event.type === 'charge.succeeded') {
      console.log('Charge succeeded:', event.data.object.amount);
      
      if (db) {
        await db.collection('transactions').add({
          source: 'stripe',
          amount: event.data.object.amount,
          currency: event.data.object.currency,
          status: 'synced',
          rawEventId: event.id,
          createdAt: new Date()
        });
        console.log('Stripe transaction saved to Firestore.');
      }
    }

    res.status(200).send('Webhook received successfully');
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// 2. Email Ingestion Endpoint (e.g., from SendGrid / Mailgun Parse Webhook)
app.post('/api/webhooks/email', upload.any(), async (req, res) => {
  try {
    console.log('Received Email Webhook!');
    
    // SendGrid/Mailgun usually sends data as multipart/form-data
    const body = req.body;
    const files = req.files; // Attachments (PDFs, Images)

    console.log(`From: ${body.from}`);
    console.log(`Subject: ${body.subject}`);
    
    let attachmentsMetadata = [];
    let ocrResults = [];

    if (files && files.length > 0) {
      console.log(`Received ${files.length} attachments.`);
      
      for (const file of files) {
        // Save the file URL so the frontend can access it
        const fileUrl = `http://localhost:${PORT}/uploads/${file.filename}`;
        attachmentsMetadata.push({
          name: file.originalname,
          url: fileUrl
        });

        try {
          const formData = new FormData();
          formData.append('file', fs.createReadStream(file.path), file.originalname);
          
          console.log(`Sending ${file.originalname} to Python OCR service...`);
          const response = await axios.post('http://localhost:8001/extract', formData, {
            headers: {
              ...formData.getHeaders()
            }
          });
          
          if (response.data.success) {
            ocrResults.push({
              filename: file.originalname,
              fileUrl: fileUrl,
              data: response.data.data
            });
            console.log(`Successfully extracted data for ${file.originalname}`);
          } else {
            console.error(`OCR failed for ${file.originalname}:`, response.data.error);
          }
        } catch (err) {
          console.error(`Error communicating with OCR service for ${file.originalname}:`, err.message);
        }
        // Notice we are NO LONGER deleting the file using fs.unlinkSync!
      }
    }

    if (db) {
      await db.collection('inbox').add({
        source: 'email',
        from: body.from || 'unknown',
        subject: body.subject || 'No Subject',
        hasAttachments: files?.length > 0,
        attachments: attachmentsMetadata,
        ocrResults: ocrResults,
        status: ocrResults.length > 0 ? 'needs_review' : 'pending_extraction',
        receivedAt: new Date()
      });
      console.log('Email metadata and OCR results saved to Firestore inbox queue.');
    }

    res.status(200).send('Email processed successfully');
  } catch (error) {
    console.error('Email webhook error:', error.message);
    res.status(500).send('Internal Server Error processing email');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`FinPilot Backend running on http://localhost:${PORT}`);
});
