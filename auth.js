/**
 * auth.js - Production-ready Authentication System
 * Handles: Session Management, Redirects, Signup, Login & Resend
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authForm = document.getElementById('auth-form');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authMessage = document.getElementById('auth-message');
    const loginBtn = document.getElementById('nav-login-btn');
    const signupBtn = document.getElementById('nav-signup-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const authModal = document.getElementById('auth-modal');
    const authTitle = document.getElementById('auth-title');
    const authToggleText = document.getElementById('auth-toggle-text');

    let isLoginMode = true;

    // ─── 1. FIREBASE AUTH INITIALIZATION ────────────────────────
    const auth = firebase.auth();
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    let currentUser = null;

    // ─── 2. AUTH STATE CHANGE LISTENER ─────────────────────────
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("[DevStage] User authenticated:", user);
            currentUser = {
                name: user.displayName,
                email: user.email,
                photo: user.photoURL
            };
            updateUI(currentUser);
            
            // Auto-redirect if on login page and not in a modal
            // if (window.location.pathname.includes('index.html')) {
            //     window.location.href = 'dashboard.html';
            // }
        } else {
            console.log("[DevStage] No active session.");
            currentUser = null;
            updateUI(null);
        }
    });

    // ─── 3. GOOGLE SIGN-IN FLOW ────────────────────────────────
    window.loginWithGoogle = async () => {
        setLoading(true, "Signing in...");
        try {
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            console.log("[DevStage] Google Login Success:", user.displayName);
            
            // Success Animation
            if (authCard) {
                authCard.classList.add('fade-out');
                setTimeout(() => {
                    closeModal();
                    authCard.classList.remove('fade-out');
                }, 600);
            } else {
                closeModal();
            }
        } catch (error) {
            console.error("[DevStage] Google Login Error:", error.code, error.message);
            if (error.code === 'auth/popup-blocked') {
                showMessage("Popup blocked! Please allow popups for this site.", "error");
            } else if (error.code === 'auth/popup-closed-by-user') {
                showMessage("Login cancelled.", "error");
            } else {
                showMessage("Login failed: " + error.message, "error");
            }
        } finally {
            setLoading(false);
        }
    };

    // ─── 4. LOGOUT FLOW ─────────────────────────────────────────
    window.logoutUser = async () => {
        try {
            await auth.signOut();
            console.log("[DevStage] User signed out.");
            // Only redirect if not on index.html
            if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("[DevStage] Logout Error:", error);
        }
    };

    // ─── 5. LEGACY EMAIL FLOWS (Placeholders) ──────────────────
    const handleSignup = async (email, password) => {
        showMessage("Email signup is currently disabled. Please use Google Login.", "info");
    };

    const handleLogin = async (email, password) => {
        showMessage("Email login is currently disabled. Please use Google Login.", "info");
    };

    const handleResend = async (email) => {
        console.log("Resend requested for:", email);
    };

    // ─── UI HELPERS ────────────────────────────────────────────
    function showMessage(text, type) {
        authMessage.innerHTML = text;
        authMessage.className = `auth-message ${type}`;
    }

    function setLoading(isLoading, message = null) {
        if (!authSubmitBtn) return;
        authSubmitBtn.disabled = isLoading;
        const defaultText = isLoginMode ? 'Sign In' : 'Sign Up';
        authSubmitBtn.innerHTML = isLoading ? `<span class="loader"></span> ${message || 'Processing...'}` : defaultText;
        
        const googleBtn = document.getElementById('google-login-btn');
        if (googleBtn) googleBtn.disabled = isLoading;
    }

    function updateUI(user) {
        const authControls = document.getElementById('auth-controls');
        const profileContainer = document.getElementById('profile-container');
        const dropdownName = document.getElementById('dropdown-user-name');
        const dropdownEmail = document.getElementById('dropdown-user-email');
        const userProfileImg = document.querySelector('#user-profile img');
        
        if (user) {
            // Logged In State
            if (authControls) authControls.style.display = 'none';
            if (profileContainer) {
                profileContainer.style.display = 'flex';
                profileContainer.style.opacity = '0';
                profileContainer.style.transition = 'opacity 0.8s ease';
                requestAnimationFrame(() => {
                    profileContainer.style.opacity = '1';
                });
            }
            
            if (dropdownName) dropdownName.textContent = user.name || 'User';
            if (dropdownEmail) dropdownEmail.textContent = user.email;
            if (userProfileImg && user.photo) userProfileImg.src = user.photo;

            // Initialize Lucide icons for new elements if needed
            if (window.lucide) window.lucide.createIcons();
        } else {
            // Logged Out State
            if (authControls) authControls.style.display = 'flex';
            if (profileContainer) {
                profileContainer.style.display = 'none';
                profileContainer.classList.remove('active');
            }
            if (userProfileImg) userProfileImg.src = 'https://ui-avatars.com/api/?name=Guest&background=64748b&color=fff';
        }
    }

    // ─── PROFILE DROPDOWN TOGGLE ──────────────────────────────
    const profileContainer = document.getElementById('profile-container');
    const profileAvatar = document.getElementById('user-profile');

    profileAvatar?.addEventListener('click', (e) => {
        e.stopPropagation();
        profileContainer.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileContainer?.contains(e.target)) {
            profileContainer?.classList.remove('active');
        }
    });

    document.getElementById('dropdown-logout-btn')?.addEventListener('click', () => {
        window.logoutUser();
    });

    function closeModal() {
        authModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
    }

    // ─── EVENT LISTENERS ──────────────────────────────────────
    // Direct Google Auth from Navbar
    loginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        window.loginWithGoogle();
    });

    signupBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        window.loginWithGoogle();
    });

    authForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        isLoginMode ? handleLogin(email, password) : handleSignup(email, password);
    });

    document.getElementById('google-login-btn')?.addEventListener('click', () => {
        window.loginWithGoogle();
    });

    // ─── PREMIUM INTERACTIONS (3D TILT & GLOW) ──────────────
    const authCard = document.getElementById('auth-card');
  
    if (authCard) {
      document.addEventListener('mousemove', (e) => {
        if (!authModal.classList.contains('active')) return;

        const rect = authCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update Light Follow CSS Variables
        authCard.style.setProperty('--glow-x', `${x}px`);
        authCard.style.setProperty('--glow-y', `${y}px`);

        // 3D Tilt Calculation
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 20; // Subtle tilt
        const rotateY = (centerX - x) / 20;

        authCard.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1)`;
      });

      // Reset transform on mouse leave or modal close
      const resetCard = () => {
        authCard.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)`;
      };

      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) resetCard();
      });
    }

    // Modal triggers (if needed for other flows, but currently overridden by Google login)
    // loginBtn?.addEventListener('click', () => openModal('login'));
    // signupBtn?.addEventListener('click', () => openModal('signup'));
    
    function openModal(mode) {
        isLoginMode = mode === 'login';
        authTitle.innerText = isLoginMode ? "Welcome Back" : "Create Account";
        authSubmitBtn.innerText = isLoginMode ? "Sign In" : "Sign Up";
        authToggleText.innerHTML = isLoginMode 
            ? "Don't have an account? <a href='#' id='toggle-auth'>Sign Up</a>" 
            : "Already have an account? <a href='#' id='toggle-auth'>Sign In</a>";
        
        showMessage("", "");
        authModal.classList.add('active');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        document.getElementById('toggle-auth').onclick = (e) => {
            e.preventDefault();
            openModal(isLoginMode ? 'signup' : 'login');
        };
    }

    document.getElementById('close-auth-modal')?.addEventListener('click', () => {
        closeModal();
    });
});
