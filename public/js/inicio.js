// Se ejecuta antes de Angular (sin código en línea, compatible con la Content-Security-Policy):
// 1) aplica el tema guardado para que la página no "parpadee" en claro;
// 2) carga Google Analytics solo si la persona aceptó las cookies analíticas.
(function () {
  var leer = function (clave) {
    try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch (e) { return null; }
  };

  var tema = leer('fastore_tema') || 'sistema';
  document.documentElement.setAttribute('data-tema', tema);

  window.fastoreCargarAnaliticas = function () {
    if (window.fastoreAnaliticasCargadas) return;
    window.fastoreAnaliticasCargadas = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-PTCNJPBMRZ', { anonymize_ip: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-PTCNJPBMRZ';
    document.head.appendChild(s);
  };

  var consentimiento = leer('fastore_consentimiento');
  if (consentimiento && consentimiento.analiticas) window.fastoreCargarAnaliticas();
})();
