(function () {
  function closePanel(panel, btn) {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  document.querySelectorAll('[data-admin-help]').forEach((btn) => {
    const panelId = btn.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = panel.hidden;
      document.querySelectorAll('.admin-help-panel').forEach((p) => {
        p.hidden = true;
        const otherBtn = document.querySelector(`[aria-controls="${p.id}"]`);
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      } else {
        closePanel(panel, btn);
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-admin-help]') || e.target.closest('.admin-help-panel')) return;
    document.querySelectorAll('.admin-help-panel:not([hidden])').forEach((panel) => {
      const btn = document.querySelector(`[aria-controls="${panel.id}"]`);
      closePanel(panel, btn);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.admin-help-panel:not([hidden])').forEach((panel) => {
      const btn = document.querySelector(`[aria-controls="${panel.id}"]`);
      closePanel(panel, btn);
    });
  });
})();
