/**
 * finales.js — Lógica de pantalla de "Inscripción a finales" y "Mis finales".
 *
 * Solo capa de vista: pide los datos a controlador/inscripcion_finales.php
 * y los dibuja con los componentes del estilo global (estilo.css).
 * Requiere que app.js esté cargado antes.
 */
(function () {
  'use strict';

  var ENDPOINT = App.controlador('inscripcion_finales.php');

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */

  function esc(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* "2026-11-03" -> "03/11/2026" */
  function fecha(iso) {
    var p = String(iso || '').substring(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }

  function cargar() {
    return fetch(ENDPOINT).then(function (resp) { return resp.json(); });
  }

  function enviar(datos) {
    var cuerpo = new URLSearchParams();
    Object.keys(datos).forEach(function (clave) { cuerpo.append(clave, datos[clave]); });
    return fetch(ENDPOINT, { method: 'POST', body: cuerpo })
      .then(function (resp) { return resp.json(); });
  }

  function vacio(icono, titulo, texto, accion) {
    return '<div class="empty">' +
             '<div class="empty__icon"><i data-lucide="' + icono + '"></i></div>' +
             '<p class="empty__title">' + esc(titulo) + '</p>' +
             '<p class="empty__text">' + esc(texto) + '</p>' +
             (accion ? '<div class="empty__action">' + accion + '</div>' : '') +
           '</div>';
  }

  function alerta(tipo, icono, html) {
    return '<div class="alert alert--' + tipo + '">' +
             '<i data-lucide="' + icono + '"></i>' +
             '<div class="alert__body">' + html + '</div>' +
           '</div>';
  }

  function alertaPeriodo(periodo, cantidad) {
    if (!periodo) {
      return alerta('info', 'info', 'Todavía no hay un turno de finales publicado.');
    }

    var turno = '<strong>Turno ' + esc(periodo.turno) + ' ' + esc(periodo.anio) + '</strong>';
    var rango = 'del ' + fecha(periodo.fecha_inicio) + ' al ' + fecha(periodo.fecha_fin);

    if (!periodo.abierto) {
      return alerta('warning', 'alert-triangle',
        turno + ' — la inscripción está cerrada (' + rango + ').');
    }

    var cupo = periodo.tope > 0
      ? ' Llevás ' + cantidad + ' de ' + periodo.tope + ' mesas.'
      : '';
    return alerta('success', 'check-circle-2',
      turno + ' — inscripción abierta ' + rango + '.' + cupo);
  }

  function errorDeCarga(contenedor, mensaje) {
    contenedor.innerHTML = alerta('error', 'x-circle', esc(mensaje || 'Error de red o del servidor.'));
    App.iconos(contenedor);
  }

  /* Ejecuta una acción (inscribir / cancelar) y vuelve a dibujar. */
  function ejecutar(boton, datos, redibujar) {
    boton.classList.add('is-loading');
    boton.disabled = true;

    enviar(datos)
      .then(function (resultado) {
        App.toast({
          tipo: resultado.ok ? 'success' : 'error',
          titulo: resultado.ok ? 'Listo' : 'No se pudo completar',
          texto: resultado.mensaje
        });
        return redibujar();
      })
      .catch(function () {
        App.toast({ tipo: 'error', titulo: 'Error', texto: 'Error de red o del servidor.' });
        boton.classList.remove('is-loading');
        boton.disabled = false;
      });
  }

  function cancelar(boton, redibujar) {
    App.confirmar({
      titulo: '¿Cancelar la inscripción?',
      texto: 'Vas a darte de baja de la mesa de ' + boton.getAttribute('data-nombre') + '.',
      confirmar: 'Dar de baja',
      cancelar: 'Volver',
      tipo: 'danger'
    }).then(function (ok) {
      if (!ok) { return; }
      ejecutar(boton, {
        accion: 'cancelar',
        id_carrera: boton.getAttribute('data-carrera'),
        id_materia: boton.getAttribute('data-materia')
      }, redibujar);
    });
  }

  /* Un solo bloque por celda: en móvil la tabla pasa a tarjetas (flex). */
  function celdaMateria(m) {
    return '<div><strong>' + esc(m.materia) + '</strong>' +
           '<div class="muted" style="font-size: .75rem;">' + esc(m.carrera) + '</div></div>';
  }

  function datosFila(m) {
    return ' data-carrera="' + m.id_carrera + '" data-materia="' + m.id_materia +
           '" data-nombre="' + esc(m.materia) + '"';
  }

  /* ------------------------------------------------------------------ */
  /* Inscripción a finales                                               */
  /* ------------------------------------------------------------------ */

  function filaMateria(m, datos) {
    var abierto = datos.periodo && datos.periodo.abierto;
    var estado;
    var accion = '';

    if (m.llamado !== null) {
      estado = '<span class="badge badge--success">Inscripto · ' +
               esc(datos.llamados[m.llamado] || '') + '</span>';
      if (abierto) {
        accion = '<button type="button" class="btn btn--outline btn--sm" data-accion="cancelar"' +
                 datosFila(m) + '>Cancelar</button>';
      }
    } else if (m.correlativas.length) {
      estado = '<span class="badge badge--warning" title="' + esc(m.correlativas.join(', ')) + '">' +
               'Faltan correlativas</span>' +
               '<div class="muted" style="font-size: .75rem; margin-top: 4px;">' +
               esc(m.correlativas.join(', ')) + '</div>';
    } else if (abierto) {
      var opciones = Object.keys(datos.llamados).map(function (id) {
        return '<option value="' + id + '">' + esc(datos.llamados[id]) + '</option>';
      }).join('');
      estado = '<select class="select" aria-label="Llamado para ' + esc(m.materia) + '">' +
               opciones + '</select>';
      accion = '<button type="button" class="btn btn--primary btn--sm" data-accion="inscribir"' +
               datosFila(m) + '>Inscribirme</button>';
    } else {
      estado = '<span class="badge badge--neutral">Cerrado</span>';
    }

    return '<tr>' +
             '<td data-label="Materia">' + celdaMateria(m) + '</td>' +
             '<td data-label="Año" class="num">' + esc(m.anio_cursada) + '.º</td>' +
             '<td data-label="Condición"><span class="badge badge--' +
               (m.condicion === 'Regular' ? 'info' : 'neutral') + '">' + esc(m.condicion) + '</span></td>' +
             '<td data-label="Inscripción"><div>' + estado + '</div></td>' +
             '<td class="col-actions">' + accion + '</td>' +
           '</tr>';
  }

  function iniciarInscripcion() {
    var cajaPeriodo = document.getElementById('periodo');
    var cajaMaterias = document.getElementById('materias');

    function dibujar() {
      return cargar().then(function (datos) {
        if (!datos.ok) {
          cajaPeriodo.innerHTML = '';
          errorDeCarga(cajaMaterias, datos.mensaje);
          return;
        }

        cajaPeriodo.innerHTML = alertaPeriodo(datos.periodo, datos.inscripciones.length);

        if (!datos.materias.length) {
          cajaMaterias.innerHTML = vacio('calendar-x', 'No hay materias para rendir',
            'No encontramos materias pendientes de final en tus carreras.');
        } else {
          cajaMaterias.innerHTML =
            '<div class="table-wrap table-wrap--stack"><table class="table">' +
              '<thead><tr><th>Materia</th><th>Año</th><th>Condición</th>' +
              '<th>Inscripción</th><th class="col-actions"></th></tr></thead>' +
              '<tbody>' + datos.materias.map(function (m) { return filaMateria(m, datos); }).join('') +
              '</tbody></table></div>';
        }

        App.iconos();
      }).catch(function () {
        errorDeCarga(cajaMaterias);
      });
    }

    cajaMaterias.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-accion]');
      if (!boton) { return; }

      if (boton.getAttribute('data-accion') === 'cancelar') {
        cancelar(boton, dibujar);
        return;
      }

      ejecutar(boton, {
        accion: 'inscribir',
        id_carrera: boton.getAttribute('data-carrera'),
        id_materia: boton.getAttribute('data-materia'),
        id_llamado: boton.closest('tr').querySelector('select').value
      }, dibujar);
    });

    return dibujar();
  }

  /* ------------------------------------------------------------------ */
  /* Mis finales                                                         */
  /* ------------------------------------------------------------------ */

  function iniciarMisFinales() {
    var cajaPeriodo = document.getElementById('periodo');
    var cajaLista = document.getElementById('inscripciones');

    function dibujar() {
      return cargar().then(function (datos) {
        if (!datos.ok) {
          cajaPeriodo.innerHTML = '';
          errorDeCarga(cajaLista, datos.mensaje);
          return;
        }

        var abierto = datos.periodo && datos.periodo.abierto;
        cajaPeriodo.innerHTML = alertaPeriodo(datos.periodo, datos.inscripciones.length);

        if (!datos.inscripciones.length) {
          cajaLista.innerHTML = vacio('inbox', 'Todavía no tenés inscripciones',
            'Cuando te anotes a una mesa final, vas a poder verla acá con su llamado y su estado.',
            '<a class="btn btn--outline" href="inscripcion_finales.html">' +
            '<i data-lucide="calendar-plus"></i>Ver materias disponibles</a>');
        } else {
          cajaLista.innerHTML =
            '<div class="table-wrap table-wrap--stack"><table class="table">' +
              '<thead><tr><th>Materia</th><th>Llamado</th><th>Estado</th>' +
              '<th class="col-actions"></th></tr></thead><tbody>' +
              datos.inscripciones.map(function (i) {
                return '<tr>' +
                  '<td data-label="Materia">' + celdaMateria(i) + '</td>' +
                  '<td data-label="Llamado">' + esc(i.llamado) + '</td>' +
                  '<td data-label="Estado"><span class="badge badge--success">Inscripto</span></td>' +
                  '<td class="col-actions">' +
                    (abierto
                      ? '<button type="button" class="btn btn--outline btn--sm" data-accion="cancelar"' +
                        datosFila(i) + '>Cancelar</button>'
                      : '') +
                  '</td></tr>';
              }).join('') +
              '</tbody></table></div>';
        }

        App.iconos();
      }).catch(function () {
        errorDeCarga(cajaLista);
      });
    }

    cajaLista.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-accion="cancelar"]');
      if (boton) { cancelar(boton, dibujar); }
    });

    return dibujar();
  }

  window.Finales = {
    iniciarInscripcion: iniciarInscripcion,
    iniciarMisFinales: iniciarMisFinales
  };
})();
