import { db } from './firebaseAdmin.js';

const seedData = [
  {
    source: 'email',
    from: 'billing@aws.amazon.com',
    subject: 'Amazon Web Services Invoice - Oct 2023',
    hasAttachments: true,
    attachments: ['aws_invoice_oct.pdf'],
    status: 'needs_review',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    ocrResults: [
      {
        filename: 'aws_invoice_oct.pdf',
        data: {
          vendor: 'Amazon Web Services',
          amount: 1240.50,
          date: '2023-10-01',
          category: 'Software & SaaS',
          line_items: [
            { description: 'EC2 Instance Usage', amount: 800.00 },
            { description: 'S3 Standard Storage', amount: 240.50 },
            { description: 'RDS Database', amount: 200.00 }
          ],
          confidence_score: 0.99
        }
      }
    ]
  },
  {
    source: 'email',
    from: 'receipts@uber.com',
    subject: 'Your Thursday morning trip with Uber',
    hasAttachments: true,
    attachments: ['uber_receipt.png'],
    status: 'needs_review',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    ocrResults: [
      {
        filename: 'uber_receipt.png',
        data: {
          vendor: 'Uber Technologies Inc',
          amount: 34.20,
          date: '2023-10-12',
          category: 'Travel',
          line_items: [
            { description: 'UberX Trip', amount: 30.00 },
            { description: 'Booking Fee', amount: 2.00 },
            { description: 'City Tax', amount: 2.20 }
          ],
          confidence_score: 0.95
        }
      }
    ]
  },
  {
    source: 'mobile_upload',
    from: 'user_upload',
    subject: 'Lunch Meeting',
    hasAttachments: true,
    attachments: ['photo_20231015_1204.jpg'],
    status: 'needs_review',
    receivedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    ocrResults: [
      {
        filename: 'photo_20231015_1204.jpg',
        data: {
          vendor: 'Sweetgreen',
          amount: 28.50,
          date: '2023-10-15',
          category: 'Food & Dining',
          line_items: [
            { description: 'Harvest Bowl', amount: 14.00 },
            { description: 'Guacamole Greens', amount: 13.00 },
            { description: 'Tax', amount: 1.50 }
          ],
          confidence_score: 0.88 // Slightly lower confidence to trigger a warning in the UI
        }
      }
    ]
  }
];

async function seedFirestore() {
  if (!db) {
    console.error('❌ Firestore Database (db) is not initialized. Ensure serviceAccountKey.json is present in the backend directory.');
    process.exit(1);
  }

  console.log('🌱 Starting Firestore seeding process...');
  
  const inboxRef = db.collection('inbox');
  
  let count = 0;
  for (const item of seedData) {
    try {
      await inboxRef.add(item);
      console.log(`✅ Inserted mock receipt: ${item.ocrResults[0].data.vendor}`);
      count++;
    } catch (error) {
      console.error('❌ Error inserting document:', error);
    }
  }

  console.log(`🎉 Seeding complete. Successfully added ${count} mock receipts to the 'inbox' collection.`);
  process.exit(0);
}

seedFirestore();
