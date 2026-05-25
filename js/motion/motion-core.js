/**
 * Motion Core - Core Motion Utilities
 * Provides reusable motion utilities and helper functions for GSAP animations
 */

const MotionCore = {
    /**
     * Safe GSAP animation wrapper with performance optimizations
     * @param {Object} targets - GSAP targets
     * @param {Object} config - Animation configuration
     * @param {Object} options - Additional options (willChange, etc.)
     */
    animate: (targets, config, options = {}) => {
        if (typeof gsap === 'undefined') {
            console.warn('GSAP is not available');
            return null;
        }

        // Apply performance optimizations
        const optimizedConfig = { ...config };
        
        // Ensure transform-based animations for GPU acceleration
        if (config.x !== undefined || config.y !== undefined || 
            config.scale !== undefined || config.rotation !== undefined) {
            optimizedConfig.force3D = true;
        }

        // Apply will-change sparingly for performance
        if (options.willChange) {
            gsap.set(targets, { willChange: options.willChange });
            
            // Clean up will-change after animation
            if (config.onComplete) {
                const originalOnComplete = config.onComplete;
                optimizedConfig.onComplete = () => {
                    gsap.set(targets, { willChange: 'auto' });
                    originalOnComplete();
                };
            } else {
                optimizedConfig.onComplete = () => {
                    gsap.set(targets, { willChange: 'auto' });
                };
            }
        }

        return gsap.to(targets, optimizedConfig);
    },

    /**
     * Create a scroll-triggered animation
     * @param {Object} targets - GSAP targets
     * @param {Object} animationConfig - Animation configuration
     * @param {Object} scrollConfig - ScrollTrigger configuration
     */
    scrollAnimate: (targets, animationConfig, scrollConfig = {}) => {
        if (typeof ScrollTrigger === 'undefined') {
            console.warn('ScrollTrigger is not available');
            return MotionCore.animate(targets, animationConfig);
        }

        const defaults = {
            trigger: targets,
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse'
        };

        return MotionCore.animate(targets, {
            ...animationConfig,
            scrollTrigger: { ...defaults, ...scrollConfig }
        });
    },

    /**
     * Fade up animation with scroll trigger
     * @param {Object} targets - Elements to animate
     * @param {Object} options - Animation options
     */
    fadeUp: (targets, options = {}) => {
        const defaults = {
            y: 40,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out'
        };

        const scrollDefaults = {
            start: 'top 85%'
        };

        return MotionCore.scrollAnimate(
            targets, 
            { ...defaults, ...options },
            { ...scrollDefaults, ...options.scrollConfig }
        );
    },

    /**
     * Staggered animation for multiple elements
     * @param {Object} targets - Elements to animate
     * @param {Object} config - Animation configuration
     */
    stagger: (targets, config = {}) => {
        const defaults = {
            y: 30,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out'
        };

        return MotionCore.scrollAnimate(targets, { ...defaults, ...config });
    },

    /**
     * Parallax effect for scroll-based movement
     * @param {Object} targets - Elements to parallax
     * @param {Number} speed - Parallax speed (negative = slower, positive = faster)
     */
    parallax: (targets, speed = 0.5) => {
        if (typeof ScrollTrigger === 'undefined') {
            console.warn('ScrollTrigger is not available for parallax');
            return null;
        }

        return gsap.to(targets, {
            y: (i, target) => -ScrollTrigger.maxScroll(window) * speed,
            ease: 'none',
            scrollTrigger: {
                trigger: targets,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
            }
        });
    },

    /**
     * Smooth scroll to element
     * @param {String|Object} target - Target selector or element
     * @param {Object} options - Scroll options
     */
    scrollTo: (target, options = {}) => {
        const defaults = {
            duration: 1,
            ease: 'power2.inOut',
            offsetY: 0
        };

        const opts = { ...defaults, ...options };

        if (window.lenis) {
            window.lenis.scrollTo(target, {
                duration: opts.duration * 1000,
                easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
                offset: opts.offsetY
            });
        } else {
            // Fallback to native scroll if Lenis is not available
            const element = typeof target === 'string' 
                ? document.querySelector(target) 
                : target;
            
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    },

    /**
     * Kill all animations on targets
     * @param {Object} targets - Elements to kill animations on
     */
    kill: (targets) => {
        if (typeof gsap === 'undefined') return;
        gsap.killTweensOf(targets);
        ScrollTrigger.getAll().forEach(trigger => {
            if (trigger.trigger === targets || trigger.trigger.contains(targets)) {
                trigger.kill();
            }
        });
    },

    /**
     * Refresh all ScrollTriggers
     * Useful after dynamic content changes
     */
    refresh: () => {
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MotionCore = MotionCore;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotionCore;
}
