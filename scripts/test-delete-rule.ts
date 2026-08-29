import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, getDoc, collection, addDoc } from 'firebase/firestore';

async function testDelete() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = `test_delete_${Date.now()}@test.arthasetu.gov`;
  const cred = await createUserWithEmailAndPassword(auth, email, 'TestPass123!');
  const uid = cred.user.uid;
  console.log('Created user with UID:', uid);

  // 1. Test users collection set & delete
  console.log('Testing users doc set...');
  await setDoc(doc(db, 'users', uid), { name: 'Test', email });
  console.log('Testing users doc delete...');
  await deleteDoc(doc(db, 'users', uid));
  console.log('✅ users doc delete OK');

  // 2. Test plans doc set & delete
  console.log('Testing plans doc add...');
  const planRef = await addDoc(collection(db, 'plans'), { userId: uid, name: 'Plan 1' });
  console.log('Created plan ID:', planRef.id);
  console.log('Testing plans doc delete...');
  await deleteDoc(doc(db, 'plans', planRef.id));
  console.log('✅ plans doc delete OK');

  // Test deleteUserFirestoreData function
  console.log('Testing deleteUserFirestoreData...');
  await setDoc(doc(db, 'users', uid), { name: 'Test', email });
  await addDoc(collection(db, 'plans'), { userId: uid, name: 'Plan 1' });
  await addDoc(collection(db, 'advice'), { userId: uid, advice: 'Advice 1' });

  const { deleteUserFirestoreData } = await import('../src/lib/firestore/users');
  await deleteUserFirestoreData(uid, db);
  console.log('✅ deleteUserFirestoreData function passed!');

  await deleteUser(cred.user);
  console.log('✅ All direct delete operations passed!');
}

testDelete().catch(console.error);
