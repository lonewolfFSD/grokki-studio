/* ==========================================================================
   Grokki settings sheet UI layer (GlideSelect + Voice Stepper + Segmented).
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

  // GlideSelect constants (size="md", radius=10, menuWidth=176, popDuration=180, glideDuration=220, rememberPosition=true, showTags=true)
  var PAD = 4;
  var ROW_H = 30;
  var GAP = 1;
  var STEP = ROW_H + GAP;
  var MENU_GAP = 6;
  var POP_DURATION = 180;
  var POP_OUT = Math.round((POP_DURATION * 2) / 3);
  var REMEMBER_POSITION = true;
  var SHOW_TAGS = true;

  var nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  var nativeIndex = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');

  var syncers = [];
  var openMenu = null;
  var uidCounter = 0;

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

  function parseOpt(text, explicitTag) {
    var clean = text.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
    var m = clean.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (!m) return { main: clean, sub: explicitTag || '' };
    return { main: m[1].trim(), sub: explicitTag || m[2].trim() };
  }

  function voiceMeta(sub) {
    var m = sub.match(/^((?:British\s)?(?:Female|Male))\s*(.*)$/);
    if (!m) return sub;
    var rest = m[2] ? m[2].charAt(0).toLowerCase() + m[2].slice(1) : '';
    return rest ? m[1] + ', ' + rest : m[1];
  }

  // Hugeicons ArrowDown01Icon & Tick02Icon matching GlideSelect.tsx
  var SVG_ARROW_DOWN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"/></svg>';
  var SVG_TICK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 14L8.5 17.5L19 6.5"/></svg>';
  var SVG_LEFT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg>';
  var SVG_RIGHT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>';

  /* --------------------------------------------------- GlideSelect menus */

  function getSheetScale() {
    var s = sheet.getBoundingClientRect();
    var scale = sheet.offsetWidth ? s.width / sheet.offsetWidth : 1;
    return scale || 1;
  }

  function placeMenu(btn, menu) {
    var s = sheet.getBoundingClientRect();
    var b = btn.getBoundingClientRect();
    var scale = getSheetScale();
    var bTop = (b.top - s.top) / scale - sheet.clientTop;
    var bBottom = (b.bottom - s.top) / scale - sheet.clientTop;
    var bLeft = (b.left - s.left) / scale - sheet.clientLeft;
    var bRight = (b.right - s.left) / scale - sheet.clientLeft;

    var spaceBelow = sheet.clientHeight - bBottom;
    var mh = menu.offsetHeight;
    var mw = Math.max(menu.offsetWidth, 176);
    var up = mh + MENU_GAP + 8 > spaceBelow && bTop > mh + MENU_GAP + 8;
    var side = up ? 'top' : 'bottom';

    // Default align="left", clamped cleanly within settingsSheet bounds
    var left = bLeft;
    var align = 'left';
    if (left + mw > sheet.clientWidth - 12) {
      left = Math.max(12, bRight - mw);
      align = 'right';
    }

    menu.dataset.side = side;
    menu.dataset.align = align;
    menu.style.left = left + 'px';
    menu.style.right = 'auto';
    menu.style.top = (up ? bTop - mh - MENU_GAP : bBottom + MENU_GAP) + 'px';
    menu.style.setProperty('--gs-origin', (side === 'bottom' ? 'top' : 'bottom') + ' ' + align);
  }

  function typeaheadIndex(parsedItems, from, ch) {
    var c = ch.toLowerCase();
    var n = parsedItems.length;
    for (var k = 1; k <= n; k++) {
      var i = (from + k) % n;
      if (parsedItems[i].main.toLowerCase().indexOf(c) === 0) return i;
    }
    return from;
  }

  function buildSelect(select) {
    var wrap = select.parentElement;
    var id = 'gs-' + (++uidCounter);
    select.classList.add('gs-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    wrap.addEventListener('animationend', function (e) {
      if (e.animationName === 'gs-swap') delete wrap.dataset.swap;
    });

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gs-select-btn';
    btn.setAttribute('role', 'combobox');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id + '-list');
    btn.setAttribute('aria-label', select.getAttribute('aria-label') || 'Select');

    var label = document.createElement('span');
    label.className = 'gs-select-label';
    btn.appendChild(label);

    var arrow = document.createElement('span');
    arrow.className = 'gs-select-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = SVG_ARROW_DOWN;
    btn.appendChild(arrow);

    wrap.insertBefore(btn, select);

    var menu = document.createElement('div');
    menu.className = 'gs-menu';
    menu.dataset.state = 'closed';

    var list = document.createElement('div');
    list.id = id + '-list';
    list.className = 'gs-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', select.getAttribute('aria-label') || 'Select');

    var pill = document.createElement('span');
    pill.className = 'gs-pill';
    pill.setAttribute('aria-hidden', 'true');
    list.appendChild(pill);

    menu.appendChild(list);
    sheet.appendChild(menu);

    var items = [];
    var parsedItems = [];

    Array.prototype.forEach.call(select.options, function (opt, i) {
      var p = parseOpt(opt.text, opt.dataset ? opt.dataset.tag : '');
      parsedItems.push({ value: opt.value, main: p.main, tag: p.sub });

      var item = document.createElement('div');
      item.id = id + '-' + i;
      item.className = 'gs-item';
      item.setAttribute('role', 'option');
      item.dataset.index = String(i);
      item.dataset.value = opt.value;

      var mainSpan = document.createElement('span');
      mainSpan.className = 'gs-item-main';
      mainSpan.textContent = p.main;
      item.appendChild(mainSpan);

      if (SHOW_TAGS && p.sub) {
        var tagSpan = document.createElement('span');
        tagSpan.className = 'gs-item-tag';
        tagSpan.textContent = p.sub;
        item.appendChild(tagSpan);
      }

      var tickSpan = document.createElement('span');
      tickSpan.className = 'gs-item-tick';
      tickSpan.setAttribute('aria-hidden', 'true');
      tickSpan.innerHTML = SVG_TICK;
      item.appendChild(tickSpan);

      list.appendChild(item);
      items.push(item);
    });

    var phase = 'closed';
    var active = null;
    var instant = false;
    var closeTimer = null;
    var scrub = null;

    function getSelectedIndex() {
      var idx = nativeIndex.get.call(select);
      return idx >= 0 && idx < items.length ? idx : 0;
    }

    function setActive(next) {
      active = next;
      if (active !== null) {
        btn.setAttribute('aria-activedescendant', id + '-' + active);
      } else {
        btn.removeAttribute('aria-activedescendant');
      }
      if (phase !== 'open') return;
      if (active === null) {
        delete list.dataset.live;
        pill.style.opacity = '0';
        return;
      }
      list.dataset.live = '';
      var jump = instant || pill.style.opacity !== '1';
      pill.style.transitionDuration = jump ? '0ms, 150ms' : '';
      pill.style.transform = 'translateY(' + (active * STEP) + 'px)';
      pill.style.opacity = '1';
      instant = false;
    }

    function sync() {
      var idx = getSelectedIndex();
      var cur = parsedItems[idx];
      if (cur) label.textContent = cur.main;
      items.forEach(function (it, i) {
        it.setAttribute('aria-selected', String(i === idx));
      });
    }
    syncers.push(sync);
    hook(select, sync);
    sync();

    function open(viaKey) {
      if (select.disabled) return;
      if (openMenu && openMenu.instance !== inst) {
        openMenu.instance.close('instant', false);
      }
      clearTimeout(closeTimer);
      instant = true;
      var sel = getSelectedIndex();
      phase = 'open';

      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');

      menu.classList.add('visible');
      placeMenu(btn, menu);

      menu.style.transitionDuration = '0ms';
      menu.dataset.state = 'closed';
      void menu.offsetHeight;
      menu.style.transitionDuration = '';
      menu.dataset.state = 'open';

      pill.style.transition = 'none';
      pill.style.transform = 'translateY(' + (Math.max(0, sel) * STEP) + 'px)';
      pill.style.opacity = '0';
      void pill.offsetHeight;
      pill.style.transition = '';

      setActive(sel >= 0 ? sel : (viaKey ? 0 : null));
      openMenu = { btn: btn, menu: menu, instance: inst };
    }

    function close(mode, returnFocus) {
      setActive(null);
      clearTimeout(closeTimer);
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      if (openMenu && openMenu.instance === inst) {
        openMenu = null;
      }
      if (mode === 'instant') {
        phase = 'closed';
        menu.dataset.state = 'closed';
        menu.classList.remove('visible');
      } else {
        menu.style.transitionDuration = '';
        menu.dataset.state = 'closed';
        phase = 'closing';
        closeTimer = setTimeout(function () {
          phase = 'closed';
          menu.classList.remove('visible');
        }, POP_OUT + 20);
      }
      if (returnFocus) btn.focus({ preventScroll: true });
    }

    function pick(i, viaKey) {
      var it = parsedItems[i];
      if (!it) {
        close('instant', true);
        return;
      }
      var curVal = nativeValue.get.call(select);
      if (it.value !== curVal) {
        nativeValue.set.call(select, it.value);
        sync();
        if (!viaKey) wrap.dataset.swap = '';
        fire(select);
      }
      close('instant', true);
    }

    var inst = { open: open, close: close };

    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || select.disabled) return;
      e.preventDefault();
      btn.focus({ preventScroll: true });
      if (phase === 'open') close('pop', false);
      else open(false);
    });

    btn.addEventListener('keydown', function (e) {
      var k = e.key;
      var n = parsedItems.length;
      var cur = active !== null ? active : getSelectedIndex();

      if (phase !== 'open') {
        if (k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp') {
          e.preventDefault();
          open(true);
        }
        return;
      }

      function go(idx) {
        e.preventDefault();
        instant = true;
        setActive(Math.min(n - 1, Math.max(0, idx)));
      }

      if (k === 'ArrowDown' || k === 'ArrowUp') {
        go(active === null ? cur : cur + (k === 'ArrowDown' ? 1 : -1));
      } else if (k === 'Home' || k === 'End') {
        go(k === 'Home' ? 0 : n - 1);
      } else if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        pick(cur, true);
      } else if (k === 'Escape' || k === 'Tab') {
        if (k === 'Escape') {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
        close('instant', k === 'Escape');
      } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        go(typeaheadIndex(parsedItems, cur, k));
      }
    });

    function rowAt(clientY) {
      if (!scrub) return null;
      var y = (clientY - scrub.top) / scrub.scale;
      var i = Math.floor((y - PAD) / STEP);
      return i >= 0 && i < items.length ? i : null;
    }

    list.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch' || scrub) return;
      var row = e.target.closest ? e.target.closest('[data-index]') : null;
      if (!row) return;
      var i = Number(row.dataset.index);
      if (i !== active) setActive(i);
    });

    list.addEventListener('pointerleave', function () {
      if (!scrub && !REMEMBER_POSITION) setActive(null);
    });

    list.addEventListener('pointerdown', function (e) {
      if (scrub) return;
      try {
        list.setPointerCapture(e.pointerId);
      } catch (err) {}
      scrub = {
        id: e.pointerId,
        top: list.getBoundingClientRect().top,
        scale: getSheetScale()
      };
      instant = true;
      setActive(rowAt(e.clientY));
    });

    list.addEventListener('pointermove', function (e) {
      if (!scrub || scrub.id !== e.pointerId) return;
      var i = rowAt(e.clientY);
      if (i !== active) setActive(i);
    });

    function onListUp(e) {
      if (!scrub || scrub.id !== e.pointerId) return;
      var i = e.type === 'pointerup' ? rowAt(e.clientY) : null;
      scrub = null;
      if (i !== null) pick(i, false);
      else if (!REMEMBER_POSITION) setActive(null);
    }

    list.addEventListener('pointerup', onListUp);
    list.addEventListener('pointercancel', onListUp);
    list.addEventListener('lostpointercapture', onListUp);
  }

  function closeOpenMenu(mode, returnFocus) {
    if (!openMenu) return;
    openMenu.instance.close(mode || 'pop', !!returnFocus);
  }

  document.addEventListener('pointerdown', function (e) {
    if (!openMenu) return;
    if (openMenu.menu.contains(e.target) || openMenu.btn.contains(e.target)) return;
    closeOpenMenu('pop', false);
  }, true);

  // Esc closes an open menu first, without closing the whole sheet.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openMenu) {
      e.stopImmediatePropagation();
      e.preventDefault();
      closeOpenMenu('instant', true);
    }
  }, true);

  var gsBody = sheet.querySelector('.gs-body');
  if (gsBody) {
    gsBody.addEventListener('scroll', function () {
      if (openMenu) placeMenu(openMenu.btn, openMenu.menu);
    }, { passive: true });
  }

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
    if (!v && wasVisible) closeOpenMenu('instant', false);
    wasVisible = v;
  }
  new MutationObserver(function () {
    [0, 60, 200, 450].forEach(function (t) { setTimeout(checkVisible, t); });
  }).observe(sheet, { attributes: true, attributeFilter: ['class', 'style'] });

  checkVisible();
  syncAll();
})();
