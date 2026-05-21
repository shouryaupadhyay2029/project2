/**
 * DevStage — Global Custom Cursor
 * Injects cursor DOM, smooth GPU tracking, delegated hover states.
 */
(function () {
    'use strict';

    const CURSOR_ID = 'devstage-custom-cursor';
    const LERP = 0.2;
    const HOVER_SELECTOR = [
        'a',
        'button',
        'input',
        'textarea',
        'select',
        'label',
        '[role="button"]',
        '[role="link"]',
        '[tabindex]:not([tabindex="-1"])',
        '.service-item',
        '.project-card',
        '.nav-link',
        '.nav-links a',
        '.dropdown-item',
        '.profile-dropdown',
        '.pro-badge',
        '.stat-btn',
        '.cta-link',
        '.btn-outline',
        '.hamburger',
        '.social-btn',
        '.profile-avatar',
        '.filter-trigger',
        '.modal-close',
        '.premium-btn',
        '.enter',
        '.inputBox input',
        '.social-btn-ui',
        '.auth-controls button',
        '.feature-terminal-card',
        '.join-btn',
        '.logo-bloom-wrapper',
        '.toggle-auth-link',
        '.forgot-password-link',
        '.about-link',
        '.card',
        '.project-cta',
        '.upload-zone',
        '.challenge-card',
        '.team-card',
        '.feed-card',
        '.filter-pill',
        '.tag-pill'
    ].join(',');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');

    let cursorEl = null;
    let rafId = null;
    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let isVisible = false;
    let activeHoverTarget = null;
    let listenersBound = false;

    function shouldUseCustomCursor() {
        return !coarsePointer.matches && !reducedMotion.matches;
    }

    function setNativeCursorMode() {
        document.documentElement.classList.remove('custom-cursor-active');
        teardownListeners();
        cancelAnimationFrame(rafId);
        rafId = null;
        const existing = document.getElementById(CURSOR_ID);
        if (existing) existing.remove();
        cursorEl = null;
        isVisible = false;
        activeHoverTarget = null;
    }

    function injectCursorElement() {
        let el = document.getElementById(CURSOR_ID);
        if (el) return el;

        el = document.createElement('div');
        el.id = CURSOR_ID;
        el.className = 'custom-cursor';
        el.setAttribute('aria-hidden', 'true');
        document.body.appendChild(el);
        return el;
    }

    function renderFrame() {
        if (!cursorEl) return;

        currentX += (targetX - currentX) * LERP;
        currentY += (targetY - currentY) * LERP;

        cursorEl.style.transform =
            `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;

        rafId = requestAnimationFrame(renderFrame);
    }

    function showCursor() {
        if (!cursorEl || isVisible) return;
        cursorEl.classList.remove('is-hidden');
        isVisible = true;
    }

    function hideCursor() {
        if (!cursorEl || !isVisible) return;
        cursorEl.classList.add('is-hidden');
        isVisible = false;
        cursorEl.classList.remove('hover');
        activeHoverTarget = null;
    }

    function onPointerMove(e) {
        if (!cursorEl) return;
        targetX = e.clientX;
        targetY = e.clientY;
        showCursor();
    }

    function onPointerOver(e) {
        if (!cursorEl) return;
        const target = e.target.closest(HOVER_SELECTOR);
        if (!target || target === activeHoverTarget) return;
        activeHoverTarget = target;
        cursorEl.classList.add('hover');
    }

    function onPointerOut(e) {
        if (!cursorEl || !activeHoverTarget) return;
        const related = e.relatedTarget;
        if (related && activeHoverTarget.contains(related)) return;
        if (related && related.closest && related.closest(HOVER_SELECTOR)) return;
        activeHoverTarget = null;
        cursorEl.classList.remove('hover');
    }

    function onPointerLeave() {
        hideCursor();
    }

    function onPointerEnter(e) {
        if (e.pointerType === 'mouse' && cursorEl) {
            targetX = e.clientX;
            targetY = e.clientY;
            currentX = targetX;
            currentY = targetY;
            showCursor();
        }
    }

    function bindListeners() {
        if (listenersBound) return;
        document.addEventListener('pointermove', onPointerMove, { passive: true });
        document.addEventListener('pointerover', onPointerOver, { passive: true });
        document.addEventListener('pointerout', onPointerOut, { passive: true });
        document.addEventListener('pointerleave', onPointerLeave, { passive: true });
        document.addEventListener('pointerenter', onPointerEnter, { passive: true });
        listenersBound = true;
    }

    function teardownListeners() {
        if (!listenersBound) return;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerover', onPointerOver);
        document.removeEventListener('pointerout', onPointerOut);
        document.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('pointerenter', onPointerEnter);
        listenersBound = false;
    }

    function init() {
        if (!document.body) return;

        if (!shouldUseCustomCursor()) {
            setNativeCursorMode();
            return;
        }

        document.documentElement.classList.add('custom-cursor-active');
        cursorEl = injectCursorElement();
        bindListeners();

        if (!rafId) {
            rafId = requestAnimationFrame(renderFrame);
        }
    }

    function boot() {
        init();
    }

    window.DevStageCursor = {
        init,
        destroy: setNativeCursorMode,
        refresh: init
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) boot();
    });

    const onMediaChange = () => boot();
    if (coarsePointer.addEventListener) {
        coarsePointer.addEventListener('change', onMediaChange);
        reducedMotion.addEventListener('change', onMediaChange);
    }
})();
