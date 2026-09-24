/* The photograph band's drift and the rise of the three lines in it.
   Self-contained on purpose: this section appears on pages that carry no
   parallax and no reveal engine of their own, and one small handler
   travelling with it beats thirty-odd pages each growing a copy.

   The drift: the image is centred when the band is centred in the window, and
   0.24 of the distance from there — panning down through the picture as the
   band rises, rather than lagging behind the page the way a background does.

   The rise only ever hides anything once the class below is on <html>, so a
   page whose script never runs shows the band rather than three blank lines. */
(function(){
  var band = document.querySelector('.jby-band');
  if (!band) return;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var rise = band.querySelectorAll('[data-rise]');
  if (rise.length && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('jb-rise-ready');
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        e.target.classList.add('jb-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    for (var i = 0; i < rise.length; i++) io.observe(rise[i]);
  }

  var bg = band.querySelector('.jb-bg');
  if (!bg || still) return;
  var ticking = false;
  function place(){
    ticking = false;
    var r = band.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    var centre = r.top + r.height / 2 - innerHeight / 2;
    bg.style.transform = 'translate3d(0,' + (centre * 0.24).toFixed(1) + 'px,0)';
  }
  function onScroll(){ if (!ticking){ ticking = true; requestAnimationFrame(place); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  place();
})();
