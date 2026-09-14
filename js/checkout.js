/* =====================================================
   CasaShoes — Checkout Flow
   Handles: cart -> checkout form -> animated confirmation
   All inside the same cart drawer (no page navigation).
   ===================================================== */

(function () {
  'use strict';

  const FIELDS = ['firstname', 'lastname', 'phone', 'email', 'street', 'city'];
  let sceneTimers = [];

  const CITY_REGION_MAP = {
    'casablanca': { region: 'Casablanca-Settat', postal: '20000' },
    'rabat': { region: 'Rabat-Salé-Kénitra', postal: '10000' },
    'marrakech': { region: 'Marrakech-Safi', postal: '40000' },
    'fès': { region: 'Fès-Meknès', postal: '30000' },
    'fes': { region: 'Fès-Meknès', postal: '30000' },
    'tanger': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '90000' },
    'agadir': { region: 'Souss-Massa', postal: '80000' },
    'meknès': { region: 'Fès-Meknès', postal: '50000' },
    'meknes': { region: 'Fès-Meknès', postal: '50000' },
    'salé': { region: 'Rabat-Salé-Kénitra', postal: '11000' },
    'sale': { region: 'Rabat-Salé-Kénitra', postal: '11000' },
    'oujda': { region: "L'Oriental", postal: '60000' },
    'kénitra': { region: 'Rabat-Salé-Kénitra', postal: '14000' },
    'kenitra': { region: 'Rabat-Salé-Kénitra', postal: '14000' },
    'tétouan': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '93000' },
    'tetouan': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '93000' },
    'safi': { region: 'Marrakech-Safi', postal: '46000' },
    'essaouira': { region: 'Marrakech-Safi', postal: '44000' },
    'el jadida': { region: 'Casablanca-Settat', postal: '24000' },
    'nador': { region: "L'Oriental", postal: '62000' },
    'al hoceïma': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '32000' },
    'al hoceima': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '32000' },
    'chefchaouen': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '91000' },
    'dakhla': { region: 'Dakhla-Oued Ed-Dahab', postal: '73000' },
    'laâyoune': { region: 'Laâyoune-Sakia El Hamra', postal: '70000' },
    'laayoune': { region: 'Laâyoune-Sakia El Hamra', postal: '70000' },
    'mohammedia': { region: 'Casablanca-Settat', postal: '28800' },
    'taza': { region: 'Fès-Meknès', postal: '35000' },
    'khouribga': { region: 'Béni Mellal-Khénifra', postal: '25000' },
    'béni mellal': { region: 'Béni Mellal-Khénifra', postal: '23000' },
    'beni mellal': { region: 'Béni Mellal-Khénifra', postal: '23000' },
    'settat': { region: 'Casablanca-Settat', postal: '26000' },
    'berrechid': { region: 'Casablanca-Settat', postal: '26100' },
    'errachidia': { region: 'Drâa-Tafilalet', postal: '52000' },
    'ouarzazate': { region: 'Drâa-Tafilalet', postal: '45000' },
    'taroudant': { region: 'Souss-Massa', postal: '83000' },
    'guelmim': { region: 'Guelmim-Oued Noun', postal: '81000' },
    'tiznit': { region: 'Souss-Massa', postal: '85000' },
    'nakhila': { region: 'Casablanca-Settat', postal: '26050' },
    'fnideq': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '93200' },
    "m'diq": { region: 'Tanger-Tétouan-Al Hoceïma', postal: '93250' },
    'mdiq': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '93250' },
    'asilah': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '90050' },
    'larache': { region: 'Tanger-Tétouan-Al Hoceïma', postal: '92000' },
    'khénifra': { region: 'Béni Mellal-Khénifra', postal: '54000' },
    'khenifra': { region: 'Béni Mellal-Khénifra', postal: '54000' },
    'midelt': { region: 'Drâa-Tafilalet', postal: '54350' },
    'sefrou': { region: 'Fès-Meknès', postal: '31000' },
    'tiflet': { region: 'Rabat-Salé-Kénitra', postal: '15400' },
    'khémisset': { region: 'Rabat-Salé-Kénitra', postal: '15000' },
    'khemisset': { region: 'Rabat-Salé-Kénitra', postal: '15000' },
    'sidi kacem': { region: 'Rabat-Salé-Kénitra', postal: '16000' },
    'sidi slimane': { region: 'Rabat-Salé-Kénitra', postal: '14200' },
    'el kelaâ des sraghna': { region: 'Marrakech-Safi', postal: '43000' },
    'el kelaa des sraghna': { region: 'Marrakech-Safi', postal: '43000' },
    'benguerir': { region: 'Marrakech-Safi', postal: '42150' },
    'oued zem': { region: 'Béni Mellal-Khénifra', postal: '25300' },
    'fquih ben salah': { region: 'Béni Mellal-Khénifra', postal: '23200' },
    'oualidia': { region: 'Casablanca-Settat', postal: '24252' },
    'tan-tan': { region: 'Guelmim-Oued Noun', postal: '82000' },
    'tan tan': { region: 'Guelmim-Oued Noun', postal: '82000' },
    'smara': { region: 'Laâyoune-Sakia El Hamra', postal: '72000' },
    'boujdour': { region: 'Laâyoune-Sakia El Hamra', postal: '71000' }
  };

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
      showError('email', 'Please enter a valid email address.');
      ok = false;
    }

    if (!data.street.trim()) {
      showError('street', 'Please enter your street address.');
      ok = false;
    }

    if (!data.city.trim()) {
      showError('city', 'Please select your city.');
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
      email: form.email.value,
      street: form.street?.value || '',
      apartment: form.apartment?.value || '',
      city: form.city?.value || ''
    };

    if (!validate(data)) {
      const firstInvalid = form.querySelector('.invalid');
      if (firstInvalid) firstInvalid.focus({ preventScroll: true });
      return;
    }

    const btn = $('checkout-submit-btn');
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }

    setTimeout(async () => {
      if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
      await placeOrder(data);
    }, 450);
  }

  function genOrderId() {
    return 'CS-' + Math.floor(100000 + Math.random() * 900000);
  }

  async function placeOrder(data) {
    const orderId = genOrderId();
    const idEl = $('order-id-value');
    if (idEl) idEl.textContent = orderId;

    const fullAddress = [
      data.street,
      data.apartment,
      data.city,
      'Morocco'
    ].filter(Boolean).join(', ');

    const cartApi = window.NEXSOLE && window.NEXSOLE.cart;
    const accountApi = window.NEXSOLE && window.NEXSOLE.account;
    const rawCart = JSON.parse(localStorage.getItem('nexsole_cart') || '[]');
    const cartTotal = cartApi ? cartApi.getCartTotal() : 0;

    let authUserId = null;
    if (window.sbClient) {
      try {
        const { data: userData } = await window.sbClient.auth.getUser();
        if (userData && userData.user) {
          authUserId = userData.user.id;
        }
      } catch (e) {}
    }

    if (accountApi && accountApi.addOrder) {
      accountApi.addOrder({
        id: orderId,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'pending',
        total: cartTotal,
        address: fullAddress,
        items: rawCart
      });
    }

    // Sync to Admin Orders Management Dashboard & Supabase
    try {
      const numericId = orderId.replace(/[^0-9]/g, '') || String(Math.floor(1000 + Math.random() * 9000));
      const now = new Date();
      const adminOrder = {
        id: orderId,
        order_number: '#' + numericId,
        created_at: now.toISOString(),
        date_display: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        agent_name: 'Admin Auto',
        agent_avatar: 'AD',
        agent_color: 'bg-blue-100 text-blue-700',
        tracking_code: 'AMN-' + Math.floor(10000 + Math.random() * 90000) + '-MA',
        tracking_carrier: 'Amana Express',
        firstname: data.firstname,
        lastname: data.lastname,
        client_name: (data.firstname + ' ' + data.lastname).trim(),
        client_email: data.email,
        client_phone: data.phone,
        client_city: data.city || 'Casablanca',
        client_street: data.street || '',
        client_apartment: data.apartment || '',
        client_address: fullAddress,
        status: 'Pending',
        category: 'Sneakers',
        total_amount: cartTotal,
        payment_method: 'Cash On Delivery',
        notes: 'Placed via customer checkout form',
        items: rawCart.map(item => ({
          name: item.name || 'CasaShoes Item',
          size: item.size || '42',
          quantity: item.quantity || item.qty || 1,
          price: item.price || cartTotal,
          image: item.image || 'images/af1_red_outline_pair.jpg'
        }))
      };

      // Save into Admin Orders LocalStorage
      const existing = JSON.parse(localStorage.getItem('casashoes_admin_orders') || '[]');
      existing.unshift(adminOrder);
      localStorage.setItem('casashoes_admin_orders', JSON.stringify(existing));
      localStorage.setItem('casashoes_last_placed_order', JSON.stringify(adminOrder));

      // Broadcast real-time event to Admin Dashboard
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('casashoes_realtime_orders');
        bc.postMessage({ type: 'NEW_ORDER', order: adminOrder });
      }

      // Insert directly into Supabase orders and order_items tables
      if (window.sbClient) {
        try {
          const { error: orderErr } = await window.sbClient
            .from('orders')
            .insert({
              id: orderId,
              customer_id: authUserId,
              customer_name: adminOrder.client_name,
              customer_phone: adminOrder.client_phone,
              customer_city: adminOrder.client_city,
              customer_address: adminOrder.client_address,
              customer_notes: adminOrder.notes,
              total_amount: cartTotal,
              status: 'pending',
              payment_method: 'cod'
            });

          if (orderErr) {
            console.warn('[Checkout] Supabase orders insert error:', orderErr);
          } else if (rawCart.length > 0) {
            const orderItems = rawCart.map(item => ({
              order_id: orderId,
              product_id: Number(item.id) || 1,
              product_name: item.name || 'CasaShoes Item',
              product_price: Number(item.price) || 199,
              size: String(item.size || '42'),
              quantity: Number(item.quantity || item.qty || 1),
              image: item.image || ''
            }));

            const { error: itemsErr } = await window.sbClient
              .from('order_items')
              .insert(orderItems);

            if (itemsErr) {
              console.warn('[Checkout] Supabase order_items insert error:', itemsErr);
            }
          }
        } catch (sbErr) {
          console.warn('[Checkout] Supabase push error:', sbErr);
        }
      }
    } catch (e) {
      console.warn('[Checkout] Admin sync warning:', e);
    }

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

  const CITIES_LIST = [
    "Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès", "Salé",
    "Oujda", "Kénitra", "Tétouan", "Safi", "Essaouira", "El Jadida", "Nador", "Al Hoceïma",
    "Chefchaouen", "Dakhla", "Laâyoune", "Mohammedia", "Taza", "Khouribga", "Béni Mellal",
    "Settat", "Berrechid", "Errachidia", "Ouarzazate", "Taroudant", "Guelmim", "Tiznit",
    "Nakhila", "Fnideq", "M'diq", "Asilah", "Larache", "Khénifra", "Midelt", "Sefrou",
    "Tiflet", "Khémisset", "Sidi Kacem", "Sidi Slimane", "El Kelaâ des Sraghna",
    "Benguerir", "Oued Zem", "Fquih Ben Salah", "Oualidia", "Tan-Tan", "Smara", "Boujdour"
  ];

  function autoFillCityDetails(cityName) {
    if (!cityName) return;
    const key = cityName.toLowerCase().trim();
    const info = CITY_REGION_MAP[key];
    if (info) {
      const regionEl = $('checkout-region');
      const postalEl = $('checkout-postal');
      if (regionEl) regionEl.value = info.region;
      if (postalEl && !postalEl.value.trim()) postalEl.value = info.postal;
    }
  }

  function initCityAutocomplete() {
    const input = $('checkout-city');
    const wrapper = $('city-autocomplete-wrapper');
    const toggleBtn = $('city-dropdown-toggle');
    const dropdown = $('city-autocomplete-dropdown');
    const optionsList = $('city-options-list');

    if (!input || !dropdown || !optionsList) return;

    let highlightedIndex = -1;

    function openDropdown() {
      dropdown.hidden = false;
      wrapper?.classList.add('is-open');
    }

    function closeDropdown() {
      dropdown.hidden = true;
      wrapper?.classList.remove('is-open');
      highlightedIndex = -1;
    }

    function selectCity(city) {
      input.value = city;
      clearError('city');
      autoFillCityDetails(city);
      closeDropdown();
    }

    function renderOptions(query = '') {
      const q = query.trim().toLowerCase();
      let matches = CITIES_LIST;

      if (q) {
        matches = CITIES_LIST.filter(city => city.toLowerCase().includes(q));
      }

      if (matches.length === 0) {
        optionsList.innerHTML = `<div class="city-option-empty">Aucune ville trouvée pour "${escapeText(query)}"</div>`;
        openDropdown();
        return;
      }

      optionsList.innerHTML = matches.map((city, idx) => {
        let label = city;
        if (q) {
          const startIdx = city.toLowerCase().indexOf(q);
          if (startIdx > -1) {
            const before = city.substring(0, startIdx);
            const match = city.substring(startIdx, startIdx + q.length);
            const after = city.substring(startIdx + q.length);
            label = `${before}<span class="city-match-highlight">${match}</span>${after}`;
          }
        }
        return `
          <div class="city-option-item ${idx === highlightedIndex ? 'highlighted' : ''}" data-city="${city}">
            <span>${label}</span>
          </div>
        `;
      }).join('');

      optionsList.querySelectorAll('.city-option-item').forEach(item => {
        item.addEventListener('click', () => {
          selectCity(item.dataset.city);
        });
      });

      openDropdown();
    }

    input.addEventListener('focus', () => {
      renderOptions(input.value);
    });

    input.addEventListener('input', () => {
      renderOptions(input.value);
      autoFillCityDetails(input.value);
    });

    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.hidden) {
        input.focus();
        renderOptions(input.value);
      } else {
        closeDropdown();
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrapper?.contains(e.target)) {
        closeDropdown();
      }
    });

    input.addEventListener('keydown', (e) => {
      const items = optionsList.querySelectorAll('.city-option-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedIndex = (highlightedIndex + 1) % Math.max(1, items.length);
        renderOptions(input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedIndex = (highlightedIndex - 1 + items.length) % Math.max(1, items.length);
        renderOptions(input.value);
      } else if (e.key === 'Enter') {
        if (!dropdown.hidden && highlightedIndex > -1 && items[highlightedIndex]) {
          e.preventDefault();
          selectCity(items[highlightedIndex].dataset.city);
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });
  }

  /* --- Init --- */
  function init() {
    $('cart-checkout-btn')?.addEventListener('click', goToCheckout);
    $('checkout-back-btn')?.addEventListener('click', backToCart);
    $('checkout-form')?.addEventListener('submit', handleSubmit);
    $('confirm-continue-btn')?.addEventListener('click', finishAndClose);

    FIELDS.forEach(name => {
      $(`checkout-${name}`)?.addEventListener('input', () => clearError(name));
      $(`checkout-${name}`)?.addEventListener('change', () => clearError(name));
    });

    initCityAutocomplete();
  }

  window.NEXSOLE = window.NEXSOLE || {};
  window.NEXSOLE.checkout = { init, goToCheckout, backToCart };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
