(function () {
  'use strict';

  function apiUrl(recurso) {
    return window.AppAdmin ? AppAdmin.controladorAdmin(recurso) : '../controlador/' + recurso;
  }

  var inputDoc = document.getElementById('buscar-docente');
  var inputMat = document.getElementById('buscar-materia');
  var resDoc = document.getElementById('resultados-docente');
  var resMat = document.getElementById('resultados-materia');
  var selDocTexto = document.getElementById('seleccion-docente');
  var selMatTexto = document.getElementById('seleccion-materia');
  var btnCrear = document.getElementById('btn-crear');
  var msg = document.getElementById('msg-asig');
  var tituloAsig = document.getElementById('titulo-asig');
  var subtituloAsig = document.getElementById('subtitulo-asig');
  var estadoAsig = document.getElementById('estado-asig');
  var estadoTitulo = document.getElementById('estado-titulo');
  var estadoTexto = document.getElementById('estado-texto');
  var tablaAsig = document.getElementById('tabla-asig');
  var tbody = document.getElementById('tbody-asig');

  var docenteSel = null;
  var materiaSel = null;
  var controladores = { docente: null, materia: null, asignaciones: null };

  function esc(texto) {
    return String(texto == null ? '' : texto);
  }

  function nombreDocente(d) {
    return esc(d.apellidos) + ', ' + esc(d.nombres);
  }

  function nombreMateria(c) {
    return esc(c.nombre_carrera_corto || c.nombre_carrera) + ' — ' + esc(c.nombre_materia)
      + ' (A' + esc(c.anio_cursada) + ')';
  }

  function ocultarResultados(cual) {
    (cual === 'docente' ? resDoc : resMat).hidden = true;
  }

  function mostrarVacio(contenedor, texto) {
    contenedor.textContent = '';
    var p = document.createElement('div');
    p.className = 'buscar-vacio';
    p.textContent = texto;
    contenedor.appendChild(p);
    contenedor.hidden = false;
  }

  function pintarOpciones(contenedor, filas, etiqueta, alElegir) {
    contenedor.textContent = '';
    if (!filas.length) {
      mostrarVacio(contenedor, 'Sin coincidencias.');
      return;
    }
    filas.forEach(function (fila) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'buscar-opcion';
      btn.textContent = etiqueta(fila);
      var detalle = document.createElement('small');
      detalle.textContent = fila.detalle || '';
      btn.appendChild(detalle);
      btn.addEventListener('click', function () { alElegir(fila); });
      contenedor.appendChild(btn);
    });
    contenedor.hidden = false;
  }

  function buscar(tipo, input, contenedor, accion, campo, alElegir) {
    var texto = input.value.trim();
    if (controladores[tipo]) {
      controladores[tipo].abort();
      controladores[tipo] = null;
    }
    if (texto.length < 2) {
      contenedor.hidden = true;
      return;
    }
    var control = typeof AbortController !== 'undefined' ? new AbortController() : null;
    controladores[tipo] = control;
    var url = apiUrl('docentes_asignaciones.php') + '?accion=' + accion + '&q=' + encodeURIComponent(texto);
    fetch(url, { credentials: 'same-origin', signal: control ? control.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (controladores[tipo] !== control) { return; }
        controladores[tipo] = null;
        if (!data.ok) {
          mostrarVacio(contenedor, data.mensaje || 'Error en la búsqueda.');
          return;
        }
        var filas = (data[campo] || []).map(function (f) {
          f.detalle = tipo === 'docente' ? f.usuario_sistema : (f.nombre_carrera || '');
          return f;
        });
        pintarOpciones(contenedor, filas, tipo === 'docente' ? nombreDocente : nombreMateria, alElegir);
      })
      .catch(function (e) {
        if (e && e.name === 'AbortError') { return; }
        controladores[tipo] = null;
        mostrarVacio(contenedor, 'No se pudo buscar. Intentá nuevamente.');
      });
  }

  function actualizarBoton() {
    btnCrear.disabled = !(docenteSel && materiaSel);
  }

  function estado(cargando, titulo, texto) {
    estadoAsig.hidden = false;
    tablaAsig.hidden = true;
    estadoTitulo.textContent = titulo;
    estadoTexto.textContent = cargando ? '' : texto;
  }

  function limpiarAsignaciones() {
    if (controladores.asignaciones) {
      controladores.asignaciones.abort();
      controladores.asignaciones = null;
    }
    tituloAsig.textContent = 'Materias asignadas';
    subtituloAsig.textContent = 'Seleccioná un docente para ver sus asignaciones.';
    estado(false, 'Sin docente seleccionado', 'Buscá un docente arriba para ver sus carreras y materias asignadas.');
  }

  function cargarAsignaciones() {
    if (!docenteSel) { limpiarAsignaciones(); return; }
    if (controladores.asignaciones) { controladores.asignaciones.abort(); }
    var control = typeof AbortController !== 'undefined' ? new AbortController() : null;
    controladores.asignaciones = control;
    tituloAsig.textContent = 'Materias asignadas de ' + nombreDocente(docenteSel);
    subtituloAsig.textContent = 'Solo se cargan las asignaciones del docente seleccionado.';
    estado(true, 'Cargando asignaciones…', '');

    var url = apiUrl('docentes_asignaciones.php')
      + '?accion=asignaciones&id_personal=' + encodeURIComponent(docenteSel.id_personal);
    fetch(url, { credentials: 'same-origin', signal: control ? control.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (controladores.asignaciones !== control) { return; }
        controladores.asignaciones = null;
        if (!data.ok) {
          estado(false, 'No se pudieron cargar las asignaciones', data.mensaje || 'Intentá nuevamente.');
          return;
        }
        var filas = data.asignaciones || [];
        if (!filas.length) {
          estado(false, 'Sin materias asignadas', 'Este docente todavía no tiene carreras ni materias asignadas.');
          return;
        }
        tbody.textContent = '';
        filas.forEach(function (a) {
          var tr = document.createElement('tr');
          [esc(a.nombre_carrera_corto || a.nombre_carrera), esc(a.nombre_materia), esc(a.anio_cursada)]
            .forEach(function (valor) {
              var td = document.createElement('td');
              td.textContent = valor;
              tr.appendChild(td);
            });
          var tdAccion = document.createElement('td');
          tdAccion.className = 'col-actions';
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn--ghost btn--sm btn-del';
          btn.textContent = 'Quitar';
          btn.setAttribute('data-id', String(a.id_asignacion));
          tdAccion.appendChild(btn);
          tr.appendChild(tdAccion);
          tbody.appendChild(tr);
        });
        estadoAsig.hidden = true;
        tablaAsig.hidden = false;
      })
      .catch(function (e) {
        if (e && e.name === 'AbortError') { return; }
        controladores.asignaciones = null;
        estado(false, 'Error de red', 'No se pudieron cargar las asignaciones.');
      });
  }

  function elegirDocente(d) {
    docenteSel = d;
    inputDoc.value = nombreDocente(d);
    selDocTexto.textContent = 'Seleccionado: ' + nombreDocente(d) + ' (' + esc(d.usuario_sistema) + ')';
    ocultarResultados('docente');
    actualizarBoton();
    cargarAsignaciones();
  }

  function elegirMateria(c) {
    materiaSel = c;
    inputMat.value = nombreMateria(c);
    selMatTexto.textContent = 'Seleccionada: ' + nombreMateria(c);
    ocultarResultados('materia');
    actualizarBoton();
  }

  function conectarBuscador(tipo, input, contenedor, accion, campo, alElegir, alLimpiar) {
    var timer;
    input.addEventListener('input', function () {
      alLimpiar();
      clearTimeout(timer);
      timer = setTimeout(function () {
        buscar(tipo, input, contenedor, accion, campo, alElegir);
      }, 350);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { contenedor.hidden = true; }
    });
  }

  conectarBuscador('docente', inputDoc, resDoc, 'buscar_docentes', 'docentes', elegirDocente, function () {
    if (!docenteSel) { return; }
    docenteSel = null;
    selDocTexto.textContent = 'Buscá y elegí un docente.';
    actualizarBoton();
    limpiarAsignaciones();
  });

  conectarBuscador('materia', inputMat, resMat, 'buscar_materias', 'carreras_materias', elegirMateria, function () {
    if (!materiaSel) { return; }
    materiaSel = null;
    selMatTexto.textContent = 'Buscá y elegí una materia.';
    actualizarBoton();
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.buscador')) {
      ocultarResultados('docente');
      ocultarResultados('materia');
    }
  });

  tbody.addEventListener('click', async function (e) {
    var btn = e.target.closest('.btn-del');
    if (!btn) { return; }
    if (!confirm('¿Quitar esta asignación?')) { return; }
    var fd = new FormData();
    fd.append('accion', 'eliminar');
    fd.append('id_asignacion', btn.getAttribute('data-id'));
    try {
      var r = await fetch(apiUrl('docentes_asignaciones.php'), { method: 'POST', body: fd, credentials: 'same-origin' });
      var j = await r.json();
      msg.textContent = j.mensaje || '';
      if (j.ok) { cargarAsignaciones(); }
    } catch (err) {
      msg.textContent = 'Error de red.';
    }
  });

  btnCrear.addEventListener('click', async function () {
    if (!docenteSel || !materiaSel) { return; }
    var fd = new FormData();
    fd.append('accion', 'crear');
    fd.append('id_personal', docenteSel.id_personal);
    fd.append('id_carrera', materiaSel.id_carrera);
    fd.append('id_materia', materiaSel.id_materia);
    btnCrear.disabled = true;
    try {
      var r = await fetch(apiUrl('docentes_asignaciones.php'), { method: 'POST', body: fd, credentials: 'same-origin' });
      var j = await r.json();
      msg.textContent = j.mensaje || '';
      if (j.ok) {
        inputMat.value = '';
        materiaSel = null;
        selMatTexto.textContent = 'Buscá y elegí una materia.';
        cargarAsignaciones();
      }
    } catch (err) {
      msg.textContent = 'Error de red.';
    } finally {
      actualizarBoton();
    }
  });

  limpiarAsignaciones();
})();
