/**
 * configuracion.js — CRUD genérico de configuración académica.
 * ISFT 182 "Clementina"
 *
 * Entidades: materias, carrera_materias, carrera_sede_turno, turnos.
 * Acciones por registro: Ver, Editar, Copiar y Borrar.
 */
(function () {
  'use strict';

  var ENTIDADES = {
    materias: {
      titulo: 'Materias',
      subtitulo: 'Catálogo de materias de la institución.',
      singular: 'materia',
      icono: 'book-open',
      columnas: [
        { label: 'ID', key: 'id_materia', clase: 'num' },
        { label: 'Materia', key: 'nombre_materia', clase: 'col-main' }
      ],
      campos: [
        { name: 'id_materia', label: 'ID de materia', tipo: 'number', min: 1, required: true, pk: true },
        { name: 'nombre_materia', label: 'Nombre de la materia', tipo: 'text', maxlength: 100, required: true, full: true }
      ],
      pk: ['id_materia'],
      buscar: ['id_materia', 'nombre_materia'],
      limpiarPkAlCopiar: true
    },

    turnos: {
      titulo: 'Turnos',
      subtitulo: 'Turnos disponibles para la cursada.',
      singular: 'turno',
      icono: 'clock',
      columnas: [
        { label: 'ID', key: 'id_turno', clase: 'num' },
        { label: 'Turno', key: 'turno', clase: 'col-main' }
      ],
      campos: [
        { name: 'id_turno', label: 'ID de turno', tipo: 'number', min: 1, required: true, pk: true },
        { name: 'turno', label: 'Nombre del turno', tipo: 'text', maxlength: 20, required: true, full: true, placeholder: 'Ej.: Mañana, Tarde, Noche' }
      ],
      pk: ['id_turno'],
      buscar: ['id_turno', 'turno'],
      limpiarPkAlCopiar: true
    },

    carrera_materias: {
      titulo: 'Relación carreras-materias',
      subtitulo: 'Materias que componen cada carrera y su año de cursada.',
      singular: 'relación',
      icono: 'link',
      columnas: [
        { label: 'Carrera', key: 'nombre_carrera', clase: 'col-main' },
        { label: 'Materia', key: 'nombre_materia' },
        { label: 'Año', key: 'anio_cursada', clase: 'num' }
      ],
      campos: [
        { name: 'id_carrera', label: 'Carrera', tipo: 'select', opciones: 'carreras', valor: 'id_carrera', texto: 'nombre_carrera', required: true, full: true },
        { name: 'id_materia', label: 'Materia', tipo: 'select', opciones: 'materias', valor: 'id_materia', texto: 'nombre_materia', required: true, full: true },
        { name: 'anio_cursada', label: 'Año de cursada', tipo: 'number', min: 1, max: 10, required: true }
      ],
      pk: ['id_carrera', 'id_materia'],
      buscar: ['nombre_carrera', 'nombre_materia', 'anio_cursada'],
      limpiarPkAlCopiar: false
    },

    carrera_sede_turno: {
      titulo: 'Relación carreras-sedes-turnos',
      subtitulo: 'Sedes y turnos habilitados para cada carrera.',
      singular: 'relación',
      icono: 'share-2',
      columnas: [
        { label: 'Carrera', key: 'nombre_carrera', clase: 'col-main' },
        { label: 'Sede', key: 'nombre_sede' },
        { label: 'Turno', key: 'turno' }
      ],
      campos: [
        { name: 'id_carrera', label: 'Carrera', tipo: 'select', opciones: 'carreras', valor: 'id_carrera', texto: 'nombre_carrera', required: true, full: true },
        { name: 'id_sede', label: 'Sede', tipo: 'select', opciones: 'sedes', valor: 'id_sede', texto: 'nombre_sede', required: true },
        { name: 'id_turno', label: 'Turno', tipo: 'select', opciones: 'turnos', valor: 'id_turno', texto: 'turno', required: true }
      ],
      pk: ['id_carrera', 'id_sede', 'id_turno'],
      buscar: ['nombre_carrera', 'nombre_sede', 'turno'],
      limpiarPkAlCopiar: false
    }
  };

  var entidad = new URLSearchParams(window.location.search).get('entidad') || 'materias';
  if (!ENTIDADES[entidad]) { entidad = 'materias'; }

  var cfg       = ENTIDADES[entidad];
  var filas     = [];
  var opciones  = {};
  var modoActual = null;
  var filaActual = null;

  document.body.setAttribute('data-page', entidad);
  document.title = cfg.titulo + ' · Panel Administrativo · Clementina · ISFT N.º 182';

  AppAdmin.montarAdmin({ titulo: cfg.titulo, subtitulo: 'Configuración académica' })
    .then(function (usuario) {
      if (!usuario) { return; }
      prepararVista();
      conectarEventos();
      cargar();
    });

  function prepararVista() {
    document.getElementById('page-titulo').textContent = cfg.titulo;
    document.getElementById('page-texto').textContent  = cfg.subtitulo;
    document.getElementById('btn-nuevo-texto').textContent = 'Nuevo/a ' + cfg.singular;
    document.getElementById('input-busqueda').placeholder =
      'Buscar en ' + cfg.titulo.toLowerCase() + '…';

    document.getElementById('tabla-head').innerHTML =
      cfg.columnas.map(function (c) {
        return '<th' + (c.clase ? ' class="' + c.clase + '"' : '') + '>' + esc(c.label) + '</th>';
      }).join('') + '<th class="col-actions">Acciones</th>';
  }

  function conectarEventos() {
    var modal = document.getElementById('modal-config');

    document.getElementById('btn-nuevo').addEventListener('click', function () {
      abrirModal('crear', null);
    });
    document.getElementById('btn-cancelar-config').addEventListener('click', cerrarModal);
    document.getElementById('btn-guardar-config').addEventListener('click', guardar);
    document.getElementById('input-busqueda').addEventListener('input', pintarTabla);

    document.getElementById('tabla-body').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-accion]');
      if (!btn) { return; }

      var fila = buscarFila(btn.dataset);
      if (!fila) { return; }

      var accion = btn.dataset.accion;
      if (accion === 'ver')       { abrirModal('ver', fila); }
      else if (accion === 'editar')  { abrirModal('editar', fila); }
      else if (accion === 'copiar')  { abrirModal('copiar', fila); }
      else if (accion === 'eliminar'){ eliminar(fila); }
    });

    modal.addEventListener('click', function (e) {
      if (e.target === modal) { cerrarModal(); }
    });
  }

  function cargar() {
    var tbody = document.getElementById('tabla-body');
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-2); padding:var(--sp-8);">Cargando…</td></tr>';

    fetch(AppAdmin.controladorAdmin('configuracion.php') + '?entidad=' + encodeURIComponent(entidad))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) {
          tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-2); padding:var(--sp-8);">' +
            esc(res.mensaje || 'No se pudieron cargar los registros.') + '</td></tr>';
          return;
        }
        filas    = Array.isArray(res.filas) ? res.filas : [];
        opciones = res.opciones || {};
        pintarTabla();
      })
      .catch(function () {
        App.toast({ tipo: 'error', titulo: 'Error', texto: 'No se pudieron cargar los registros.' });
      });
  }

  function pintarTabla() {
    var tbody = document.getElementById('tabla-body');
    var texto = document.getElementById('input-busqueda').value.trim().toLowerCase();
    var lista = texto ? filas.filter(function (f) { return coincide(f, texto); }) : filas;

    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-2); padding:var(--sp-8);">' +
        (texto ? 'Sin resultados para la búsqueda.' : 'Sin registros cargados.') + '</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(function (f) {
      var attrs = pkAttrs(f);
      return '<tr>' +
        cfg.columnas.map(function (c) {
          return '<td' + (c.clase ? ' class="' + c.clase + '"' : '') + ' data-label="' + esc(c.label) + '">' +
            esc(f[c.key] == null ? '—' : f[c.key]) + '</td>';
        }).join('') +
        '<td class="col-actions" data-label="Acciones">' +
          accion('ver', 'Ver', 'eye', attrs) +
          accion('editar', 'Editar', 'pencil', attrs) +
          accion('copiar', 'Copiar', 'copy', attrs) +
          accion('eliminar', 'Borrar', 'trash-2', attrs) +
        '</td>' +
      '</tr>';
    }).join('');

    App.iconos(tbody);
  }

  function accion(nombre, titulo, icono, attrs) {
    return '<button type="button" class="btn btn--ghost btn--icon btn--sm" title="' + titulo +
      '" aria-label="' + titulo + '" data-accion="' + nombre + '" ' + attrs + '>' +
      '<i data-lucide="' + icono + '"></i></button> ';
  }

  function coincide(fila, texto) {
    return cfg.buscar.some(function (key) {
      return String(fila[key] == null ? '' : fila[key]).toLowerCase().indexOf(texto) !== -1;
    });
  }

  function pkAttrs(fila) {
    return cfg.pk.map(function (key) {
      return 'data-' + key.replace(/_/g, '-') + '="' + esc(fila[key]) + '"';
    }).join(' ');
  }

  function buscarFila(dataset) {
    for (var i = 0; i < filas.length; i++) {
      var ok = cfg.pk.every(function (key) {
        var dataKey = key.replace(/_([a-z])/g, function (m, l) { return l.toUpperCase(); });
        return String(filas[i][key]) === String(dataset[dataKey]);
      });
      if (ok) { return filas[i]; }
    }
    return null;
  }

  function pkDeFila(fila) {
    var pk = {};
    cfg.pk.forEach(function (key) { pk[key] = fila[key]; });
    return pk;
  }

  function abrirModal(modo, fila) {
    modoActual = modo;
    filaActual = fila;

    var modal = document.getElementById('modal-config');
    var titulo = document.getElementById('modal-config-titulo');
    var subtitulo = document.getElementById('modal-config-subtitulo');
    var body = document.getElementById('modal-config-body');
    var btnGuardar = document.getElementById('btn-guardar-config');
    var btnCancelar = document.getElementById('btn-cancelar-config');

    if (modo === 'ver') {
      titulo.textContent = 'Detalle de ' + cfg.singular;
      subtitulo.textContent = 'Información del registro seleccionado.';
      body.innerHTML = '<dl class="data-list">' + cfg.campos.map(function (campo) {
        return filaDato(campo.label, valorLegible(campo, fila));
      }).join('') + '</dl>';
      btnGuardar.hidden = true;
      btnCancelar.textContent = 'Cerrar';
    } else {
      titulo.textContent =
        modo === 'crear'  ? 'Nuevo/a ' + cfg.singular :
        modo === 'copiar' ? 'Copiar ' + cfg.singular :
                            'Editar ' + cfg.singular;
      subtitulo.textContent =
        modo === 'copiar'
          ? 'Revisá los datos precargados y ajustá los campos necesarios para crear el nuevo registro.'
          : (modo === 'crear' ? 'Completá los datos del nuevo registro.' : 'Actualizá los datos del registro.');

      body.innerHTML = formulario(fila, modo);
      btnGuardar.hidden = false;
      btnCancelar.textContent = 'Cancelar';
    }

    modal.classList.add('is-open');
    App.iconos(modal);

    requestAnimationFrame(function () {
      var primero = body.querySelector('input, select, button');
      if (primero && modo !== 'ver') { primero.focus(); }
    });
  }

  function formulario(fila, modo) {
    return '<form id="form-config" novalidate><div class="form-grid">' +
      cfg.campos.map(function (campo) {
        var valor = fila ? fila[campo.name] : '';
        var esPk  = !!campo.pk;
        var limpiar = modo === 'copiar' && esPk && cfg.limpiarPkAlCopiar;
        var soloLectura = modo === 'editar' && esPk;

        if (limpiar) { valor = ''; }

        return campoHTML(campo, valor, soloLectura);
      }).join('') +
    '</div></form>';
  }

  function campoHTML(campo, valor, soloLectura) {
    var req = campo.required ? ' required' : '';
    var read = soloLectura ? ' readonly' : '';
    var full = campo.full || campo.tipo === 'select' ? ' form-grid__full' : '';
    var id = 'cfg-' + campo.name;
    var control;

    if (campo.tipo === 'select') {
      var lista = opciones[campo.opciones] || [];
      var actual = String(valor == null ? '' : valor);
      control =
        '<select class="input" id="' + id + '" name="' + campo.name + '"' + req + read + '>' +
          '<option value="">Seleccioná…</option>' +
          lista.map(function (op) {
            var v = String(op[campo.valor]);
            var sel = v === actual ? ' selected' : '';
            return '<option value="' + esc(v) + '"' + sel + '>' + esc(op[campo.texto]) + '</option>';
          }).join('') +
        '</select>';
    } else {
      var extra = '';
      if (campo.min != null) { extra += ' min="' + campo.min + '"'; }
      if (campo.max != null) { extra += ' max="' + campo.max + '"'; }
      if (campo.maxlength)   { extra += ' maxlength="' + campo.maxlength + '"'; }
      if (campo.placeholder) { extra += ' placeholder="' + esc(campo.placeholder) + '"'; }
      if (campo.tipo === 'number') { extra += ' inputmode="numeric"'; }
      control = '<input class="input" id="' + id + '" name="' + campo.name +
        '" type="' + campo.tipo + '" value="' + esc(valor == null ? '' : valor) + '"' +
        req + read + extra + '>';
    }

    return '<div class="field' + full + '">' +
      '<label class="label" for="' + id + '">' + esc(campo.label) +
        (campo.required ? ' <span class="req">*</span>' : '') + '</label>' +
      control +
    '</div>';
  }

  function valorLegible(campo, fila) {
    if (!fila) { return '—'; }
    var valor = fila[campo.name];

    if (campo.tipo === 'select') {
      var lista = opciones[campo.opciones] || [];
      for (var i = 0; i < lista.length; i++) {
        if (String(lista[i][campo.valor]) === String(valor)) {
          return lista[i][campo.texto];
        }
      }
    }
    return valor == null || valor === '' ? '—' : valor;
  }

  function filaDato(label, valor) {
    return '<div class="data-row"><dt class="data-row__label">' + esc(label) +
      '</dt><dd class="data-row__value">' + esc(valor) + '</dd></div>';
  }

  function cerrarModal() {
    document.getElementById('modal-config').classList.remove('is-open');
    modoActual = null;
    filaActual = null;
  }

  function guardar() {
    var form = document.getElementById('form-config');
    if (!form) { return; }
    if (!form.reportValidity()) { return; }

    var datos = new URLSearchParams();
    datos.append('entidad', entidad);
    datos.append('accion', modoActual === 'editar' ? 'actualizar' : 'crear');

    cfg.campos.forEach(function (campo) {
      var el = document.getElementById('cfg-' + campo.name);
      if (el) { datos.append(campo.name, el.value.trim()); }
    });

    if (modoActual === 'editar' && filaActual) {
      datos.append('pk_json', JSON.stringify(pkDeFila(filaActual)));
    }

    var btn = document.getElementById('btn-guardar-config');
    btn.disabled = true;

    fetch(AppAdmin.controladorAdmin('configuracion.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: datos.toString()
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) {
          App.toast({ tipo: 'error', titulo: 'No se pudo guardar', texto: res.mensaje || 'Intentá nuevamente.' });
          return;
        }
        cerrarModal();
        cargar();
        App.toast({ tipo: 'success', titulo: cfg.titulo, texto: res.mensaje || 'Cambios guardados.' });
      })
      .catch(function () {
        App.toast({ tipo: 'error', titulo: 'Error de red', texto: 'No se pudo guardar. Revisá tu conexión.' });
      })
      .then(function () { btn.disabled = false; });
  }

  function eliminar(fila) {
    App.confirmar({
      tipo: 'danger',
      titulo: 'Borrar ' + cfg.singular,
      texto: '¿Confirmás que querés borrar este registro? Esta acción no se puede deshacer.',
      confirmar: 'Borrar'
    }).then(function (confirmado) {
      if (!confirmado) { return; }

      var datos = new URLSearchParams();
      datos.append('entidad', entidad);
      datos.append('accion', 'eliminar');
      datos.append('pk_json', JSON.stringify(pkDeFila(fila)));

      fetch(AppAdmin.controladorAdmin('configuracion.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: datos.toString()
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res.ok) {
            App.toast({ tipo: 'error', titulo: 'No se pudo borrar', texto: res.mensaje || 'Intentá nuevamente.' });
            return;
          }
          cargar();
          App.toast({ tipo: 'success', titulo: cfg.titulo, texto: res.mensaje || 'Registro eliminado.' });
        })
        .catch(function () {
          App.toast({ tipo: 'error', titulo: 'Error de red', texto: 'No se pudo borrar. Revisá tu conexión.' });
        });
    });
  }

  function esc(txt) {
    return String(txt == null ? '' : txt)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
})();
