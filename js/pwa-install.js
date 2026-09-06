/* =====================================================
   CasaShoes — PWA Install & Service Worker Registration
   ===================================================== */

(function () {
  'use strict';

  /* ===================================================
     SERVICE WORKER REGISTRATION
     =================================================== */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./service-worker.js')
        .then((reg) => console.log('[PWA] Service worker registered:', reg.scope))
        .catch((err) => console.warn('[PWA] Service worker registration failed:', err));
    });
  }

  /* ===================================================
     HELPERS
     =================================================== */
  function isIos() {
    const ua = window.navigator.userAgent;
    const iOSDevice = /iPad|iPhone|iPod/.test(ua);
    // iPadOS 13+ reports as "MacIntel" but has touch support
    const iPadOS13Up = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOSDevice || iPadOS13Up;
  }

  function isInStandaloneMode() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true // iOS Safari flag
    );
  }

  /* ===================================================
     INSTALL FLOW (Android / Desktop Chrome, Edge, etc.)
     =================================================== */
  function initPwaInstall() {
    const row       = document.getElementById('pwa-install-row');
    const installBtn = document.getElementById('pwa-install-btn');
    const iosOverlay = document.getElementById('pwa-ios-overlay');
    const iosSheet    = document.getElementById('pwa-ios-sheet');
    const iosClose    = document.getElementById('pwa-ios-close');

    if (!row || !installBtn) return;

    // Already installed / running standalone — nothing to offer.
    if (isInStandaloneMode()) return;

    let deferredPrompt = null;

    function openIosSheet() {
      iosOverlay?.classList.add('open');
      iosSheet?.classList.add('open');
    }

    function closeIosSheet() {
      iosOverlay?.classList.remove('open');
      iosSheet?.classList.remove('open');
    }

    iosClose?.addEventListener('click', closeIosSheet);
    iosOverlay?.addEventListener('click', closeIosSheet);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && iosSheet?.classList.contains('open')) closeIosSheet();
    });

    if (isIos()) {
      // iOS: no beforeinstallprompt support — show the row immediately,
      // tapping it opens manual "Add to Home Screen" instructions.
      row.hidden = false;
      installBtn.addEventListener('click', openIosSheet);
      return;
    }

    // Chromium-based browsers (Android Chrome, desktop Chrome/Edge, etc.)
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      row.hidden = false; // only reveal the button once install is actually possible
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install prompt outcome:', outcome);
      deferredPrompt = null;
      row.hidden = true;
    });

    // Browser fired this once the user actually installed the app
    window.addEventListener('appinstalled', () => {
      row.hidden = true;
      deferredPrompt = null;
      console.log('[PWA] App installed');
    });
  }

  /* ===================================================
     INIT
     =================================================== */
  registerServiceWorker();
  document.addEventListener('DOMContentLoaded', initPwaInstall);
})();
