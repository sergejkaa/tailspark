(function () {
  const CHEWS_PER_JAR = 60;
  const SUB_DISCOUNT = 0.15;

  // chewsPerDay + recommendedJars per dog size
  // Supply days = (qty * 60) / chewsPerDay
  // Over 75 lbs — confirm with client, currently assumed 4 chews/day, 3 jars
  const SIZES = {
    'under-15': { chewsPerDay: 1, recommendedJars: 1 },
    '15-45':    { chewsPerDay: 2, recommendedJars: 1 },
    '45-75':    { chewsPerDay: 3, recommendedJars: 2 },
    'over-75':  { chewsPerDay: 4, recommendedJars: 3 },
  };

  const state = {
    size: 'under-15',
    qty: 1,
    intervalDays: null,
    sellingPlanId: null,
    basePrice: 0,
    comparePrice: 0,
    sellingPlans: [],
  };

  // ── DOM helpers ──────────────────────────────────────────────────────────────

  const $ = (id) => document.getElementById(id);
  const fmt = (cents) => '$' + (cents / 100).toFixed(2);

  // ── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    const widget = $('ts-sub-widget');
    if (!widget) return;

    state.basePrice = parseInt(widget.dataset.basePrice, 10) || 0;
    state.comparePrice = parseInt(widget.dataset.comparePrice, 10) || state.basePrice;

    parsePlans();
    bindIntervalPlanIds();
    bindEvents();

    selectSize('under-15');

    // Auto-select first available interval
    const firstInterval = document.querySelector('#ts-interval-pills .ts-pill');
    if (firstInterval) selectInterval(firstInterval);
  }

  function parsePlans() {
    const el = $('ts-selling-plans-data');
    if (!el) return;
    try {
      const groups = JSON.parse(el.textContent);
      groups.forEach((group) => {
        group.selling_plans.forEach((plan) => state.sellingPlans.push(plan));
      });
    } catch (e) {}
  }

  // Match each interval pill's data-days to a selling plan ID
  function bindIntervalPlanIds() {
    document.querySelectorAll('#ts-interval-pills .ts-pill').forEach((btn) => {
      const days = parseInt(btn.dataset.days, 10);
      const plan = findPlanByDays(days);
      if (plan) btn.dataset.planId = plan.id;
    });
  }

  function findPlanByDays(days) {
    return state.sellingPlans.find((plan) => {
      const freqOption = plan.options && plan.options.find((o) => o.name === 'Order Frequency and Unit');
      if (!freqOption) return false;
      // value looks like "30-day", "45-day", etc.
      const planDays = parseInt(freqOption.value, 10);
      return planDays === days;
    });
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  function bindEvents() {
    document.querySelectorAll('.ts-size-pills .ts-pill').forEach((btn) => {
      btn.addEventListener('click', () => selectSize(btn.dataset.size));
    });

    $('ts-qty-minus').addEventListener('click', () => changeQty(-1));
    $('ts-qty-plus').addEventListener('click', () => changeQty(1));

    document.querySelectorAll('#ts-interval-pills .ts-pill').forEach((btn) => {
      btn.addEventListener('click', () => selectInterval(btn));
    });

    $('ts-btn-subscribe').addEventListener('click', submitSubscribe);
    $('ts-btn-onetime').addEventListener('click', submitOnetime);
  }

  // ── Size ─────────────────────────────────────────────────────────────────────

  function selectSize(size) {
    state.size = size;
    state.qty = SIZES[size].recommendedJars;

    document.querySelectorAll('.ts-size-pills .ts-pill').forEach((b) => {
      b.classList.toggle('ts-pill--active', b.dataset.size === size);
    });

    updateQtyDisplay();
    updateRecommended();
    updatePrice();
    checkWarning();
  }

  // ── Quantity ─────────────────────────────────────────────────────────────────

  function changeQty(delta) {
    state.qty = Math.max(1, state.qty + delta);
    updateQtyDisplay();
    updatePrice();
    checkWarning();
  }

  function updateQtyDisplay() {
    const unit = state.qty === 1 ? 'jar' : 'jars';
    $('ts-qty-num').textContent = state.qty;
    $('ts-qty-unit').textContent = unit;
  }

  // ── Recommendation box ────────────────────────────────────────────────────────

  function updateRecommended() {
    const { chewsPerDay, recommendedJars } = SIZES[state.size];
    const supplyDays = Math.floor((recommendedJars * CHEWS_PER_JAR) / chewsPerDay);
    const unit = recommendedJars === 1 ? 'jar' : 'jars';

    $('ts-rec-num').textContent = recommendedJars;
    $('ts-rec-unit').textContent = unit;
    $('ts-supply-days').textContent = supplyDays;
    $('ts-chews-day').textContent = chewsPerDay;
  }

  // ── Interval ─────────────────────────────────────────────────────────────────

  function selectInterval(btn) {
    document.querySelectorAll('#ts-interval-pills .ts-pill').forEach((b) => {
      b.classList.remove('ts-pill--active');
    });
    btn.classList.add('ts-pill--active');

    state.intervalDays = parseInt(btn.dataset.days, 10);
    state.sellingPlanId = btn.dataset.planId || null;

    checkWarning();
  }

  // ── Warning ───────────────────────────────────────────────────────────────────

  function checkWarning() {
    const warning = $('ts-warning');
    if (!state.intervalDays) { warning.classList.remove('ts-warning--visible'); return; }

    const { chewsPerDay } = SIZES[state.size];
    const actualSupply = Math.floor((state.qty * CHEWS_PER_JAR) / chewsPerDay);

    if (actualSupply < state.intervalDays) {
      const unit = state.qty === 1 ? 'jar' : 'jars';
      $('ts-warn-jars').textContent = state.qty;
      $('ts-warn-jars-unit').textContent = unit;
      $('ts-warn-supply').textContent = actualSupply;
      $('ts-warn-interval').textContent = state.intervalDays;
      warning.classList.add('ts-warning--visible');
    } else {
      warning.classList.remove('ts-warning--visible');
    }
  }

  // ── Price ─────────────────────────────────────────────────────────────────────

  function updatePrice() {
    const fullTotal = state.basePrice * state.qty;
    const subTotal = Math.round(fullTotal * (1 - SUB_DISCOUNT));
    const perJar = Math.round(subTotal / state.qty);

    $('ts-price-sale').textContent = fmt(subTotal);
    $('ts-price-compare').textContent = fmt(fullTotal);
    $('ts-price-per').textContent = fmt(perJar) + '/jar';
    $('ts-cta-sub-price').textContent = fmt(subTotal);
    $('ts-cta-otp-price').textContent = fmt(fullTotal);
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  function getForm() {
    const id = $('ts-sub-widget').dataset.productFormId;
    return document.getElementById(id);
  }

  function setHiddenInput(form, name, value) {
    let input = form.querySelector(`input[name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
    return input;
  }

  function submitSubscribe() {
    const form = getForm();
    if (!form) return;
    setHiddenInput(form, 'selling_plan', state.sellingPlanId || '');
    setHiddenInput(form, 'quantity', state.qty);
    form.querySelector('[type="submit"]').click();
  }

  function submitOnetime() {
    const form = getForm();
    if (!form) return;
    const sp = form.querySelector('input[name="selling_plan"]');
    if (sp) sp.remove();
    setHiddenInput(form, 'quantity', state.qty);
    form.querySelector('[type="submit"]').click();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
