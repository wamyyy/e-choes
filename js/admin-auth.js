/**
 * CasaShoes Admin Authentication Service
 * - Backed by Supabase Auth (Postgres & Profiles table)
 * - Server-side verified sessions with RLS enforcement
 * - Zero hardcoded credentials or client-side hash bypasses
 */
(function(window) {
  'use strict';

  const AUTH_KEY = 'casashoes_admin_authenticated';
  const USER_KEY = 'casashoes_admin_username';
  const ROLE_KEY = 'casashoes_admin_role';

  const AdminAuth = {
    /**
     * Check if user is currently marked authenticated locally (preliminary fast check)
     */
    isAuthenticated() {
      return localStorage.getItem(AUTH_KEY) === 'true' || sessionStorage.getItem(AUTH_KEY) === 'true';
    },

    /**
     * Get currently logged-in username or email
     */
    getCurrentUser() {
      return localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || 'Administrator';
    },

    /**
     * Deep asynchronous session verification with Supabase
     */
    async verifyServerSession() {
      if (!window.sbClient) {
        return { authenticated: false, error: 'Database connection not initialized' };
      }

      try {
        const { data: { session }, error: sessionErr } = await window.sbClient.auth.getSession();
        if (sessionErr || !session || !session.user) {
          this.clearLocalSession();
          return { authenticated: false };
        }

        // Verify user profile role in Supabase
        const { data: profile, error: profErr } = await window.sbClient
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profErr || !profile || profile.role !== 'admin') {
          this.clearLocalSession();
          return { 
            authenticated: false, 
            user: session.user,
            needsPromotion: true,
            message: 'Your account does not have administrator privileges yet. Run: SELECT public.promote_user_to_admin(\'' + session.user.email + '\'); in Supabase SQL editor.'
          };
        }

        const username = profile.full_name || session.user.email || 'Admin';
        localStorage.setItem(AUTH_KEY, 'true');
        localStorage.setItem(USER_KEY, username);
        localStorage.setItem(ROLE_KEY, 'admin');

        return { authenticated: true, user: session.user, profile };
      } catch (err) {
        console.error('[AdminAuth] Verification error:', err);
        return { authenticated: false, error: err.message };
      }
    },

    /**
     * Authenticate with email and password via Supabase Auth
     */
    async login(email, password, rememberMe = true) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPass = password || '';

      if (!cleanEmail || !cleanPass) {
        return { success: false, message: 'Please enter both email and password.' };
      }

      if (!window.sbClient) {
        return { success: false, message: 'Supabase client is not available. Please check your connection.' };
      }

      try {
        const { data, error } = await window.sbClient.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass
        });

        if (error) {
          return { 
            success: false, 
            message: error.message || 'Invalid email or password.' 
          };
        }

        if (!data || !data.user) {
          return { success: false, message: 'Sign in failed. No user returned.' };
        }

        // Query profiles table to verify role = 'admin'.
        // NOTE: we deliberately do NOT attempt to auto-promote the user here
        // (via RPC or a direct profiles update) — that was a security hole
        // that let any signed-up visitor grant themselves admin access.
        // Promotion must only ever be done by the project owner from the
        // Supabase SQL Editor (SELECT public.promote_user_to_admin('email')),
        // which now requires the service_role/SQL Editor connection.
        const { data: profile, error: profErr } = await window.sbClient
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile || profile.role !== 'admin') {
          await window.sbClient.auth.signOut();
          return {
            success: false,
            message: 'Account signed in, but this account is not an administrator. Ask an existing admin to run: SELECT public.promote_user_to_admin(\'' + cleanEmail + '\'); in the Supabase SQL Editor.'
          };
        }

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(AUTH_KEY, 'true');
        storage.setItem(USER_KEY, profile.full_name || data.user.email || cleanEmail);
        storage.setItem(ROLE_KEY, 'admin');

        return { success: true, user: data.user, profile };
      } catch (err) {
        console.error('[AdminAuth] Login error:', err);
        return { 
          success: false, 
          message: err.message || 'An unexpected error occurred during login.' 
        };
      }
    },

    /**
     * Sign up a new admin account (First-time setup helper)
     */
    async registerAdmin(email, password, fullName = 'Administrator') {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPass = password || '';

      if (!cleanEmail || !cleanPass) {
        return { success: false, message: 'Please enter both email and password.' };
      }

      if (!window.sbClient) {
        return { success: false, message: 'Supabase client is not available.' };
      }

      try {
        const { data, error } = await window.sbClient.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
          options: {
            data: {
              full_name: fullName,
              role: 'admin'
            }
          }
        });

        if (error) {
          return { success: false, message: error.message };
        }

        // NOTE: we no longer auto-promote here. A freshly registered account
        // is just a normal ('customer') account until the site owner
        // explicitly promotes it from the Supabase SQL Editor. This is what
        // stops anyone who fills in this form from becoming an admin on
        // their own — see prevent_role_self_escalation trigger + the
        // REVOKE on promote_user_to_admin() in supabase-schema.sql.
        return { 
          success: true, 
          user: data.user,
          session: data.session,
          message: 'Account created. It is NOT an admin yet — ask the site owner to run: SELECT public.promote_user_to_admin(\'' + cleanEmail + '\'); in the Supabase SQL Editor before you can sign in here.'
        };
      } catch (err) {
        return { success: false, message: err.message || 'Registration failed.' };
      }
    },

    /**
     * Clear all local authentication credentials
     */
    clearLocalSession() {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ROLE_KEY);
      sessionStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(ROLE_KEY);
    },

    /**
     * Logout from Supabase and redirect
     */
    async logout() {
      if (window.sbClient) {
        try {
          await window.sbClient.auth.signOut();
        } catch (e) {}
      }
      this.clearLocalSession();
      window.location.replace('admin-login.html');
    },

    /**
     * Protected route guard for admin.html
     */
    async requireAuth() {
      const res = await this.verifyServerSession();
      if (!res.authenticated) {
        const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`admin-login.html?redirect=${currentPath}`);
      }
    }
  };

  window.AdminAuth = AdminAuth;
})(window);

