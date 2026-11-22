// Only display a download when an actual distribution URL is configured.
(async () => {
  try {
    const response = await fetch('./app-downloads.json', { cache: 'no-store' });
    if (!response.ok) return;
    const release = await response.json();
    for (const platform of ['android', 'ios']) {
      const value = release[platform];
      if (!value) continue;
      const url = new URL(value, location.href);
      if (url.protocol !== 'https:' && url.origin !== location.origin) continue;
      const link = document.querySelector(`[data-download="${platform}"]`);
      const pending = document.querySelector(`[data-download-pending="${platform}"]`);
      link.href = url.href;
      link.hidden = false;
      pending.hidden = true;
      document.querySelector('#app-download-note').textContent = 'Versão de apresentação · alguns recursos utilizam dados ilustrativos.';
    }
  } catch { /* Keep the honest availability state if configuration is unavailable. */ }
})();
