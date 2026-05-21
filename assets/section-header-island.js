/* ============================================================
   ISLAND HEADER — section-header-island.js
   ============================================================ */

class IslandHeader extends HTMLElement {
  connectedCallback() {
    this.wrapper   = this.closest('.header-island-wrapper');
    this.section   = this.closest('.header-island-section');
    this.spacer    = this.section && this.section.querySelector('.header-island-spacer');
    this.drawer    = document.querySelector('.header-island__drawer');
    this.searchPanel = document.querySelector('.header-island__search-panel');
    this.stickyType  = this.dataset.sticky || 'always';
    this.lastScrollY = window.scrollY;
    this.scrollThreshold = 60;

    this._updateSpacer();
    this._updateMegaTop();
    this._setupMenu();
    this._setupSearch();
    this._setupScroll();
    this._setupDrawer();
    this._setupCartDrawer();
    this._markReady();

    document.addEventListener('click', this._onDocClick.bind(this));
    document.addEventListener('keydown', this._onKeydown.bind(this));
  }

  _markReady() {
    var entrance = this.dataset.entrance;
    if (entrance && entrance !== 'none') this.classList.add('animate--' + entrance);
    this.classList.add('is-ready');
  }

  _updateSpacer() {
    if (!this.spacer || !this.wrapper) return;
    var self = this;
    var update = function () {
      var h = self.wrapper.offsetHeight;
      if (self.section) self.section.style.setProperty('--header-island-total-height', h + 'px');
      self.spacer.style.height = h + 'px';
      // Update search panel top
      self._updateMegaTop();
    };
    update();
    new ResizeObserver(update).observe(this.wrapper);
  }

  _updateMegaTop() {
    var rect = this.getBoundingClientRect();
    var top  = rect.bottom + 8;
    this.wrapper.style.setProperty('--header-island-mega-top', top + 'px');
  }

  /* ---- Desktop menu: CLICK ONLY ---- */
  _setupMenu() {
    var self = this;
    this.querySelectorAll('.header-island__item[data-has-sub]').forEach(function (item) {
      var trigger = item.querySelector('.header-island__link');
      if (!trigger) return;
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = item.classList.contains('is-open');
        self._closeAll();
        if (!isOpen) {
          item.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
          self._updateMegaTop();
        }
      });
    });
  }

  _closeAll() {
    var self = this;
    this.querySelectorAll('.header-island__item.is-open').forEach(function (item) {
      item.classList.remove('is-open');
      var t = item.querySelector('.header-island__link');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }

  /* ---- Search ---- */
  _setupSearch() {
    var self = this;
    var btn = this.querySelector('[data-island-search]');
    if (!btn || !this.searchPanel) return;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var isOpen = self.searchPanel.classList.contains('is-open');
      self._closeAll();
      if (isOpen) {
        self._closeSearch();
      } else {
        self._updateMegaTop();
        self.searchPanel.classList.add('is-open');
        var input = self.searchPanel.querySelector('input[type="search"], input[name="q"]');
        if (input) setTimeout(function () { input.focus(); }, 80);
      }
    });
  }

  _closeSearch() {
    if (this.searchPanel) this.searchPanel.classList.remove('is-open');
  }

  /* ---- Outside clicks ---- */
  _onDocClick(e) {
    var target = e.target;
    var inHeader   = this.contains(target);
    var inSearch   = this.searchPanel && this.searchPanel.contains(target);
    var inMega     = !!target.closest('.header-island__mega, .header-island__dropdown');
    if (!inHeader && !inSearch && !inMega) {
      this._closeAll();
      this._closeSearch();
    }

    // Close drawer if open and click is outside the drawer panel
    if (this.drawer && this.drawer.classList.contains('is-open')) {
      var panel = this.drawer.querySelector('.header-island__drawer-panel');
      if (panel && !panel.contains(target)) {
        this._closeDrawer();
      }
    }
  }

  _onKeydown(e) {
    if (e.key === 'Escape') { this._closeAll(); this._closeSearch(); }
  }

  /* ---- Scroll ---- */
  _setupScroll() {
    var self = this;

    if (this.stickyType === 'none') {
      this.wrapper.classList.add('header-island-wrapper--static');
      return;
    }

    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;height:1px;width:1px;pointer-events:none;';
    document.body.prepend(sentinel);

    new IntersectionObserver(function (entries) {
      var past = !entries[0].isIntersecting;
      if (self.stickyType === 'compact-on-scroll' || self.stickyType === 'reveal-on-scroll-up') {
        self.wrapper.classList.toggle('is-compact', past);
      }
      if (!past) self.wrapper.classList.remove('is-hidden');
    }, { threshold: 0 }).observe(sentinel);

    if (self.stickyType === 'reveal-on-scroll-up') {
      window.addEventListener('scroll', function () { self._onScroll(); }, { passive: true });
    }
  }

  _onScroll() {
    var y    = window.scrollY;
    var diff = y - this.lastScrollY;
    if (diff > 5 && y > this.scrollThreshold) {
      this.wrapper.classList.add('is-hidden');
    } else if (diff < -5) {
      this.wrapper.classList.remove('is-hidden');
    }
    if (y <= 10) {
      this.wrapper.classList.remove('is-hidden', 'is-compact');
    }
    this.lastScrollY = y;
  }

  /* ---- Mobile Drawer ---- */
  _setupDrawer() {
    if (!this.drawer) return;
    var self = this;

    // Move drawer to <body> so its z-index: 999 is in the root stacking context,
    // preventing any section (slideshow, hero, etc.) from painting above it.
    if (this.drawer.parentElement !== document.body) {
      document.body.appendChild(this.drawer);
    }

    var burger  = this.querySelector('.header-island__burger');
    var closeBtn = this.drawer.querySelector('.header-island__drawer-close');
    var overlay  = this.drawer.querySelector('.header-island__drawer-overlay');

    if (burger)   burger.addEventListener('click',   function (e) { e.stopPropagation(); self._openDrawer(); });
    if (closeBtn) closeBtn.addEventListener('click', function (e) { e.stopPropagation(); self._closeDrawer(); });

    // Overlay click — robust handler
    if (overlay) {
      overlay.addEventListener('click',      function (e) { e.stopPropagation(); self._closeDrawer(); });
      overlay.addEventListener('touchstart', function (e) { e.stopPropagation(); self._closeDrawer(); }, { passive: true });
    }

    // Drawer submenus
    this.drawer.querySelectorAll('.header-island__drawer-item[data-has-sub]').forEach(function (item) {
      var trigger = item.querySelector('[data-toggle]');
      if (trigger) {
        trigger.addEventListener('click', function () {
          item.classList.toggle('is-open');
        });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.drawer.classList.contains('is-open')) self._closeDrawer();
    });
  }

  _openDrawer() {
    if (!this.drawer) return;
    this.drawer.classList.add('is-open');
    this.drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('island-drawer-open');
  }

  _closeDrawer() {
    if (!this.drawer) return;
    this.drawer.classList.remove('is-open');
    this.drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('island-drawer-open');
  }

  /* ---- Cart Drawer ---- */
  _setupCartDrawer() {
    var btn = this.querySelector('[data-island-cart]');
    if (!btn) return;
    var cartDrawer = document.querySelector('cart-drawer');
    if (!cartDrawer) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      cartDrawer.open(btn);
    });
  }
}

customElements.define('island-header', IslandHeader);
