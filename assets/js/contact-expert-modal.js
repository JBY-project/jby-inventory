(function () {
  'use strict';

  var modal = document.getElementById('jby-ce');
  if (!modal || modal.dataset.bound === '1') {
    return;
  }
  modal.dataset.bound = '1';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var CE_TOPICS = ['Buying a yacht', 'Selling a yacht', 'Experiences & events', 'Service & maintenance', 'General inquiry'];
  var cePicked = [];
  var cePicker = document.getElementById('jby-ce-picker');
  var ceMenu = document.getElementById('jby-ce-menu');
  var ceWrap = document.getElementById('jby-ce-topics');

  function lock(on) {
    document.body.style.overflow = on ? 'hidden' : '';
  }

  function openModal(trigger) {
    modal._opener = trigger || null;
    modal.querySelector('.jby-st-panel').classList.remove('done');
    modal.classList.add('open');
    lock(true);
    var mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) mobileMenu.classList.add('hidden');
    var mega = document.getElementById('headerV2Mega');
    if (mega && mega.classList.contains('open')) {
      mega.classList.remove('open');
      mega.setAttribute('aria-hidden', 'true');
      var header = document.querySelector('[data-header-v2]');
      if (header) header.classList.remove('header-v2--menu-open');
      document.body.classList.remove('header-v2-menu-open');
    }
    var closeBtn = modal.querySelector('.jby-st-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    lock(false);
    if (ceWrap) {
      ceWrap.classList.remove('open');
      cePicker.setAttribute('aria-expanded', 'false');
    }
    if (modal._opener && modal._opener.focus) {
      modal._opener.focus();
    }
  }

  function ceRender() {
    if (!cePicker) return;
    var chips = cePicked.map(function (t) {
      return '<span class="jby-rs-chip">' + t +
        '<button type="button" data-cedrop="' + t + '" aria-label="Remove ' + t + '">' +
        '<svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></span>';
    }).join('');
    cePicker.innerHTML = (chips || '<span class="jby-rs-ph">Select a topic</span>') +
      '<svg class="chev" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 7.5l5 5 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    ceMenu.innerHTML = CE_TOPICS.map(function (t) {
      var on = cePicked.indexOf(t) > -1;
      return '<div class="jby-rs-opt' + (on ? ' on' : '') + '" role="option" aria-selected="' + on + '" data-cepick="' + t + '">' +
        '<span class="jby-st-box" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        t + '</div>';
    }).join('');
  }

  if (cePicker) {
    ceRender();
    cePicker.addEventListener('click', function (e) {
      var drop = e.target.closest('[data-cedrop]');
      if (drop) {
        e.stopPropagation();
        cePicked = cePicked.filter(function (t) { return t !== drop.getAttribute('data-cedrop'); });
        ceRender();
        return;
      }
      ceWrap.classList.toggle('open');
      cePicker.setAttribute('aria-expanded', ceWrap.classList.contains('open'));
    });
    ceMenu.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-cepick]');
      if (!opt) return;
      var t = opt.getAttribute('data-cepick');
      if (cePicked.indexOf(t) > -1) cePicked = cePicked.filter(function (x) { return x !== t; });
      else cePicked.push(t);
      ceRender();
    });
    document.addEventListener('click', function (e) {
      if (ceWrap.classList.contains('open') && !ceWrap.contains(e.target)) {
        ceWrap.classList.remove('open');
        cePicker.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function bindOpener(el) {
    if (!el || el.dataset.contactExpertBound === '1') return;
    el.dataset.contactExpertBound = '1';
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(el);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-open-expert], .btn-contact-us, a.header-home__contact'), bindOpener);

  Array.prototype.forEach.call(modal.querySelectorAll('[data-ce-close]'), function (el) {
    el.addEventListener('click', closeModal);
  });

  document.getElementById('jby-ce-submit').addEventListener('click', function () {
    var err = document.getElementById('jby-ce-err');
    var miss = [];
    if (!document.getElementById('jby-ce-name').value.trim()) miss.push('your full name');
    if (!EMAIL_RE.test(document.getElementById('jby-ce-email').value.trim())) miss.push('a valid email');
    if (miss.length) {
      err.textContent = 'Please add ' + miss.join(', ') + '.';
      err.classList.add('show');
      return;
    }
    err.classList.remove('show');
    var topics = cePicked.length ? ' about ' + cePicked.join(', ').toLowerCase() : '';
    document.getElementById('jby-ce-done-msg').textContent =
      'Thanks — a Jeff Brown Yachts specialist will be in touch' + topics +
      ' at ' + document.getElementById('jby-ce-email').value.trim() + ' shortly.';
    modal.querySelector('.jby-st-panel').classList.add('done');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  window.openContactExpertModal = openModal;
  window.closeContactExpertModal = closeModal;
})();
