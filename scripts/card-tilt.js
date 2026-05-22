function initCardTilt(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const cards = scope.querySelectorAll('.featured-team-card, .premium-side-panel');

    cards.forEach((card) => {
        if (card.dataset.tiltInit === '1') return;
        card.dataset.tiltInit = '1';

        const side = card.classList.contains('premium-side-panel');
        const divisor = side ? 22 : 15;
        const lift = side ? -4 : -8;

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rotateX = (y - rect.height / 2) / divisor;
            const rotateY = (rect.width / 2 - x) / divisor;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${lift}px)`;
            if (side) {
                card.style.borderColor = 'rgba(255, 140, 40, 0.12)';
                card.style.boxShadow = '0 14px 36px rgba(0, 0, 0, 0.55), 0 0 12px rgba(255, 140, 40, 0.04)';
            } else {
                card.style.borderColor = 'rgba(255, 138, 31, 0.28)';
                card.style.boxShadow =
                    '0 0 0 1px rgba(255, 138, 31, 0.08) inset, 0 20px 48px rgba(0, 0, 0, 0.48), 0 0 24px rgba(255, 138, 31, 0.08)';
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
            card.style.borderColor = '';
            card.style.boxShadow = '';
        });
    });
}
window.initCardTilt = initCardTilt;
