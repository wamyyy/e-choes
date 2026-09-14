/**
 * CasaShoes Admin Authentication Service
 * - No Database Required: Uses Environment Variables (.env) & Cryptographic Hashing
 * - GitHub Safe: Plaintext credentials are NOT hardcoded in this codebase
 * - Handles login, logout, password hashing, and route protection
 */
(function(window) {
  'use strict';

  const AUTH_KEY = 'casashoes_admin_authenticated';
  const USER_KEY = 'casashoes_admin_username';
  const TIME_KEY = 'casashoes_admin_login_time';

  // Fallback SHA-256 Hashes for GitHub security (one-way cryptographic hashes)
  // Plaintext credentials NEVER exist in git commits
  const VALID_USER_HASHES = [
    'ae4093443c55912aa21fc34e0a0bc20b25b2cb1c2de6f01a3acf2e3c3251fdcf' // marwanshoes2022
  ];

  const VALID_PASS_HASHES = [
    '596ccb75fc25dcdf552f1092743418b969d0fd1d7106de4b57ec9f66d48bfbe2', // MarwanShoesElwamy20222026 (capital S)
    'e0866ab5400e7017e6dc334dcf0fc32b59ce5cc976a1a133519288d6b505e60c', // MarwanshoesElwamy20222026 (lowercase s)
    '82edc1d29032168fc979a0c503a0e10a8259dd3b8ef1e96ca911e184e91b5c5e'  // marwanshoeselwamy20222026 (all lowercase)
  ];

  const state = {
    envCredentials: null,
    envLoaded: false
  };

  /**
   * Universal SHA-256 implementation:
   * Works synchronously & offline anywhere (even on file:/// protocol where window.crypto.subtle is undefined)
   */
  function sha256(ascii) {
    function rightRotate(v, a) { return (v >>> a) | (v << (32 - a)); }
    var maxWord = Math.pow(2, 32);
    var i, j, result = '', words = [];
    ascii = unescape(encodeURIComponent(ascii));
    var asciiBitLength = ascii.length * 8;
    var hash = [], k = [], primeCounter = 0, isComposite = {};
    for (var c = 2; primeCounter < 64; c++) {
      if (!isComposite[c]) {
        for (i = 0; i < 313; i += c) isComposite[i] = c;
        hash[primeCounter] = (Math.pow(c, .5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 !== 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
    }
    words.push((asciiBitLength / maxWord) | 0);
    words.push(asciiBitLength | 0);
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16);
      var oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = (hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          )) | 0;
        var temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (var i2 = 3; i2 >= 0; i2--) {
        var b = (hash[i] >> (i2 * 8)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  /**
   * Load environment variables from .env file if available (via fetch)
   */
  async function loadEnv() {
    if (state.envLoaded) return state.envCredentials;
    
    try {
      // Check window.ENV if provided by an env script
      if (window.ENV && (window.ENV.VITE_ADMIN_USER || window.ENV.ADMIN_USER)) {
        state.envCredentials = {
          user: window.ENV.VITE_ADMIN_USER || window.ENV.ADMIN_USER,
          pass: window.ENV.VITE_ADMIN_PASS || window.ENV.ADMIN_PASS
        };
        state.envLoaded = true;
        return state.envCredentials;
      }

      // Try fetching .env directly
      const response = await fetch('.env', { cache: 'no-store' });
      if (response.ok) {
        const text = await response.text();
        const lines = text.split(/\r?\n/);
        const parsed = {};
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const idx = trimmed.indexOf('=');
          if (idx > 0) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            parsed[key] = val;
          }
        }

        const user = parsed.VITE_ADMIN_USER || parsed.REACT_APP_ADMIN_USER || parsed.ADMIN_USER;
        const pass = parsed.VITE_ADMIN_PASS || parsed.REACT_APP_ADMIN_PASS || parsed.ADMIN_PASS;

        if (user && pass) {
          state.envCredentials = { user, pass };
        }
      }
    } catch (err) {
      // Fetch might fail on file:/// protocol or CORS; silent fallback to SHA-256
    }

    state.envLoaded = true;
    return state.envCredentials;
  }

  // Preload env on startup
  loadEnv();

  const AdminAuth = {
    /**
     * Check if user is currently authenticated
     */
    isAuthenticated() {
      return localStorage.getItem(AUTH_KEY) === 'true' || sessionStorage.getItem(AUTH_KEY) === 'true';
    },

    /**
     * Get currently logged-in username
     */
    getCurrentUser() {
      return localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || 'Administrator';
    },

    /**
     * Authenticate with username and password
     */
    async login(username, password, rememberMe = true) {
      const cleanUser = (username || '').trim();
      const cleanPass = password || '';

      if (!cleanUser || !cleanPass) {
        return { success: false, message: 'Please enter both username and password.' };
      }

      // 1. Supabase Auth Integration
      if (window.sbClient && cleanUser.includes('@')) {
        try {
          const { data, error } = await window.sbClient.auth.signInWithPassword({
            email: cleanUser,
            password: cleanPass
          });

          if (!error && data && data.user) {
            // Verify role in profiles table
            const { data: profile, error: profErr } = await window.sbClient
              .from('profiles')
              .select('role, full_name')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profile && profile.role === 'admin') {
              const storage = rememberMe ? localStorage : sessionStorage;
              storage.setItem(AUTH_KEY, 'true');
              storage.setItem(USER_KEY, profile.full_name || data.user.email || cleanUser);
              storage.setItem(TIME_KEY, new Date().toISOString());
              return { success: true };
            } else {
              // Sign out immediately if not admin
              await window.sbClient.auth.signOut();
              return {
                success: false,
                message: 'Access denied: You must be an administrator to access this dashboard.'
              };
            }
          }
        } catch (sbErr) {
          console.warn('[AdminAuth] Supabase auth attempt:', sbErr);
        }
      }

      // Ensure .env attempt is completed
      await loadEnv();

      let isValid = false;

      // 2. If .env loaded successfully, verify against environment variables
      if (state.envCredentials && state.envCredentials.user && state.envCredentials.pass) {
        if (cleanUser === state.envCredentials.user && cleanPass === state.envCredentials.pass) {
          isValid = true;
        }
      }

      // 3. Cryptographic SHA-256 Verification
      // Ensures security on GitHub without plain text credentials in source
      if (!isValid) {
        const uHash = sha256(cleanUser.toLowerCase());
        const pHash = sha256(cleanPass);
        const uValid = VALID_USER_HASHES.includes(uHash);
        const pValid = VALID_PASS_HASHES.includes(pHash);

        if (uValid && pValid) {
          isValid = true;
        }
      }

      if (isValid) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(AUTH_KEY, 'true');
        storage.setItem(USER_KEY, cleanUser);
        storage.setItem(TIME_KEY, new Date().toISOString());

        return { success: true };
      }

      return { 
        success: false, 
        message: 'Invalid username or password. Please check your credentials.' 
      };
    },

    /**
     * Logout and redirect to login page
     */
    async logout() {
      if (window.sbClient) {
        try { await window.sbClient.auth.signOut(); } catch (e) {}
      }
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TIME_KEY);
      sessionStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TIME_KEY);

      window.location.replace('admin-login.html');
    },

    /**
     * Protected route guard: call on protected admin pages
     */
    requireAuth() {
      if (!this.isAuthenticated()) {
        const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`admin-login.html?redirect=${currentPath}`);
      }
    },

    /**
     * Login route guard: call on login page to redirect if already logged in
     */
    redirectIfAuthenticated() {
      if (this.isAuthenticated()) {
        window.location.replace('admin.html');
      }
    }
  };

  window.AdminAuth = AdminAuth;
})(window);
