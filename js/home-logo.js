(function () {
  if (!document.body.classList.contains('home-page')) return;

  document.querySelectorAll('.logo-img-link[href="#top"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      window.history.replaceState(null, '', '#top');
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  });
})();
