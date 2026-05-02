/**
 * DevStage Global Page Loader
 * Handles entrance animations and page transitions
 */
(function() {
    // 1. Create and Inject Loader HTML
    const injectLoader = () => {
        if (document.getElementById('page-loader')) return;

        const loaderHTML = `
            <div id="page-loader" class="loader-wrapper">
                <div class="loader">
                    <svg viewBox="0 0 80 80">
                        <circle r="32" cy="40" cx="40" id="test"></circle>
                    </svg>
                </div>

                <div class="loader triangle">
                    <svg viewBox="0 0 86 80">
                        <polygon points="43 8 79 72 7 72"></polygon>
                    </svg>
                </div>

                <div class="loader">
                    <svg viewBox="0 0 80 80">
                        <rect height="64" width="64" y="8" x="8"></rect>
                    </svg>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('afterbegin', loaderHTML);
    };

    let isInitialLoad = true;

    // 2. Loader Logic
    const pageLoader = {
        hide: () => {
            const el = document.getElementById('page-loader');
            if (el) {
                el.classList.add('hidden');
                setTimeout(() => {
                    el.style.display = 'none';
                    isInitialLoad = false; // After first hide, it's no longer initial
                }, 800);
            }
        },
        show: () => {
            const el = document.getElementById('page-loader');
            if (el) {
                el.style.display = 'flex';
                el.offsetHeight;
                el.classList.remove('hidden');
            }
        }
    };

    // Expose to window
    window.pageLoader = pageLoader;

    // 3. Initialize on DOM ready
    const init = () => {
        injectLoader();
        const startTime = Date.now();

        // Hide on window load with conditional duration check
        window.addEventListener('load', () => {
            const elapsed = Date.now() - startTime;
            // Initial load: 1.5s, Transitions: 0.5s
            const minDuration = isInitialLoad ? 1500 : 500;
            const remaining = Math.max(0, minDuration - elapsed);

            setTimeout(() => {
                pageLoader.hide();
            }, remaining);
        });

        // Safety fallback
        setTimeout(pageLoader.hide, 5000);

        // 4. Page Transition Logic (Link Interception)
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            const target = link.getAttribute('target');

            // Skip if it's an external link, anchor, or has target="_blank"
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || 
                link.hasAttribute('download') || target === '_blank') {
                return;
            }

            // Only transition if it's a different internal page
            try {
                const url = new URL(href, window.location.origin);
                if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
                    // Pre-show loader before navigation starts
                    pageLoader.show();
                }
            } catch (err) {
                // Ignore invalid URLs
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
