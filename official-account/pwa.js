(function registerServiceCenterApp() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/official/sw.js', { scope: '/official/', updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}());
