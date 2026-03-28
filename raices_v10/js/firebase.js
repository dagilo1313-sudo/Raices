import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzvD2H3VFa_k985maDejBUUbMy65nzaKA",
  authDomain: "habitos-5f3a3.firebaseapp.com",
  projectId: "habitos-5f3a3",
  storageBucket: "habitos-5f3a3.firebasestorage.app",
  messagingSenderId: "605769214329",
  appId: "1:605769214329:web:987ef36342a4c0c5f727a8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
