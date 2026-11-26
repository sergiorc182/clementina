(function (global) {
  'use strict';

  const fetchOriginal = global.fetch.bind(global);
  const patronNode = /^https?:\/\/(?:localhost|127\.0\.0\.1):3000\/api/;

  function apiBaseUrl() {
    const configurada = global.ISFT182_CONFIG && global.ISFT182_CONFIG.apiBaseUrl;
    if (configurada) return String(configurada).replace(/\/+$/, '');
    if (global.ISFTAuth && typeof global.ISFTAuth.legacyBaseUrl === 'function') {
      return `${global.ISFTAuth.legacyBaseUrl()}/ProyectoPreceptoria/api.php`;
    }
    if (global.location.hostname === 'localhost' || global.location.hostname === '127.0.0.1') {
      return 'http://localhost/clementina/ProyectoPreceptoria/api.php';
    }
    const partes = global.location.pathname.split('/').filter(Boolean);
    const indice = partes.indexOf('clementina');
    const raiz = indice >= 0 ? `${global.location.origin}/${partes.slice(0, indice + 1).join('/')}` : global.location.origin;
    return `${raiz}/ProyectoPreceptoria/api.php`;
  }

  global.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!patronNode.test(url)) {
      return fetchOriginal(input, init);
    }
    const ruta = url.replace(patronNode, '');
    const destino = `${apiBaseUrl()}?r=${encodeURIComponent(ruta)}`;
    const opciones = Object.assign({}, init || {}, { credentials: 'include' });
    return fetchOriginal(destino, opciones);
  };

  global.ISFTApiBridge = { apiBaseUrl };
})(window);
