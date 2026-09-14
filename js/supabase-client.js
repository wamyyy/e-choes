/**
 * CasaShoes (Elwamy) - Supabase Client Initialization
 * Connects the storefront, customer account, and admin panel to Supabase backend.
 */
(function (window) {
  'use strict';

  const SUPABASE_URL = 'https://aagwbecelhmdwmwsulzf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ3diZWNlbGhtZHdtd3N1bHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDcwMzEsImV4cCI6MjEwNDk4MzAzMX0.TdDThHk9WuOtgWSN5CvOlA5ToPGxz1cxcAk-SvcBs1s';

  // Expose global constants for backward-compatibility
  window.CASASHOES_SUPABASE_URL = SUPABASE_URL;
  window.CASASHOES_SUPABASE_KEY = SUPABASE_ANON_KEY;

  let client = null;

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      console.log('[Supabase] Client initialized successfully.');
    } catch (err) {
      console.error('[Supabase] Failed to initialize client:', err);
    }
  } else {
    console.warn('[Supabase] SDK (@supabase/supabase-js) not found on window. Ensure script is included.');
  }

  // Export globally
  window.sbClient = client;
  window.supabaseClient = client;

  // Helper utility functions
  window.SupabaseHelper = {
    client,
    isAvailable() {
      return !!window.sbClient;
    },
    async getUser() {
      if (!window.sbClient) return null;
      try {
        const { data: { user }, error } = await window.sbClient.auth.getUser();
        if (error || !user) return null;
        return user;
      } catch (e) {
        return null;
      }
    },
    async getSession() {
      if (!window.sbClient) return null;
      try {
        const { data: { session }, error } = await window.sbClient.auth.getSession();
        if (error || !session) return null;
        return session;
      } catch (e) {
        return null;
      }
    }
  };
})(window);
