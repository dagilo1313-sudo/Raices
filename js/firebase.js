import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Firestore con persistencia offline en IndexedDB
// - Las lecturas funcionan sin conexión (sirve la última versión cacheada)
// - Las escrituras se guardan en cola local y se sincronizan al volver la conexión
// - persistentMultipleTabManager permite tener varias pestañas abiertas a la vez
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
