(function () {
    const header = document.querySelector('[data-header-v2]');
    const toggle = document.getElementById('headerV2MenuToggle');
    const mega = document.getElementById('headerV2Mega');

    if (!header || !toggle || !mega) {
        return;
    }

    const body = document.getElementById('headerV2MegaBody');
    const cats = Array.prototype.slice.call(mega.querySelectorAll('.mega-cat[data-cat]'));
    const panes = Array.prototype.slice.call(mega.querySelectorAll('.mega-pane'));
    const mq = window.matchMedia('(max-width:880px)');
    const firstCat = cats.length ? cats[0].dataset.cat : null;

    const activate = function (cat) {
        if (!cat) {
            return;
        }

        cats.forEach(function (node) {
            node.classList.toggle('active', node.dataset.cat === cat);
        });

        panes.forEach(function (pane) {
            pane.classList.toggle('on', pane.dataset.pane === cat);
        });
    };

    const openMenu = function () {
        activate(firstCat);
        if (body) {
            body.classList.remove('drill');
        }
        mega.classList.add('open');
        mega.setAttribute('aria-hidden', 'false');
        header.classList.add('header-v2--menu-open');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('header-v2-menu-open');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    };

    const closeMenu = function () {
        mega.classList.remove('open');
        mega.setAttribute('aria-hidden', 'true');
        header.classList.remove('header-v2--menu-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('header-v2-menu-open');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';

        window.setTimeout(function () {
            if (!mega.classList.contains('open') && body) {
                body.classList.remove('drill');
            }
        }, 500);
    };

    toggle.addEventListener('click', function () {
        if (mega.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    mega.addEventListener('click', function (event) {
        if (event.target.closest('[data-mega-close]')) {
            closeMenu();
        }
    });

    const backBtn = mega.querySelector('[data-mega-back]');
    if (backBtn && body) {
        backBtn.addEventListener('click', function () {
            body.classList.remove('drill');
        });
    }

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && mega.classList.contains('open')) {
            closeMenu();
        }
    });

    cats.forEach(function (cat) {
        cat.addEventListener('click', function () {
            activate(cat.dataset.cat);
            if (mq.matches && body) {
                body.classList.add('drill');
            }
        });

        cat.addEventListener('mouseenter', function () {
            if (!mq.matches) {
                activate(cat.dataset.cat);
            }
        });
    });

    const updateScrolled = function () {
        const y = window.scrollY || 0;
        const isFlow = header.classList.contains('header-v2--flow');
        const isScrolled = y > (isFlow ? 8 : 60);
        header.classList.toggle('header-v2--sticky', isScrolled);
        header.classList.toggle('scrolled', isScrolled);
    };

    window.addEventListener('scroll', updateScrolled, { passive: true });
    updateScrolled();
})();
