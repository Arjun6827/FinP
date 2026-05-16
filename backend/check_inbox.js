import { db } from './firebaseAdmin.js';

async function checkInbox() {
  try {
    const snapshot = await db.collection('inbox').orderBy('receivedAt', 'desc').limit(5).get();
    console.log(`Found ${snapshot.size} recent items.`);
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Source: ${data.source}`);
      console.log(`  ReceivedAt: ${data.receivedAt?.toDate()}`);
      console.log(`  HasAttachments: ${data.hasAttachments}`);
      console.log('-------------------');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking inbox:', error);
    process.exit(1);
  }
}

checkInbox();
