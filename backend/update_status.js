import { db } from './firebaseAdmin.js';

async function updateStatus() {
  try {
    const snapshot = await db.collection('inbox').where('status', '==', 'pending').get();
    console.log(`Found ${snapshot.size} pending items.`);
    
    if (snapshot.size === 0) {
      console.log('No pending items found.');
      process.exit(0);
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      console.log(`Updating doc ${doc.id}...`);
      batch.update(doc.ref, { status: 'needs_review' });
    });
    
    await batch.commit();
    console.log('Successfully updated all pending items to needs_review.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating status:', error);
    process.exit(1);
  }
}

updateStatus();
