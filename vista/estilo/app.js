/**
 * app.js — Núcleo de la interfaz de Clementina (ISFT N.º 182).
 *
 * Contiene:
 *   1. Utilidades de rutas (base, raíz, controlador, vista).
 *   2. Sesión (verificar / cerrar) — misma lógica y endpoints que antes.
 *   3. Shell del dashboard (sidebar + topbar) reutilizable por las vistas.
 *   4. Componentes de UI: iconos Lucide, toasts, modales de confirmación,
 *      menús desplegables y navegación móvil.
 *
 * No modifica endpoints, modelos ni autenticación: solo la capa visual.
 */
(function () {
  'use strict';

  /* ================================================================== */
  /* Utilidades internas                                                 */
  /* ================================================================== */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  function setTexto(id, valor) {
    var el = document.getElementById(id);
    if (el) { el.textContent = valor; }
  }

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function iniciales(nombre) {
    var partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) { return '·'; }
    var a = partes[0].charAt(0);
    var b = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }

  /* ================================================================== */
  /* Iconos (incluidos localmente, sin dependencias externas)            */
  /* ================================================================== */

  var ICONOS = {
    "alert-triangle": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>",
    "arrow-left": "<path d=\"m12 19-7-7 7-7\"/><path d=\"M19 12H5\"/>",
    "arrow-right": "<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>",
    "calendar": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" ry=\"2\"/><line x1=\"16\" x2=\"16\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"2\" y2=\"6\"/><line x1=\"3\" x2=\"21\" y1=\"10\" y2=\"10\"/>",
    "calendar-check": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" ry=\"2\"/><line x1=\"16\" x2=\"16\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"2\" y2=\"6\"/><line x1=\"3\" x2=\"21\" y1=\"10\" y2=\"10\"/><path d=\"m9 16 2 2 4-4\"/>",
    "calendar-clock": "<path d=\"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5\"/><path d=\"M16 2v4\"/><path d=\"M8 2v4\"/><path d=\"M3 10h5\"/><path d=\"M17.5 17.5 16 16.25V14\"/><path d=\"M22 16a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z\"/>",
    "calendar-days": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" ry=\"2\"/><line x1=\"16\" x2=\"16\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"2\" y2=\"6\"/><line x1=\"3\" x2=\"21\" y1=\"10\" y2=\"10\"/><path d=\"M8 14h.01\"/><path d=\"M12 14h.01\"/><path d=\"M16 14h.01\"/><path d=\"M8 18h.01\"/><path d=\"M12 18h.01\"/><path d=\"M16 18h.01\"/>",
    "calendar-plus": "<path d=\"M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8\"/><line x1=\"16\" x2=\"16\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"2\" y2=\"6\"/><line x1=\"3\" x2=\"21\" y1=\"10\" y2=\"10\"/><line x1=\"19\" x2=\"19\" y1=\"16\" y2=\"22\"/><line x1=\"16\" x2=\"22\" y1=\"19\" y2=\"19\"/>",
    "calendar-x": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" ry=\"2\"/><line x1=\"16\" x2=\"16\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"2\" y2=\"6\"/><line x1=\"3\" x2=\"21\" y1=\"10\" y2=\"10\"/><line x1=\"10\" x2=\"14\" y1=\"14\" y2=\"18\"/><line x1=\"14\" x2=\"10\" y1=\"14\" y2=\"18\"/>",
    "check-circle-2": "<path d=\"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z\"/><path d=\"m9 12 2 2 4-4\"/>",
    "chevron-down": "<path d=\"m6 9 6 6 6-6\"/>",
    "clipboard-list": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"M12 11h4\"/><path d=\"M12 16h4\"/><path d=\"M8 11h.01\"/><path d=\"M8 16h.01\"/>",
    "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>",
    "credit-card": "<rect width=\"20\" height=\"14\" x=\"2\" y=\"5\" rx=\"2\"/><line x1=\"2\" x2=\"22\" y1=\"10\" y2=\"10\"/>",
    "file-search": "<path d=\"M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v3\"/><polyline points=\"14 2 14 8 20 8\"/><path d=\"M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z\"/><path d=\"m9 18-1.5-1.5\"/>",
    "file-text": "<path d=\"M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z\"/><polyline points=\"14 2 14 8 20 8\"/><line x1=\"16\" x2=\"8\" y1=\"13\" y2=\"13\"/><line x1=\"16\" x2=\"8\" y1=\"17\" y2=\"17\"/><line x1=\"10\" x2=\"8\" y1=\"9\" y2=\"9\"/>",
    "hash": "<line x1=\"4\" x2=\"20\" y1=\"9\" y2=\"9\"/><line x1=\"4\" x2=\"20\" y1=\"15\" y2=\"15\"/><line x1=\"10\" x2=\"8\" y1=\"3\" y2=\"21\"/><line x1=\"16\" x2=\"14\" y1=\"3\" y2=\"21\"/>",
    "help-circle": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/><path d=\"M12 17h.01\"/>",
    "inbox": "<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\"/><path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/>",
    "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4\"/><path d=\"M12 8h.01\"/>",
    "layout-dashboard": "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>",
    "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>",
    "log-in": "<path d=\"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4\"/><polyline points=\"10 17 15 12 10 7\"/><line x1=\"15\" x2=\"3\" y1=\"12\" y2=\"12\"/>",
    "log-out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><polyline points=\"16 17 21 12 16 7\"/><line x1=\"21\" x2=\"9\" y1=\"12\" y2=\"12\"/>",
    "mail": "<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/><path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\"/>",
    "menu": "<line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\"/><line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\"/><line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\"/>",
    "phone": "<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"/>",
    "school": "<path d=\"m4 6 8-4 8 4\"/><path d=\"m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2\"/><path d=\"M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4\"/><path d=\"M18 5v17\"/><path d=\"M6 5v17\"/><circle cx=\"12\" cy=\"9\" r=\"2\"/>",
    "search": "<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/>",
    "shield-check": "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/><path d=\"m9 12 2 2 4-4\"/>",
    "user": "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>",
    "x": "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>",
    "x-circle": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m15 9-6 6\"/><path d=\"m9 9 6 6\"/>"
  };

  /* ================================================================== */
  /* Aplicación                                                          */
  /* ================================================================== */

  var App = {

    /* Ruta absoluta hasta la carpeta /vista, calculada desde app.js */
    base: (function () {
      var scripts = document.querySelectorAll('script[src]');
      var src = document.currentScript ? document.currentScript.src : scripts[scripts.length - 1].src;
      return src.substring(0, src.lastIndexOf('/estilo/'));
    })(),

    /* Ruta hasta la raíz del proyecto (carpeta padre de /vista) */
    raiz: function () {
      return this.base.replace(/\/vista$/, '');
    },

    /* Ruta HTTP a un controlador en /controlador */
    controlador: function (nombre) {
      return this.base.replace(/\/vista$/, '/controlador') + '/' + nombre;
    },

    /* Ruta a una vista dentro de /vista */
    vista: function (nombre) {
      return this.base + '/' + nombre;
    },

    /**
     * Valida la sesión contra controlador/verificar_sesion.php.
     * Si no hay sesión y redirigir !== false, manda al login.
     * Devuelve el objeto usuario (o null).
     */
    verificarSesion: function (redirigir) {
      var self = this;
      return fetch(this.controlador('verificar_sesion.php'))
        .then(function (resp) { return resp.json(); })
        .then(function (datos) {
          if (datos.ok) {
            return datos.usuario;
          }
          if (redirigir !== false) {
            window.location.href = self.vista('login.html');
          }
          return null;
        })
        .catch(function () {
          if (redirigir !== false) {
            window.location.href = self.vista('login.html');
          }
          return null;
        });
    },

    /* Cierra la sesión y redirige al login */
    cerrarSesion: function () {
      var self = this;
      return fetch(this.controlador('cerrar_sesion.php'), { method: 'POST' })
        .catch(function () { /* no importa el resultado */ })
        .then(function () {
          window.location.href = self.vista('login.html');
        });
    },

    /* Texto legible del rol para mostrar en pantalla */
    nombreRol: function (rol) {
      return rol === 'alumno' ? 'Alumno' : 'Personal';
    },

    /* ================================================================ */
    /* Iconos                                                          */
    /* ================================================================ */

    /* Reemplaza cada <i data-lucide="nombre"> por su <svg> local. */
    iconos: function (raiz) {
      var cont = raiz || document;
      var pendientes = cont.querySelectorAll('[data-lucide]');
      for (var i = 0; i < pendientes.length; i++) {
        var el = pendientes[i];
        if (el.tagName && el.tagName.toLowerCase() === 'svg') { continue; }
        var nombre = el.getAttribute('data-lucide');
        var cuerpo = ICONOS[nombre];
        if (cuerpo == null) { continue; }

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');

        var clase = el.getAttribute('class');
        svg.setAttribute('class', 'lucide lucide-' + nombre + (clase ? ' ' + clase : ''));
        svg.innerHTML = cuerpo;

        if (el.parentNode) { el.parentNode.replaceChild(svg, el); }
      }
    },

    /* Marca propia de Clementina: "C" abierta + nodo turquesa. */
    _marcaSvg: function () {
      return '<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">' +
             '<path d="M21.5 11.4a7 7 0 1 0 0 9.2" fill="none" stroke="currentColor" ' +
             'stroke-width="2.6" stroke-linecap="round"/>' +
             '<circle cx="21.5" cy="16" r="2.2" fill="#14B8A6"/></svg>';
    },

    /* ================================================================ */
    /* Shell: topbar                                                    */
    /* ================================================================ */

    montarLayout: function (opciones) {
      opciones = opciones || {};
      var self = this;
      var protegida = opciones.protegida !== false;

      this._montarTopbar();
      this._conectarUI();

      var sesion = this.verificarSesion(protegida);
      return sesion.then(function (usuario) {
        if (usuario) {
          self.pintarUsuario(usuario);
        } else {
          self.pintarInvitado();
        }
        self.iconos();
        return usuario;
      });
    },

    _montarTopbar: function () {
      var contenedor = document.getElementById('topbar');
      if (!contenedor) { return; }

      var html = '';
      html += '<a class="brand brand--topbar" href="' + this.raiz() + '/index.html" aria-label="Clementina, inicio">';
      html += '  <span class="brand__mark">' + this._marcaSvg() + '</span>';
      html += '  <span class="brand__text">';
      html += '    <span class="brand__name">Clementina</span>';
      html += '    <span class="brand__sub">ISFT N.º 182</span>';
      html += '  </span>';
      html += '</a>';
      html += '<div class="topbar__spacer"></div>';
      html += '<div class="topbar__actions" id="topbar-acciones"></div>';

      contenedor.innerHTML = html;
    },

    _htmlUsuario: function () {
      var v = this.vista.bind(this);
      var html = '';
      html += '<div class="dropdown" id="dropdown-usuario">';
      html += '  <button type="button" class="user-chip" id="btn-usuario" aria-haspopup="true" aria-expanded="false">';
      html += '    <span class="avatar" id="usuario-avatar">·</span>';
      html += '    <span class="user-chip__info">';
      html += '      <span class="user-chip__name" id="usuario-nombre">—</span>';
      html += '      <span class="user-chip__role" id="usuario-rol"></span>';
      html += '    </span>';
      html += '    <i data-lucide="chevron-down" class="icon--sm"></i>';
      html += '  </button>';
      html += '  <div class="dropdown__menu" role="menu">';
      html += '    <a class="dropdown__item" role="menuitem" href="' + v('mis_datos.html') + '"><i data-lucide="user"></i>Mis datos</a>';
      html += '    <div class="dropdown__divider"></div>';
      html += '    <button type="button" class="dropdown__item dropdown__item--danger" role="menuitem" id="btn-cerrar-sesion-menu"><i data-lucide="log-out"></i>Cerrar sesión</button>';
      html += '  </div>';
      html += '</div>';
      return html;
    },

    _htmlInvitado: function () {
      var v = this.vista.bind(this);
      return '<a class="btn btn--primary btn--sm" href="' + v('login.html') + '">' +
             '<i data-lucide="log-in"></i>Ingresar</a>';
    },

    pintarUsuario: function (usuario) {
      var contenedor = document.getElementById('topbar-acciones');
      if (contenedor && !document.getElementById('dropdown-usuario')) {
        contenedor.innerHTML = this._htmlUsuario();
        this._conectarUsuario();
      }

      var nombre = (usuario.nombre || '') + ' ' + (usuario.apellido || '');
      nombre = nombre.trim();
      setTexto('usuario-nombre', nombre || usuario.usuario || 'Usuario');
      setTexto('usuario-rol', this.nombreRol(usuario.rol));
      setTexto('usuario-avatar', iniciales(nombre || usuario.usuario));
    },

    pintarInvitado: function () {
      var contenedor = document.getElementById('topbar-acciones');
      if (contenedor) {
        contenedor.innerHTML = this._htmlInvitado();
      }
    },

    _conectarUsuario: function () {
      var self = this;
      var cerrar = function () {
        self.confirmar({
          titulo: '¿Cerrar sesión?',
          texto: 'Vas a salir de tu cuenta de Clementina. Podés volver a ingresar cuando quieras.',
          confirmar: 'Cerrar sesión',
          tipo: 'danger'
        }).then(function (ok) {
          if (ok) { self.cerrarSesion(); }
        });
      };

      var btnMenu = document.getElementById('btn-cerrar-sesion-menu');
      if (btnMenu) { btnMenu.addEventListener('click', cerrar); }
    },

    _conectarUI: function () {
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          var dd = document.getElementById('dropdown-usuario');
          if (dd) { dd.classList.remove('is-open'); }
        }
      });

      /* Dropdown de usuario */
      document.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('#btn-usuario') : null;
        var dd = document.getElementById('dropdown-usuario');
        if (btn && dd) {
          var abierto = dd.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
          e.preventDefault();
          return;
        }
        if (dd && !dd.contains(e.target)) {
          dd.classList.remove('is-open');
          var b = document.getElementById('btn-usuario');
          if (b) { b.setAttribute('aria-expanded', 'false'); }
        }
      });
    },

    /* ================================================================ */
    /* Toast                                                           */
    /* ================================================================ */

    toast: function (opciones) {
      var region = document.getElementById('toast-region');
      if (!region) {
        region = document.createElement('div');
        region.id = 'toast-region';
        region.className = 'toast-region';
        region.setAttribute('aria-live', 'polite');
        document.body.appendChild(region);
      }

      var tipo = opciones.tipo || 'info';
      var icono = {
        success: 'check-circle-2',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
      }[tipo] || 'info';

      var el = document.createElement('div');
      el.className = 'toast toast--' + tipo;
      el.setAttribute('role', 'status');
      el.innerHTML =
        '<span class="toast__icon"><i data-lucide="' + icono + '"></i></span>' +
        '<div class="toast__body">' +
          (opciones.titulo ? '<div class="toast__title">' + escapar(opciones.titulo) + '</div>' : '') +
          (opciones.texto ? '<div class="toast__text">' + escapar(opciones.texto) + '</div>' : '') +
        '</div>' +
        '<button type="button" class="toast__close" aria-label="Cerrar"><i data-lucide="x" class="icon--sm"></i></button>';

      region.appendChild(el);
      this.iconos();

      function quitar() {
        if (el.classList.contains('is-leaving')) { return; }
        el.classList.add('is-leaving');
        setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 180);
      }

      el.querySelector('.toast__close').addEventListener('click', quitar);
      var tiempo = opciones.duracion || 4000;
      if (tiempo > 0) { setTimeout(quitar, tiempo); }

      return el;
    },

    /* ================================================================ */
    /* Confirmación (modal)                                            */
    /* ================================================================ */

    confirmar: function (opciones) {
      var self = this;
      opciones = opciones || {};

      return new Promise(function (resolve) {
        var tipo = opciones.tipo || 'warning';
        var icono = tipo === 'danger' || tipo === 'error' ? 'alert-triangle' : 'help-circle';
        var claseIcono = tipo === 'danger' || tipo === 'error' ? 'modal__icon--error' : 'modal__icon--warning';

        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML =
          '<div class="modal__dialog">' +
            '<div class="modal__header">' +
              '<span class="modal__icon ' + claseIcono + '"><i data-lucide="' + icono + '"></i></span>' +
              '<div><div class="modal__title">' + escapar(opciones.titulo || 'Confirmar acción') + '</div>' +
              (opciones.texto ? '<p class="modal__text">' + escapar(opciones.texto) + '</p>' : '') +
              '</div>' +
            '</div>' +
            '<div class="modal__footer">' +
              '<button type="button" class="btn btn--outline" data-accion="cancelar">' + escapar(opciones.cancelar || 'Cancelar') + '</button>' +
              '<button type="button" class="btn ' + (tipo === 'danger' ? 'btn--danger' : 'btn--primary') + '" data-accion="confirmar">' + escapar(opciones.confirmar || 'Confirmar') + '</button>' +
            '</div>' +
          '</div>';

        document.body.appendChild(modal);
        self.iconos();

        function cerrar(valor) {
          modal.classList.remove('is-open');
          setTimeout(function () {
            if (modal.parentNode) { modal.parentNode.removeChild(modal); }
          }, 180);
          document.removeEventListener('keydown', alTeclado);
          resolve(valor);
        }

        function alTeclado(e) {
          if (e.key === 'Escape') { cerrar(false); }
        }

        modal.addEventListener('click', function (e) {
          if (e.target === modal) { cerrar(false); }
        });
        modal.querySelector('[data-accion="cancelar"]').addEventListener('click', function () { cerrar(false); });
        modal.querySelector('[data-accion="confirmar"]').addEventListener('click', function () { cerrar(true); });
        document.addEventListener('keydown', alTeclado);

        requestAnimationFrame(function () {
          modal.classList.add('is-open');
          var conf = modal.querySelector('[data-accion="confirmar"]');
          if (conf) { conf.focus(); }
        });
      });
    }
  };

  window.App = App;
})();
