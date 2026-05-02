// firebase-config.js
// Centralized Firebase Configuration & Initialization

const firebaseConfig = {
  apiKey: "AIzaSyCVetFMH6RBpDVDrX20OsrhxK8Z4m-PmIg",
  authDomain: "devstage-872b1.firebaseapp.com",
  projectId: "devstage-872b1",
  storageBucket: "devstage-872b1.firebasestorage.app",
  messagingSenderId: "993834630425",
  appId: "1:993834630425:web:b063407a7d47a0830d5988"
};

// 1. Ensure Firebase is only initialized once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log("[DevStage] Firebase Initialized successfully.");
}

// 2. Export instances to window for global access in vanilla JS
window.db = firebase.firestore();
window.auth = firebase.auth();
window.storage = firebase.storage();

// 3. Optional: Enable offline persistence for better UX
window.db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("[DevStage] Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code == 'unimplemented') {
      console.warn("[DevStage] The current browser does not support all of the features required to enable persistence.");
    }
  });
