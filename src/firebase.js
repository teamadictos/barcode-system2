import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // <-- Asegúrate de agregar esto

const firebaseConfig = {
  apiKey: "AIzaSyArjuQwsjrUeyGmDepqN7PJak3oPOSjrrE",
  authDomain: "barcode-system-e32a8.firebaseapp.com",
  projectId: "barcode-system-e32a8",
  storageBucket: "barcode-system-e32a8.firebasestorage.app",
  messagingSenderId: "26514853207",
  appId: "1:26514853207:web:5be1d9fa07d7cf56220212",
  measurementId: "G-2TEY89RXM5"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app); // <-- Exportación necesaria