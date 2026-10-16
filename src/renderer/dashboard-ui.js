/* ==========================================================================
   Dashboard UI layer: sliding sidebar highlight.
   dashboard.js keeps handling tab switching; this only watches which
   .nav-btn carries .active and moves the highlight to it.
   Load AFTER dashboard.js.
   ========================================================================== */
(function () {
  'use strict';

  var nav = document.querySelector('.ds-nav');
  if (!nav) return;

  var buttons = nav.querySelectorAll('.nav-btn');
  var thumb = nav.querySelector('.ds-nav-thumb');
  if (!thumb || !buttons.length) return;

  function place(animate) {
    var active = nav.querySelector('.nav-btn.active') || buttons[0];
    if (!active || !active.offsetHeight) return;
    if (!animate) nav.classList.remove('ready');
    thumb.style.height = active.offsetHeight + 'px';
    thumb.style.transform = 'translateY(' + active.offsetTop + 'px)';
    if (!animate) {
      void thumb.offsetHeight;
      nav.classList.add('ready');
    }
  }

  var mo = new MutationObserver(function () { place(true); });
  Array.prototype.forEach.call(buttons, function (b) {
    mo.observe(b, { attributes: true, attributeFilter: ['class'] });
    b.addEventListener('click', function () { setTimeout(function () { place(true); }, 0); });
  });

  window.addEventListener('resize', function () { place(false); });

  place(false);
  // Fonts/icons can shift row heights after first paint.
  window.addEventListener('load', function () { place(false); });
})();
