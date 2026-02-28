import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // También le quito el /web-extension por si acaso
import { getFirestore } from "firebase/firestore"; // ¡Aquí está la magia, sin el /lite!

const firebaseConfig = {
  apiKey: "AIzaSyBIBsGDU-UEtXWOi8nnfXu55uYkkvt3Xf8",
  authDomain: "etna-7a0bb.firebaseapp.com",
  projectId: "etna-7a0bb",
  storageBucket: "etna-7a0bb.firebasestorage.app",
  messagingSenderId: "536588334839",
  appId: "1:536588334839:web:9b4ac9c2c07d83398045f2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);