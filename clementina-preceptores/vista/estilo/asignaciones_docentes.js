(function () {
  'use strict';
  function apiUrl(r) { return '../controlador/' + r; }
  var selDoc = document.getElementById('sel-docente');
  var selCm = document.getElementById('sel-cm');
  var tbody = document.getElementById('tbody-asig');
  var msg = document.getElementById('msg-asig');

  async function cargar() {
    msg.textContent = '';
    try {
      var res = await fetch(apiUrl('docentes_asignaciones.php'), { credentials: 'same-origin' });
      var data = await res.json();
      if (!data.ok) { msg.textContent = data.mensaje || 'Error'; return; }
      selDoc.innerHTML = '<option value="">Seleccionar...</option>';
      (data.docentes || []).forEach(function (d) {
        var o = document.createElement('option');
        o.value = String(d.id_personal);
        o.textContent = (d.apellidos || '') + ', ' + (d.nombres || '') + ' (' + (d.usuario_sistema || '') + ')';
        selDoc.appendChild(o);
      });
      selCm.innerHTML = '<option value="">Seleccionar...</option>';
      (data.carreras_materias || []).forEach(function (cm) {
        var o = document.createElement('option');
        o.value = cm.id_carrera + '|' + cm.id_materia;
        o.textContent = (cm.nombre_carrera_corto || cm.nombre_carrera) + ' — ' + cm.nombre_materia + ' (A' + cm.anio_cursada + ')';
        selCm.appendChild(o);
      });
      tbody.innerHTML = '';
      (data.asignaciones || []).forEach(function (a) {
        var tr = document.createElement('tr');
        [(a.apellidos || '') + ', ' + (a.nombres || ''),
         a.nombre_carrera_corto || a.nombre_carrera || '',
         a.nombre_materia || ''].forEach(function (valor) {
          var td = document.createElement('td');
          td.textContent = valor;
          tr.appendChild(td);
        });
        var tdAccion = document.createElement('td');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--ghost btn--sm btn-del';
        btn.textContent = 'Quitar';
        btn.setAttribute('data-id', String(a.id_asignacion));
        tdAccion.appendChild(btn);
        tr.appendChild(tdAccion);
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.btn-del').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('¿Quitar esta asignación?')) return;
          var fd = new FormData();
          fd.append('accion', 'eliminar');
          fd.append('id_asignacion', btn.getAttribute('data-id'));
          var r = await fetch(apiUrl('docentes_asignaciones.php'), { method: 'POST', body: fd, credentials: 'same-origin' });
          var j = await r.json();
          alert(j.mensaje || (j.ok ? 'OK' : 'Error'));
          cargar();
        });
      });
    } catch (e) {
      msg.textContent = 'Error de red.';
    }
  }

  document.getElementById('btn-crear').addEventListener('click', async function () {
    var idp = selDoc.value;
    var v = selCm.value;
    if (!idp || !v) { alert('Completá docente y carrera/materia.'); return; }
    var parts = v.split('|');
    var fd = new FormData();
    fd.append('accion', 'crear');
    fd.append('id_personal', idp);
    fd.append('id_carrera', parts[0]);
    fd.append('id_materia', parts[1]);
    var r = await fetch(apiUrl('docentes_asignaciones.php'), { method: 'POST', body: fd, credentials: 'same-origin' });
    var j = await r.json();
    alert(j.mensaje || (j.ok ? 'OK' : 'Error'));
    if (j.ok) cargar();
  });

  cargar();
})();
