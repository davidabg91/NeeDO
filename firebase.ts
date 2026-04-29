
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Valid configuration for project Needo
const firebaseConfig = {
  apiKey: "AIzaSyDS1wlI1_GghWVqy820I8oukzJD3LdipPY",
  authDomain: "needo-3cfbd.firebaseapp.com",
  projectId: "needo-3cfbd",
  storageBucket: "needo-3cfbd.firebasestorage.app",
  messagingSenderId: "247568530128",
  appId: "1:247568530128:web:48569cbe677d0b11547cd5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with settings to fix connection timeouts
// experimentalForceLongPolling ensures connectivity in restrictive network environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const storage = getStorage(app);
