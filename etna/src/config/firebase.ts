import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBIBsGDU-UEtXWOi8nnfXu55uYkkvt3Xf8",
  authDomain: "etna-7a0bb.firebaseapp.com",
  projectId: "etna-7a0bb",
  storageBucket: "etna-7a0bb.firebasestorage.app",
  messagingSenderId: "536588334839",
  appId: "1:536588334839:web:9b4ac9c2c07d83398045f2"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app); // <-- NUEVO

export { auth, db, storage };