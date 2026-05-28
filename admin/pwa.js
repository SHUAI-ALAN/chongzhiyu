(function registerAdminApp() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/admin/sw.js', { scope: '/admin/', updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}());
