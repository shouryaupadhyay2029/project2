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

    function handleInvalidToken() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("devstageUser");
        localStorage.removeItem("devstageMockAccount");
        const isInsidePages = window.location.pathname.includes('/pages/');
        const redirectUrl = isInsidePages ? "login.html" : "pages/login.html";
        window.location.href = redirectUrl;
    }

    function injectProfileUI(user) {
        // 1. Sidebar name
        const nameEl = document.querySelector(".sidebar .name");
        if (nameEl) nameEl.textContent = user.username;

        // 2. Sidebar handle
        const handleEl = document.querySelector(".sidebar .handle");
        if (handleEl) {
            handleEl.textContent = "@" + user.username.toLowerCase().replace(/\s+/g, '');
        }

        // 3. Sidebar email
        const emailMetaItem = document.querySelector("#profile-email-sidebar");
        if (emailMetaItem) {
            emailMetaItem.textContent = user.email;
        }

        // 4. Contact email values (under Contact tab)
        const contactEmailVal = document.querySelector(".contact-email-val");
        if (contactEmailVal) contactEmailVal.textContent = user.email;

        // 5. Contact copy button data-copy
        document.querySelectorAll(".copy-btn").forEach(btn => {
            if (btn.dataset.copy && (btn.dataset.copy.includes("@") || btn.dataset.copy === "")) {
                btn.dataset.copy = user.email;
                btn.setAttribute("data-copy", user.email);
            }
        });

        // 6. Sidebar avatar initials
        const avatarEl = document.querySelector(".sidebar .avatar");
        const initials = user.username ? user.username.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";
        if (avatarEl) avatarEl.textContent = initials;

        // 7. Preview card avatar initials
        const previewAvatar = document.querySelector(".preview-avatar");
        if (previewAvatar) previewAvatar.textContent = initials;

        // 8. Preview card name
        const previewName = document.querySelector(".preview-name");
        if (previewName) previewName.textContent = user.username;

        // 9. Document title
        document.title = `${user.username} — Designer & Developer`;

        // 10. Update reveal-wordmark text content if exists
        const wordmarkEl = document.getElementById("reveal-wordmark");
        if (wordmarkEl) wordmarkEl.textContent = user.username;
    }

    // Protected page authentication check
    const protectedPages = ["profile.html", "dashboard.html", "settings.html"];
    const currentPage = window.location.pathname.split("/").pop();

    if (protectedPages.includes(currentPage)) {
        const token = localStorage.getItem("token");

        if (!token) {
            console.log("[DevStage Auth] Access denied — missing token. Redirecting to login.");
            handleInvalidToken();
            return;
        }

        // Send authenticated request to backend API
        fetch("http://localhost:5000/api/auth/me", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Invalid token or server error");
            }
            return response.json();
        })
        .then(data => {
            if (!data.success || !data.user) {
                throw new Error("User authentication failed");
            }

            const backendUser = data.user;
            console.log("[DevStage Auth] User authenticated via backend:", backendUser.username);

            // Sync user data to local storage
            localStorage.setItem("user", JSON.stringify(backendUser));
            localStorage.setItem("isLoggedIn", "true");

            const devstageUserData = {
                displayName: backendUser.username,
                email: backendUser.email,
                uid: backendUser.id,
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(backendUser.username)}&background=c8b89a&color=0b0b0b`
            };
            localStorage.setItem("devstageUser", JSON.stringify(devstageUserData));
            window.currentUser = devstageUserData;

            // Load global user UI elements (nav avatar, names, dropdown)
            window.loadUserUI();

            // Inject dynamically into profile UI if current page is profile.html
            if (currentPage === "profile.html") {
                injectProfileUI(backendUser);
            }
        })
        .catch(error => {
            console.error("[DevStage Auth] Backend verification failed:", error);
            handleInvalidToken();
        });
    }

    // Prevent logged-in users from visiting auth pages
    const authPages = ["login.html", "register.html"];
    if (authPages.includes(currentPage)) {
        const token = localStorage.getItem("token");
        if (token) {
            console.log("User already logged in, redirecting to profile...");
            const isInsidePages = window.location.pathname.includes('/pages/');
            const redirectUrl = isInsidePages ? "profile.html" : "pages/profile.html";
            window.location.href = redirectUrl;
            return;
        }
    }

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
    onAuthStateChanged(auth, async(user) => {
        if (user) {
            console.log("[DevStage] Global Auth: User Found", user.email);

            // Get token and save to localStorage for unified auth persistence
            try {
                const token = await user.getIdToken();
                localStorage.setItem("token", token);
                localStorage.setItem("isLoggedIn", "true");

                const userDataForLocalStorage = {
                    id: user.uid,
                    username: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    fullName: user.displayName || '',
                    photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=c8b89a&color=0b0b0b`,
                    profileImage: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=c8b89a&color=0b0b0b`
                };
                localStorage.setItem("user", JSON.stringify(userDataForLocalStorage));
            } catch (e) {
                console.error("Error retrieving Firebase ID token:", e);
            }

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
            if (cached && (isMockSession(cached) || localStorage.getItem("token"))) {
                window.currentUser = cached;
                window.loadUserUI();
                return;
            }
            console.log("[DevStage] Global Auth: No Session");
            localStorage.removeItem("devstageUser");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("isLoggedIn");
            window.currentUser = null;
            window.loadUserUI();
        }
    });

    const provider = new GoogleAuthProvider();

    window.loginWithGoogle = function() {
        signInWithPopup(auth, provider)
            .then(async(result) => {
                const user = result.user;
                console.log("Google login success");

                const token = await user.getIdToken();
                localStorage.setItem("token", token);
                localStorage.setItem("isLoggedIn", "true");

                const userData = {
                    id: user.uid,
                    username: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    fullName: user.displayName || '',
                    photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=c8b89a&color=0b0b0b`,
                    profileImage: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=c8b89a&color=0b0b0b`
                };
                localStorage.setItem("user", JSON.stringify(userData));
                console.log("User stored:", userData);

                saveUserToFirestore(user);

                // Sync devstageUser with the newly logged in user details to populate global UI
                const devstageUserData = {
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    uid: user.uid,
                    joined: user.metadata.creationTime
                };
                localStorage.setItem("devstageUser", JSON.stringify(devstageUserData));
                window.currentUser = devstageUserData;

                console.log("Redirecting to profile page");
                const isInsidePages = window.location.pathname.includes('/pages/');
                const redirectUrl = isInsidePages ? "profile.html" : "pages/profile.html";
                window.location.href = redirectUrl;
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
                localStorage.removeItem("token");
                localStorage.removeItem("user");
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

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async(e) => {

        e.preventDefault();

        const username = document.getElementById("username").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {

            const response = await fetch("http://localhost:5000/api/auth/register", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username,
                    email,
                    password
                })

            });

            const data = await response.json();

            console.log(data);

            if (data.success) {

                localStorage.setItem("token", data.token);

                alert("Registration Successful");

                window.location.href = "../pages/dashboard.html";

            } else {

                alert(data.message);

            }

        } catch (error) {

            console.log(error);

            alert("Something went wrong");

        }

    });

}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async(e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();
            console.log(data);

            if (data.success === true) {
                console.log("Login Success");
                console.log(data);

                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("isLoggedIn", "true");

                // Sync devstageUser with the newly logged in user details to populate global UI
                const userData = {
                    displayName: data.user.username,
                    email: data.user.email,
                    uid: data.user.id,
                    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}&background=c8b89a&color=0b0b0b`
                };
                localStorage.setItem("devstageUser", JSON.stringify(userData));
                window.currentUser = userData;

                alert("Login successful! Redirecting to your profile...");
                window.location.href = "../pages/profile.html";
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.log(error);
            alert("Something went wrong");
        }
    });
}