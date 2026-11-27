import { crearControlFinales } from './src/components/ControlFinales.js';
import { guardarUsuarioEnCookies } from './src/utils/cookies.js';

(function () {
  'use strict';

  const destino = document.getElementById('finales-shell-host');
  if (!destino) return;

  window.ISFTNotify = function (mensaje, tipo) {
    const mapa = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
    window.App.toast({
      tipo: mapa[tipo] || 'info',
      texto: String(mensaje || '')
    });
  };

  function prepararShadow() {
    const host = document.createElement('div');
    host.className = 'finales-shell-host';
    host.style.display = 'block';
    host.dataset.finalesMount = 'loading';
    const shadow = host.attachShadow({ mode: 'open' });
    const mount = document.createElement('div');
    shadow.appendChild(mount);
    destino.replaceChildren(host);
    return { host, shadow, mount };
  }

  async function cargarEstilos(shadow) {
    try {
      const urls = [
        new URL('./src/index.css', import.meta.url),
        new URL('./src/finales-admin.css', import.meta.url)
      ];
      const respuestas = await Promise.all(urls.map((url) => fetch(url)));
      const textos = await Promise.all(respuestas.map((respuesta) => respuesta.ok ? respuesta.text() : ''));
      const css = textos[0].replace(/:root/g, ':host') + '\n' + textos[1];
      const estilo = document.createElement('style');
      estilo.textContent = css;
      shadow.appendChild(estilo);
    } catch (error) {
      window.App.toast({ tipo: 'warning', texto: 'No se pudieron cargar los estilos del módulo de finales.' });
    }
  }

  window.AppAdmin.montarAdmin({
    titulo: 'Finales · Control y rendiciones',
    subtitulo: 'Inscripciones, calificaciones y auditoría en un solo lugar'
  }).then(function (usuario) {
    if (!usuario) return;

    const nombre = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ').trim();
    guardarUsuarioEnCookies({
      tipoUsuario: 'preceptor',
      idAlumno: null,
      nombreAlumno: nombre || 'Preceptoría ISFT 182'
    });

    const { host, shadow, mount } = prepararShadow();
    cargarEstilos(shadow).then(function () {
      window.__finalesShell = crearControlFinales(mount, {
        alumnos: [],
        vistaInicial: 'listado'
      });
      host.dataset.finalesMount = 'ready';
    });
  });
})();
