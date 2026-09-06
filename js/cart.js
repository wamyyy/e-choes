/* =====================================================
   CasaShoes — Cart Functionality
   ===================================================== */

(function () {
  'use strict';

  const CART_KEY = 'nexsole_cart';
  const FAV_KEY  = 'nexsole_favorites';

  /* --- State --- */
  let cart      = loadFromStorage(CART_KEY) || [];
  let favorites = loadFromStorage(FAV_KEY)  || [];

  /* --- Storage helpers --- */
  function loadFromStorage(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  }

  function saveCart()      { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function saveFavorites() { localStorage.setItem(FAV_KEY,  JSON.stringify(favorites)); }

  /* --- Cart actions --- */
  function addToCart(product, qty = 1, size = null) {
    const existing = cart.find(i => i.id === product.id && i.size === size);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ ...product, qty, size });
    }
    saveCart();
    updateCartUI();
    animateBadge();
  }

  function removeFromCart(id, size) {
    cart = cart.filter(i => !(i.id === id && i.size === size));
    saveCart();
    updateCartUI();
    renderCartItems();
  }

  function updateQty(id, size, delta) {
    const item = cart.find(i => i.id === id && i.size === size);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    updateCartUI();
    renderCartItems();
  }

  /* --- Bundle pricing ---
     Pair 1  = 199 DH
     Pair 2  = +100 DH  (199+100 = 299)
     Pair 3  = +199... rounds to +200 DH (299+200 = 499)
     Pair 4  = +100 DH  (499+100 = 599)
     ...then it keeps alternating +100 / +200 for each extra pair
     (1=199, 2=299, 3=499, 4=599, 5=799, 6=899, ...)
     Applies to the total number of pairs in the cart,
     regardless of which product(s) they are. */
  function calculateBundlePrice(count) {
    if (count <= 0) return 0;
    let total = 199;
    for (let i = 2; i <= count; i++) {
      total += (i % 2 === 0) ? 100 : 200;
    }
    return total;
  }

  function getCartTotal() {
    return calculateBundlePrice(getCartCount());
  }

  // Sum of items at their normal (non-bundle) price — used to show savings.
  function getCartBaseTotal() {
    return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function getCartCount() {
    return cart.reduce((sum, i) => sum + i.qty, 0);
  }

  function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
    renderCartItems();
  }

  /* --- Favorites --- */
  function toggleFavorite(product) {
    const idx = favorites.findIndex(f => f.id === product.id);
    if (idx > -1) {
      favorites.splice(idx, 1);
      showToast(`Removed from favorites`);
    } else {
      favorites.push({ id: product.id, name: product.name });
      showToast(`Added to favorites!`, 'success');
    }
    saveFavorites();
    updateFavoriteButtons();
  }

  function isFavorite(id) {
    return favorites.some(f => f.id === id);
  }

  /* --- UI Updates --- */
  function updateCartUI() {
    const count = getCartCount();
    const badge = document.querySelector('.cart-badge');
    const countEl = document.querySelector('.cart-items-count');
    const totalEl = document.querySelector('.cart-total-amount');
    const savingsEl = document.getElementById('cart-savings');

    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('visible', count > 0);
    }
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = `${getCartTotal().toFixed(2)} DH`;

    if (savingsEl) {
      const savings = getCartBaseTotal() - getCartTotal();
      if (savings > 0) {
        savingsEl.hidden = false;
        savingsEl.innerHTML = `<span>Bundle savings</span><span>-${savings.toFixed(2)} DH</span>`;
      } else {
        savingsEl.hidden = true;
        savingsEl.innerHTML = '';
      }
    }
  }

  function updateFavoriteButtons() {
    document.querySelectorAll('.product-fav-btn, .modal-fav-btn').forEach(btn => {
      const id = parseInt(btn.dataset.productId);
      if (!isNaN(id)) {
        btn.classList.toggle('favorited', isFavorite(id));
      }
    });
  }

  function renderCartItems() {
    const container = document.querySelector('.cart-items');
    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <p class="cart-empty-title">Your cart is empty</p>
          <p class="cart-empty-desc">Add some products to get started!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}" data-size="${item.size || ''}">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" loading="lazy">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-size">${item.size ? `Size: ${item.size}` : 'One size'}</div>
          <div class="cart-item-price">${(item.price * item.qty).toFixed(2)} DH</div>
          <div class="cart-item-controls">
            <button class="qty-btn qty-minus" data-id="${item.id}" data-size="${item.size || ''}" aria-label="Decrease quantity">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn qty-plus"  data-id="${item.id}" data-size="${item.size || ''}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="cart-item-remove" data-id="${item.id}" data-size="${item.size || ''}" aria-label="Remove from cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Bind cart item events
    container.querySelectorAll('.qty-minus').forEach(btn => {
      btn.addEventListener('click', () => updateQty(parseInt(btn.dataset.id), btn.dataset.size, -1));
    });
    container.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', () => updateQty(parseInt(btn.dataset.id), btn.dataset.size, 1));
    });
    container.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id), btn.dataset.size));
    });
  }

  function animateBadge() {
    const badge = document.querySelector('.cart-badge');
    if (!badge) return;
    badge.classList.remove('bounce');
    void badge.offsetWidth; // reflow
    badge.classList.add('bounce');
    setTimeout(() => badge.classList.remove('bounce'), 500);
  }

  /* --- Cart Drawer --- */
  function openCart() {
    const overlay = document.querySelector('.cart-overlay');
    const drawer  = document.querySelector('.cart-drawer');
    if (!overlay || !drawer) return;
    renderCartItems();
    updateCartUI();
    drawer.dataset.step = 'cart';
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    const overlay = document.querySelector('.cart-overlay');
    const drawer  = document.querySelector('.cart-drawer');
    overlay?.classList.remove('open');
    drawer?.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* --- Toast --- */
  function showToast(message, type = '') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  /* --- Init --- */
  function init() {
    updateCartUI();

    // Cart button
    document.querySelectorAll('.cart-btn, [data-action="open-cart"]').forEach(btn => {
      btn.addEventListener('click', openCart);
    });

    // Cart overlay close
    document.querySelector('.cart-overlay')?.addEventListener('click', closeCart);
    document.querySelectorAll('.cart-close').forEach(btn => {
      btn.addEventListener('click', closeCart);
    });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeCart();
    });
  }

  /* --- Public API --- */
  window.NEXSOLE = window.NEXSOLE || {};
  window.NEXSOLE.cart = {
    addToCart,
    removeFromCart,
    updateQty,
    toggleFavorite,
    isFavorite,
    openCart,
    closeCart,
    showToast,
    getCartCount,
    getCartTotal,
    getCartBaseTotal,
    calculateBundlePrice,
    clearCart,
    updateFavoriteButtons,
    renderCartItems,
    updateCartUI,
    init
  };
})();
