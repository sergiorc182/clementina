(function () {
  'use strict';

  function apiUrl(ruta) {
    return App.raiz() + '/clementina-docentes/controlador/' + ruta;
  }

  var selCarrera = document.getElementById('sel-carrera');
  var selMateria = document.getElementById('sel-materia');
  var tbody = document.getElementById('tbody-alumnos');
  var subtabla = document.getElementById('subtabla');
  var materiasMap = {};

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
      var url = apiUrl('mis_alumnos.php?id_carrera=' + encodeURIComponent(idc) + '&id_materia=' + encodeURIComponent(idm));
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
        var nota = a.nota != null && String(a.nota) !== '0' ? String(a.nota) : (a.nota === '0' || a.nota === 0 ? '0' : '—');
        var tipo = (a.tipo_alumno || '').trim() || '—';
        var promo = (parseInt(a.nota, 10) >= 4 && tipo.toUpperCase() === 'P') ? 'Sí' : (parseInt(a.nota, 10) >= 4 ? 'No (aprobado)' : '—');
        var notaFinal = (a.fecha_aprobacion && a.nota && parseInt(a.nota, 10) > 0) ? String(a.nota) : '—';
        tr.innerHTML = '<td>' + ((a.apellido || '') + ', ' + (a.nombre || '')) + '</td>' +
          '<td>' + (a.legajo || '—') + '</td>' +
          '<td>' + nota + '</td>' +
          '<td>' + tipo + '</td>' +
          '<td>' + promo + '</td>' +
          '<td>' + notaFinal + '</td>';
        tbody.appendChild(tr);
      });
    } catch (e) {
      subtabla.textContent = 'Error de red';
    }
  }

  document.getElementById('btn-cargar').addEventListener('click', cargarAlumnos);

  (async function init() {
    var u = await cargarSesion();
    if (!u) return;
    await cargarCatalogo();
  })();
})();
