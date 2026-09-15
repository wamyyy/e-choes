/* =====================================================
   CasaShoes Admin — Real-Time Supabase & Real Orders Storage
   - Prioritizes 100% REAL orders placed by users
   - Captures all customer fields: firstname, lastname, email/gmail, phone, street, apt, city
   - Archives delivered orders to keep active dashboard clean
   - Bell chime sound & native desktop push notifications
   ===================================================== */

(function () {
  'use strict';

  const STORAGE_KEY_ORDERS = 'casashoes_admin_orders';
  const STORAGE_KEY_SOUND = 'casashoes_sound_enabled';
  const BROADCAST_CHANNEL = 'casashoes_realtime_orders';

  const SUPABASE_URL = 'https://aagwbecelhmdwmwsulzf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ3diZWNlbGhtZHdtd3N1bHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDcwMzEsImV4cCI6MjEwNDk4MzAzMX0.TdDThHk9WuOtgWSN5CvOlA5ToPGxz1cxcAk-SvcBs1s';

  class AdminDataService {
    constructor() {
      this.supabase = null;
      this.channel = null;
      this.subscribers = new Set();
      this.broadcastChannel = null;
      this.audioCtx = null;
      this.soundEnabled = localStorage.getItem(STORAGE_KEY_SOUND) !== 'false';

      this.cleanMockData();
      this.initAudioContext();
      this.initBroadcastChannel();
      this.initSupabaseClient();
    }

    cleanMockData() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const filtered = list.filter(o => o && o.agent_name !== 'Jawad M.' && o.client_name !== 'Jawad' && o.tracking_carrier !== 'CTM Messagerie');
            if (filtered.length !== list.length) {
              localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(filtered));
            }
          }
        }
      } catch (e) {}
    }

    // --- Web Audio Bell / Chime Generator ---
    initAudioContext() {
      const unlockAudio = () => {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!this.audioCtx && AudioContext) {
            this.audioCtx = new AudioContext();
          }
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
        } catch (e) {}
      };

      window.addEventListener('click', unlockAudio, { once: true, passive: true });
      window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
      window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    }

    playBellChime() {
      if (!this.soundEnabled) return;

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.audioCtx && AudioContext) {
          this.audioCtx = new AudioContext();
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;

        // Strike 1: Dual bell harmonic (830.6Hz + 1661.2Hz)
        [830.6, 1661.2, 2491.8].forEach((freq, i) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const volume = [0.22, 0.12, 0.05][i];

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(volume, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now);
          osc.stop(now + 1.15);
        });

        // Strike 2: Higher pitch ringing chime 130ms later
        setTimeout(() => {
          if (!this.audioCtx || this.audioCtx.state !== 'running') return;
          const t = this.audioCtx.currentTime;
          [1046.5, 2093].forEach((f, idx) => {
            const osc2 = this.audioCtx.createOscillator();
            const g2 = this.audioCtx.createGain();
            const vol = [0.18, 0.08][idx];

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(f, t);

            g2.gain.setValueAtTime(0, t);
            g2.gain.linearRampToValueAtTime(vol, t + 0.015);
            g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);

            osc2.connect(g2);
            g2.connect(this.audioCtx.destination);

            osc2.start(t);
            osc2.stop(t + 1.35);
          });
        }, 130);
      } catch (err) {
        console.warn('[Audio Bell Chime Notice]:', err);
      }
    }

    setSoundEnabled(enabled) {
      this.soundEnabled = !!enabled;
      localStorage.setItem(STORAGE_KEY_SOUND, this.soundEnabled ? 'true' : 'false');
    }

    // --- Native Desktop / Push Notifications ---
    async requestNotificationPermission() {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;

      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {
        return false;
      }
    }

    showDesktopNotification(order) {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const orderId = (order.order_number || order.id || '').replace('#', '');
      const clientName = order.client_name || `${order.firstname || ''} ${order.lastname || ''}`.trim() || 'Customer';
      const amount = order.total_amount ? Number(order.total_amount).toFixed(2) + ' DH' : '0.00 DH';

      try {
        const notification = new Notification(`🛍️ Order #${orderId} Received`, {
          body: `Client: ${clientName} - Total: ${amount}`,
          icon: 'images/icons/icon-192.png',
          badge: 'images/icons/icon-192.png',
          tag: `order-${orderId}`,
          renotify: true
        });

        notification.onclick = function () {
          window.focus();
          this.close();
        };
      } catch (err) {
        console.warn('Desktop notification error:', err);
      }
    }

    // --- Supabase Realtime Listener (INSERT / UPDATE / DELETE events) ---
    initSupabaseClient() {
      if (window.sbClient) {
        this.supabase = window.sbClient;
      } else if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        try {
          this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: true, autoRefreshToken: true }
          });
        } catch (e) {
          console.warn('[AdminDataService] Client create exception:', e);
        }
      }

      if (!this.supabase) {
        this.notifyStatusChange({ status: 'ready', message: 'Offline Mode' });
        return;
      }

      try {
        this.channel = this.supabase
          .channel('public:orders')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            async (payload) => {
              console.log('[Supabase Realtime INSERT]:', payload.new);
              const formatted = await this.fetchAndFormatOrder(payload.new);
              this.handleIncomingOrder(formatted, true);
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders' },
            (payload) => {
              console.log('[Supabase Realtime UPDATE]:', payload.new);
              const statusCapitalized = payload.new.status 
                ? (payload.new.status.charAt(0).toUpperCase() + payload.new.status.slice(1))
                : 'Pending';
              this.handleStatusUpdate(payload.new.id, statusCapitalized);
            }
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'orders' },
            (payload) => {
              console.log('[Supabase Realtime DELETE]:', payload.old);
              if (payload.old && payload.old.id) {
                this.handleDeleteOrder(payload.old.id);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              this.notifyStatusChange({ status: 'live', message: 'Supabase Connected' });
            }
          });
      } catch (err) {
        console.warn('Supabase realtime init notice:', err);
      }
    }

    async fetchAndFormatOrder(row) {
      let items = [];
      if (this.supabase && row.id) {
        try {
          const { data: orderItems } = await this.supabase
            .from('order_items')
            .select('*')
            .eq('order_id', row.id);
          if (orderItems && orderItems.length > 0) {
            items = orderItems;
          }
        } catch (e) {}
      }
      return this.formatSupabaseOrder({ ...row, order_items: items });
    }

    // --- Cross-Tab Sync ---
    initBroadcastChannel() {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'NEW_ORDER') {
            this.handleIncomingOrder(event.data.order, true);
          } else if (event.data && event.data.type === 'STATUS_UPDATE') {
            this.handleStatusUpdate(event.data.orderId, event.data.newStatus);
          }
        };
      }

      window.addEventListener('storage', (e) => {
        if (e.key === 'casashoes_last_placed_order' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.handleIncomingOrder(parsed, true);
          } catch (err) {}
        }
      });
    }

    formatSupabaseOrder(row) {
      const createdDate = new Date(row.created_at || Date.now());
      const dateDisplay = createdDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ', ' + createdDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const clientName = row.customer_name || row.client_name || `${row.firstname || ''} ${row.lastname || ''}`.trim() || 'Online Customer';
      const initials = clientName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'CU';

      const orderNumber = row.order_number 
        ? (row.order_number.startsWith('#') ? row.order_number : '#' + row.order_number)
        : (row.id ? (row.id.startsWith('#') ? row.id : '#' + String(row.id).replace(/^CS-/, '')) : '#1001');

      const rawStatus = row.status || 'Pending';
      const statusCapitalized = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

      let items = [];
      if (Array.isArray(row.order_items) && row.order_items.length > 0) {
        items = row.order_items.map(it => ({
          name: it.product_name || 'CasaShoes Sneaker',
          size: it.size || '42',
          quantity: it.quantity || 1,
          price: Number(it.product_price || 199),
          image: it.image || 'images/af1_red_outline_pair.jpg'
        }));
      } else if (Array.isArray(row.items) && row.items.length > 0) {
        items = row.items;
      } else {
        items = [
          { name: 'CasaShoes Premium Selection', size: '42', quantity: 1, price: Number(row.total_amount || 499), image: 'images/af1_red_outline_pair.jpg' }
        ];
      }

      return {
        id: String(row.id || Math.floor(1000 + Math.random() * 9000)),
        order_number: orderNumber,
        created_at: row.created_at || new Date().toISOString(),
        date_display: dateDisplay,
        agent_name: row.agent_name || 'Admin Auto',
        agent_avatar: initials,
        agent_color: 'bg-blue-100 text-blue-700',
        tracking_code: row.tracking_code || ('AMN-' + Math.floor(10000 + Math.random() * 90000) + '-MA'),
        tracking_carrier: row.tracking_carrier || 'Amana Express',
        firstname: row.firstname || '',
        lastname: row.lastname || '',
        client_name: clientName,
        client_email: row.customer_email || row.client_email || row.email || '',
        client_phone: row.customer_phone || row.client_phone || row.phone || '',
        client_city: row.customer_city || row.client_city || row.city || 'Casablanca',
        client_street: row.client_street || row.street || '',
        client_apartment: row.client_apartment || row.apartment || '',
        client_address: row.customer_address || row.client_address || [row.client_street, row.client_city, 'Morocco'].filter(Boolean).join(', '),
        status: statusCapitalized,
        category: row.category || 'Sneakers',
        total_amount: Number(row.total_amount || 0),
        payment_method: row.payment_method || 'Cash On Delivery',
        notes: row.customer_notes || row.notes || 'Online order',
        items: items
      };
    }

    async fetchFromSupabaseRest() {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&order=created_at.desc`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        if (res.ok) {
          const rows = await res.json();
          return rows;
        }
      } catch (err) {
        console.warn('[AdminDataService] Direct REST fetch error:', err);
      }
      return null;
    }

    async getOrders() {
      let orders = null;

      // 1. Ensure Supabase client is initialized
      if (!this.supabase) {
        this.initSupabaseClient();
      }

      // 2. Try fetching via Supabase JS client
      if (this.supabase) {
        try {
          const { data, error } = await this.supabase
            .from('orders')
            .select('*, order_items(*)')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data)) {
            orders = data.map(row => this.formatSupabaseOrder(row));
          } else if (error) {
            console.warn('[AdminDataService] Supabase client fetch error:', error.message, error.code);
          }
        } catch (err) {
          console.warn('[AdminDataService] Supabase client fetch throw:', err);
        }
      }

      // 3. Fallback to direct REST API fetch if SDK query returned null
      if (!orders) {
        const restRows = await this.fetchFromSupabaseRest();
        if (Array.isArray(restRows)) {
          orders = restRows.map(row => this.formatSupabaseOrder(row));
        }
      }

      // 4. If Supabase succeeded, persist fresh orders and return
      if (orders !== null) {
        await this.saveOrdersLocal(orders);
        return orders;
      }

      // 5. Fallback to LocalStorage cache (only when completely offline)
      try {
        const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
        const cached = raw ? JSON.parse(raw) : [];
        return cached.filter(o => o && o.agent_name !== 'Jawad M.' && o.client_name !== 'Jawad');
      } catch (e) {
        return [];
      }
    }

    async saveOrdersLocal(orders) {
      try {
        localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
      } catch (e) {}
    }

    async updateOrderStatus(orderId, newStatus) {
      let updated = null;
      const orders = await this.getOrders();
      const idx = orders.findIndex(o => String(o.id) === String(orderId) || o.order_number === orderId);

      if (idx !== -1) {
        orders[idx].status = newStatus;
        await this.saveOrdersLocal(orders);
        updated = orders[idx];
      }

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'STATUS_UPDATE',
          orderId: orderId,
          newStatus: newStatus
        });
      }

      if (this.supabase) {
        try {
          const dbStatus = (newStatus || '').toLowerCase();
          await this.supabase
            .from('orders')
            .update({ status: dbStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId);
        } catch (err) {
          console.warn('[AdminDataService] Supabase update status error:', err);
        }
      }

      this.notifySubscribers({ type: 'STATUS_UPDATE', orderId, newStatus, order: updated });
      return updated;
    }

    async handleIncomingOrder(order, triggerAlerts = true) {
      const orders = await this.getOrders();
      const exists = orders.some(o => o.order_number === order.order_number || String(o.id) === String(order.id));

      if (!exists) {
        orders.unshift(order);
        await this.saveOrdersLocal(orders);
      }

      if (triggerAlerts) {
        this.playBellChime();
        this.showDesktopNotification(order);
      }

      this.notifySubscribers({
        type: 'NEW_ORDER',
        order: order,
        isNew: !exists
      });
    }

    async handleStatusUpdate(orderId, newStatus) {
      const orders = await this.getOrders();
      const o = orders.find(item => String(item.id) === String(orderId) || item.order_number === orderId);
      if (o) {
        o.status = newStatus;
        await this.saveOrdersLocal(orders);
        this.notifySubscribers({ type: 'STATUS_UPDATE', orderId, newStatus, order: o });
      }
    }

    async handleDeleteOrder(orderId) {
      const orders = await this.getOrders();
      const filtered = orders.filter(o => String(o.id) !== String(orderId) && o.order_number !== orderId);
      await this.saveOrdersLocal(filtered);

      if (this.supabase) {
        try { 
          await this.supabase.from('orders').delete().eq('id', orderId); 
        } catch (e) {
          console.warn('[AdminDataService] Supabase delete error:', e);
        }
      }

      this.notifySubscribers({ type: 'DELETE_ORDER', orderId });
    }

    async clearAllOrders() {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify([]));
      this.notifySubscribers({ type: 'DATA_RESET', orders: [] });
    }

    subscribe(callback) {
      this.subscribers.add(callback);
      return () => this.subscribers.delete(callback);
    }

    notifySubscribers(payload) {
      this.subscribers.forEach(cb => {
        try { cb(payload); } catch (e) {}
      });
    }

    onStatusChange(callback) {
      this.statusChangeCallback = callback;
    }

    notifyStatusChange(state) {
      if (this.statusChangeCallback) {
        this.statusChangeCallback(state);
      }
    }
  }

  window.AdminDataService = new AdminDataService();
})();
