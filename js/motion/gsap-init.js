/**
 * GSAP Initialization
 * Registers GSAP plugins and sets up the foundation for motion design
 */

// Wait for GSAP to be loaded
window.addEventListener('load', () => {
    if (typeof gsap === 'undefined') {
        console.error('GSAP is not loaded. Please check the CDN script tag.');
        return;
    }

    if (typeof ScrollTrigger === 'undefined') {
        console.error('ScrollTrigger is not loaded. Please check the CDN script tag.');
        return;
    }

    // Register ScrollTrigger plugin
    try {
        gsap.registerPlugin(ScrollTrigger);
        console.log('GSAP and ScrollTrigger registered successfully');
    } catch (error) {
        console.error('Error registering ScrollTrigger:', error);
    }
});
