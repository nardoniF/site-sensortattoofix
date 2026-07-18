/**
 * sensortattoofix.com — só redirect sem www. Links de idioma: stf-lang-nav.js
 */
(function () {
  if (location.hostname === 'sensortattoofix.com') {
    location.replace(
      'https://www.sensortattoofix.com' + location.pathname + location.search + location.hash
    );
  }
})();
