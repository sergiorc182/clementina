/**
 * inscripciones.js — Inscripciones a finales (panel de preceptores).
 *
 * Monta el shell del panel y carga el listado de inscripciones con
 * búsqueda por texto, filtro de estado, paginación y acciones de gestión
 * (cancelar, reactivar y eliminar).
 */
(function () {
  'use strict';

  var paginaActual = 1;
  var busquedaActual = '';
  var estadoActual = '';
  var timer = null;

  AppAdmin.montarAdmin({ titulo: 'Inscripciones a finales', subtitulo: 'Listado general' })
    .then(function (usuario) {
      if (!usuario) { return; }
      conectarFiltros();
      cargar(1);
    });

  function conectarFiltros() {
    var input  = document.getElementById('input-busqueda');
    var estado = document.getElementById('filtro-estado');

    document.getElementById('tabla-body').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-accion]');
      if (!btn) { return; }

      var id = parseInt(btn.dataset.id, 10);
      if (btn.dataset.accion === 'cancelar') {
        cambiarEstado(id, 'C', btn);
      } else if (btn.dataset.accion === 'reactivar') {
        cambiarEstado(id, 'A', btn);
      } else if (btn.dataset.accion === 'eliminar') {
        eliminar(id, btn);
      }
    });

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { cargar(1, input.value.trim()); }, 450);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        clearTimeout(timer);
        cargar(1, input.value.trim());
      }
    });
    estado.addEventListener('change', function () {
      cargar(1, input.value.trim(), estado.value);
    });
  }

  function cargar(pagina, busqueda, estado) {
    paginaActual   = pagina     || 1;
    busquedaActual = busqueda !== undefined ? busqueda : busquedaActual;
    estadoActual   = estado    !== undefined ? estado    : estadoActual;

    var tbody = document.getElementById('tabla-body');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-2); padding:var(--sp-8);">Cargando inscripciones…</td></tr>';

    var params = '?pagina=' + paginaActual;
    if (busquedaActual) { params += '&q=' + encodeURIComponent(busquedaActual); }
    if (estadoActual)   { params += '&estado=' + encodeURIComponent(estadoActual); }

    fetch(AppAdmin.controladorAdmin('inscripciones.php') + params)
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) {
          App.toast({ tipo: 'error', titulo: 'Error', texto: res.mensaje || 'No se pudieron cargar las inscripciones.' });
          pintarVacio();
          return;
        }
        var inscripciones = Array.isArray(res.inscripciones) ? res.inscripciones : [];
        if (!inscripciones.length) { pintarVacio(); pintarPaginacion(res); return; }
        pintarTabla(inscripciones);
        pintarPaginacion(res);
      })
      .catch(function () {
        App.toast({ tipo: 'error', titulo: 'Error de red', texto: 'No se pudo conectar con el servidor.' });
        pintarVacio();
      });
  }

  function pintarVacio() {
    document.getElementById('tabla-body').innerHTML =
      '<tr><td colspan="8" style="text-align:center; color:var(--text-2); padding:var(--sp-8);">' +
      'No hay inscripciones con ese criterio.</td></tr>';
    document.getElementById('paginacion').innerHTML = '';
    document.getElementById('total-info').textContent = '';
  }

  function pintarTabla(inscripciones) {
    document.getElementById('tabla-body').innerHTML = inscripciones.map(function (i) {
      var activa = i.estado === 'A';
      return '<tr>' +
        '<td class="col-main" data-label="Alumno"><strong>' + esc(i.alumno) + '</strong></td>' +
        '<td data-label="Materia">' + esc(i.materia) + '</td>' +
        '<td data-label="Carrera">' + esc(i.carrera) + '</td>' +
        '<td data-label="Turno">' + esc(i.turno) + '</td>' +
        '<td data-label="Año" class="num">' + esc(i.anio) + '</td>' +
        '<td data-label="Fecha inscripción">' + fmtFechaHora(i.fecha_hora) + '</td>' +
        '<td data-label="Estado"><span class="badge ' + (activa ? 'badge--success' : 'badge--warning') + '">' +
          (activa ? 'Activa' : 'Cancelada') + '</span></td>' +
        '<td class="col-actions" data-label="Acciones">' +
          (activa
            ? '<button type="button" class="btn btn--outline btn--sm" data-accion="cancelar" data-id="' + i.id_inscripcion + '">Cancelar</button> '
            : '<button type="button" class="btn btn--outline btn--sm" data-accion="reactivar" data-id="' + i.id_inscripcion + '">Reactivar</button> ') +
          '<button type="button" class="btn btn--ghost btn--sm" data-accion="eliminar" data-id="' + i.id_inscripcion + '">Eliminar</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function cambiarEstado(id, estado, btn) {
    var cancelar = estado === 'C';

    App.confirmar({
      tipo: cancelar ? 'danger' : 'primary',
      titulo: cancelar ? 'Cancelar inscripción' : 'Reactivar inscripción',
      texto: cancelar
        ? '¿Cancelar esta inscripción a la mesa de examen?'
        : '¿Reactivar esta inscripción a la mesa de examen?',
      confirmar: cancelar ? 'Sí, cancelar' : 'Sí, reactivar'
    }).then(function (confirmado) {
      if (!confirmado) { return; }

      var datos = new URLSearchParams();
      datos.append('accion', 'cambiar_estado');
      datos.append('id_inscripcion', id);
      datos.append('estado', estado);

      enviarAccion(datos, btn, 'No se pudo actualizar la inscripción.');
    });
  }

  function eliminar(id, btn) {
    App.confirmar({
      tipo: 'danger',
      titulo: 'Eliminar inscripción',
      texto: '¿Eliminar definitivamente esta inscripción? Esta acción no se puede deshacer.',
      confirmar: 'Sí, eliminar'
    }).then(function (confirmado) {
      if (!confirmado) { return; }

      var datos = new URLSearchParams();
      datos.append('accion', 'eliminar');
      datos.append('id_inscripcion', id);

      enviarAccion(datos, btn, 'No se pudo eliminar la inscripción.');
    });
  }

  function enviarAccion(datos, btn, mensajeError) {
    if (btn) { btn.disabled = true; }

    fetch(AppAdmin.controladorAdmin('inscripciones.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: datos.toString()
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) {
          App.toast({ tipo: 'error', titulo: 'Acción no realizada', texto: res.mensaje || mensajeError });
          if (btn) { btn.disabled = false; }
          return;
        }
        App.toast({ tipo: 'success', titulo: 'Inscripciones', texto: res.mensaje || 'Acción realizada.' });
        cargar(paginaActual);
      })
      .catch(function () {
        App.toast({ tipo: 'error', titulo: 'Error de red', texto: 'No se pudo conectar con el servidor.' });
        if (btn) { btn.disabled = false; }
      });
  }

  function pintarPaginacion(res) {
    var total   = res.total   || 0;
    var paginas = res.paginas || 1;

    document.getElementById('total-info').textContent =
      total + ' inscripción' + (total !== 1 ? 'es' : '') + ' · Pág. ' + (res.pagina || paginaActual) + ' / ' + paginas;

    var pag = document.getElementById('paginacion');
    if (paginas <= 1) { pag.innerHTML = ''; return; }

    var html = '';
    html += '<button type="button" class="btn btn--outline btn--sm" id="pag-anterior" ' + (paginaActual <= 1 ? 'disabled' : '') + '>Anterior</button>';
    html += '<button type="button" class="btn btn--outline btn--sm" id="pag-siguiente" ' + (paginaActual >= paginas ? 'disabled' : '') + '>Siguiente</button>';
    pag.innerHTML = html;

    var btnAnt = document.getElementById('pag-anterior');
    var btnSig = document.getElementById('pag-siguiente');
    if (btnAnt) { btnAnt.addEventListener('click', function () { cargar(paginaActual - 1); }); }
    if (btnSig) { btnSig.addEventListener('click', function () { cargar(paginaActual + 1); }); }
  }

  function fmtFechaHora(valor) {
    if (!valor) { return '—'; }
    var p = String(valor).substring(0, 10).split('-');
    return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : valor;
  }

  function esc(txt) {
    return String(txt == null ? '' : txt)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

})();
