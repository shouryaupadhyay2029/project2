import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCVetFMH6RBpDVDrX20OsrhxK8Z4m-PmIg",
    authDomain: "devstage-872b1.firebaseapp.com",
    projectId: "devstage-872b1",
    storageBucket: "devstage-872b1.firebasestorage.app",
    messagingSenderId: "993834630425",
    appId: "1:993834630425:web:b063407a7d47a0830d5988"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;
if (!window.db) {
    window.db = db;
}

// ─── GLOBAL USER UI LOADER ───
window.loadUserUI = function () {
    const cachedUser = JSON.parse(localStorage.getItem("devstageUser"));

    const guestSection = document.getElementById("guestSection");
    const userSection = document.getElementById("userSection");
    const navAvatar = document.getElementById("navAvatar");
    const navName = document.getElementById("navName");
    const dropdownName = document.getElementById("dropdown-user-name");
    const dropdownEmail = document.getElementById("dropdown-user-email");

    if (!cachedUser) {
        if (guestSection) guestSection.style.display = "flex";
        if (userSection) userSection.style.display = "none";
        return;
    }

    // Populate UI
    if (guestSection) guestSection.style.display = "none";
    if (userSection) userSection.style.display = "flex";

    if (navAvatar) navAvatar.src = cachedUser.photoURL || `https://ui-avatars.com/api/?name=${cachedUser.displayName}`;
    if (navName) navName.textContent = cachedUser.displayName || 'User';

    // Also update dropdown if present
    if (dropdownName) dropdownName.textContent = cachedUser.displayName || 'User';
    if (dropdownEmail) dropdownEmail.textContent = cachedUser.email || '';
}

document.addEventListener('DOMContentLoaded', () => {
    window.loadUserUI();

    const authForm = document.getElementById('auth-form');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authMessage = document.getElementById('auth-message');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const authModal = document.getElementById('auth-modal');
    const authTitle = document.getElementById('auth-title');
    const authToggleText = document.getElementById('auth-toggle-text');
    const closeAuthModal = document.getElementById('close-auth-modal');

    let isLoginMode = true;

    // ─── 2. AUTH STATE CHANGE LISTENER ───
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("[DevStage] Global Auth: User Found", user.email);
            const userData = {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                uid: user.uid,
                joined: user.metadata.creationTime
            };
            localStorage.setItem("devstageUser", JSON.stringify(userData));
            window.currentUser = userData;
            window.loadUserUI();
        } else {
            console.log("[DevStage] Global Auth: No Session");
            localStorage.removeItem("devstageUser");
            window.currentUser = null;
            window.loadUserUI();
        }
    });

    const provider = new GoogleAuthProvider();

    window.loginWithGoogle = function () {
        signInWithPopup(auth, provider)
            .then((result) => {
                saveUserToFirestore(result.user);
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    const isRoot = window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/") || window.location.pathname.endsWith("/project2") || window.location.pathname.endsWith("/project2/");
                    window.location.href = isRoot ? "pages/dashboard.html" : "dashboard.html";
                }
            })
            .catch((error) => {
                console.error("Login error:", error);
                if (authMessage) showMessage("Login failed: " + error.message, "error");
            });
    };

    async function saveUserToFirestore(user) {
        const userRef = doc(db, 'users', user.uid);
        try {
            const docSnap = await getDoc(userRef);
            if (!docSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    name: user.displayName || 'Anonymous',
                    email: user.email,
                    avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`,
                    createdAt: serverTimestamp()
                }, { merge: true });
            }
        } catch (error) {
            console.error("Firestore Sync Error:", error);
        }
    }

    window.openLoginModal = (mode = 'login') => {
        if (!authModal) return;
        isLoginMode = (mode === 'login');
        if (authTitle) authTitle.innerText = isLoginMode ? 'Welcome Back' : 'Create Account';
        if (authSubmitBtn && authSubmitBtn.querySelector('span')) {
            authSubmitBtn.querySelector('span').innerText = isLoginMode ? 'Sign In' : 'Sign Up';
        }
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    function closeModal() {
        authModal?.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    closeAuthModal?.addEventListener('click', closeModal);

    loginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        window.openLoginModal('login');
    });

    signupBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        window.openLoginModal('signup');
    });

    document.getElementById('google-login-btn')?.addEventListener('click', () => {
        window.loginWithGoogle();
    });

    function showMessage(text, type) {
        if (authMessage) {
            authMessage.innerText = text;
            authMessage.className = `auth-message ${type}`;
        }
    }

    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                localStorage.removeItem("devstageUser");
                await signOut(auth);
                const isRoot = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/project2') || window.location.pathname.endsWith('/project2/');
                window.location.href = isRoot ? 'index.html' : '../index.html';
            } catch (error) {
                console.error("Logout failed:", error);
            }
        });
    });

    const userProfile = document.getElementById('user-profile');
    const userSection = document.getElementById('userSection');

    userProfile?.addEventListener('click', (e) => {
        e.stopPropagation();
        userSection?.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (userSection && !userSection.contains(e.target)) {
            userSection.classList.remove('active');
        }
    });
});
