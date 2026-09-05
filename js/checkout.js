/* =====================================================
   CasaShoes — Checkout Flow
   Handles: cart -> checkout form -> animated confirmation
   All inside the same cart drawer (no page navigation).
   ===================================================== */

(function () {
  'use strict';

  const FIELDS = ['firstname', 'lastname', 'phone', 'email'];
  let sceneTimers = [];

  /* --- Helpers --- */
  function $(id) { return document.getElementById(id); }
  function drawer() { return $('cart-drawer'); }

  function setStep(step) {
    const d = drawer();
    if (d) d.dataset.step = step; // 'cart' | 'checkout' | 'confirm'
  }

  function clearTimers() {
    sceneTimers.forEach(t => clearTimeout(t));
    sceneTimers = [];
  }

  /* --- Step: Cart -> Checkout --- */
  function goToCheckout() {
    const cartApi = window.NEXSOLE && window.NEXSOLE.cart;
    if (!cartApi || cartApi.getCartCount() === 0) {
      cartApi && cartApi.showToast('Your cart is empty.', 'error');
      return;
    }
    fillSummary();
    setStep('checkout');
    const first = $('checkout-firstname');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 380);
  }

  function backToCart() {
    setStep('cart');
  }

  function fillSummary() {
    const cartApi = window.NEXSOLE && window.NEXSOLE.cart;
    if (!cartApi) return;
    const total = `${cartApi.getCartTotal().toFixed(2)} DH`;
    const sub = $('checkout-subtotal');
    const tot = $('checkout-total');
    if (sub) sub.textContent = total;
    if (tot) tot.textContent = total;
  }

  /* --- Validation --- */
  function fieldEls(name) {
    return {
      input: $(`checkout-${name}`),
      error: document.querySelector(`[data-error-for="${name}"]`)
    };
  }

  function showError(name, msg) {
    const { input, error } = fieldEls(name);
    if (input) input.classList.add('invalid');
    if (error) { error.textContent = msg; error.hidden = false; }
  }

  function clearError(name) {
    const { input, error } = fieldEls(name);
    if (input) input.classList.remove('invalid');
    if (error) error.hidden = true;
  }

  function validate(data) {
    let ok = true;
    FIELDS.forEach(clearError);

    if (!data.firstname.trim()) {
      showError('firstname', 'Please enter your first name.');
      ok = false;
    }
    if (!data.lastname.trim()) {
      showError('lastname', 'Please enter your last name.');
      ok = false;
    }

    const phoneClean = data.phone.replace(/[\s.-]/g, '');
    if (!/^\+?\d{8,15}$/.test(phoneClean)) {
      showError('phone', 'Please enter a valid phone number.');
      ok = false;
    }

    const emailClean = data.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailClean)) {
      showError('email', 'Please enter a valid email address (e.g. name@gmail.com).');
      ok = false;
    }

    return ok;
  }

  /* --- Submit --- */
  function handleSubmit(e) {
    e.preventDefault();
    const form = $('checkout-form');
    if (!form) return;

    const data = {
      firstname: form.firstname.value,
      lastname: form.lastname.value,
      phone: form.phone.value,
      email: form.email.value
    };

    if (!validate(data)) {
      const firstInvalid = form.querySelector('.invalid');
      if (firstInvalid) firstInvalid.focus({ preventScroll: true });
      return;
    }

    const btn = $('checkout-submit-btn');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }

    // Brief, cheap "processing" delay for perceived feedback (no network call).
    setTimeout(() => {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
      placeOrder(data);
    }, 450);
  }

  function genOrderId() {
    return 'CS-' + Math.floor(100000 + Math.random() * 900000);
  }

  function placeOrder(data) {
    const idEl = $('order-id-value');
    if (idEl) idEl.textContent = genOrderId();
    setStep('confirm');
    runConfirmAnimation(data);
  }

  /* --- Confirmation animation sequence --- */
  function runConfirmAnimation(data) {
    const stage = $('confirm-anim-stage');
    const title = $('confirm-title');
    const sub = $('confirm-sub');
    const details = $('confirm-details');
    const continueBtn = $('confirm-continue-btn');
    if (!stage) return;

    clearTimers();

    // Reset to scene 1
    stage.classList.remove('scene-pack', 'scene-ship', 'scene-done');
    if (details) details.hidden = true;
    if (continueBtn) continueBtn.hidden = true;
    if (title) title.textContent = 'Packing your order…';
    if (sub) sub.textContent = 'Placing your shoes safely in the box.';

    // Force reflow so the restart of scoped CSS animations is guaranteed.
    void stage.offsetWidth;
    stage.classList.add('scene-pack');

    sceneTimers.push(setTimeout(() => {
      stage.classList.remove('scene-pack');
      stage.classList.add('scene-ship');
      if (title) title.textContent = 'On its way!';
      if (sub) sub.textContent = `Hi ${escapeText(data.firstname) || 'there'}, your order just left our warehouse.`;
    }, 1500));

    sceneTimers.push(setTimeout(() => {
      stage.classList.remove('scene-ship');
      stage.classList.add('scene-done');
      if (title) title.textContent = 'Order Confirmed';
      if (sub) sub.textContent = 'Thank you for shopping with CasaShoes!';
      if (details) details.hidden = false;
      if (continueBtn) continueBtn.hidden = false;

      const cartApi = window.NEXSOLE && window.NEXSOLE.cart;
      if (cartApi && cartApi.clearCart) cartApi.clearCart();
    }, 3400));
  }

  function escapeText(str) {
    return (str || '').replace(/[<>&]/g, '');
  }

  function finishAndClose() {
    const cartApi = window.NEXSOLE && window.NEXSOLE.cart;
    if (cartApi) cartApi.closeCart();
    clearTimers();
    setTimeout(() => setStep('cart'), 350);
    const form = $('checkout-form');
    if (form) form.reset();
    FIELDS.forEach(clearError);
  }

  /* --- Init --- */
  function init() {
    $('cart-checkout-btn')?.addEventListener('click', goToCheckout);
    $('checkout-back-btn')?.addEventListener('click', backToCart);
    $('checkout-form')?.addEventListener('submit', handleSubmit);
    $('confirm-continue-btn')?.addEventListener('click', finishAndClose);

    FIELDS.forEach(name => {
      $(`checkout-${name}`)?.addEventListener('input', () => clearError(name));
    });
  }

  window.NEXSOLE = window.NEXSOLE || {};
  window.NEXSOLE.checkout = { init, goToCheckout, backToCart };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
