/* divide.ai — registra o service worker (offline + instalável). */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('[divide.ai] service worker não registrado:', err);
    });
  });
})();
