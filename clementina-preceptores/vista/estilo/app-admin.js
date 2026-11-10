/**
 * app-admin.js — Shell del panel de preceptores/directivos.
 * ISFT 182 "Clementina"
 *
 * Extiende App (app.js del proyecto raíz) con:
 *   1. Sidebar con navegación, ítem activo y toggle móvil.
 *   2. Topbar del panel admin.
 *   3. Verificación de sesión con exigencia de rol personal.
 *   4. Modo noche (misma clave localStorage que el panel de alumnos).
 *
 * Requiere que app.js esté cargado antes.
 */
(function () {
  'use strict';

  /* ================================================================== */
  /* Navegación del sidebar                                               */
  /* ================================================================== */

  var NAV_ITEMS = [
    {
      seccion: 'Principal',
      items: [
        { id: 'dashboard',  icon: 'layout-dashboard', label: 'Dashboard',         href: '../index.html' },
      ]
    },
    {
      seccion: 'Alumnos',
      items: [
        { id: 'alumnos',    icon: 'user',             label: 'Listado de alumnos', href: 'alumnos.html' },
        { id: 'historial',  icon: 'file-search',      label: 'Historial académico', href: 'historial.html' },
      ]
    },
    {
      seccion: 'Académico',
      items: [
        { id: 'carreras',   icon: 'school',           label: 'Carreras',           href: 'carreras.html' },
        { id: 'inscripciones', icon: 'calendar-check', label: 'Inscripciones',     href: 'inscripciones.html' },
        { id: 'mesas',      icon: 'calendar-days',    label: 'Mesas de examen',    href: 'mesas.html' },
        { id: 'cronogramas', icon: 'file-text',       label: 'Cronogramas de finales', href: 'cronogramas_finales.html' },
      ]
    },
  ];

  /* ================================================================== */
  /* AppAdmin — extiende App                                              */
  /* ================================================================== */

  var AppAdmin = {

    /* Página activa: la detecta por el atributo data-page del <body> */
    paginaActiva: function () {
      return document.body.getAttribute('data-page') || '';
    },

    /* Ruta base del panel de preceptores */
    baseAdmin: (function () {
      var scripts = document.querySelectorAll('script[src]');
      var src = document.currentScript
        ? document.currentScript.src
        : scripts[scripts.length - 1].src;
      // Sube desde /vista/estilo/app-admin.js hasta /clementina-preceptores/vista/
      return src.substring(0, src.lastIndexOf('/estilo/'));
    })(),

    /* URL de un controlador del panel admin */
    controladorAdmin: function (nombre) {
      return this.baseAdmin.replace(/\/vista$/, '/controlador') + '/' + nombre;
    },

    /* URL de una vista del panel admin */
    vistaAdmin: function (nombre) {
      return this.baseAdmin + '/' + nombre;
    },

    /* URL del login del alumno (para redirigir al cerrar sesión) */
    urlLogin: function () {
      // Sube desde /clementina-preceptores/ hasta la raíz
      return this.baseAdmin.replace(/\/clementina-preceptores\/vista$/, '') + '/vista/login.html';
    },

    /* ================================================================ */
    /* Shell: montar sidebar + topbar del panel admin                    */
    /* ================================================================ */

    montarAdmin: function (opciones) {
      opciones = opciones || {};
      var self = this;

      this._montarSidebar();
      this._montarTopbarAdmin(opciones.titulo || 'Panel administrativo', opciones.subtitulo || '');
      this._conectarToggleMobil();

      // Aplica el tema antes de mostrar (evita parpadeo)
      App._pintarBotonTema && App._pintarBotonTema.call(App);

      // Verificar sesión como personal
      return fetch(this.controladorAdmin('verificar_sesion.php'))
        .then(function (r) { return r.json(); })
        .then(function (datos) {
          if (!datos.ok) {
            window.location.href = self.urlLogin();
            return null;
          }
          self._pintarUsuarioSidebar(datos.usuario);
          App.iconos();
          return datos.usuario;
        })
        .catch(function () {
          window.location.href = self.urlLogin();
          return null;
        });
    },

    /* ================================================================ */
    /* Sidebar                                                           */
    /* ================================================================ */

    _montarSidebar: function () {
      var sidebar = document.getElementById('sidebar');
      if (!sidebar) { return; }

      var self = this;
      var paginaActiva = this.paginaActiva();

      var html = '';

      // Encabezado
      html += '<div class="sidebar__head">';
      html += '  <a class="sidebar__brand" href="' + this.vistaAdmin('index.html') + '">';
      html += '    <img class="sidebar__logo" src="'
              + this.baseAdmin + '/../../vista/estilo/logo-isft182.svg?v=3"'
              + ' alt="" width="32" height="36">';
      html += '    <span class="sidebar__brand-text">';
      html += '      <span class="sidebar__brand-name">Clementina</span>';
      html += '      <span class="sidebar__brand-sub">ISFT N.º 182</span>';
      html += '    </span>';
      html += '  </a>';
      html += '  <span class="sidebar__role-badge" id="sidebar-role-badge">Panel</span>';
      html += '</div>';

      // Navegación
      html += '<nav class="sidebar__nav" aria-label="Navegación del panel">';
      NAV_ITEMS.forEach(function (grupo) {
        html += '<div class="sidebar__section">' + grupo.seccion + '</div>';
        grupo.items.forEach(function (item) {
          var activo = paginaActiva === item.id ? ' is-active' : '';
          var ariaCurrent = paginaActiva === item.id ? ' aria-current="page"' : '';
          html += '<a class="sidebar__item' + activo + '"'
                + ariaCurrent
                + ' href="' + self.vistaAdmin(item.href) + '">';
          html += '  <i data-lucide="' + item.icon + '" class="sidebar__item-icon icon"></i>';
          html += '  <span>' + item.label + '</span>';
          html += '</a>';
        });
      });
      html += '</nav>';

      // Pie (usuario + cerrar sesión)
      html += '<div class="sidebar__foot">';
      html += '  <div class="sidebar__user" id="sidebar-user">';
      html += '    <span class="sidebar__user-avatar" id="sidebar-avatar">·</span>';
      html += '    <div class="sidebar__user-info">';
      html += '      <span class="sidebar__user-name" id="sidebar-nombre">Cargando...</span>';
      html += '      <span class="sidebar__user-role" id="sidebar-rol"></span>';
      html += '    </div>';
      html += '  </div>';
      html += '  <button type="button" class="sidebar__logout" id="btn-sidebar-logout">';
      html += '    <i data-lucide="log-out" class="sidebar__item-icon icon"></i>';
      html += '    <span>Cerrar sesión</span>';
      html += '  </button>';
      html += '</div>';

      sidebar.innerHTML = html;

      // Overlay (móvil)
      var overlay = document.getElementById('sidebar-overlay');
      if (overlay) {
        overlay.addEventListener('click', function () {
          sidebar.classList.remove('is-open');
          overlay.style.display = 'none';
        });
      }

      // Botón cerrar sesión
      var btnLogout = document.getElementById('btn-sidebar-logout');
      if (btnLogout) {
        btnLogout.addEventListener('click', function () {
          App.confirmar({
            titulo: '¿Cerrar sesión?',
            texto: 'Vas a salir del panel administrativo de Clementina.',
            confirmar: 'Cerrar sesión',
            tipo: 'danger'
          }).then(function (ok) {
            if (!ok) { return; }
            fetch(App.controlador('cerrar_sesion.php'), { method: 'POST' })
              .catch(function () { /* no importa el resultado */ })
              .finally(function () {
                window.location.href = self.urlLogin();
              });
          });
        });
      }
    },

    _pintarUsuarioSidebar: function (usuario) {
      var nombre = ((usuario.nombre || '') + ' ' + (usuario.apellido || '')).trim();
      var rol    = usuario.rol || 'personal';

      var elNombre = document.getElementById('sidebar-nombre');
      var elRol    = document.getElementById('sidebar-rol');
      var elAvatar = document.getElementById('sidebar-avatar');
      var elBadge  = document.getElementById('sidebar-role-badge');

      if (elNombre) { elNombre.textContent = nombre || 'Personal'; }
      if (elRol)    { elRol.textContent    = this._nombreRolAdmin(rol); }
      if (elAvatar) { elAvatar.textContent = this._iniciales(nombre); }
      if (elBadge)  { elBadge.textContent  = this._nombreRolAdmin(rol); }
    },

    _nombreRolAdmin: function (rol) {
      var roles = {
        'preceptor':  'Preceptor/a',
        'directivo':  'Directivo/a',
        'secretaria': 'Secretaría',
        'personal':   'Personal',
      };
      return roles[rol] || 'Personal';
    },

    _iniciales: function (nombre) {
      var partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
      if (!partes.length) { return '·'; }
      var a = partes[0].charAt(0);
      var b = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
      return (a + b).toUpperCase();
    },

    /* ================================================================ */
    /* Topbar del panel admin                                            */
    /* ================================================================ */

    _montarTopbarAdmin: function (titulo, subtitulo) {
      var topbar = document.getElementById('admin-topbar');
      if (!topbar) { return; }

      var self = this;
      var html = '';
      html += '<button type="button" class="admin-topbar__toggle" id="btn-sidebar-toggle" aria-label="Abrir menú">';
      html += '  <i data-lucide="menu" class="icon"></i>';
      html += '</button>';
      html += '<div class="admin-topbar__heading">';
      html += '  <div class="admin-topbar__title" id="topbar-titulo">' + titulo + '</div>';
      if (subtitulo) {
        html += '  <div class="admin-topbar__sub">' + subtitulo + '</div>';
      }
      html += '</div>';
      html += '<div class="admin-topbar__actions">';
      html += '  <button type="button" class="btn btn--ghost btn--icon" id="btn-tema-admin" title="Cambiar tema">';
      html += '  </button>';
      html += '</div>';

      topbar.innerHTML = html;

      // Botón de tema
      var btnTema = document.getElementById('btn-tema-admin');
      if (btnTema) {
        this._pintarBotonTemaAdmin(btnTema);
        btnTema.addEventListener('click', function () {
          App.cambiarTema();
          self._pintarBotonTemaAdmin(btnTema);
        });
      }
    },

    _pintarBotonTemaAdmin: function (boton) {
      if (!boton) { return; }
      var oscuro = App.tema() === 'dark';
      boton.innerHTML = '<i data-lucide="' + (oscuro ? 'sun' : 'moon') + '" class="icon"></i>';
      boton.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo noche');
      App.iconos(boton);
    },

    /* ================================================================ */
    /* Toggle del sidebar en móvil                                       */
    /* ================================================================ */

    _conectarToggleMobil: function () {
      var btn     = document.getElementById('btn-sidebar-toggle');
      var sidebar = document.getElementById('sidebar');
      var overlay = document.getElementById('sidebar-overlay');
      if (!btn || !sidebar) { return; }

      btn.addEventListener('click', function () {
        var abierto = sidebar.classList.toggle('is-open');
        if (overlay) { overlay.style.display = abierto ? 'block' : 'none'; }
      });
    },

  };

  window.AppAdmin = AppAdmin;

})();
