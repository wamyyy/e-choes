/* =====================================================
   CasaShoes — Main JavaScript
   ===================================================== */

(function () {
  'use strict';

  /* ===================================================
     LOADING SCREEN
     =================================================== */
  function initLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    if (!screen) return;
    window.addEventListener('load', () => {
      setTimeout(() => screen.classList.add('hidden'), 900);
    });
  }

  /* ===================================================
     NAVIGATION
     =================================================== */
  function initNavigation() {
    const header    = document.getElementById('site-header');
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    if (!header) return;

    // Scroll behavior
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      header.classList.toggle('scrolled', scrollY > 50);
      lastScroll = scrollY;
    }, { passive: true });

    // Hamburger toggle
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        const isOpen = hamburger.classList.toggle('open');
        mobileMenu.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close on link click
      mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('open');
          mobileMenu.classList.remove('open');
          document.body.style.overflow = '';
        });
      });
    }

    // Active nav link based on scroll
    const navLinks = document.querySelectorAll('.nav-links .nav-link[href^="#"]');
    let preferredCategoryLink = 'Men';

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const href = link.getAttribute('href');
        if (href === '#categories') {
          preferredCategoryLink = link.textContent.trim();
        }
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    function updateActiveNav() {
      const headerEl = document.getElementById('site-header');
      const headerHeight = headerEl ? headerEl.offsetHeight : 64;
      const scrollY = window.scrollY;
      const scrollPos = scrollY + headerHeight + 80;

      // Special case: Top of page
      if (scrollY < 200) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#hero');
        });
        return;
      }

      // Special case: Near bottom of page -> footer / about us
      if ((window.innerHeight + scrollY) >= (document.documentElement.scrollHeight - 80)) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#site-footer' || link.getAttribute('href') === '#editorial');
        });
        return;
      }

      const trackedSections = [
        { id: 'site-footer', href: '#site-footer' },
        { id: 'editorial', href: '#site-footer' },
        { id: 'best-collection', href: '#categories' },
        { id: 'countdown-section', href: '#categories' },
        { id: 'categories', href: '#categories' },
        { id: 'brands', href: '#brands' },
        { id: 'trust-bar', href: '#hero' },
        { id: 'hero', href: '#hero' }
      ];

      for (const item of trackedSections) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            navLinks.forEach(link => {
              const href = link.getAttribute('href');
              if (href === item.href) {
                if (href === '#categories') {
                  link.classList.toggle('active', link.textContent.trim() === preferredCategoryLink);
                } else {
                  link.classList.add('active');
                }
              } else {
                link.classList.remove('active');
              }
            });
            break;
          }
        }
      }
    }

    window.addEventListener('scroll', updateActiveNav, { passive: true });

    // Interactive brand cards filter
    document.querySelectorAll('.brand-item').forEach(item => {
      const name = item.querySelector('.brand-name')?.textContent.trim().toLowerCase();
      if (name === 'nike' || name === 'adidas') {
        item.style.cursor = 'pointer';
        item.setAttribute('title', `Filter shoes by ${name.toUpperCase()}`);
        item.addEventListener('click', () => {
          const catBtn = document.querySelector(`.category-btn[data-category="${name}"]`);
          if (catBtn) catBtn.click();
          const catSec = document.getElementById('categories');
          if (catSec) {
            const headerEl = document.getElementById('site-header');
            const hH = headerEl ? headerEl.offsetHeight : 64;
            const topPos = catSec.getBoundingClientRect().top + window.scrollY - hH;
            window.scrollTo({ top: Math.max(0, topPos), behavior: 'smooth' });
          }
        });
      }
    });
  }

  /* ===================================================
     SEARCH
     =================================================== */
  function initSearch() {
    const overlay      = document.querySelector('.search-overlay');
    const input        = document.getElementById('search-input');
    const closeBtn     = document.querySelector('.search-close');
    const resultsEl    = document.querySelector('.search-results');
    const desktopBtn   = document.getElementById('search-toggle');
    const heroTrigger   = document.getElementById('hero-search-trigger');

    if (!overlay || !input) return;

    function openSearch() {
      overlay.classList.add('open');
      // Hide the persistent mobile search bar while the overlay is open,
      // so only one search box is ever visible at a time.
      heroTrigger?.classList.add('is-hidden-while-searching');
      document.body.style.overflow = 'hidden';
      setTimeout(() => input.focus(), 100);
    }

    function closeSearch() {
      overlay.classList.remove('open');
      heroTrigger?.classList.remove('is-hidden-while-searching');
      document.body.style.overflow = '';
      input.value = '';
      if (resultsEl) resultsEl.innerHTML = '';
    }

    desktopBtn?.addEventListener('click', openSearch);
    heroTrigger?.addEventListener('click', openSearch);
    closeBtn?.addEventListener('click', closeSearch);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeSearch();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeSearch();
    });

    // Search logic
    let searchTimeout;
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => performSearch(input.value.trim()), 250);
    });

    function performSearch(query) {
      if (!resultsEl) return;

      if (!query) {
        resultsEl.innerHTML = '';
        return;
      }

      const products = window.NEXSOLE?.PRODUCTS || [];
      const lower    = query.toLowerCase();
      const matches  = products.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        (p.brand && p.brand.toLowerCase().includes(lower)) ||
        (p.model && p.model.toLowerCase().includes(lower)) ||
        (p.colorway && p.colorway.toLowerCase().includes(lower)) ||
        (p.category && p.category.toLowerCase().includes(lower))
      );

      if (matches.length === 0) {
        resultsEl.innerHTML = `<div class="search-empty">No shoes found for "${query}"</div>`;
        return;
      }

      resultsEl.innerHTML = matches.slice(0, 8).map(p => `
        <div class="search-result-item" data-id="${p.id}" role="button" tabindex="0">
          ${window.NEXSOLE.imageOptim.buildPicture(p.image, p.name, { imgClass: 'search-result-img', wrapperClass: 'search-result-img-wrap' })}
          <div class="search-result-info">
            <div class="search-result-name">${p.name}</div>
            <div class="search-result-price">${p.price.toFixed(2)} DH · <span style="font-size:0.75rem;color:var(--clr-gray-400);">${(p.images || []).length} photos</span></div>
          </div>
        </div>
      `).join('');
      window.NEXSOLE.imageOptim.syncCachedImages(resultsEl);

      resultsEl.querySelectorAll('.search-result-item').forEach(item => {
        const handler = () => {
          const product = products.find(p => p.id === parseInt(item.dataset.id));
          if (product) {
            closeSearch();
            openProductModal(product);
          }
        };
        item.addEventListener('click', handler);
        item.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });
      });
    }
  }

  /* ===================================================
     ACCOUNT MODAL (Sign In / Sign Up)
     =================================================== */
  function initAccountModal() {
    const overlay      = document.querySelector('.account-overlay');
    const userBtn       = document.getElementById('user-btn');
    const closeBtn      = document.getElementById('account-close');
    const tabLogin      = document.getElementById('account-tab-login');
    const tabSignup     = document.getElementById('account-tab-signup');
    const form          = document.getElementById('account-form');
    const submitBtn     = document.getElementById('account-submit');
    const usernameEl    = document.getElementById('account-username');
    const passwordEl    = document.getElementById('account-password');
    const confirmGroup  = document.getElementById('account-confirm-group');
    const confirmEl     = document.getElementById('account-password-confirm');
    const passwordError = document.getElementById('account-password-error');
    const googleBtn     = document.getElementById('account-google-btn');

    if (!overlay || !userBtn) return;

    let mode = 'login';

    function openAccount() {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => usernameEl?.focus(), 100);
    }

    function closeAccount() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      form?.reset();
      passwordError.hidden = true;
    }

    function setMode(newMode) {
      mode = newMode;
      const isLogin = mode === 'login';
      tabLogin.classList.toggle('active', isLogin);
      tabSignup.classList.toggle('active', !isLogin);
      tabLogin.setAttribute('aria-selected', isLogin);
      tabSignup.setAttribute('aria-selected', !isLogin);
      submitBtn.textContent = isLogin ? 'Sign In' : 'Create Account';

      // Sign up requires typing the password twice the first time
      confirmGroup.hidden = isLogin;
      confirmEl.required = !isLogin;
      if (isLogin) confirmEl.value = '';
      passwordError.hidden = true;
    }

    userBtn.addEventListener('click', openAccount);
    closeBtn?.addEventListener('click', closeAccount);
    tabLogin?.addEventListener('click', () => setMode('login'));
    tabSignup?.addEventListener('click', () => setMode('signup'));

    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeAccount();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeAccount();
    });

    form?.addEventListener('submit', e => {
      e.preventDefault();

      if (mode === 'signup' && passwordEl.value !== confirmEl.value) {
        passwordError.hidden = false;
        confirmEl.focus();
        return;
      }

      passwordError.hidden = true;
      closeAccount();
    });

    googleBtn?.addEventListener('click', () => {
      // Placeholder: hook up real Google OAuth flow here
      closeAccount();
    });
  }

  /* ===================================================
     PRODUCT GRID
     =================================================== */
  function initProductGrid() {
    const gridEl         = document.querySelector('.product-grid');
    const catBtns        = document.querySelectorAll('.category-btn');
    const loadMoreBtn    = document.getElementById('load-more-btn');
    const loadMoreCont   = document.getElementById('load-more-container');
    if (!gridEl) return;

    const products       = window.NEXSOLE?.PRODUCTS || [];
    let activeCategory   = 'all';
    let showingAll       = true; // Show all curated shoes in collection
    const INITIAL_LIMIT  = 12;

    // Compute dynamic category counts
    catBtns.forEach(btn => {
      const cat = btn.dataset.category;
      const countEl = btn.querySelector('.category-count');
      if (countEl) {
        const count = cat === 'all'
          ? products.length
          : products.filter(p => p.category === cat || p.brandCategory === cat || (p.brand && p.brand.toLowerCase() === cat)).length;
        countEl.textContent = count;
      }
    });

    function getFilteredProducts(category) {
      if (category === 'all') return products;
      return products.filter(p =>
        p.category === category ||
        p.brandCategory === category ||
        (p.brand && p.brand.toLowerCase() === category) ||
        (p.model && p.model.toLowerCase() === category)
      );
    }

    function renderGrid(category) {
      const filtered = getFilteredProducts(category);
      const itemsToRender = showingAll ? filtered : filtered.slice(0, INITIAL_LIMIT);

      // Handle Load More button visibility and text
      if (loadMoreCont && loadMoreBtn) {
        if (!showingAll && filtered.length > INITIAL_LIMIT) {
          const remaining = filtered.length - INITIAL_LIMIT;
          loadMoreBtn.innerHTML = `Load More Shoes (${remaining} more) <span class="arrow">↓</span>`;
          loadMoreCont.style.display = 'block';
        } else {
          loadMoreCont.style.display = 'none';
        }
      }

      // Fade out existing cards
      const existing = gridEl.querySelectorAll('.product-card');
      existing.forEach(el => el.classList.add('hiding'));

      setTimeout(() => {
        gridEl.innerHTML = itemsToRender.map((p, i) => buildProductCard(p, i)).join('');
        gridEl.querySelectorAll('.product-card').forEach(card => card.classList.add('showing'));
        bindProductCardEvents(gridEl);
        updateFavButtons();
        window.NEXSOLE?.imageOptim?.syncCachedImages(gridEl);
        window.NEXSOLE?.darkPhotos?.applyPhotoTheme(document.body.getAttribute('data-theme') === 'dark');
      }, 180);
    }

    function updateFavButtons() {
      gridEl.querySelectorAll('.product-fav-btn').forEach(btn => {
        const id = parseInt(btn.dataset.productId);
        btn.classList.toggle('favorited', window.NEXSOLE?.cart?.isFavorite(id) ?? false);
      });
    }

    // Load More click event
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        showingAll = true;
        renderGrid(activeCategory);
      });
    }

    // Category click event
    const categoryNavEl = document.querySelector('.category-nav');
    const mobileToggleBtn = document.getElementById('category-mobile-toggle');
    const mobileToggleLabel = document.getElementById('category-mobile-toggle-label');

    // Hamburger toggle opens/closes the dropdown list on mobile
    if (mobileToggleBtn && categoryNavEl) {
      mobileToggleBtn.addEventListener('click', () => {
        const nowOpen = categoryNavEl.classList.toggle('open');
        mobileToggleBtn.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
      });
    }

    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.category;
        showingAll = true;
        renderGrid(activeCategory);

        if (mobileToggleLabel) {
          mobileToggleLabel.textContent = btn.textContent.trim().replace(/\s*\d+\s*$/, '').trim();
        }
        if (categoryNavEl) {
          categoryNavEl.classList.remove('open');
        }
        if (mobileToggleBtn) {
          mobileToggleBtn.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Close the mobile dropdown when tapping outside of it
    document.addEventListener('click', (e) => {
      if (categoryNavEl && categoryNavEl.classList.contains('open') &&
          !categoryNavEl.contains(e.target) && !(mobileToggleBtn && mobileToggleBtn.contains(e.target))) {
        categoryNavEl.classList.remove('open');
        if (mobileToggleBtn) mobileToggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Initial render
    renderGrid(activeCategory);
  }

  function buildProductCard(product, index) {
    const starsHtml = buildStars(product.rating);
    const colorsHtml = (product.colors || []).map(c =>
      `<span class="color-dot" style="background:${c}" title="${c}"></span>`
    ).join('');
    const badgeHtml = product.badge
      ? `<span class="product-badge">${product.badge}</span>`
      : '';
    const oldPriceHtml = product.oldPrice
      ? `<span class="old-price">${product.oldPrice.toFixed(2)} DH</span>`
      : '';

    return `
      <div class="product-card reveal" style="transition-delay: ${index * 0.05}s" data-id="${product.id}">
        <div class="product-card-img-wrapper">
          ${badgeHtml}
          ${window.NEXSOLE.imageOptim.buildPicture(product.image, product.name, { imgClass: 'product-card-img', eager: index < 4 })}
          <button class="product-fav-btn" data-product-id="${product.id}" aria-label="Favorite ${product.name}">
            <svg viewBox="0 0 24 24" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
        </div>
        <div class="product-card-body">
          <div class="product-card-brand-row">
            <span class="product-card-brand">${product.brand || 'Sneaker'}</span>
            <div class="product-card-rating">
              <div class="stars">${starsHtml}</div>
              <span class="rating-count">(${product.reviews})</span>
            </div>
          </div>
          <h3 class="product-card-name">${product.name}</h3>
          <div class="product-card-colorway">${product.colorway || ''}</div>
          <div class="product-card-colors">${colorsHtml}</div>
          <div class="product-card-footer">
            <div class="product-card-price">${oldPriceHtml}${product.price.toFixed(2)} DH</div>
            <button class="product-card-shop-btn btn-arrow" data-id="${product.id}">
              View Angles <span class="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function bindProductCardEvents(container) {
    container.querySelectorAll('.product-card').forEach(card => {
      const id = parseInt(card.dataset.id);
      const product = (window.NEXSOLE?.PRODUCTS || []).find(p => p.id === id);

      card.addEventListener('click', e => {
        if (e.target.closest('.product-fav-btn')) return;
        if (product) openProductModal(product);
      });

      card.querySelector('.product-fav-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        if (product) {
          window.NEXSOLE?.cart?.toggleFavorite(product);
          const btn = e.currentTarget;
          btn.classList.toggle('favorited', window.NEXSOLE?.cart?.isFavorite(id));
          btn.style.transform = 'scale(1.4)';
          setTimeout(() => btn.style.transform = '', 200);
        }
      });

      const shopBtn = card.querySelector('.product-card-shop-btn');
      shopBtn?.addEventListener('click', e => {
        e.stopPropagation();
        if (product) openProductModal(product);
      });

      if (typeof IntersectionObserver !== 'undefined') {
        const io = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1 });
        io.observe(card);
      } else {
        card.classList.add('revealed');
      }
    });
  }

  /* ===================================================
     PREMIUM PRODUCT QUICK-VIEW MODAL & GALLERY
     =================================================== */
  const ALL_STANDARD_SIZES = ["39", "40", "41", "42", "43", "44"];

  let currentModalProduct = null;
  let currentModalGallery = {
    images: [],
    currentIndex: 0
  };

  let lightboxState = {
    images: [],
    currentIndex: 0,
    isOpen: false
  };

  function openLightbox(images, startIndex = 0) {
    const lightbox = document.getElementById('product-lightbox');
    const imgEl = document.getElementById('lightbox-img');
    const counterEl = document.getElementById('lightbox-counter');
    if (!lightbox || !imgEl) return;

    lightboxState.images = images;
    lightboxState.currentIndex = startIndex;
    lightboxState.isOpen = true;

    imgEl.src = window.NEXSOLE.imageOptim.bestSrc(images[startIndex]);
    if (counterEl) counterEl.textContent = `${startIndex + 1} / ${images.length}`;

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lightbox = document.getElementById('product-lightbox');
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightboxState.isOpen = false;
    // If modal is still open, keep scroll locked, else restore
    const overlay = document.querySelector('.modal-overlay');
    if (!overlay || !overlay.classList.contains('open')) {
      document.body.style.overflow = '';
    }
  }

  function updateLightboxImage(index) {
    if (!lightboxState.isOpen) return;
    const len = lightboxState.images.length;
    if (len === 0) return;
    if (index < 0) index = len - 1;
    if (index >= len) index = 0;
    lightboxState.currentIndex = index;

    const imgEl = document.getElementById('lightbox-img');
    const counterEl = document.getElementById('lightbox-counter');
    if (imgEl) {
      imgEl.style.opacity = '0.3';
      imgEl.style.transform = 'scale(0.96)';
      setTimeout(() => {
        imgEl.src = window.NEXSOLE.imageOptim.bestSrc(lightboxState.images[index]);
        imgEl.style.opacity = '1';
        imgEl.style.transform = 'scale(1)';
      }, 120);
    }
    if (counterEl) {
      counterEl.textContent = `${index + 1} / ${len}`;
    }
  }

  function openProductModal(product) {
    const overlay = document.querySelector('.modal-overlay');
    const modal   = document.getElementById('product-modal');
    if (!overlay || !modal) return;

    currentModalProduct = product;

    const galleryImages = (product.images && product.images.length > 0)
      ? product.images
      : [product.image];

    currentModalGallery.images = galleryImages;
    currentModalGallery.currentIndex = 0;

    const starsHtml   = buildStars(product.rating);
    const oldPriceHtml = product.oldPrice
      ? `<span class="old-price">${product.oldPrice.toFixed(2)} DH</span>` : '';
    const discountPercent = product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;
    const discountPill = discountPercent
      ? `<span class="modal-discount-badge">-${discountPercent}%</span>`
      : '';

    const isFav = window.NEXSOLE?.cart?.isFavorite(product.id) ?? false;

    // Sibling variants of the same model line
    const allProducts = window.NEXSOLE?.PRODUCTS || [];
    const siblingVariants = allProducts.filter(p =>
      p.model && product.model &&
      p.model.toLowerCase() === product.model.toLowerCase() &&
      p.brand && product.brand &&
      p.brand.toLowerCase() === product.brand.toLowerCase()
    );

    // Color selector HTML
    let colorSelectorHtml = '';
    if (siblingVariants.length > 1) {
      const swatches = siblingVariants.map(variant => {
        const isSelected = variant.id === product.id;
        const mainColor = (variant.colors && variant.colors[0]) || '#111111';
        const secondColor = (variant.colors && variant.colors[1]) || mainColor;
        return `
          <button class="modal-colorway-swatch ${isSelected ? 'selected' : ''}" 
                  data-variant-id="${variant.id}" 
                  title="${variant.name} (${variant.colorway || ''})"
                  aria-label="Colorway: ${variant.colorway || variant.name}">
            <span class="colorway-swatch-circle" style="background: linear-gradient(135deg, ${mainColor} 50%, ${secondColor} 50%);"></span>
            <span class="colorway-swatch-ring"></span>
          </button>
        `;
      }).join('');

      colorSelectorHtml = `
        <div class="modal-selector-block">
          <div class="modal-selector-header">
            <span class="modal-label">Color / Colorway</span>
            <span class="modal-selected-value" id="modal-selected-colorway-name">${product.colorway || product.name}</span>
          </div>
          <div class="modal-colorways-grid">
            ${swatches}
          </div>
        </div>
      `;
    } else {
      const dots = (product.colors || ['#111111', '#ffffff']).map((c, i) =>
        `<button class="modal-color-dot ${i === 0 ? 'selected' : ''}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`
      ).join('');

      colorSelectorHtml = `
        <div class="modal-selector-block">
          <div class="modal-selector-header">
            <span class="modal-label">Color Palette</span>
            <span class="modal-selected-value">${product.colorway || 'Original'}</span>
          </div>
          <div class="modal-colors">
            ${dots}
          </div>
        </div>
      `;
    }

    // Sizes grid HTML
    const availableSizes = product.sizes || ["39", "40", "41", "42", "43", "44"];
    let defaultSelectedSize = availableSizes[0] || "40";

    const sizesHtml = ALL_STANDARD_SIZES.map(s => {
      const isAvailable = availableSizes.includes(s);
      const isSelected = s === defaultSelectedSize;
      if (isAvailable) {
        return `
          <button class="size-btn ${isSelected ? 'selected' : ''}" data-size="${s}" aria-label="Size ${s}">
            ${s}
          </button>
        `;
      } else {
        return `
          <button class="size-btn disabled" data-size="${s}" disabled aria-label="Size ${s} - Out of stock" title="Out of stock">
            <span>${s}</span>
            <span class="size-strike" aria-hidden="true"></span>
          </button>
        `;
      }
    }).join('');

    // Thumbnails HTML
    const thumbnailsHtml = galleryImages.map((imgSrc, idx) => `
      <button class="modal-thumb-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Photo ${idx + 1} of ${galleryImages.length}">
        ${window.NEXSOLE.imageOptim.buildPicture(imgSrc, `${product.name} angle ${idx + 1}`, { imgClass: 'modal-thumb-img', eager: idx === 0 })}
      </button>
    `).join('');

    modal.querySelector('.product-modal-inner').innerHTML = `
      <!-- LEFT SIDE: Gallery -->
      <div class="product-modal-img-side">
        <!-- Close Button -->
        <button class="modal-close" aria-label="Close product view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="modal-gallery-wrapper">
          <!-- Main Stage Image Container -->
          <div class="modal-main-img-container" id="modal-main-img-wrapper" role="button" tabindex="0" title="Click to view fullscreen">
            <img class="product-modal-img" id="modal-main-img" src="${window.NEXSOLE.imageOptim.bestSrc(galleryImages[0])}" alt="${product.name}" decoding="async" fetchpriority="high">
            
            <!-- Zoom Hint Badge -->
            <div class="modal-zoom-badge" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              <span>Click to zoom</span>
            </div>

            <!-- Authentic / Badge pill -->
            ${product.badge ? `<div class="modal-badge-tag">${product.badge}</div>` : ''}

            <!-- Prev / Next navigation arrows -->
            ${galleryImages.length > 1 ? `
              <button class="modal-gallery-nav prev" id="modal-prev-btn" aria-label="Previous photo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button class="modal-gallery-nav next" id="modal-next-btn" aria-label="Next photo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            ` : ''}

            <!-- Photo Counter -->
            <div class="modal-photo-counter" id="modal-photo-counter">
              1 / ${galleryImages.length}
            </div>
          </div>

          <!-- Thumbnails Strip -->
          ${galleryImages.length > 1 ? `
            <div class="modal-thumbnails-container" id="modal-thumbnails" role="tablist" aria-label="Shoe photo angles">
              ${thumbnailsHtml}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- RIGHT SIDE: Product Details & Purchase Form -->
      <div class="product-modal-info">
        <!-- Top Bar: Brand, Rating & Favorite -->
        <div class="modal-header-top">
          <div class="modal-brand-rating">
            <span class="modal-brand-tag">${product.brand || 'Sneakers'}</span>
            <div class="modal-rating">
              <div class="stars">${starsHtml}</div>
              <span class="modal-rating-count">${product.rating} (${product.reviews} reviews)</span>
            </div>
          </div>
          <button class="modal-fav-btn ${isFav ? 'favorited' : ''}" data-product-id="${product.id}" aria-label="Toggle Wishlist">
            <svg viewBox="0 0 24 24" stroke-width="2" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        </div>

        <!-- Product Name & Colorway -->
        <h2 class="modal-product-name">${product.name}</h2>
        ${product.colorway ? `<div class="modal-colorway-label">${product.colorway}</div>` : ''}

        <!-- Price & Stock Row -->
        <div class="modal-price-stock-row">
          <div class="modal-price-wrapper">
            <span class="modal-current-price">${product.price.toFixed(2)} DH</span>
            ${oldPriceHtml}
            ${discountPill}
          </div>
          <div class="modal-stock-status">
            <span class="stock-indicator-dot"></span>
            <span>In Stock • Ready to ship</span>
          </div>
        </div>

        <!-- Color Selection -->
        ${colorSelectorHtml}

        <!-- Size Selection -->
        <div class="modal-selector-block" id="modal-size-block">
          <div class="modal-selector-header">
            <div class="modal-size-title-wrap">
              <span class="modal-label">Select Size</span>
              <span class="modal-selected-size-label" id="modal-selected-size-text">${defaultSelectedSize ? `: ${defaultSelectedSize}` : ''}</span>
            </div>
            <button type="button" class="modal-size-guide-link" id="modal-size-guide-trigger">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h20M2 12l5-5M2 12l5 5"/>
              </svg>
              Size Guide
            </button>
          </div>
          <div class="modal-sizes-grid" id="modal-sizes-grid">
            ${sizesHtml}
          </div>
          <!-- Inline Validation Error -->
          <div class="modal-size-error" id="modal-size-error" style="display: none;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Please select a shoe size before adding to cart</span>
          </div>
        </div>

        <!-- Quantity & Purchase Row -->
        <div class="modal-purchase-row">
          <div class="modal-qty-container">
            <span class="modal-label-small">Qty</span>
            <div class="modal-qty-stepper">
              <button class="modal-qty-btn minus" id="modal-qty-minus" aria-label="Decrease quantity" disabled>−</button>
              <span class="modal-qty-value" id="modal-qty-value">1</span>
              <button class="modal-qty-btn plus" id="modal-qty-plus" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <div class="modal-cta-container">
            <button class="modal-add-cart-btn" id="modal-add-cart">
              <span class="btn-text-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                <span>Add to Cart</span>
              </span>
              <span class="btn-price-tag">${product.price.toFixed(2)} DH</span>
            </button>
          </div>
        </div>

        <!-- Short Description -->
        <p class="modal-desc-preview">${product.description}</p>

        <!-- Divider -->
        <div class="modal-divider"></div>

        <!-- Trust Badges Bar -->
        <div class="modal-trust-bar">
          <div class="modal-trust-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            100% Authentic
          </div>
          <div class="modal-trust-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            Free Fast Shipping
          </div>
          <div class="modal-trust-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            30-Day Returns
          </div>
        </div>

        <!-- Accordion Details Sections -->
        <div class="modal-accordions">
          <!-- Accordion 1: Description -->
          <div class="modal-accordion-item">
            <button class="modal-accordion-header" aria-expanded="false">
              <span>Description & Craftsmanship</span>
              <span class="accordion-icon">+</span>
            </button>
            <div class="modal-accordion-body">
              <div class="accordion-content-inner">
                <p>${product.description}</p>
                <p style="margin-top: 8px;">Constructed with premium artisanal materials for optimal comfort, durability, and unmatched street elegance. Perfect for casual wear or elevation of modern lifestyle looks.</p>
              </div>
            </div>
          </div>

          <!-- Accordion 2: Details & Specs -->
          <div class="modal-accordion-item">
            <button class="modal-accordion-header" aria-expanded="false">
              <span>Details & Specifications</span>
              <span class="accordion-icon">+</span>
            </button>
            <div class="modal-accordion-body">
              <div class="accordion-content-inner">
                <ul class="modal-specs-list">
                  <li><strong>Brand:</strong> ${product.brand}</li>
                  <li><strong>Model:</strong> ${product.model}</li>
                  <li><strong>Colorway:</strong> ${product.colorway || 'Standard'}</li>
                  <li><strong>Upper:</strong> Premium Full-Grain Leather & Suede Trim</li>
                  <li><strong>Sole:</strong> Textured Gum / Rubber Outsole</li>
                  <li><strong>Closure:</strong> Lace-Up Fastening with reinforced eyelets</li>
                  <li><strong>Style Code:</strong> NX-${product.brand.substring(0,3).toUpperCase()}-${product.id.toString().padStart(4, '0')}</li>
                  <li><strong>Condition:</strong> Brand New In Original Box (Deadstock)</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Accordion 3: Size & Fit Guide -->
          <div class="modal-accordion-item" id="accordion-size-guide">
            <button class="modal-accordion-header" aria-expanded="false">
              <span>Size & Fit Guide</span>
              <span class="accordion-icon">+</span>
            </button>
            <div class="modal-accordion-body">
              <div class="accordion-content-inner">
                <p style="margin-bottom: 10px; font-weight: 500;">Fit Advice: <strong>True to size.</strong> If you have wider feet or prefer extra toe room, we recommend half a size up.</p>
                <div class="size-chart-table-wrap">
                  <table class="size-chart-table">
                    <thead>
                      <tr>
                        <th>US Men</th>
                        <th>US Women</th>
                        <th>UK</th>
                        <th>EU</th>
                        <th>CM</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>6.0</td><td>7.5</td><td>5.5</td><td>38.7</td><td>24.0</td></tr>
                      <tr><td>6.5</td><td>8.0</td><td>6.0</td><td>39.3</td><td>24.5</td></tr>
                      <tr><td>7.0</td><td>8.5</td><td>6.5</td><td>40.0</td><td>25.0</td></tr>
                      <tr><td>7.5</td><td>9.0</td><td>7.0</td><td>40.7</td><td>25.5</td></tr>
                      <tr><td>8.0</td><td>9.5</td><td>7.5</td><td>41.3</td><td>26.0</td></tr>
                      <tr><td>8.5</td><td>10.0</td><td>8.0</td><td>42.0</td><td>26.5</td></tr>
                      <tr><td>9.0</td><td>10.5</td><td>8.5</td><td>42.7</td><td>27.0</td></tr>
                      <tr><td>9.5</td><td>11.0</td><td>9.0</td><td>43.3</td><td>27.5</td></tr>
                      <tr><td>10.0</td><td>11.5</td><td>9.5</td><td>44.0</td><td>28.0</td></tr>
                      <tr><td>10.5</td><td>12.0</td><td>10.0</td><td>44.7</td><td>28.5</td></tr>
                      <tr><td>11.0</td><td>12.5</td><td>10.5</td><td>45.3</td><td>29.0</td></tr>
                      <tr><td>12.0</td><td>13.5</td><td>11.5</td><td>46.7</td><td>30.0</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Accordion 4: Shipping & Returns removed per request -->
        </div>
      </div>
    `;

    // Bind Gallery Navigation
    const mainImgEl     = modal.querySelector('#modal-main-img');
    const mainImgWrap   = modal.querySelector('#modal-main-img-wrapper');
    const counterEl     = modal.querySelector('#modal-photo-counter');
    const prevBtn       = modal.querySelector('#modal-prev-btn');
    const nextBtn       = modal.querySelector('#modal-next-btn');
    const thumbBtns     = modal.querySelectorAll('.modal-thumb-btn');

    window.NEXSOLE.imageOptim.syncCachedImages(modal);

    function setGalleryPhoto(index) {
      if (index < 0) index = galleryImages.length - 1;
      if (index >= galleryImages.length) index = 0;
      currentModalGallery.currentIndex = index;

      if (mainImgEl) {
        mainImgEl.style.opacity = '0.3';
        mainImgEl.style.transform = 'scale(0.96)';
        setTimeout(() => {
          mainImgEl.src = window.NEXSOLE.imageOptim.bestSrc(galleryImages[index]);
          mainImgEl.style.opacity = '1';
          mainImgEl.style.transform = 'scale(1)';
        }, 120);
      }

      if (counterEl) {
        counterEl.textContent = `${index + 1} / ${galleryImages.length}`;
      }

      thumbBtns.forEach((tb, i) => {
        tb.classList.toggle('active', i === index);
      });

      const activeThumb = modal.querySelector(`.modal-thumb-btn[data-index="${index}"]`);
      activeThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      setGalleryPhoto(currentModalGallery.currentIndex - 1);
    });

    nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      setGalleryPhoto(currentModalGallery.currentIndex + 1);
    });

    thumbBtns.forEach(tb => {
      tb.addEventListener('click', () => {
        const idx = parseInt(tb.dataset.index);
        setGalleryPhoto(idx);
      });
    });

    // Main image click -> Lightbox
    mainImgWrap?.addEventListener('click', () => {
      openLightbox(galleryImages, currentModalGallery.currentIndex);
    });

    // Size Selection Logic
    let selectedSize = defaultSelectedSize;
    const sizeTextEl = modal.querySelector('#modal-selected-size-text');
    const sizeErrorEl = modal.querySelector('#modal-size-error');
    const sizeBlockEl = modal.querySelector('#modal-size-block');

    modal.querySelectorAll('.size-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedSize = btn.dataset.size;
        if (sizeTextEl) sizeTextEl.textContent = `: ${selectedSize}`;
        if (sizeErrorEl) sizeErrorEl.style.display = 'none';
        if (sizeBlockEl) sizeBlockEl.classList.remove('has-error', 'shake');
      });
    });

    // Size Guide Trigger Button
    const sizeGuideBtn = modal.querySelector('#modal-size-guide-trigger');
    const sizeGuideAcc = modal.querySelector('#accordion-size-guide');
    sizeGuideBtn?.addEventListener('click', () => {
      if (sizeGuideAcc) {
        const header = sizeGuideAcc.querySelector('.modal-accordion-header');
        const body = sizeGuideAcc.querySelector('.modal-accordion-body');
        const icon = sizeGuideAcc.querySelector('.accordion-icon');
        const isOpen = header.getAttribute('aria-expanded') === 'true';
        if (!isOpen) {
          header.setAttribute('aria-expanded', 'true');
          body.style.maxHeight = body.scrollHeight + 'px';
          if (icon) icon.textContent = '−';
        }
        sizeGuideAcc.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Sibling Variant Color Swatches Click
    modal.querySelectorAll('.modal-colorway-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const vId = parseInt(swatch.dataset.variantId);
        const nextProduct = allProducts.find(p => p.id === vId);
        if (nextProduct) {
          openProductModal(nextProduct);
        }
      });
    });

    // Modal Color Dots (for single shoe palette)
    modal.querySelectorAll('.modal-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        modal.querySelectorAll('.modal-color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
      });
    });

    // Quantity Stepper
    let qty = 1;
    const MAX_STOCK = 10;
    const qtyEl  = modal.querySelector('#modal-qty-value');
    const minusB = modal.querySelector('#modal-qty-minus');
    const plusB  = modal.querySelector('#modal-qty-plus');
    const priceTagEl = modal.querySelector('.btn-price-tag');

    function updateLivePrice() {
      if (!priceTagEl) return;
      const cartApi = window.NEXSOLE?.cart;
      if (cartApi && typeof cartApi.calculateBundlePrice === 'function') {
        const existingCount = cartApi.getCartCount();
        const marginal = cartApi.calculateBundlePrice(existingCount + qty) - cartApi.calculateBundlePrice(existingCount);
        priceTagEl.textContent = `${marginal.toFixed(2)} DH`;
      } else {
        priceTagEl.textContent = `${(product.price * qty).toFixed(2)} DH`;
      }
    }

    function updateQtyButtons() {
      if (qtyEl) qtyEl.textContent = qty;
      if (minusB) minusB.disabled = qty <= 1;
      if (plusB) plusB.disabled = qty >= MAX_STOCK;
      updateLivePrice();
    }

    updateLivePrice();

    minusB?.addEventListener('click', () => {
      if (qty > 1) {
        qty -= 1;
        updateQtyButtons();
      }
    });

    plusB?.addEventListener('click', () => {
      if (qty < MAX_STOCK) {
        qty += 1;
        updateQtyButtons();
      }
    });

    // Add to Cart Logic with Validation and Feedback
    const addCartBtn = modal.querySelector('#modal-add-cart');
    addCartBtn?.addEventListener('click', () => {
      if (!selectedSize) {
        if (sizeErrorEl) sizeErrorEl.style.display = 'flex';
        if (sizeBlockEl) {
          sizeBlockEl.classList.add('has-error', 'shake');
          sizeBlockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => sizeBlockEl.classList.remove('shake'), 500);
        }
        return;
      }

      // Valid size -> Add to Cart
      addCartBtn.disabled = true;
      const originalHtml = addCartBtn.innerHTML;
      addCartBtn.classList.add('success-state');
      addCartBtn.innerHTML = `
        <span class="btn-text-content" style="color: #ffffff;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Added to Cart!</span>
        </span>
      `;

      window.NEXSOLE?.cart?.addToCart(product, qty, selectedSize);

      setTimeout(() => {
        addCartBtn.classList.remove('success-state');
        addCartBtn.innerHTML = originalHtml;
        addCartBtn.disabled = false;
        closeProductModal();
        setTimeout(() => window.NEXSOLE?.cart?.openCart(), 300);
      }, 750);
    });

    // Favorite Toggle
    modal.querySelector('.modal-fav-btn')?.addEventListener('click', e => {
      window.NEXSOLE?.cart?.toggleFavorite(product);
      const btn = e.currentTarget;
      const nowFav = window.NEXSOLE?.cart?.isFavorite(product.id);
      btn.classList.toggle('favorited', nowFav);
      btn.querySelector('svg').setAttribute('fill', nowFav ? 'currentColor' : 'none');
      btn.style.transform = 'scale(1.25)';
      setTimeout(() => btn.style.transform = '', 200);
    });

    // Accordions Toggle Logic
    modal.querySelectorAll('.modal-accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        const icon = header.querySelector('.accordion-icon');
        const isExpanded = header.getAttribute('aria-expanded') === 'true';

        // Close other accordions for clean single accordion view
        modal.querySelectorAll('.modal-accordion-header').forEach(h => {
          if (h !== header) {
            h.setAttribute('aria-expanded', 'false');
            if (h.nextElementSibling) h.nextElementSibling.style.maxHeight = null;
            const otherIcon = h.querySelector('.accordion-icon');
            if (otherIcon) otherIcon.textContent = '+';
          }
        });

        if (isExpanded) {
          header.setAttribute('aria-expanded', 'false');
          body.style.maxHeight = null;
          if (icon) icon.textContent = '+';
        } else {
          header.setAttribute('aria-expanded', 'true');
          body.style.maxHeight = body.scrollHeight + 'px';
          if (icon) icon.textContent = '−';
        }
      });
    });

    // Close Button
    modal.querySelector('.modal-close')?.addEventListener('click', closeProductModal);

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    const overlay = document.querySelector('.modal-overlay');
    overlay?.classList.remove('open');
    if (!lightboxState.isOpen) {
      document.body.style.overflow = '';
    }
  }

  /* ===================================================
     BEST COLLECTION GRID
     =================================================== */
  function initBestCollection() {
    const gridEl         = document.querySelector('#collection-grid');
    const loadMoreBtn    = document.getElementById('collection-load-more-btn');
    const loadMoreCont   = document.getElementById('collection-load-more');
    if (!gridEl) return;

    const products       = window.NEXSOLE?.PRODUCTS || [];
    // Only use the first 15 products for featured if there are more
    // actually user said "more than 15 shoes", let's use all products
    const featured       = products; 
    let showingAll       = false;
    const INITIAL_LIMIT  = 6;

    function renderGrid() {
      const itemsToRender = showingAll ? featured : featured.slice(0, INITIAL_LIMIT);

      if (loadMoreCont && loadMoreBtn) {
        if (!showingAll && featured.length > INITIAL_LIMIT) {
          const remaining = featured.length - INITIAL_LIMIT;
          loadMoreBtn.innerHTML = `View All Shoes (${remaining} more) <span class="arrow">↓</span>`;
          loadMoreCont.style.display = 'block';
        } else {
          loadMoreCont.style.display = 'none';
        }
      }

      // Fade out existing cards
      const existing = gridEl.querySelectorAll('.product-card');
      existing.forEach(el => el.classList.add('hiding'));

      setTimeout(() => {
        gridEl.innerHTML = itemsToRender.map((p, i) => buildProductCard(p, i)).join('');
        gridEl.querySelectorAll('.product-card').forEach(card => card.classList.add('showing'));
        bindProductCardEvents(gridEl);
        
        // update favorite buttons
        gridEl.querySelectorAll('.product-fav-btn').forEach(btn => {
          const id = parseInt(btn.dataset.productId);
          btn.classList.toggle('favorited', window.NEXSOLE?.cart?.isFavorite(id) ?? false);
        });
        window.NEXSOLE?.imageOptim?.syncCachedImages(gridEl);
        window.NEXSOLE?.darkPhotos?.applyPhotoTheme(document.body.getAttribute('data-theme') === 'dark');
      }, 200);
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        showingAll = true;
        renderGrid();
      });
    }

    renderGrid();
  }

  /* ===================================================
     REVIEWS CAROUSEL
     =================================================== */
  function initReviewsCarousel() {
    const reviews = [
      {
        text: "Finding shoes that feel good and look great isn't always easy. But this pair exceeded all my expectations. The quality is incredible and the style is exactly what I was looking for.",
        name: "Marcus Johnson",
        role: "Verified Customer",
        rating: 5,
        initials: "MJ",
        color: "#FF5E2C"
      },
      {
        text: "I ordered the Nike Air Force 1 and I'm absolutely blown away by the quality. The website was so easy to use and delivery was super fast. Will definitely be ordering again!",
        name: "Sophia Chen",
        role: "Verified Customer",
        rating: 5,
        initials: "SC",
        color: "#7C3AED"
      },
      {
        text: "These are the most comfortable sneakers I've ever owned. The premium materials are obvious the moment you put them on. CasaShoes has become my go-to shoe store.",
        name: "Alex Rivera",
        role: "Verified Customer",
        rating: 5,
        initials: "AR",
        color: "#0EA5E9"
      },
      {
        text: "Absolutely love my new formal shoes from CasaShoes. They look stunning and feel even better. I've been getting compliments every time I wear them. Highly recommend!",
        name: "Emma Williams",
        role: "Verified Customer",
        rating: 5,
        initials: "EW",
        color: "#10B981"
      },
      {
        text: "The checkout experience was seamless and my shoes arrived in perfect condition. The boot I ordered is stunning. Perfect fit and premium quality — worth every penny.",
        name: "James Mitchell",
        role: "Verified Customer",
        rating: 4,
        initials: "JM",
        color: "#F59E0B"
      }
    ];

    const container = document.querySelector('.reviews-track');
    if (!container) return;

    function buildReview(r) {
      const stars = Array.from({length: 5}, (_, i) =>
        `<span style="color:${i < r.rating ? '#FFB800' : '#ddd'}">★</span>`
      ).join('');
      return `
        <div class="review-card reveal">
          <div class="review-quote-icon">"</div>
          <p class="review-text">${r.text}</p>
          <div class="review-footer">
            <div class="review-avatar-placeholder" style="background:${r.color}">${r.initials}</div>
            <div>
              <div class="review-stars">${stars}</div>
              <div class="review-name">${r.name}</div>
              <div class="review-role">${r.role}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Show 3 at a time
    let currentSet = 0;
    const setsCount = Math.ceil(reviews.length / 3);

    function renderReviews() {
      const start = currentSet * 3;
      const slice = reviews.slice(start, start + 3);
      container.style.opacity = '0';
      setTimeout(() => {
        container.innerHTML = slice.map(buildReview).join('');
        container.style.opacity = '1';
        initScrollReveal(container.querySelectorAll('.reveal'));
      }, 300);
    }

    renderReviews();

    // Auto-cycle
    const reviewInterval = setInterval(() => {
      currentSet = (currentSet + 1) % setsCount;
      renderReviews();
    }, 6000);

    container.addEventListener('mouseenter', () => clearInterval(reviewInterval));
  }

  /* ===================================================
     HERO MOUSE PARALLAX
     =================================================== */
  function initHeroParallax() {
    const wrapper = document.querySelector('.hero-sneaker-wrapper');
    if (!wrapper) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let ticking = false;

    document.addEventListener('mousemove', e => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (e.clientX - cx) / cx;
        const dy = (e.clientY - cy) / cy;
        wrapper.style.transform = `translate(${dx * 12}px, ${dy * 8}px) rotateY(${dx * 4}deg)`;
        ticking = false;
      });
    });

    document.addEventListener('mouseleave', () => {
      wrapper.style.transform = '';
    });
  }

  /* ===================================================
     SCROLL REVEAL
     =================================================== */
  function initScrollReveal(elements) {
    const targets = elements || document.querySelectorAll('.reveal, .reveal-scale, .reveal-left, .reveal-right');
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach(el => el.classList.add('revealed'));
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => io.observe(el));
  }

  /* ===================================================
     EDITORIAL IMAGE COLLAGE
     =================================================== */
  function initEditorial() {
    const visual = document.querySelector('.editorial-visual');
    if (!visual) return;

    // Use authentic shoe photos from the collection
    const imgSrcs = [
      'images/b2aaf839-6b10-42f0-88a5-71b23eb18c21.JPG', // Samba Red
      'images/043da058-5617-461b-b50d-0e6b02cddd94.JPG', // Campus Grey
      'images/03e0972f-72d5-421d-8f0c-d4219e495966.JPG', // AF1 Baby Blue
      'images/18198879-d042-443b-9fa8-4157e94777e8.JPG'  // Samba OG White
    ];

    visual.innerHTML = imgSrcs.map((src, i) => `
      <div class="editorial-img-item reveal ${i === 0 ? 'reveal-left' : 'reveal-right'}"
           style="transition-delay: ${i * 0.15}s">
        ${window.NEXSOLE.imageOptim.buildPicture(src, 'Style editorial photo', { imgClass: 'editorial-img' })}
        <div class="editorial-img-overlay"></div>
      </div>
    `).join('');

    window.NEXSOLE.imageOptim.syncCachedImages(visual);
    initScrollReveal(visual.querySelectorAll('.reveal, .reveal-left, .reveal-right'));
  }

  /* ===================================================
     COUNTDOWN TIMER
     =================================================== */
  function initCountdown() {
    const daysEl  = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl  = document.getElementById('cd-mins');
    const secsEl  = document.getElementById('cd-secs');
    if (!daysEl) return;

    // Target: 2 days from now
    const saved = localStorage.getItem('nexsole_countdown_end');
    let endTime;
    if (saved) {
      endTime = parseInt(saved);
      if (endTime < Date.now()) {
        endTime = Date.now() + (2 * 24 * 60 * 60 * 1000) + (21 * 60 * 60 * 1000) + (44 * 60 * 1000) + (54 * 1000);
        localStorage.setItem('nexsole_countdown_end', endTime);
      }
    } else {
      endTime = Date.now() + (2 * 24 * 60 * 60 * 1000) + (21 * 60 * 60 * 1000) + (44 * 60 * 1000) + (54 * 1000);
      localStorage.setItem('nexsole_countdown_end', endTime);
    }

    function updateCountdown() {
      const remaining = Math.max(0, endTime - Date.now());
      const d = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const h = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((remaining % (1000 * 60)) / 1000);

      function setEl(el, val) {
        const str = String(val).padStart(2, '0');
        if (el.textContent !== str) {
          el.style.transform = 'translateY(-4px)';
          el.style.opacity   = '0.5';
          setTimeout(() => {
            el.textContent       = str;
            el.style.transform   = '';
            el.style.opacity     = '';
          }, 120);
        }
      }

      setEl(daysEl, d);
      setEl(hoursEl, h);
      setEl(minsEl, m);
      setEl(secsEl, s);

      if (remaining === 0) clearInterval(timer);
    }

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
  }

  /* ===================================================
     MODAL & LIGHTBOX OVERLAY EVENTS
     =================================================== */
  function initModalEvents() {
    const overlay = document.querySelector('.modal-overlay');
    const lightbox = document.getElementById('product-lightbox');
    const lbClose = document.getElementById('lightbox-close');
    const lbPrev = document.getElementById('lightbox-prev');
    const lbNext = document.getElementById('lightbox-next');

    // Modal background click
    overlay?.addEventListener('click', e => {
      if (e.target === overlay) closeProductModal();
    });

    // Lightbox events
    lightbox?.addEventListener('click', e => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-img-wrapper')) {
        closeLightbox();
      }
    });

    lbClose?.addEventListener('click', closeLightbox);
    lbPrev?.addEventListener('click', (e) => {
      e.stopPropagation();
      updateLightboxImage(lightboxState.currentIndex - 1);
    });
    lbNext?.addEventListener('click', (e) => {
      e.stopPropagation();
      updateLightboxImage(lightboxState.currentIndex + 1);
    });

    // Global keyboard handling for modal and lightbox
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (lightboxState.isOpen) {
          closeLightbox();
        } else if (overlay?.classList.contains('open')) {
          closeProductModal();
        }
      } else if (e.key === 'ArrowLeft') {
        if (lightboxState.isOpen) {
          updateLightboxImage(lightboxState.currentIndex - 1);
        } else if (overlay?.classList.contains('open')) {
          const prevBtn = overlay.querySelector('#modal-prev-btn');
          prevBtn?.click();
        }
      } else if (e.key === 'ArrowRight') {
        if (lightboxState.isOpen) {
          updateLightboxImage(lightboxState.currentIndex + 1);
        } else if (overlay?.classList.contains('open')) {
          const nextBtn = overlay.querySelector('#modal-next-btn');
          nextBtn?.click();
        }
      }
    });
  }

  /* ===================================================
     BUILD STARS HELPER
     =================================================== */
  function buildStars(rating) {
    return Array.from({length: 5}, (_, i) => {
      if (i < Math.floor(rating)) return '<span>★</span>';
      if (i < rating)             return '<span style="opacity:0.5">★</span>';
      return '<span style="opacity:0.25">★</span>';
    }).join('');
  }
  window.buildStars = buildStars;
  window.openProductModal = openProductModal;

  /* ===================================================
     SMOOTH SCROLL FOR ANCHOR LINKS
     =================================================== */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const header = document.getElementById('site-header');
          const headerHeight = header ? header.offsetHeight : 64;
          const targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight;
          window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth'
          });

          // Update active link immediately if desktop nav link
          if (link.classList.contains('nav-link')) {
            document.querySelectorAll('.nav-links .nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          }
        }
      });
    });
  }

  /* ===================================================
     SETTINGS PANEL + DARK MODE
     =================================================== */
  function initSettingsPanel() {
    const openBtn   = document.getElementById('settings-open-btn');
    const closeBtn  = document.getElementById('settings-close-btn');
    const overlay   = document.getElementById('settings-overlay');
    const panel     = document.getElementById('settings-panel');
    const toggle    = document.getElementById('dark-mode-toggle');
    const STORAGE_KEY = 'nexsole-theme';

    function openPanel() {
      overlay?.classList.add('open');
      panel?.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closePanel() {
      overlay?.classList.remove('open');
      panel?.classList.remove('open');
      document.body.style.overflow = '';
    }

    openBtn?.addEventListener('click', openPanel);
    closeBtn?.addEventListener('click', closePanel);
    overlay?.addEventListener('click', closePanel);

    function applyTheme(theme) {
      document.body.setAttribute('data-theme', theme);
      toggle?.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
      window.NEXSOLE?.darkPhotos?.applyPhotoTheme(theme === 'dark');
    }

    // Restore saved preference — light mode is the default unless the
    // visitor has explicitly chosen dark mode before.
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    applyTheme(saved === 'dark' ? 'dark' : 'light');

    toggle?.addEventListener('click', () => {
      const isDark = document.body.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
    });
  }

  /* ===================================================
     PROMO POPUP
     =================================================== */
  function initPromoPopup() {
    const overlay = document.getElementById('promo-overlay');
    const popup   = document.getElementById('promo-popup');
    const closeBtn = document.getElementById('promo-close-btn');
    const shopBtn  = document.getElementById('promo-shop-btn');
    const SESSION_KEY = 'nexsole-promo-seen';

    if (!overlay || !popup) return;

    let alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { /* ignore */ }
    if (alreadySeen) return;

    function openPromo() {
      overlay.classList.add('open');
      popup.classList.add('open');
    }

    function closePromo() {
      overlay.classList.remove('open');
      popup.classList.remove('open');
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { /* ignore */ }
    }

    closeBtn?.addEventListener('click', closePromo);
    overlay?.addEventListener('click', closePromo);
    shopBtn?.addEventListener('click', closePromo);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popup.classList.contains('open')) closePromo();
    });

    setTimeout(openPromo, 1500);
  }

  /* ===================================================
     INIT ALL
     =================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initLoadingScreen();
    initNavigation();
    initSearch();
    initAccountModal();
    initProductGrid();
    initBestCollection();
    initReviewsCarousel();
    initHeroParallax();
    initScrollReveal();
    initEditorial();
    initCountdown();
    initModalEvents();
    initSmoothScroll();
    initSettingsPanel();
    initPromoPopup();

    // Init cart
    window.NEXSOLE?.cart?.init();
  });

})();
