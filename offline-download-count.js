(() => {
  const endpoint = 'https://kreativtools-offline-click-counter.andrei-olaru.workers.dev/click';
  document.querySelectorAll('a[href$="/downloads/kreativ-pdf-offline.zip"]').forEach((link) => {
    link.addEventListener('click', () => {
      try { navigator.sendBeacon(endpoint); } catch { /* Counting must never block the download. */ }
    });
  });
})();
