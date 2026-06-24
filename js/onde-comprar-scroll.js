/**
 * Ao clicar em #onde-comprar, centraliza o bloco na viewport (abaixo do header).
 * Flex + min-height na seção empurrava o conteúdo para baixo no scroll por âncora.
 */
(function () {
  var HASH = '#onde-comprar';

  function isOndeComprarLink(href) {
    if (!href) return false;
    var h = String(href).trim();
    return h === HASH || h.slice(-HASH.length) === HASH;
  }

  function headerHeight() {
    var header = document.querySelector('header');
    return header ? header.getBoundingClientRect().height : 70;
  }

  function centerOndeComprar(smooth) {
    var section = document.getElementById('onde-comprar');
    if (!section) return;
    var box = section.querySelector('.container');
    if (!box) return;

    var headerH = headerHeight();
    var sectionTop = section.getBoundingClientRect().top + window.pageYOffset;
    var gap = (window.innerHeight - headerH - box.offsetHeight) / 2;
    var top = sectionTop - headerH - Math.max(12, gap);

    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
  }

  function onHashLanding() {
    if (location.hash !== HASH) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { centerOndeComprar(false); });
    });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || !document.getElementById('onde-comprar')) return;
    if (!isOndeComprarLink(a.getAttribute('href'))) return;

    e.preventDefault();
    if (location.hash !== HASH) {
      history.pushState(null, '', HASH);
    }
    centerOndeComprar(true);
  }, true);

  window.addEventListener('hashchange', onHashLanding);
  window.addEventListener('load', onHashLanding);
  document.addEventListener('DOMContentLoaded', onHashLanding);
})();
