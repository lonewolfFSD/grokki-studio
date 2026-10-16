/* ==========================================================================
   Grokki settings sheet UI layer.
   The native <select> / checkbox / button elements stay in the DOM with their
   original ids, so app.js keeps reading and writing them exactly as before.
   This file only mirrors their state into custom controls and writes user
   choices back (dispatching input + change events).
   Load AFTER app.js.
   ========================================================================== */
(function () {
  'use strict';

  var sheet = document.getElementById('settingsSheet');
  if (!sheet) return;

  if (getComputedStyle(sheet).position === 'static') sheet.style.position = 'relative';

  var EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
  var EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D]/gu;

  var nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  var nativeIndex = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');

  var syncers = [];
  var openMenu = null;

  function reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Mirror programmatic changes (app.js loading saved settings, etc.)
  function hook(select, onSync) {
    Object.defineProperty(select, 'value', {
      configurable: true,
      get: function () { return nativeValue.get.call(this); },
      set: function (v) { nativeValue.set.call(this, v); onSync(); }
    });
    Object.defineProperty(select, 'selectedIndex', {
      configurable: true,
      get: function () { return nativeIndex.get.call(this); },
      set: function (v) { nativeIndex.set.call(this, v); onSync(); }
    });
  }

  function parseOpt(text) {
    var clean = text.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
    var m = clean.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (!m) return { main: clean, sub: '' };
    return { main: m[1].trim(), sub: m[2].trim() };
  }

  function voiceMeta(sub) {
    var m = sub.match(/^((?:British\s)?(?:Female|Male))\s*(.*)$/);
    if (!m) return sub;
    var rest = m[2] ? m[2].charAt(0).toLowerCase() + m[2].slice(1) : '';
    return rest ? m[1] + ', ' + rest : m[1];
  }

  var SVG_UPDOWN = '<svg viewBox="0 0 10 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.2 5 2.2l3 3M2 8.8l3 3 3-3"/></svg>';
  var SVG_CHECK = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.5 5.6 10.6 11.5 3.6"/></svg>';
  var SVG_LEFT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg>';
  var SVG_RIGHT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>';

  /* ---------------------------------------------------------------- menus */

  function closeMenu(returnFocus) {
    if (!openMenu) return;
    var m = openMenu;
    openMenu = null;
    m.btn.classList.remove('open');
    m.btn.setAttribute('aria-expanded', 'false');
    m.menu.classList.remove('open');
    if (returnFocus) m.btn.focus();
  }

  function placeMenu(btn, menu) {
    var s = sheet.getBoundingClientRect();
    var b = btn.getBoundingClientRect();
    var scale = sheet.offsetWidth ? s.width / sheet.offsetWidth : 1;
    if (!scale) scale = 1;
    var bTop = (b.top - s.top) / scale - sheet.clientTop;
    var bBottom = (b.bottom - s.top) / scale - sheet.clientTop;
    var spaceBelow = sheet.clientHeight - bBottom;
    var mh = menu.offsetHeight;
    var up = mh + 14 > spaceBelow && bTop > mh + 14;

    menu.style.minWidth = Math.max(b.width / scale, 150) + 'px';
    menu.style.left = 'auto';
    menu.style.right = ((s.right - b.right) / scale - sheet.clientLeft) + 'px';
    menu.style.top = (up ? bTop - mh - 6 : bBottom + 6) + 'px';
    menu.style.transformOrigin = up ? 'bottom right' : 'top right';
  }

  function buildSelect(select) {
    var wrap = select.parentElement;
    select.classList.add('gs-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gs-select-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    var label = document.createElement('span');
    label.className = 'gs-select-label';
    btn.appendChild(label);
    btn.insertAdjacentHTML('beforeend', SVG_UPDOWN);
    wrap.insertBefore(btn, select);

    var menu = document.createElement('div');
    menu.className = 'gs-menu';
    menu.setAttribute('role', 'listbox');
    sheet.appendChild(menu);

    var items = [];
    Array.prototype.forEach.call(select.options, function (opt) {
      var p = parseOpt(opt.text);
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'gs-item';
      item.setAttribute('role', 'option');
      item.dataset.value = opt.value;
      item.tabIndex = -1;
      item.innerHTML = '<span class="gs-item-text"><span class="gs-item-main"></span><span class="gs-item-sub"></span></span>' + SVG_CHECK;
      item.querySelector('.gs-item-main').textContent = p.main;
      item.querySelector('.gs-item-sub').textContent = p.sub;
      item.addEventListener('click', function () {
        nativeValue.set.call(select, opt.value);
        sync();
        fire(select);
        closeMenu(true);
      });
      menu.appendChild(item);
      items.push(item);
    });

    function sync() {
      var cur = select.options[nativeIndex.get.call(select)];
      if (cur) label.textContent = parseOpt(cur.text).main;
      items.forEach(function (it) {
        it.setAttribute('aria-selected', String(cur && it.dataset.value === cur.value));
      });
    }
    syncers.push(sync);
    hook(select, sync);
    sync();

    function open() {
      if (openMenu && openMenu.menu === menu) return closeMenu(true);
      closeMenu();
      placeMenu(btn, menu);
      menu.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      openMenu = { btn: btn, menu: menu };
      var sel = menu.querySelector('[aria-selected="true"]') || items[0];
      if (sel) sel.focus({ preventScroll: true });
    }

    btn.addEventListener('click', open);
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!openMenu || openMenu.menu !== menu) open();
      }
    });
    menu.addEventListener('keydown', function (e) {
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Tab') { closeMenu(true); }
    });
  }

  document.addEventListener('pointerdown', function (e) {
    if (!openMenu) return;
    if (openMenu.menu.contains(e.target) || openMenu.btn.contains(e.target)) return;
    closeMenu();
  }, true);

  // Esc closes an open menu first, without closing the whole sheet.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openMenu) {
      e.stopImmediatePropagation();
      e.preventDefault();
      closeMenu(true);
    }
  }, true);

  /* -------------------------------------------------------- voice stepper */

  function buildStepper(select) {
    var host = select.parentElement;
    select.classList.add('gs-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'gs-step-btn';
    prev.setAttribute('aria-label', 'Previous voice');
    prev.innerHTML = SVG_LEFT;

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'gs-step-btn';
    next.setAttribute('aria-label', 'Next voice');
    next.innerHTML = SVG_RIGHT;

    var view = document.createElement('div');
    view.className = 'gs-step-view';
    view.setAttribute('aria-live', 'polite');

    host.insertBefore(prev, select);
    host.insertBefore(view, select);
    host.insertBefore(next, select);

    function makeItem(p) {
      var el = document.createElement('div');
      el.className = 'gs-step-item';
      var n = document.createElement('span');
      n.className = 'gs-step-name';
      n.textContent = p.main;
      var m = document.createElement('span');
      m.className = 'gs-step-meta';
      m.textContent = voiceMeta(p.sub);
      el.appendChild(n);
      el.appendChild(m);
      return el;
    }

    function render(dir) {
      var idx = nativeIndex.get.call(select);
      var opt = select.options[idx];
      if (!opt) return;
      if (view.dataset.v === opt.value && !dir) return;
      view.dataset.v = opt.value;

      var el = makeItem(parseOpt(opt.text));
      var olds = Array.prototype.slice.call(view.children);
      view.appendChild(el);

      if (!dir || reduced() || !olds.length) {
        olds.forEach(function (o) { o.remove(); });
        return;
      }
      var d = dir * 18;
      olds.forEach(function (o) {
        var a = o.animate(
          [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + (-d) + 'px)', opacity: 0 }],
          { duration: 240, easing: EASE, fill: 'forwards' }
        );
        a.onfinish = function () { o.remove(); };
      });
      el.animate(
        [{ transform: 'translateX(' + d + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
        { duration: 360, easing: EASE }
      );
    }

    function step(dir) {
      var n = select.options.length;
      if (!n) return;
      nativeIndex.set.call(select, (nativeIndex.get.call(select) + dir + n) % n);
      render(dir);
      fire(select);
    }

    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    host.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });

    syncers.push(function () { render(0); });
    hook(select, function () { render(0); });
    render(0);
  }

  /* ------------------------------------------------------ segmented control */

  function buildSegment(seg) {
    var thumb = document.createElement('span');
    thumb.className = 'gs-seg-thumb';
    seg.insertBefore(thumb, seg.firstChild);
    var buttons = seg.querySelectorAll('.pref-segment');

    function place(animate) {
      var active = seg.querySelector('.pref-segment.active') || buttons[0];
      if (!active || !active.offsetWidth) return;
      if (!animate) seg.classList.remove('ready');
      thumb.style.width = active.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + active.offsetLeft + 'px)';
      if (!animate) {
        void thumb.offsetWidth;
        seg.classList.add('ready');
      }
    }

    var mo = new MutationObserver(function () { place(true); });
    Array.prototype.forEach.call(buttons, function (b) {
      mo.observe(b, { attributes: true, attributeFilter: ['class'] });
      b.addEventListener('click', function () { setTimeout(function () { place(true); }, 0); });
    });

    syncers.push(function () { place(false); });
    place(false);
  }

  /* ------------------------------------------------------------------ init */

  Array.prototype.forEach.call(sheet.querySelectorAll('.gs-select > select'), buildSelect);

  var voice = sheet.querySelector('.gs-stepper > select');
  if (voice) buildStepper(voice);

  var seg = sheet.querySelector('.gs-segment');
  if (seg) buildSegment(seg);

  function syncAll() {
    syncers.forEach(function (fn) { fn(); });
  }

  // Re-measure whenever the sheet becomes visible (controls report 0 width while hidden).
  var wasVisible = false;
  function isVisible() {
    var cs = getComputedStyle(sheet);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 && sheet.offsetWidth > 0;
  }
  function checkVisible() {
    var v = isVisible();
    if (v && !wasVisible) syncAll();
    if (!v && wasVisible) closeMenu();
    wasVisible = v;
  }
  new MutationObserver(function () {
    [0, 60, 200, 450].forEach(function (t) { setTimeout(checkVisible, t); });
  }).observe(sheet, { attributes: true, attributeFilter: ['class', 'style'] });

  checkVisible();
  syncAll();
})();
