import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA0n2qx8M2qHiwvepKjqTm_ECcZ3E1AnW8",
  authDomain: "anokorolinq.firebaseapp.com",
  projectId: "anokorolinq",
  databaseURL: "https://anokorolinq-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "anokorolinq.firebasestorage.app",
  messagingSenderId: "193022894612",
  appId: "1:193022894612:web:0f7487d7ac2b245f347d01",
  measurementId: "G-HPM6F4FGEH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
