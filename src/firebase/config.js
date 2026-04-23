import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

//  Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBFO3NBfUXF0JSQjUUgdwn56Fk1KsTB_uM",
  authDomain: "luctreport.firebaseapp.com",
  projectId: "luctreport",
  storageBucket: "luctreport.appspot.com",
  messagingSenderId: "1079882634068",
  appId: "1:1079882634068:web:01bde8d9523e76d6beeec1",
  measurementId: "G-GN9BMXKQEV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);