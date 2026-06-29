(function () {
  var toggle = document.getElementById('mobile-menu-toggle');
  if (!toggle) return;

  function closeMenu() {
    toggle.checked = false;
  }

  document.querySelectorAll('.nav-main a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });
})();
