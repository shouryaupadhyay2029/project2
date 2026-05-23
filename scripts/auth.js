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
window.loadUserUI = function() {
    const cachedUser = JSON.parse(localStorage.getItem("devstageUser"));

    const guestSection = document.getElementById("guestSection");
    const userSection = document.getElementById("userSection");
    const navAvatar = document.getElementById("navAvatar");
    const navName = document.getElementById("navName");
    const dropdownName = document.getElementById("dropdown-user-name");
    const dropdownEmail = document.getElementById("dropdown-user-email");
    const dropdownAvatar = document.getElementById("dropdown-avatar");
    if (!cachedUser) {
        if (guestSection) guestSection.style.display = "flex";
        if (userSection) userSection.style.display = "none";
        return;
    }

    // Populate UI
    if (guestSection) guestSection.style.display = "none";
    if (userSection) userSection.style.display = "flex";

    const avatarUrl = cachedUser.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(cachedUser.displayName || 'User')}&background=c8b89a&color=0b0b0b`;

    if (navAvatar) navAvatar.src = avatarUrl;
    if (navName) navName.textContent = cachedUser.displayName || 'User';
    if (dropdownName) dropdownName.textContent = cachedUser.displayName || 'User';
    if (dropdownEmail) dropdownEmail.textContent = cachedUser.email || '';
    if (dropdownAvatar) dropdownAvatar.src = avatarUrl;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[DevStage Auth] Initializing authentication module...');
    window.loadUserUI();

    const authForm = document.getElementById('auth-form');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authMessage = document.getElementById('auth-message');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const authModal = document.getElementById('auth-modal');
    const authCard = document.getElementById('auth-card');
    const authTitle = document.getElementById('auth-title');
    const authToggleText = document.getElementById('auth-toggle-text');
    const closeAuthModal = document.getElementById('close-auth-modal');

    let isLoginMode = true;

    function isMockSession(userData) {
        return userData?.uid && String(userData.uid).startsWith('mock-');
    }

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
            const cached = JSON.parse(localStorage.getItem("devstageUser") || 'null');
            if (cached && isMockSession(cached)) {
                window.currentUser = cached;
                window.loadUserUI();
                return;
            }
            console.log("[DevStage] Global Auth: No Session");
            localStorage.removeItem("devstageUser");
            window.currentUser = null;
            window.loadUserUI();
        }
    });

    const provider = new GoogleAuthProvider();

    window.loginWithGoogle = function() {
        signInWithPopup(auth, provider)
            .then((result) => {
                saveUserToFirestore(result.user);
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    const isRoot = window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/") || window.location.pathname.endsWith("/project2") || window.location.pathname.endsWith("/project2/");
                    window.location.href = isRoot ? "pages/profile.html" : "profile.html";
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

        authCard?.classList.toggle('auth-mode-login', isLoginMode);
        authCard?.classList.toggle('auth-mode-signup', !isLoginMode);

        // Update header text
        if (authTitle) authTitle.innerText = isLoginMode ? 'Log in' : 'Sign Up';
        if (authSubmitBtn && authSubmitBtn.querySelector('span')) {
            authSubmitBtn.querySelector('span').innerText = isLoginMode ? 'Enter' : 'Create';
        }

        // Update footer toggle text
        if (authToggleText) {
            authToggleText.innerHTML = isLoginMode ?
                'Don\'t have an account? <a href="#" class="toggle-auth-link">Sign Up</a>' :
                'Already have an account? <a href="#" class="toggle-auth-link">Login</a>';

            // Re-attach event listener to the new toggle link
            const toggleLinks = document.querySelectorAll('.toggle-auth-link');
            toggleLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.openLoginModal(isLoginMode ? 'signup' : 'login');
                });
            });
        }

        // Clear form and messages
        if (authForm) authForm.reset();
        if (authMessage) authMessage.innerText = '';
        if (authMessage) authMessage.className = 'auth-message';

        // Show modal
        if (authCard) authCard.classList.remove('fade-out');
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');

        if (window.lucide) lucide.createIcons();

        // Focus on first field
        setTimeout(() => {
            const firstInput = isLoginMode ?
                document.getElementById('auth-email') :
                document.getElementById('auth-fullname');
            if (firstInput) firstInput.focus();
        }, 300);
    };

    function closeModal() {
        if (!authModal) return;
        const authCard = document.getElementById('auth-card');
        if (authCard) {
            authCard.classList.add('fade-out');
            setTimeout(() => {
                authModal.classList.remove('active');
                authCard.classList.remove('fade-out');
                document.body.style.overflow = '';
                document.body.classList.remove('modal-open');
            }, 280);
        } else {
            authModal.classList.remove('active');
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
        }
    }

    closeAuthModal?.addEventListener('click', closeModal);

    function saveMockSession(userData) {
        localStorage.setItem('devstageUser', JSON.stringify(userData));
        window.currentUser = userData;
        window.loadUserUI();
    }

    function completeMockAuth(userData, successText) {
        saveMockSession(userData);
        showMessage(successText, 'success');
        setTimeout(() => closeModal(), 600);
    }

    // ─── FORM SUBMISSION HANDLER (demo / mock when email auth backend unavailable) ───
    if (authForm) {
        authForm.addEventListener('submit', async(e) => {
            e.preventDefault();

            const email = document.getElementById('auth-email')?.value.trim();
            const password = document.getElementById('auth-password')?.value;

            if (!email || !password) {
                showMessage('Please fill in all required fields', 'error');
                return;
            }

            try {
                if (isLoginMode) {
                    const stored = JSON.parse(localStorage.getItem('devstageMockAccount') || 'null');
                    if (stored && stored.email === email && stored.password !== password) {
                        showMessage('Incorrect password', 'error');
                        return;
                    }

                    const displayName = stored?.displayName || email.split('@')[0];
                    completeMockAuth({
                        displayName,
                        email,
                        photoURL: stored?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=c8b89a&color=0b0b0b`,
                        uid: stored?.uid || `mock-${email}`,
                        joined: stored?.joined || new Date().toISOString()
                    }, 'Welcome back!');
                } else {
                    const fullname = document.getElementById('auth-fullname')?.value.trim();
                    const username = document.getElementById('auth-username')?.value.trim();
                    const confirmPassword = document.getElementById('auth-confirm-password')?.value;

                    if (!fullname || !username || !confirmPassword) {
                        showMessage('Please fill in all required fields', 'error');
                        return;
                    }

                    if (password !== confirmPassword) {
                        showMessage('Passwords do not match', 'error');
                        return;
                    }

                    if (password.length < 6) {
                        showMessage('Password must be at least 6 characters', 'error');
                        return;
                    }

                    const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullname)}&background=c8b89a&color=0b0b0b`;
                    const mockAccount = {
                        displayName: fullname,
                        username,
                        email,
                        password,
                        photoURL,
                        uid: `mock-${Date.now()}`,
                        joined: new Date().toISOString()
                    };
                    localStorage.setItem('devstageMockAccount', JSON.stringify(mockAccount));
                    completeMockAuth({
                        displayName: fullname,
                        email,
                        photoURL,
                        uid: mockAccount.uid,
                        joined: mockAccount.joined
                    }, 'Account created successfully!');
                }
            } catch (error) {
                showMessage('An error occurred: ' + error.message, 'error');
            }
        });
    }

    // ─── TOGGLE AUTH MODE LINK ───
    const toggleAuthLink = document.getElementById('toggle-auth');
    if (toggleAuthLink) {
        toggleAuthLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.openLoginModal(isLoginMode ? 'signup' : 'login');
        });
    }

    // ─── CLOSE MODAL ON ESC ───
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal && authModal.classList.contains('active')) {
            closeModal();
        }
    });

    // ─── CLOSE MODAL ON BACKDROP CLICK ───
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeModal();
            }
        });
    }

    document.querySelectorAll('.forgot-password-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showMessage('Password reset is not connected yet. Use demo login or Google.', 'error');
        });
    });

    loginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        window.openLoginModal('login');
    });

    signupBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        window.openLoginModal('signup');
    });

    if (loginBtn && signupBtn) {
        console.log('[DevStage Auth] Login & Sign Up buttons initialized');
    } else {
        console.warn('[DevStage Auth] Warning: Login or Sign Up button not found in DOM');
    }

    document.getElementById('google-login-btn')?.addEventListener('click', () => {
        window.loginWithGoogle();
    });

    document.getElementById('github-login-btn')?.addEventListener('click', () => {
        const name = isLoginMode ? 'GitHub User' : 'New GitHub User';
        completeMockAuth({
            displayName: name,
            email: 'github.user@devstage.demo',
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b0b0b&color=f5f2ec`,
            uid: `mock-github-${Date.now()}`,
            joined: new Date().toISOString()
        }, 'Signed in with GitHub');
    });

    function showMessage(text, type) {
        if (authMessage) {
            authMessage.innerText = text;
            authMessage.className = `auth-message ${type}`;
        }
    }

    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async(e) => {
            e.preventDefault();
            try {
                localStorage.removeItem("devstageUser");
                localStorage.removeItem("devstageMockAccount");
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
    const profileDropdown = document.getElementById('profile-dropdown');

    const closeProfileDropdown = () => {
        if (userSection) userSection.classList.remove('active');
        if (profileDropdown) profileDropdown.classList.remove('active');
    };

    const adjustProfileDropdownPosition = () => {
        if (!profileDropdown || !profileDropdown.classList.contains('active')) return;

        profileDropdown.style.top = '';
        profileDropdown.style.bottom = '';
        profileDropdown.style.right = '0';
        profileDropdown.style.left = '';

        const rect = profileDropdown.getBoundingClientRect();
        const pad = 12;

        if (rect.right > window.innerWidth - pad) {
            profileDropdown.style.right = '0';
        }
        if (rect.left < pad) {
            profileDropdown.style.right = 'auto';
            profileDropdown.style.left = '0';
        }
        if (rect.bottom > window.innerHeight - pad) {
            profileDropdown.style.top = 'auto';
            profileDropdown.style.bottom = 'calc(100% + 10px)';
        }
    };

    userProfile?.addEventListener('click', (e) => {
        e.stopPropagation();
        userSection?.classList.toggle('active');
        profileDropdown?.classList.toggle('active');
        if (profileDropdown?.classList.contains('active')) {
            if (window.lucide) lucide.createIcons();
            requestAnimationFrame(adjustProfileDropdownPosition);
        }
    });

    window.addEventListener('resize', adjustProfileDropdownPosition);

    // Close dropdown when clicking outside (but not on the dropdown itself or profile button)
    document.addEventListener('click', (e) => {
        const isClickOnProfile = userProfile && userProfile.contains(e.target);
        const isClickInDropdown = profileDropdown && profileDropdown.contains(e.target);

        if (!isClickOnProfile && !isClickInDropdown && userSection) {
            closeProfileDropdown();
        }
    });

    // Add click handler to dropdown items to navigate and close
    if (profileDropdown) {
        const dropdownLinks = profileDropdown.querySelectorAll('a.dropdown-item');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Close dropdown when clicking a link
                setTimeout(() => closeProfileDropdown(), 100);
            });
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
            closeProfileDropdown();
        }
    });
});
