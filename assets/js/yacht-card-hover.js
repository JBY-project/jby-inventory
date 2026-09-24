(function () {
    function initYachtCardHover(root) {
        const scope = root || document;

        scope.querySelectorAll('.yacht-card').forEach(function (card) {
            if (card.dataset.hoverInit === '1') {
                return;
            }

            card.dataset.hoverInit = '1';

            card.addEventListener('mouseenter', function () {
                const overlay = card.querySelector('.yacht-video-overlay');

                if (!overlay) {
                    return;
                }

                const video = overlay.querySelector('video');

                if (!video) {
                    return;
                }

                if (video.readyState === 0) {
                    video.load();
                }

                video.muted = true;
                video.play().catch(function () {});
            });

            card.addEventListener('mouseleave', function () {
                const video = card.querySelector('.yacht-video-overlay video');

                if (!video) {
                    return;
                }

                video.pause();

                try {
                    video.currentTime = 0;
                } catch (e) {
                    // Ignore seek errors on unload.
                }
            });
        });
    }

    window.initYachtCardHover = initYachtCardHover;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initYachtCardHover();
        });
    } else {
        initYachtCardHover();
    }
})();
