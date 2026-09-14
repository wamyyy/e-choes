/* =====================================================
   CasaShoes Admin — Orders Dashboard Controller
   - 3-button status action: Confirmed, Delivered, Cancelled
   - "View Full Details" modal matching Image 2 checkout form exactly
   - Active Orders vs Archived (Delivered) workflow
   - Real customer data persistence
   ===================================================== */

(function () {
  'use strict';

  const state = {
    orders: [],
    filteredOrders: [],
    selectedOrderIds: new Set(),
    viewMode: 'active', // 'active' | 'archived'
    searchQuery: '',
    statusFilter: 'Pending', // Pending is the DEFAULT view as requested
    sort: {
      field: 'created_at',
      direction: 'desc'
    },
    pagination: {
      currentPage: 1,
      pageSize: 10
    }
  };

  const $ = (id) => document.getElementById(id);

  // Store WhatsApp Contact Number for support footer
  const STORE_WHATSAPP_NUMBER = '0770220925';

  /**
   * Sanitizes customer's phone number to retain only digits
   * Automatically formats Moroccan mobile numbers (06... / 07... -> 2126... / 2127...)
   */
  function sanitizePhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '212' + cleaned.substring(1);
    }
    return cleaned;
  }

  /**
   * Generates a fully encoded WhatsApp confirmation URL with exact Arabic message template
   * @param {Object} orderData - Order details object
   * @returns {string} Fully encoded WhatsApp URL (https://wa.me/...)
   */
  function generateWhatsAppUrl(orderData) {
    if (!orderData) return 'https://wa.me/';

    const cleanPhone = sanitizePhoneNumber(orderData.client_phone || orderData.phone);
    const customerName = (orderData.client_name || `${orderData.firstname || ''} ${orderData.lastname || ''}`).trim() || 'الزبون المحترم';
    const orderNumber = orderData.order_number || orderData.id || '';
    const totalAmount = Number(orderData.total_amount || 0).toFixed(2);

    // Format products / items list
    let itemsText = '';
    if (Array.isArray(orderData.items) && orderData.items.length > 0) {
      itemsText = orderData.items.map(item => {
        const name = item.name || 'CasaShoes Sneaker';
        const size = item.size || '42';
        const color = item.color || item.colorway || 'الأصلي';
        const qty = item.quantity || item.qty || 1;
        return `• المنتج: ${name} (المقاس: ${size} | العدد: ${qty})`;
      }).join('\n');
    } else {
      itemsText = `• المنتج: CasaShoes Premium Selection (المقاس: 42 | اللون: الأصلي | العدد: 1)`;
    }

    // Format customer shipping address
    const addressParts = [
      orderData.client_street || orderData.street,
      orderData.client_apartment || orderData.apartment,
      orderData.client_city || orderData.city || 'الدار البيضاء'
    ].filter(Boolean);
    const customerAddress = addressParts.join('، ') || orderData.client_address || orderData.city || 'الدار البيضاء';
    const rawPhone = orderData.client_phone || orderData.phone || '';

    // Exact Arabic Message Template requested
    const message = `مرحباً ${customerName}، تم استلام طلبك رقم #${orderNumber} بنجاح وجاري تحضيره للشحن:

${itemsText}
• المبلغ الإجمالي: ${totalAmount} درهم
• العنوان : ${customerAddress} 

سيصلك اتصال من الموزع لتأكيد موعد التسليم. للاستفسار أو التعديل، تواصل معنا عبر الواتساب: ${STORE_WHATSAPP_NUMBER}. شكراً لثقتك بـ CasaShoes!`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  // Expose globally for modular usage
  window.generateWhatsAppUrl = generateWhatsAppUrl;
  window.sanitizePhoneNumber = sanitizePhoneNumber;

  const STATUS_CONFIG = {
    'Confirmed': {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Confirmed'
    },
    'Delivered': {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
      label: 'Delivered (Archived)'
    },
    'Pending': {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Pending'
    },
    'Cancelled': {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      label: 'Cancelled'
    },
    'Failed Delivery': {
      bg: 'bg-orange-50 text-orange-700 border-orange-200',
      dot: 'bg-orange-500',
      label: 'Failed Delivery'
    }
  };

  async function init() {
    setupSoundNotificationToggle();
    setupSubscribers();
    setupGlobalDelegatedListeners();
    setupStaticEventListeners();
    await loadOrders();
    updateConnectionIndicator();
    // Highlight the Pending metric card since it is the default filter
    const pendingCard = $('card-metric-pending');
    if (pendingCard) {
      pendingCard.classList.add('ring-2', 'ring-amber-400', 'ring-offset-1');
    }
  }

  // --- Real-Time Audio & Desktop Notifications ---
  function setupSoundNotificationToggle() {
    const btn = $('btn-sound-toggle');
    if (!btn) return;

    updateSoundButtonUI();

    btn.addEventListener('click', async () => {
      const dataService = window.AdminDataService;
      if (!dataService) return;

      const newState = !dataService.soundEnabled;
      dataService.setSoundEnabled(newState);

      if (dataService.audioCtx && dataService.audioCtx.state === 'suspended') {
        try { await dataService.audioCtx.resume(); } catch (e) {}
      }

      if (newState) {
        dataService.playBellChime();
        if ('Notification' in window) {
          if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            await dataService.requestNotificationPermission();
          }
        }
        showToast('🔊 Real-Time Alerts ON', 'success');
      } else {
        showToast('🔇 Alerts Muted', 'info');
      }

      updateSoundButtonUI();
    });
  }

  function updateSoundButtonUI() {
    const btn = $('btn-sound-toggle');
    const label = $('sound-toggle-label');
    const indicator = $('sound-toggle-indicator');
    if (!btn) return;

    const isEnabled = window.AdminDataService ? window.AdminDataService.soundEnabled : true;

    if (isEnabled) {
      btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all shadow-xs';
      if (indicator) indicator.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
      if (label) label.textContent = 'Alerts ON';
    } else {
      btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-all shadow-xs';
      if (indicator) indicator.className = 'w-2 h-2 rounded-full bg-slate-300';
      if (label) label.textContent = 'Alerts OFF';
    }
  }

  // --- Real-Time Listener Subscriber ---
  function setupSubscribers() {
    if (!window.AdminDataService) return;

    window.AdminDataService.subscribe(async (event) => {
      if (event.type === 'NEW_ORDER') {
        const newOrder = event.order;
        const exists = state.orders.some(o => o.order_number === newOrder.order_number || String(o.id) === String(newOrder.id));

        if (!exists) {
          state.orders.unshift(newOrder);
        }

        // Show active tab so admin sees the new order right away
        state.viewMode = 'active';
        updateTabButtonsUI();

        applyFiltersAndSort(true);
        updateMetrics();
        highlightTopOrderRow(newOrder.id);
        showToast(`🛍️ New Order #${newOrder.order_number || newOrder.id} received!`, 'success');
      } else if (event.type === 'STATUS_UPDATE') {
        const o = state.orders.find(item => String(item.id) === String(event.orderId) || item.order_number === event.orderId);
        if (o) o.status = event.newStatus;
        applyFiltersAndSort(false);
        updateMetrics();
      } else if (event.type === 'DELETE_ORDER' || event.type === 'DATA_RESET') {
        await loadOrders(false);
      }
    });

    window.AdminDataService.onStatusChange((statusInfo) => {
      updateConnectionIndicator(statusInfo);
    });
  }

  function highlightTopOrderRow(orderId) {
    requestAnimationFrame(() => {
      const row = document.querySelector(`[data-order-id="${orderId}"]`);
      if (row) {
        row.classList.add('bg-blue-100/70', 'ring-2', 'ring-blue-400');
        setTimeout(() => {
          row.classList.remove('bg-blue-100/70', 'ring-2', 'ring-blue-400');
        }, 3000);
      }
    });
  }

  function updateConnectionIndicator() {
    const badge = $('connection-badge');
    const pulse = $('connection-pulse');
    const text = $('connection-text');
    if (!badge || !text) return;

    badge.className = 'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ml-1';
    if (pulse) pulse.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
    text.textContent = 'Real-Time Active';
  }

  // --- Load Orders ---
  async function loadOrders(resetPage = true) {
    if (!window.AdminDataService) return;
    state.orders = await window.AdminDataService.getOrders();
    applyFiltersAndSort(resetPage);
    updateMetrics();
  }

  // --- Filtering: Active vs Archived Orders ---
  function applyFiltersAndSort(resetPage = true) {
    let result = [...state.orders];

    // 1. View Mode: Active vs Archived
    if (state.viewMode === 'active') {
      result = result.filter(o => o.status !== 'Delivered');
    } else if (state.viewMode === 'archived') {
      result = result.filter(o => o.status === 'Delivered');
    }

    // 2. Search Query Filter
    const q = state.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(order => {
        const idMatch = (order.order_number || order.id || '').toLowerCase().includes(q);
        const nameMatch = (order.client_name || `${order.firstname || ''} ${order.lastname || ''}`).toLowerCase().includes(q);
        const emailMatch = (order.client_email || '').toLowerCase().includes(q);
        const phoneMatch = (order.client_phone || '').toLowerCase().includes(q);
        const cityMatch = (order.client_city || '').toLowerCase().includes(q);
        return idMatch || nameMatch || emailMatch || phoneMatch || cityMatch;
      });
    }

    // 3. Status Filter (from top metric cards)
    if (state.statusFilter !== 'all') {
      result = result.filter(o => o.status === state.statusFilter);
    }

    // 4. Sorting
    result.sort((a, b) => {
      let valA = a[state.sort.field];
      let valB = b[state.sort.field];

      if (state.sort.field === 'created_at') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (state.sort.field === 'total_amount') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return state.sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return state.sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    state.filteredOrders = result;

    if (resetPage) {
      state.pagination.currentPage = 1;
    }

    renderTable();
    renderMobileCards();
    renderPagination();
    updateViewCounts();
  }

  function updateViewCounts() {
    const activeCount = state.orders.filter(o => o.status !== 'Delivered').length;
    const archivedCount = state.orders.filter(o => o.status === 'Delivered').length;

    const bActive = $('badge-active-count');
    const bArchived = $('badge-archived-count');
    if (bActive) bActive.textContent = activeCount;
    if (bArchived) bArchived.textContent = archivedCount;

    const bActiveM = $('badge-active-count-mobile');
    const bArchivedM = $('badge-archived-count-mobile');
    if (bActiveM) bActiveM.textContent = activeCount;
    if (bArchivedM) bArchivedM.textContent = archivedCount;
  }

  // --- Metrics ---
  function updateMetrics() {
    const orders = state.orders;
    const total = orders.length;
    const confirmed = orders.filter(o => o.status === 'Confirmed').length;
    const delivered = orders.filter(o => o.status === 'Delivered').length;
    const pending = orders.filter(o => o.status === 'Pending').length;
    const cancelled = orders.filter(o => o.status === 'Cancelled').length;

    const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    if ($('metric-total-orders')) $('metric-total-orders').textContent = total;
    if ($('metric-confirmed-orders')) $('metric-confirmed-orders').textContent = confirmed;
    if ($('metric-delivered-orders')) $('metric-delivered-orders').textContent = delivered;
    if ($('metric-pending-orders')) $('metric-pending-orders').textContent = pending;
    if ($('metric-cancelled-orders')) $('metric-cancelled-orders').textContent = cancelled;
    if ($('metric-delivery-rate')) $('metric-delivery-rate').textContent = `${rate}%`;
  }

  // --- Render Table (Desktop) ---
  function renderTable() {
    const tbody = $('orders-table-body');
    if (!tbody) return;

    const start = (state.pagination.currentPage - 1) * state.pagination.pageSize;
    const end = start + state.pagination.pageSize;
    const pageOrders = state.filteredOrders.slice(start, end);

    if (pageOrders.length === 0) {
      const isArchivedTab = state.viewMode === 'archived';
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-16 text-center text-slate-500">
            <div class="flex flex-col items-center justify-center">
              <svg class="w-12 h-12 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
              </svg>
              <p class="text-sm font-bold text-slate-700">
                ${isArchivedTab ? 'No delivered orders in archive yet' : 'No active orders right now'}
              </p>
              <p class="text-xs text-slate-400 mt-1 max-w-sm">
                ${isArchivedTab 
                  ? 'Orders marked as "Delivered" will be archived here to keep the active dashboard clean.' 
                  : 'Place an order on the storefront to see it here live!'}
              </p>
              <a href="index.html" class="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs">
                Open Storefront & Order &rarr;
              </a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = pageOrders.map(order => {
      const isSelected = state.selectedOrderIds.has(order.id);
      const isDelivered = order.status === 'Delivered';
      const isConfirmed = order.status === 'Confirmed';
      const isCancelled = order.status === 'Cancelled';

      const statusConfig = STATUS_CONFIG[order.status] || {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        label: order.status
      };

      const fullName = order.client_name || `${order.firstname || ''} ${order.lastname || ''}`.trim() || 'Customer';
      const email = order.client_email || order.email || 'No email';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${isSelected ? 'bg-blue-50/40' : ''}" data-order-id="${order.id}">
          <!-- 1. Selection & ID -->
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-2.5">
              <input type="checkbox" class="order-select-checkbox w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" data-id="${order.id}" ${isSelected ? 'checked' : ''}>
              <span class="font-bold text-sm text-slate-900 font-mono">${order.order_number || '#' + order.id}</span>
            </div>
          </td>

          <!-- 2. Date -->
          <td class="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
            ${order.date_display || order.created_at}
          </td>

          <!-- 3. Customer Info (Full Name & Gmail) -->
          <td class="py-3.5 px-4">
            <div class="flex flex-col">
              <span class="text-xs font-bold text-slate-900">${escapeHtml(fullName)}</span>
              <span class="text-[11px] text-blue-600 font-mono truncate max-w-[180px]">${escapeHtml(email)}</span>
            </div>
          </td>

          <!-- 4. Phone & City -->
          <td class="py-3.5 px-4">
            <div class="flex flex-col">
              <a href="tel:${order.client_phone}" class="text-xs font-bold text-slate-800 hover:text-blue-600 hover:underline">
                ${order.client_phone}
              </a>
              <span class="text-[11px] text-slate-500 font-medium">${escapeHtml(order.client_city || 'Casablanca')}</span>
            </div>
          </td>

          <!-- 5. Total -->
          <td class="py-3.5 px-4 text-xs font-bold text-slate-900 font-mono">
            ${order.total_amount ? Number(order.total_amount).toFixed(2) + ' DH' : '0.00 DH'}
          </td>

          <!-- 6. Status Badge -->
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig.bg}">
              <span class="w-1.5 h-1.5 rounded-full ${statusConfig.dot}"></span>
              ${statusConfig.label}
            </span>
          </td>

          <!-- 7. Actions: 3 Status Buttons + Details Button -->
          <td class="py-3.5 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              
              <!-- Status Action: Confirm -->
              <button 
                class="btn-status-action px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  isConfirmed 
                    ? 'bg-emerald-600 text-white ring-1 ring-emerald-500' 
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }"
                data-id="${order.id}" 
                data-status="Confirmed"
                title="Mark Confirmed"
              >
                ✓
              </button>

              <!-- Status Action: Deliver -->
              <button 
                class="btn-status-action px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  isDelivered 
                    ? 'bg-blue-600 text-white ring-1 ring-blue-500' 
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                }"
                data-id="${order.id}" 
                data-status="Delivered"
                title="Mark Delivered & Archive"
              >
                🚚
              </button>

              <!-- Status Action: Cancel -->
              <button 
                class="btn-status-action px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  isCancelled 
                    ? 'bg-rose-600 text-white ring-1 ring-rose-500' 
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }"
                data-id="${order.id}" 
                data-status="Cancelled"
                title="Cancel Order"
              >
                ✕
              </button>

              <!-- View Details Button -->
              <button class="btn-view-details ml-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs" data-id="${order.id}">
                Details
              </button>

            </div>
          </td>
        </tr>
      `;
    }).join('');

    updateSelectAllCheckboxState();
  }

  // --- Render Mobile Cards (< 768px): REDESIGNED 3-BUTTON STATUS + FULL DETAILS ---
  function renderMobileCards() {
    const container = $('orders-mobile-container');
    if (!container) return;

    const start = (state.pagination.currentPage - 1) * state.pagination.pageSize;
    const end = start + state.pagination.pageSize;
    const pageOrders = state.filteredOrders.slice(start, end);

    if (pageOrders.length === 0) {
      const isArchived = state.viewMode === 'archived';
      container.innerHTML = `
        <div class="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <p class="text-sm font-bold text-slate-700">${isArchived ? 'No archived orders' : 'No active orders'}</p>
          <p class="text-xs text-slate-400 mt-1">${isArchived ? 'Delivered orders will appear here.' : 'Place an order on the storefront!'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pageOrders.map(order => {
      const isConfirmed = order.status === 'Confirmed';
      const isDelivered = order.status === 'Delivered';
      const isCancelled = order.status === 'Cancelled';

      const fullName = order.client_name || `${order.firstname || ''} ${order.lastname || ''}`.trim() || 'Customer';
      const email = order.client_email || order.email || 'No email';

      const statusColorClass = isConfirmed ? 'text-emerald-700' : (isDelivered ? 'text-blue-700' : (isCancelled ? 'text-rose-700' : 'text-amber-700'));

      return `
        <div class="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-card flex flex-col gap-3 transition-all" data-order-id="${order.id}">
          
          <!-- Header Line: ID, Date, Amount -->
          <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-sm font-mono text-slate-900">${order.order_number || '#' + order.id}</span>
              <span class="text-[11px] text-slate-400">&bull; ${order.date_display || ''}</span>
            </div>
            <div class="font-black text-slate-900 text-base font-mono">
              ${order.total_amount ? Number(order.total_amount).toFixed(2) + ' DH' : '0.00 DH'}
            </div>
          </div>

          <!-- Customer Identity -->
          <div>
            <h4 class="font-bold text-slate-900 text-sm leading-snug">${escapeHtml(fullName)}</h4>
            <div class="flex flex-wrap items-center gap-2 mt-1 text-xs">
              <span class="text-blue-600 font-mono text-[11px] font-semibold">${escapeHtml(email)}</span>
              <span class="text-slate-300">&bull;</span>
              <span class="font-medium text-slate-600">${escapeHtml(order.client_city || 'Casablanca')}</span>
            </div>
          </div>

          <!-- Phone Actions: Call & WhatsApp -->
          <div class="grid grid-cols-2 gap-2">
            <a href="tel:${order.client_phone}" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors">
              <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
              </svg>
              <span>${order.client_phone}</span>
            </a>
            <a href="${generateWhatsAppUrl(order)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-colors touch-manipulation">
              <svg class="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>WhatsApp</span>
            </a>
          </div>

          <!-- REDESIGNED 3-BUTTON STATUS ACTION AREA -->
          <div class="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Order Status:</span>
              <span class="text-[11px] font-bold ${statusColorClass}">Current: ${order.status}</span>
            </div>

            <!-- 3 Clean Dedicated Status Buttons in 3 Columns -->
            <div class="grid grid-cols-3 gap-1.5">
              <!-- 1. Confirmed -->
              <button 
                class="btn-status-action flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isConfirmed 
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-500 ring-offset-1' 
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 active:scale-95'
                }"
                data-id="${order.id}" 
                data-status="Confirmed"
              >
                <span>✓ Confirmed</span>
              </button>

              <!-- 2. Delivered (Moves to Archive) -->
              <button 
                class="btn-status-action flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isDelivered 
                    ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-1' 
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 active:scale-95'
                }"
                data-id="${order.id}" 
                data-status="Delivered"
              >
                <span>🚚 Delivered</span>
              </button>

              <!-- 3. Cancelled -->
              <button 
                class="btn-status-action flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isCancelled 
                    ? 'bg-rose-600 text-white ring-2 ring-rose-500 ring-offset-1' 
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50 active:scale-95'
                }"
                data-id="${order.id}" 
                data-status="Cancelled"
              >
                <span>✕ Cancelled</span>
              </button>
            </div>
          </div>

          <!-- FULL-WIDTH VIEW FULL DETAILS BUTTON (100% WORKING) -->
          <button 
            class="btn-view-details w-full py-3 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm"
            data-id="${order.id}"
          >
            <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            <span>View Full Details</span>
          </button>

        </div>
      `;
    }).join('');
  }

  // --- Pagination ---
  function renderPagination() {
    const totalItems = state.filteredOrders.length;
    const totalPages = Math.ceil(totalItems / state.pagination.pageSize) || 1;
    const current = state.pagination.currentPage;

    const infoEl = $('pagination-info');
    if (infoEl) {
      const start = totalItems === 0 ? 0 : (current - 1) * state.pagination.pageSize + 1;
      const end = Math.min(current * state.pagination.pageSize, totalItems);
      infoEl.textContent = `Showing ${start} to ${end} of ${totalItems} orders (${state.viewMode === 'archived' ? 'Archived' : 'Active'})`;
    }

    const prevBtn = $('pagination-prev');
    const nextBtn = $('pagination-next');
    if (prevBtn) prevBtn.disabled = current <= 1;
    if (nextBtn) nextBtn.disabled = current >= totalPages;

    const pagesContainer = $('pagination-pages');
    if (pagesContainer) {
      let pagesHtml = '';
      for (let i = 1; i <= totalPages; i++) {
        pagesHtml += `
          <button class="pagination-page-btn w-8 h-8 rounded-lg text-xs font-semibold ${i === current ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}" data-page="${i}">
            ${i}
          </button>
        `;
      }
      pagesContainer.innerHTML = pagesHtml;

      pagesContainer.querySelectorAll('.pagination-page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.pagination.currentPage = Number(btn.dataset.page);
          renderTable();
          renderMobileCards();
          renderPagination();
        });
      });
    }
  }

  // --- ORDER DETAILS MODAL (MATCHING IMAGE 2 EXACT CHECKOUT FORM) ---
  function openOrderDetailsModal(orderId) {
    const order = state.orders.find(o => String(o.id) === String(orderId) || o.order_number === orderId);
    if (!order) {
      console.warn('Order not found for ID:', orderId);
      return;
    }

    // Extract first & last name
    let fn = order.firstname || '';
    let ln = order.lastname || '';
    if (!fn && !ln && order.client_name) {
      const parts = order.client_name.trim().split(' ');
      fn = parts[0] || '';
      ln = parts.slice(1).join(' ') || '';
    }

    // Header values
    if ($('modal-detail-order-number')) $('modal-detail-order-number').textContent = order.order_number || '#' + order.id;
    if ($('modal-detail-date')) $('modal-detail-date').textContent = order.date_display || order.created_at;

    // Field 1: First Name (Matching Image 2)
    if ($('modal-detail-firstname')) $('modal-detail-firstname').textContent = fn || 'Not specified';

    // Field 2: Last Name (Matching Image 2)
    if ($('modal-detail-lastname')) $('modal-detail-lastname').textContent = ln || 'Not specified';

    // Field 3: Phone Number (Matching Image 2)
    const phone = order.client_phone || order.phone || '-';
    if ($('modal-detail-phone')) $('modal-detail-phone').textContent = phone;
    if ($('modal-detail-phone-call')) $('modal-detail-phone-call').href = `tel:${phone}`;
    if ($('modal-detail-whatsapp')) {
      $('modal-detail-whatsapp').href = generateWhatsAppUrl(order);
    }

    // Field 4: Email (Matching Image 2)
    const email = order.client_email || order.email || 'Not specified';
    if ($('modal-detail-email')) $('modal-detail-email').textContent = email;

    // SHIPPING ADDRESS FIELDS (Matching Image 2 exactly)
    // Field 5: Street Address
    const street = order.client_street || order.street || order.client_address || 'Not specified';
    if ($('modal-detail-street')) $('modal-detail-street').textContent = street;

    // Field 6: Apartment, Quartier, etc. (Optional)
    const apt = order.client_apartment || order.apartment || 'None (or not specified)';
    if ($('modal-detail-apartment')) $('modal-detail-apartment').textContent = apt;

    // Field 7: City — Ville
    const city = order.client_city || order.city || 'Casablanca';
    if ($('modal-detail-city')) $('modal-detail-city').textContent = city;

    // Field 8: Total Amount
    if ($('modal-detail-total')) $('modal-detail-total').textContent = `${Number(order.total_amount || 0).toFixed(2)} DH`;
    if ($('modal-detail-status-select')) $('modal-detail-status-select').value = order.status;

    // Field 9: Shoes / Items List
    const itemsList = $('modal-detail-items-list');
    if (itemsList) {
      const items = order.items && order.items.length ? order.items : [
        { name: 'CasaShoes Premium Selection', size: '42', quantity: 1, price: order.total_amount || 499, image: 'images/af1_red_outline_pair.jpg' }
      ];

      itemsList.innerHTML = items.map(item => `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div class="flex items-center gap-3">
            <img src="${item.image || 'images/af1_red_outline_pair.jpg'}" alt="${escapeHtml(item.name)}" class="w-14 h-14 object-cover rounded-xl border border-slate-200" onerror="this.src='images/af1_red_outline_pair.jpg'">
            <div>
              <h5 class="text-xs font-bold text-slate-900">${escapeHtml(item.name)}</h5>
              <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                <span>Size: <strong class="text-slate-800 font-bold">${item.size || '42'}</strong></span>
                <span>&bull;</span>
                <span>Qty: <strong class="text-slate-800 font-bold">${item.quantity || 1}</strong></span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs font-bold text-slate-900 font-mono">
              ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)} DH
            </div>
            <div class="text-[10px] text-slate-400 font-medium">Unit: ${Number(item.price || 0).toFixed(2)} DH</div>
          </div>
        </div>
      `).join('');
    }

    // Save Status Button in Modal
    const saveStatusBtn = $('btn-modal-save-status');
    if (saveStatusBtn) {
      saveStatusBtn.onclick = async () => {
        const newStatus = $('modal-detail-status-select').value;
        if (window.AdminDataService) {
          await window.AdminDataService.updateOrderStatus(order.id, newStatus);
          if (newStatus === 'Delivered') {
            showToast(`Order #${order.id} marked as Delivered & moved to Archive!`, 'info');
          } else {
            showToast(`Order #${order.id} updated to ${newStatus}!`, 'success');
          }
        }
        closeModal('modal-order-details');
      };
    }

    // Copy Email button
    const copyEmailBtn = $('btn-copy-email');
    if (copyEmailBtn) {
      copyEmailBtn.onclick = () => {
        if (email && email.includes('@')) {
          navigator.clipboard.writeText(email).then(() => {
            showToast('Email copied to clipboard!', 'info');
          });
        }
      };
    }

    openModal('modal-order-details');
  }

  function openModal(id) {
    const m = $(id);
    if (m) {
      m.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
  }

  function closeModal(id) {
    const m = $(id);
    if (m) {
      m.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }

  // --- GLOBAL DELEGATED CLICK LISTENERS (100% Guarantee of working) ---
  function setupGlobalDelegatedListeners() {
    document.addEventListener('click', async (e) => {
      // 1. "View Full Details" button click
      const viewBtn = e.target.closest('.btn-view-details');
      if (viewBtn) {
        e.preventDefault();
        e.stopPropagation();
        const orderId = viewBtn.dataset.id;
        openOrderDetailsModal(orderId);
        return;
      }

      // 2. Status Action Buttons (Confirmed, Delivered, Cancelled)
      const statusBtn = e.target.closest('.btn-status-action');
      if (statusBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = statusBtn.dataset.id;
        const newStatus = statusBtn.dataset.status;

        if (window.AdminDataService) {
          await window.AdminDataService.updateOrderStatus(id, newStatus);
          if (newStatus === 'Delivered') {
            showToast(`Order #${id} marked as Delivered & moved to Archive!`, 'info');
          } else {
            showToast(`Order #${id} marked as ${newStatus}!`, 'success');
          }
        }
        return;
      }

      // 3. Close Modal Buttons
      const closeBtn = e.target.closest('.btn-close-modal');
      if (closeBtn) {
        e.preventDefault();
        const modalId = closeBtn.dataset.modal;
        if (modalId) closeModal(modalId);
        return;
      }

      // 4. Modal Backdrop click
      if (e.target.classList.contains('modal-backdrop')) {
        e.target.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    });
  }

  // --- Static Event Listeners ---
  function setupStaticEventListeners() {
    // Search Bar
    const searchInput = $('global-search-input');
    if (searchInput) {
      let debounce = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          state.searchQuery = e.target.value;
          applyFiltersAndSort();
        }, 200);
      });
    }

    // Logout Button
    $('btn-admin-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.AdminAuth) {
        window.AdminAuth.logout();
      } else {
        localStorage.removeItem('casashoes_admin_authenticated');
        sessionStorage.removeItem('casashoes_admin_authenticated');
        window.location.replace('admin-login.html');
      }
    });

    // View Tab Switchers
    $('view-tab-active')?.addEventListener('click', () => {
      state.viewMode = 'active';
      state.statusFilter = 'all';
      updateTabButtonsUI();
      applyFiltersAndSort();
    });

    $('view-tab-archived')?.addEventListener('click', () => {
      state.viewMode = 'archived';
      state.statusFilter = 'all';
      updateTabButtonsUI();
      applyFiltersAndSort();
    });

    $('mobile-nav-active')?.addEventListener('click', () => {
      state.viewMode = 'active';
      state.statusFilter = 'all';
      updateTabButtonsUI();
      applyFiltersAndSort();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    $('mobile-nav-archived')?.addEventListener('click', () => {
      state.viewMode = 'archived';
      state.statusFilter = 'all';
      updateTabButtonsUI();
      applyFiltersAndSort();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Helper: visually highlight the currently-active metric card
    const METRIC_CARD_IDS = ['card-metric-total','card-metric-confirmed','card-metric-delivered','card-metric-pending','card-metric-cancelled'];
    function setActiveMetricCard(activeId) {
      METRIC_CARD_IDS.forEach(id => {
        const el = $(id);
        if (!el) return;
        el.classList.remove('ring-2','ring-amber-400','ring-blue-400','ring-emerald-400','ring-rose-400','ring-offset-1');
      });
      const activeEl = $(activeId);
      if (!activeEl) return;
      if (activeId === 'card-metric-pending')   activeEl.classList.add('ring-2','ring-amber-400','ring-offset-1');
      else if (activeId === 'card-metric-confirmed')  activeEl.classList.add('ring-2','ring-emerald-400','ring-offset-1');
      else if (activeId === 'card-metric-cancelled')  activeEl.classList.add('ring-2','ring-rose-400','ring-offset-1');
      else if (activeId === 'card-metric-delivered')  activeEl.classList.add('ring-2','ring-blue-400','ring-offset-1');
      else activeEl.classList.add('ring-2','ring-blue-400','ring-offset-1');
    }

    // Metric cards filtering
    $('card-metric-total')?.addEventListener('click', () => {
      state.statusFilter = 'all';
      setActiveMetricCard('card-metric-total');
      applyFiltersAndSort();
    });

    $('card-metric-confirmed')?.addEventListener('click', () => {
      state.viewMode = 'active';
      state.statusFilter = 'Confirmed';
      updateTabButtonsUI();
      setActiveMetricCard('card-metric-confirmed');
      applyFiltersAndSort();
    });

    $('card-metric-delivered')?.addEventListener('click', () => {
      state.viewMode = 'archived';
      state.statusFilter = 'all';
      updateTabButtonsUI();
      setActiveMetricCard('card-metric-delivered');
      applyFiltersAndSort();
    });

    $('card-metric-pending')?.addEventListener('click', () => {
      state.viewMode = 'active';
      state.statusFilter = 'Pending';
      updateTabButtonsUI();
      setActiveMetricCard('card-metric-pending');
      applyFiltersAndSort();
    });

    $('card-metric-cancelled')?.addEventListener('click', () => {
      state.viewMode = 'active';
      state.statusFilter = 'Cancelled';
      updateTabButtonsUI();
      setActiveMetricCard('card-metric-cancelled');
      applyFiltersAndSort();
    });

    // Export & Clear
    $('btn-export-csv')?.addEventListener('click', exportOrdersToCSV);
    $('btn-clear-all-orders')?.addEventListener('click', () => {
      if (confirm('Clear all orders to start fresh with real incoming orders?')) {
        window.AdminDataService.clearAllOrders();
        showToast('All orders cleared.', 'info');
      }
    });

    // Sorting Headers
    document.querySelectorAll('[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (state.sort.field === field) {
          state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort.field = field;
          state.sort.direction = 'asc';
        }
        applyFiltersAndSort();
      });
    });

    // Pagination
    $('pagination-prev')?.addEventListener('click', () => {
      if (state.pagination.currentPage > 1) {
        state.pagination.currentPage--;
        renderTable();
        renderMobileCards();
        renderPagination();
      }
    });

    $('pagination-next')?.addEventListener('click', () => {
      const totalPages = Math.ceil(state.filteredOrders.length / state.pagination.pageSize);
      if (state.pagination.currentPage < totalPages) {
        state.pagination.currentPage++;
        renderTable();
        renderMobileCards();
        renderPagination();
      }
    });
  }

  function updateTabButtonsUI() {
    const tabActive = $('view-tab-active');
    const tabArchived = $('view-tab-archived');
    const mActive = $('mobile-nav-active');
    const mArchived = $('mobile-nav-archived');

    const isActive = state.viewMode === 'active';

    if (tabActive) {
      tabActive.className = `flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
        isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`;
    }

    if (tabArchived) {
      tabArchived.className = `flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
        !isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`;
    }

    if (mActive) {
      mActive.className = `flex flex-col items-center py-1 transition-colors touch-manipulation ${
        isActive ? 'text-blue-600' : 'text-slate-400'
      }`;
    }

    if (mArchived) {
      mArchived.className = `flex flex-col items-center py-1 transition-colors touch-manipulation ${
        !isActive ? 'text-blue-600' : 'text-slate-400'
      }`;
    }
  }

  function updateSelectAllCheckboxState() {
    const selectAll = $('select-all-orders');
    if (!selectAll) return;

    const start = (state.pagination.currentPage - 1) * state.pagination.pageSize;
    const end = start + state.pagination.pageSize;
    const visibleOrders = state.filteredOrders.slice(start, end);

    if (visibleOrders.length === 0) {
      selectAll.checked = false;
      return;
    }

    const visibleSelected = visibleOrders.filter(o => state.selectedOrderIds.has(o.id));
    selectAll.checked = visibleSelected.length === visibleOrders.length;
  }

  function exportOrdersToCSV() {
    const ordersToExport = state.filteredOrders;
    if (ordersToExport.length === 0) {
      showToast('No orders to export in current view', 'error');
      return;
    }

    const headers = ['Order Number', 'Date', 'First Name', 'Last Name', 'Email', 'Phone', 'City', 'Street Address', 'Status', 'Total (DH)'];
    const rows = ordersToExport.map(o => [
      `"${o.order_number || o.id}"`,
      `"${o.date_display || o.created_at}"`,
      `"${(o.firstname || '').replace(/"/g, '""')}"`,
      `"${(o.lastname || '').replace(/"/g, '""')}"`,
      `"${(o.client_email || '').replace(/"/g, '""')}"`,
      `"${o.client_phone || ''}"`,
      `"${o.client_city || ''}"`,
      `"${(o.client_street || o.client_address || '').replace(/"/g, '""')}"`,
      `"${o.status || ''}"`,
      `"${o.total_amount || 0}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `CasaShoes_${state.viewMode}_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${ordersToExport.length} orders to CSV`, 'success');
  }

  function showToast(message, type = 'info') {
    const container = $('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      info: 'bg-slate-900 text-white'
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold ${colors[type] || colors.info} transform transition-all duration-300 translate-y-3 opacity-0`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span><button class="ml-2 hover:opacity-75">&times;</button>`;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    });

    const close = () => {
      toast.classList.add('translate-y-3', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('button').onclick = close;
    setTimeout(close, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
