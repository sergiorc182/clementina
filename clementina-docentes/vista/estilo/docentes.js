(function () {
  'use strict';

  function apiUrl(ruta) {
    var base = window.location.pathname.replace(/\/[^/]*$/, '/');
    return base + 'controlador/' + ruta;
  }

  var selCarrera = document.getElementById('sel-carrera');
  var selMateria = document.getElementById('sel-materia');
  var selAnio = document.getElementById('sel-anio');
  var buscarAlumno = document.getElementById('buscar-alumno');
  var tbody = document.getElementById('tbody-alumnos');
  var subtabla = document.getElementById('subtabla');
  var materiasMap = {};
  var aniosMap = {};

  async function cargarSesion() {
    try {
      var res = await fetch(apiUrl('verificar_sesion.php'), { credentials: 'same-origin' });
      var data = await res.json();
      if (!data.ok) {
        window.location.href = '../vista/login.html';
        return null;
      }
      document.getElementById('docente-nombre').textContent = data.usuario.nombre_completo || 'Docente';
      return data.usuario;
    } catch (e) {
      window.location.href = '../vista/login.html';
      return null;
    }
  }

  function llenarMaterias(idCarrera) {
    selMateria.innerHTML = '';
    var list = materiasMap[String(idCarrera)] && materiasMap[String(idCarrera)].materias ? materiasMap[String(idCarrera)].materias : [];
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = list.length ? 'Seleccionar...' : 'Sin materias';
    selMateria.appendChild(opt0);
      list.forEach(function (m) {
        var o = document.createElement('option');
        o.value = String(m.id_materia);
        o.textContent = m.nombre_materia + ' (Año ' + m.anio_cursada + ')';
        selMateria.appendChild(o);
      });
      llenarAnios(idCarrera);
    }

    function llenarAnios(idCarrera) {
      var lista = aniosMap[String(idCarrera)] || [];
      selAnio.innerHTML = '';
      var todos = document.createElement('option');
      todos.value = '';
      todos.textContent = 'Todos los años';
      selAnio.appendChild(todos);
      lista.forEach(function (anio) {
        var o = document.createElement('option');
        o.value = String(anio);
        o.textContent = String(anio);
        selAnio.appendChild(o);
      });
    }


  async function cargarCatalogo() {
    try {
      var res = await fetch(apiUrl('mis_alumnos.php?catalogo=1'), { credentials: 'same-origin' });
      var data = await res.json();
      if (!data.ok || !data.carreras) {
        subtabla.textContent = (data && data.mensaje) ? data.mensaje : 'Sin asignaciones.';
        return;
      }
      materiasMap = {};
      (data.materias_por_carrera || []).forEach(function (c) {
        materiasMap[String(c.id_carrera)] = c;
      });
      aniosMap = data.anios_por_carrera || {};
      selCarrera.innerHTML = '';
      var opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = 'Seleccionar...';
      selCarrera.appendChild(opt0);
      var seen2 = {};
      (data.carreras || []).forEach(function (c) {
        var k = String(c.id_carrera);
        if (seen2[k]) return;
        seen2[k] = true;
        var o = document.createElement('option');
        o.value = k;
        o.textContent = c.nombre_carrera_corto || c.nombre_carrera;
        selCarrera.appendChild(o);
      });
      selCarrera.addEventListener('change', function () {
        llenarMaterias(selCarrera.value);
      });
      if (selCarrera.options.length > 1) {
        selCarrera.selectedIndex = 1;
        llenarMaterias(selCarrera.value);
      } else {
        subtabla.textContent = 'No tenés materias asignadas. El preceptor debe asignarte en “Asignaciones docentes”.';
      }
    } catch (e) {
      console.error(e);
    }
  }

  function estadoNota(nota, tipo) {
    var n = parseInt(nota, 10);
    if (isNaN(n)) { n = 0; }
    var t = String(tipo || '').trim().toUpperCase();
    if (n >= 4) { return t === 'P' ? 'Promocionada' : 'Aprobada'; }
    if (n > 0) { return 'Desaprobada'; }
    if (t === 'R') { return 'Regular'; }
    if (t === 'L') { return 'Libre'; }
    return 'En curso';
  }

  function celda(texto) {
    var td = document.createElement('td');
    td.textContent = texto;
    return td;
  }

  async function guardarNota(alumno, fila) {
    var inputNota = fila.querySelector('.nota-input');
    var inputCond = fila.querySelector('.cond-input');
    var boton = fila.querySelector('.btn-guardar');
    var nota = String(inputNota.value || '').trim();
    if (nota === '') {
      alert('Ingresá una nota.');
      return;
    }
    boton.disabled = true;
    boton.textContent = 'Guardando...';
    try {
      var cuerpo = new URLSearchParams();
      cuerpo.append('id_alumno', String(alumno.id_alumno));
      cuerpo.append('id_carrera', String(selCarrera.value));
      cuerpo.append('id_materia', String(selMateria.value));
      cuerpo.append('nota', nota);
      cuerpo.append('tipo_alumno', inputCond.value);
      var res = await fetch(apiUrl('guardar_nota.php'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: cuerpo.toString()
      });
      var data = await res.json();
      if (!data.ok) {
        alert(data.mensaje || 'No se pudo guardar la nota.');
        return;
      }
      subtabla.textContent = 'Nota guardada para ' + (alumno.apellido || '') + ', ' + (alumno.nombre || '') + '.';
      await cargarAlumnos();
    } catch (e) {
      alert('No se pudo guardar la nota.');
    } finally {
      boton.disabled = false;
      boton.textContent = 'Guardar';
    }
  }

  async function cargarAlumnos() {
    var idc = selCarrera.value;
    var idm = selMateria.value;
    if (!idc || !idm) {
      alert('Seleccioná carrera y materia.');
      return;
    }
    subtabla.textContent = 'Cargando...';
    tbody.innerHTML = '';
    try {
      var url = apiUrl('mis_alumnos.php?id_carrera=' + encodeURIComponent(idc)
        + '&id_materia=' + encodeURIComponent(idm)
        + '&anio=' + encodeURIComponent(selAnio.value)
        + '&q=' + encodeURIComponent(buscarAlumno.value.trim()));
      var res = await fetch(url, { credentials: 'same-origin' });
      var data = await res.json();
      if (!data.ok) {
        subtabla.textContent = data.mensaje || 'Error';
        return;
      }
      var rows = data.alumnos || [];
      subtabla.textContent = rows.length + ' alumno(s)';
      rows.forEach(function (a) {
        var tr = document.createElement('tr');
        tr.dataset.idAlumno = String(a.id_alumno);
        tr.appendChild(celda((a.apellido || '') + ', ' + (a.nombre || '')));
        tr.appendChild(celda(a.legajo || '—'));
        tr.appendChild(celda(a.anio_inscripcion ? String(a.anio_inscripcion) : '—'));

        var tdNota = document.createElement('td');
        var inputNota = document.createElement('input');
        inputNota.type = 'number';
        inputNota.min = '0';
        inputNota.max = '10';
        inputNota.step = '1';
        inputNota.className = 'input nota-input';
        inputNota.setAttribute('aria-label', 'Nota de ' + (a.nombre || 'alumno'));
        inputNota.value = (a.nota !== null && a.nota !== undefined) ? String(a.nota) : '';
        inputNota.placeholder = '—';
        tdNota.appendChild(inputNota);
        tr.appendChild(tdNota);

        var tdCond = document.createElement('td');
        var inputCond = document.createElement('select');
        inputCond.className = 'input cond-input';
        inputCond.setAttribute('aria-label', 'Condición de ' + (a.nombre || 'alumno'));
        [['X', 'Sin condición'], ['R', 'Regular'], ['P', 'Promocionado'], ['L', 'Libre']].forEach(function (op) {
          var option = document.createElement('option');
          option.value = op[0];
          option.textContent = op[1];
          inputCond.appendChild(option);
        });
        var condActual = String(a.tipo_alumno || '').trim().toUpperCase();
        if (['P', 'R', 'L', 'X'].indexOf(condActual) === -1) { condActual = 'X'; }
        inputCond.value = condActual;
        tdCond.appendChild(inputCond);
        tr.appendChild(tdCond);

        tr.appendChild(celda(estadoNota(a.nota, condActual)));

        var tomo = parseInt(a.tomo_acta, 10);
        var folio = parseInt(a.folio_acta, 10);
        var acta = (tomo > 0 && folio > 0) ? ('T. ' + tomo + ' / F. ' + folio) : '—';
        tr.appendChild(celda(acta));

        var tdAccion = document.createElement('td');
        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'btn btn--primary btn--sm btn-guardar';
        boton.textContent = 'Guardar';
        boton.addEventListener('click', function () { guardarNota(a, tr); });
        tdAccion.appendChild(boton);
        tr.appendChild(tdAccion);

        tbody.appendChild(tr);
      });
    } catch (e) {
      subtabla.textContent = 'Error de red';
    }
  }

  document.getElementById('btn-cargar').addEventListener('click', cargarAlumnos);

  buscarAlumno.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      cargarAlumnos();
    }
  });

  (async function init() {
    var u = await cargarSesion();
    if (!u) return;
    await cargarCatalogo();
  })();
})();
