/**
 * app.js - Utilidades compartidas del sistema (sesión y rutas).
 *
 * Se calcula la ruta base a partir de la URL de este mismo script, así
 * funciona igual desde index.html (raíz) y desde las páginas de vista/.
 */
(function () {
  'use strict';

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
    }
  };

  window.App = App;
})();