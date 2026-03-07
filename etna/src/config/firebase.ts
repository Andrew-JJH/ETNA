import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';

//import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';


const firebaseConfig = {
  apiKey: "AIzaSyDxHPMQlFxeTRbY9LM8iyBA78bSM3HYbHM",
  authDomain: "etna-app-551ad.firebaseapp.com",
  projectId: "etna-app-551ad",
  storageBucket: "etna-app-551ad.firebasestorage.app",
  messagingSenderId: "630151871306",
  appId: "1:630151871306:web:95c480a4281dc79d939fb3"
};

const app = initializeApp(firebaseConfig);


const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app); // <-- NUEVO

export { auth, db, storage };