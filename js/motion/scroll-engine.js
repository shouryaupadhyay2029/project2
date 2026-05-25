/**
 * Scroll Engine - Lenis Smooth Scrolling with GSAP Integration
 * Provides premium smooth scrolling synchronized with GSAP ScrollTrigger
 */

// Initialize Lenis smooth scrolling
const initLenis = () => {
    if (typeof Lenis === 'undefined') {
        console.error('Lenis is not loaded. Please check the CDN script tag.');
        return null;
    }

    const lenis = new Lenis({
        duration: 1.2,
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 1,
        infinite: false,
    });

    // Synchronize Lenis with GSAP ScrollTrigger
    if (typeof ScrollTrigger !== 'undefined') {
        lenis.on('scroll', ScrollTrigger.update);
        
        // Add Lenis to GSAP ticker for smooth integration
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        
        // Disable lag smoothing for immediate response
        gsap.ticker.lagSmoothing(0);
    }

    // Request animation frame loop
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    
    requestAnimationFrame(raf);

    console.log('Lenis smooth scrolling initialized');
    return lenis;
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for GSAP to be registered first
    setTimeout(() => {
        window.lenis = initLenis();
    }, 100);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initLenis };
}
