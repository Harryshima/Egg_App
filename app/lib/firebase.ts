// Import Firebase SDK functions
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCpgsEe-TB0JmdMTllzQnakn3xtTcuBqtI",
  authDomain: "egg-cellent-5075b.firebaseapp.com",
  databaseURL: "https://egg-cellent-5075b-default-rtdb.firebaseio.com",
  projectId: "egg-cellent-5075b",
  storageBucket: "egg-cellent-5075b.firebasestorage.app",
  messagingSenderId: "981329504048",
  appId: "1:981329504048:web:75faa881bf2911d3b50af5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);
