/**
 * Global premium nav dropdown — hamburger menu on all app pages.
 */
function initPremiumNavDropdown() {
    const checkbox =
        document.getElementById('hamburger-checkbox') ||
        document.getElementById('nav-toggle');
    const dropdown =
        document.getElementById('hamburger-dropdown') ||
        document.getElementById('nav-dropdown');

    if (!checkbox || !dropdown) return;

    const root =
        document.getElementById('hamburger-menu-label') ||
        checkbox.closest('.hamburger-wrapper') ||
        checkbox.closest('.nav-actions') ||
        checkbox.closest('label');

    const items = dropdown.querySelectorAll('.nav-item-anim');

    const resetItems = () => {
        items.forEach((item) => {
            item.classList.remove('nav-item-visible');
            item.style.transitionDelay = '0ms';
        });
    };

    const closeMenu = () => {
        checkbox.checked = false;
        dropdown.classList.remove('active');
        resetItems();
    };

    const openMenu = () => {
        dropdown.classList.add('active');
        resetItems();
        requestAnimationFrame(() => {
            items.forEach((item, index) => {
                item.style.transitionDelay = `${index * 28}ms`;
                item.classList.add('nav-item-visible');
            });
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    };

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) openMenu();
        else {
            dropdown.classList.remove('active');
            resetItems();
        }
    });

    dropdown.addEventListener('mousemove', (e) => {
        const rect = dropdown.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        dropdown.style.setProperty('--mouse-x', `${x}%`);
        dropdown.style.setProperty('--mouse-y', `${y}%`);
    });

    document.addEventListener('click', (e) => {
        if (!checkbox.checked) return;
        if (root && root.contains(e.target)) return;
        closeMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && checkbox.checked) closeMenu();
    });

    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeMenu();
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase
                    .auth()
                    .signOut()
                    .then(() => {
                        const inPages = /\/pages\//i.test(window.location.pathname);
                        window.location.href = inPages ? '../index.html' : 'index.html';
                    })
                    .catch(() => {});
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPremiumNavDropdown);
} else {
    initPremiumNavDropdown();
}

window.initPremiumNavDropdown = initPremiumNavDropdown;
