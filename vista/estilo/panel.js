/**
 * Panel de preceptores de Clementina.
 *
 * Frontend independiente del sitio de alumnos. Consume el ABM genérico
 * (controlador/abm.php) y usa la misma sesión y base de datos.
 */
(function () {
  'use strict';

  var ICONOS = {
    'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'check-circle-2': '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>',
    'inbox': '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    'pencil': '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'trash-2': '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'refresh-cw': '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
    'user-check': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'
  };

  var esquema = [];
  var porClave = {};
  var actual = null;
  var filas = [];
  var timerBuscar = null;

  var modo = 'validar';
  var alumnoActual = null;
  var materiasActuales = [];
  var filtroMaterias = 'pendiente';
  var filtroNav = '';
  var resultadosAlumnos = [];
  var timerAlumno = null;
  var finalAlumno = null;
  var finalInscripciones = [];
  var finalOpciones = null;
  var finalResultados = [];
  var finalFiltro = 'todas';
  var timerFinal = null;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function iniciales(nombre) {
    var partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) { return 'P'; }
    var a = partes[0].charAt(0);
    var b = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }

  /* =============================== Iconos =============================== */

  function iconos(raiz) {
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
  }

  /* =============================== API =============================== */

  function apiGet(params) {
    var q = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch('controlador/abm.php?' + q).then(function (r) { return r.json(); });
  }

  function apiPost(obj) {
    return fetch('controlador/abm.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }).then(function (r) { return r.json(); });
  }

  function apiCursadasGet(params) {
    var q = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch('controlador/preceptor_cursadas.php?' + q).then(function (r) { return r.json(); });
  }

  function apiCursadasPost(obj) {
    return fetch('controlador/preceptor_cursadas.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }).then(function (r) { return r.json(); });
  }

  function apiFinalesGet(params) {
    var q = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch('controlador/preceptor_finales.php?' + q).then(function (r) { return r.json(); });
  }

  function apiFinalesPost(obj) {
    return fetch('controlador/preceptor_finales.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }).then(function (r) { return r.json(); });
  }

  /* =============================== Toasts =============================== */

  function toast(opciones) {
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
      info: 'check-circle-2'
    }[tipo] || 'check-circle-2';

    var el = document.createElement('div');
    el.className = 'toast toast--' + tipo;
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="toast__icon"><i data-lucide="' + icono + '"></i></span>' +
      '<div class="toast__body">' +
        (opciones.titulo ? '<div class="toast__title">' + esc(opciones.titulo) + '</div>' : '') +
        (opciones.texto ? '<div class="toast__text">' + esc(opciones.texto) + '</div>' : '') +
      '</div>' +
      '<button type="button" class="toast__close" aria-label="Cerrar"><i data-lucide="x" class="icon--sm"></i></button>';

    region.appendChild(el);
    iconos();

    function quitar() {
      if (el.classList.contains('is-leaving')) { return; }
      el.classList.add('is-leaving');
      window.setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 180);
    }

    el.querySelector('.toast__close').addEventListener('click', quitar);
    var tiempo = opciones.duracion || 4000;
    if (tiempo > 0) { window.setTimeout(quitar, tiempo); }

    return el;
  }

  function toastError(texto) {
    toast({ tipo: 'error', titulo: 'Error', texto: texto });
  }

  function bloquearScrollPagina() {
    document.body.classList.add('modal-abierto');
  }

  function liberarScrollPagina() {
    if (!document.querySelector('.modal')) {
      document.body.classList.remove('modal-abierto');
    }
  }

  /* =============================== Confirmación =============================== */

  function confirmar(opciones) {
    opciones = opciones || {};

    return new Promise(function (resolve) {
      var tipo = opciones.tipo || 'warning';
      var icono = tipo === 'danger' || tipo === 'error' ? 'alert-triangle' : 'alert-triangle';

      var modal = document.createElement('div');
      modal.className = 'modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML =
        '<div class="modal__dialog">' +
          '<div class="modal__header">' +
            '<span class="modal__icon modal__icon--error"><i data-lucide="' + icono + '"></i></span>' +
            '<div>' +
              '<div class="modal__title">' + esc(opciones.titulo || 'Confirmar acción') + '</div>' +
              (opciones.texto ? '<p class="modal__text">' + esc(opciones.texto) + '</p>' : '') +
            '</div>' +
          '</div>' +
          '<div class="modal__footer">' +
            '<button type="button" class="btn btn--outline" data-accion="cancelar">' + esc(opciones.cancelar || 'Cancelar') + '</button>' +
            '<button type="button" class="btn btn--danger" data-accion="confirmar">' + esc(opciones.confirmar || 'Confirmar') + '</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(modal);
      bloquearScrollPagina();
      iconos(modal);

      function cerrar(valor) {
        modal.classList.remove('is-open');
        window.setTimeout(function () {
          if (modal.parentNode) { modal.parentNode.removeChild(modal); }
          liberarScrollPagina();
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

  /* =============================== Barra lateral =============================== */

  function renderNav() {
    var grupos = [];
    var indice = {};
    esquema.forEach(function (e) {
      if (!indice[e.grupo]) { indice[e.grupo] = []; grupos.push(e.grupo); }
      indice[e.grupo].push(e);
    });

    var grupoAcademico = 'Acad\u00e9mico';
    if (!indice[grupoAcademico]) {
      indice[grupoAcademico] = [];
      grupos.push(grupoAcademico);
    }
    indice[grupoAcademico].push({ clave: 'finales', titulo: 'Finales' });

    var html =
      '<button type="button" class="admin__nav-item admin__nav-item--principal" data-modo="validar">' +
        '<i data-lucide="user-check"></i><span>Validar cursadas</span>' +
      '</button>' +
      '<div class="field field--icon admin__nav-search">' +
        '<span class="field__icon"><i data-lucide="search"></i></span>' +
        '<input class="input" type="search" id="admin-nav-buscar" placeholder="Buscar sección..." autocomplete="off" aria-label="Buscar sección del panel" value="' + esc(filtroNav) + '">' +
      '</div>' +
      '<div class="admin__divider"></div>';

    grupos.forEach(function (g) {
      html += '<div class="admin__group" data-grupo="' + esc(g) + '">';
      html += '<div class="admin__group-title">' + esc(g) + '</div>';
      indice[g].forEach(function (e) {
        html += '<button type="button" class="admin__nav-item" data-clave="' + esc(e.clave) + '">' +
                  esc(e.titulo) +
                '</button>';
      });
      html += '</div>';
    });

    html += '<div class="admin__nav-vacio" id="admin-nav-vacio" hidden>Sin resultados</div>';

    var nav = document.getElementById('admin-nav');
    nav.innerHTML = html;
    iconos(nav);
    nav.onclick = function (ev) {
      var modoBtn = ev.target.closest('[data-modo="validar"]');
      if (modoBtn) { activarValidacion(); return; }
      var btn = ev.target.closest('.admin__nav-item[data-clave]');
      if (btn) { seleccionar(btn.getAttribute('data-clave')); }
    };

    var buscar = document.getElementById('admin-nav-buscar');
    if (buscar) {
      buscar.addEventListener('input', function () {
        filtroNav = buscar.value;
        filtrarNav();
      });
      buscar.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          filtroNav = '';
          buscar.value = '';
          filtrarNav();
          buscar.focus();
        } else if (ev.key === 'Enter') {
          var primero = nav.querySelector('.admin__nav-item[data-clave]:not([hidden])');
          if (primero) { ev.preventDefault(); primero.click(); }
        }
      });
    }
    filtrarNav();

    var activoNav = modo === 'validar'
      ? 'validar'
      : (modo === 'finales' ? 'finales' : (actual ? actual.clave : 'validar'));
    marcarActivo(activoNav);
  }

  function normalizarTexto(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function filtrarNav() {
    var nav = document.getElementById('admin-nav');
    if (!nav) { return; }

    var input = document.getElementById('admin-nav-buscar');
    var q = normalizarTexto(input ? input.value : '');
    var grupos = nav.querySelectorAll('.admin__group');
    var visibles = 0;

    for (var i = 0; i < grupos.length; i++) {
      var grupo = grupos[i];
      var grupoTexto = normalizarTexto(grupo.getAttribute('data-grupo'));
      var items = grupo.querySelectorAll('.admin__nav-item[data-clave]');
      var visiblesGrupo = 0;

      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var coincide = !q || grupoTexto.indexOf(q) !== -1 || normalizarTexto(item.textContent).indexOf(q) !== -1;
        item.hidden = !coincide;
        if (coincide) { visiblesGrupo++; }
      }

      grupo.hidden = visiblesGrupo === 0;
      visibles += visiblesGrupo;
    }

    var vacio = document.getElementById('admin-nav-vacio');
    if (vacio) { vacio.hidden = !q || visibles > 0; }
  }

  function marcarActivo(clave) {
    var items = document.querySelectorAll('.admin__nav-item');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var activo = clave === 'validar'
        ? item.getAttribute('data-modo') === 'validar'
        : item.getAttribute('data-clave') === clave;
      item.classList.toggle('is-active', activo);
    }
  }

  /* =============================== Panel =============================== */

  function seleccionar(clave) {
    if (clave === 'finales') { activarFinales(); return; }
    actual = porClave[clave];
    if (!actual) { return; }
    modo = 'abm';
    marcarActivo(clave);
    renderPanel();
    cargarFilas('');
  }

  function activarValidacion() {
    modo = 'validar';
    actual = null;
    marcarActivo('validar');
    renderValidacion();
  }

  function renderPanel(buscar) {
    var panel = document.getElementById('admin-panel');
    panel.innerHTML =
      '<div class="admin__panel-head">' +
        '<div>' +
          '<h3 class="card__title">' + esc(actual.titulo) + '</h3>' +
          '<p class="muted" id="abm-conteo"></p>' +
        '</div>' +
        '<div class="row">' +
          '<div class="field field--icon admin__search">' +
            '<span class="field__icon"><i data-lucide="search"></i></span>' +
            '<input class="input" type="search" id="abm-buscar" placeholder="Buscar..." value="' + esc(buscar || '') + '">' +
          '</div>' +
          '<button type="button" class="btn btn--primary" id="abm-nuevo"><i data-lucide="plus"></i> Nuevo</button>' +
        '</div>' +
      '</div>' +
      '<div id="abm-tabla"></div>';

    iconos(panel);

    document.getElementById('abm-nuevo').addEventListener('click', function () { abrirFormulario(null); });
    var input = document.getElementById('abm-buscar');
    input.addEventListener('input', function () {
      window.clearTimeout(timerBuscar);
      var valor = this.value;
      timerBuscar = window.setTimeout(function () { cargarFilas(valor); }, 250);
    });
  }

  function columnasLista() {
    var cols = actual.campos.filter(function (c) { return c.lista; });
    if (!cols.length) {
      cols = actual.campos.filter(function (c) { return !c.sensible; }).slice(0, 4);
    }
    return cols;
  }

  function cargarFilas(buscar) {
    var cont = document.getElementById('abm-tabla');
    if (!cont) { return; }
    cont.innerHTML = '<div class="skeleton skeleton--line" style="width: 60%; margin: 8px 0;"></div>' +
                     '<div class="skeleton skeleton--line" style="width: 45%; margin: 8px 0;"></div>';

    apiGet({ accion: 'listar', entidad: actual.clave, buscar: buscar || '' })
      .then(function (r) {
        if (!r.ok) { toastError(r.mensaje); return; }
        filas = r.filas || [];
        pintarTabla();
      })
      .catch(function () { toastError('No se pudieron cargar los datos.'); });
  }

  function pintarTabla() {
    var cont = document.getElementById('abm-tabla');
    var cols = columnasLista();
    var conteo = document.getElementById('abm-conteo');
    if (conteo) { conteo.textContent = filas.length + (filas.length === 1 ? ' registro' : ' registros'); }

    if (!filas.length) {
      cont.innerHTML =
        '<div class="empty">' +
          '<div class="empty__icon"><i data-lucide="inbox"></i></div>' +
          '<div class="empty__title">Sin registros</div>' +
          '<p class="empty__text">No hay datos para mostrar en "' + esc(actual.titulo) + '". Podés crear el primero.</p>' +
          '<div class="empty__action"><button type="button" class="btn btn--primary" id="abm-nuevo-vacio"><i data-lucide="plus"></i> Nuevo</button></div>' +
        '</div>';
      iconos(cont);
      var b = document.getElementById('abm-nuevo-vacio');
      if (b) { b.addEventListener('click', function () { abrirFormulario(null); }); }
      return;
    }

    var html = '<div class="table-wrap"><table class="table"><thead><tr>';
    cols.forEach(function (c) { html += '<th>' + esc(c.label) + '</th>'; });
    html += '<th class="col-actions">Acciones</th></tr></thead><tbody>';

    filas.forEach(function (fila) {
      html += '<tr>';
      cols.forEach(function (c) {
        var v = fila[c.col];
        html += '<td>' + (v === null || v === undefined || v === '' ? '<span class="muted">—</span>' : esc(v)) + '</td>';
      });
      html += '<td class="col-actions">' +
                '<button type="button" class="btn btn--outline btn--sm" data-editar><i data-lucide="pencil"></i> Editar</button> ' +
                '<button type="button" class="btn btn--ghost btn--sm text-danger" data-eliminar><i data-lucide="trash-2"></i> Eliminar</button>' +
              '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    cont.innerHTML = html;
    iconos(cont);

    var trs = cont.querySelectorAll('tbody tr');
    for (var i = 0; i < trs.length; i++) {
      (function (tr, fila) {
        tr.querySelector('[data-editar]').addEventListener('click', function () { abrirFormulario(fila); });
        tr.querySelector('[data-eliminar]').addEventListener('click', function () { eliminar(fila); });
      })(trs[i], filas[i]);
    }
  }

  /* =============================== Formulario =============================== */

  function pkDe(fila) {
    var pk = {};
    actual.pk.forEach(function (col) { pk[col] = fila[col]; });
    return pk;
  }

  function inputHtml(campo, valor) {
    var id = 'f-' + campo.col;
    var req = campo.req ? ' required' : '';
    var val = (valor === null || valor === undefined) ? '' : valor;
    var extra = '';
    if (campo.max) { extra += ' maxlength="' + campo.max + '"'; }
    if (campo.tipo === 'number') {
      if (campo.min !== undefined) { extra += ' min="' + campo.min + '"'; }
      if (campo.maxv !== undefined) { extra += ' max="' + campo.maxv + '"'; }
      extra += ' step="' + (campo.step || 1) + '"';
    }

    if (campo.tipo === 'select' || campo.tipo === 'fk') {
      var opciones = campo.opciones || [];
      var h = '<select class="select" id="' + id + '" data-col="' + esc(campo.col) + '"' + req + '>';
      if (!campo.req) { h += '<option value="">—</option>'; }
      var encontrado = false;
      opciones.forEach(function (o) {
        var sel = String(o.valor) === String(val) ? ' selected' : '';
        if (sel) { encontrado = true; }
        h += '<option value="' + esc(o.valor) + '"' + sel + '>' + esc(o.texto) + '</option>';
      });
      if (val !== '' && !encontrado) {
        h += '<option value="' + esc(val) + '" selected>' + esc(val) + ' (actual)</option>';
      }
      h += '</select>';
      return h;
    }

    if (campo.tipo === 'textarea') {
      return '<textarea class="textarea" id="' + id + '" data-col="' + esc(campo.col) + '"' + req + extra + '>' + esc(val) + '</textarea>';
    }

    var tipo = 'text';
    if (campo.tipo === 'email') { tipo = 'email'; }
    else if (campo.tipo === 'number') { tipo = 'number'; }
    else if (campo.tipo === 'date') { tipo = 'date'; }
    else if (campo.tipo === 'datetime') { tipo = 'datetime-local'; }
    else if (campo.tipo === 'tel') { tipo = 'tel'; }
    else if (campo.tipo === 'password') { tipo = 'password'; }

    var pista = campo.tipo === 'password'
      ? (valor ? 'Dejá vacío para conservar la actual.' : (campo.pista || ''))
      : (campo.pista || '');

    return '<input class="input" type="' + tipo + '" id="' + id + '" data-col="' + esc(campo.col) + '" value="' + esc(val) + '"' + req + extra + '>' +
           (pista ? '<p class="field__hint">' + esc(pista) + '</p>' : '');
  }

  function campoHtml(campo, valor, esNuevo) {
    if (esNuevo && actual.autoincrement && campo.pk) { return ''; }
    var soloLectura = (!esNuevo && actual.autoincrement && campo.pk);

    var clase = 'field' + (campo.ancho === 'full' ? ' field--full' : '');
    var control = soloLectura
      ? '<input class="input" type="text" value="' + esc(valor) + '" disabled>'
      : inputHtml(campo, valor);

    return '<div class="' + clase + '">' +
             '<label class="label" for="f-' + esc(campo.col) + '">' + esc(campo.label) +
               (campo.req && !soloLectura ? ' <span class="req">*</span>' : '') + '</label>' +
             control +
           '</div>';
  }

  function abrirFormulario(fila) {
    var esNuevo = !fila;
    var campos = actual.campos.filter(function (c) { return c.form; });

    var cuerpo = '';
    campos.forEach(function (c) { cuerpo += campoHtml(c, fila ? fila[c.col] : '', esNuevo); });

    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="modal__dialog modal__dialog--wide">' +
        '<form class="modal__form" id="abm-form" novalidate>' +
          '<div class="modal__header">' +
            '<span class="modal__icon modal__icon--warning"><i data-lucide="' + (esNuevo ? 'plus' : 'pencil') + '"></i></span>' +
            '<div class="modal__head-text">' +
              '<div class="modal__title">' + (esNuevo ? 'Nuevo ' : 'Editar ') + esc(actual.titulo_singular.toLowerCase()) + '</div>' +
            '</div>' +
            '<button type="button" class="modal__close btn btn--ghost btn--icon btn--sm" data-cerrar aria-label="Cerrar"><i data-lucide="x"></i></button>' +
          '</div>' +
          '<div class="modal__body"><div class="grid grid--2">' + cuerpo + '</div></div>' +
          '<div class="modal__footer">' +
            '<button type="button" class="btn btn--outline" data-cerrar>Cancelar</button>' +
            '<button type="submit" class="btn btn--primary" id="abm-guardar"><i data-lucide="check-circle-2"></i> Guardar</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(modal);
    bloquearScrollPagina();
    iconos(modal);

    function cerrar() {
      modal.classList.remove('is-open');
      document.removeEventListener('keydown', alTeclado);
      window.setTimeout(function () {
        if (modal.parentNode) { modal.parentNode.removeChild(modal); }
        liberarScrollPagina();
      }, 180);
    }
    function alTeclado(e) { if (e.key === 'Escape') { cerrar(); } }

    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('[data-cerrar]')) { cerrar(); }
    });
    document.addEventListener('keydown', alTeclado);

    modal.querySelector('#abm-form').addEventListener('submit', function (e) {
      e.preventDefault();
      guardar(modal, fila, cerrar);
    });

    requestAnimationFrame(function () {
      modal.classList.add('is-open');
      var primero = modal.querySelector('.input, .select, .textarea');
      if (primero) { primero.focus(); }
    });
  }

  function guardar(modal, fila, cerrar) {
    var btn = modal.querySelector('#abm-guardar');
    var datos = {};
    var controles = modal.querySelectorAll('[data-col]');
    for (var i = 0; i < controles.length; i++) {
      datos[controles[i].getAttribute('data-col')] = controles[i].value;
    }

    var cuerpo = { accion: 'guardar', entidad: actual.clave, datos: datos };
    if (fila) { cuerpo.pk = pkDe(fila); }

    btn.disabled = true;
    btn.classList.add('is-loading');
    apiPost(cuerpo)
      .then(function (r) {
        btn.disabled = false;
        btn.classList.remove('is-loading');
        if (r.ok) {
          cerrar();
          toast({ tipo: 'success', titulo: 'Listo', texto: r.mensaje });
          cargarFilas(document.getElementById('abm-buscar').value);
        } else {
          toastError(r.mensaje || 'No se pudo guardar.');
        }
      })
      .catch(function () {
        btn.disabled = false;
        btn.classList.remove('is-loading');
        toastError('Error de red o del servidor.');
      });
  }

  function eliminar(fila) {
    var etiqueta = actual.titulo_singular.toLowerCase();
    confirmar({
      titulo: '¿Eliminar ' + etiqueta + '?',
      texto: 'Esta acción no se puede deshacer.',
      confirmar: 'Eliminar',
      tipo: 'danger'
    }).then(function (ok) {
      if (!ok) { return; }
      apiPost({ accion: 'eliminar', entidad: actual.clave, pk: pkDe(fila) })
        .then(function (r) {
          if (r.ok) {
            toast({ tipo: 'success', titulo: 'Eliminado', texto: r.mensaje });
            cargarFilas(document.getElementById('abm-buscar').value);
          } else {
            toastError(r.mensaje || 'No se pudo eliminar.');
          }
        })
        .catch(function () { toastError('Error de red o del servidor.'); });
    });
  }

  /* =============================== Sesión =============================== */

  /* =============================== Validación de cursadas =============================== */

  function fechaCorta(valor) {
    if (!valor) { return ''; }
    var partes = String(valor).slice(0, 10).split('-');
    if (partes.length !== 3) { return String(valor); }
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }

  function etiquetaAsistencia(valor) {
    var mapa = { '1': 'Presencial', '2': 'Libre', '3': 'Vocacional' };
    return mapa[String(valor || '')] || '';
  }

  function contarEstados() {
    var conteo = { pendiente: 0, aprobada: 0, no_aprobada: 0, final_aprobada: 0, total: materiasActuales.length };
    materiasActuales.forEach(function (m) {
      if (conteo[m.estado] !== undefined) { conteo[m.estado]++; }
    });
    return conteo;
  }

  function pintarDetalleVacio() {
    var detalle = document.getElementById('val-detalle');
    if (!detalle) { return; }
    detalle.innerHTML =
      '<div class="empty val-vacio">' +
        '<div class="empty__icon"><i data-lucide="book-open"></i></div>' +
        '<div class="empty__title">Buscá un alumno para empezar</div>' +
        '<p class="empty__text">Podés buscar por DNI, legajo, apellido o nombre. También vas a ver acá la cola de alumnos con cursadas pendientes.</p>' +
      '</div>';
    iconos(detalle);
  }

  function renderValidacion() {
    alumnoActual = null;
    materiasActuales = [];
    filtroMaterias = 'pendiente';
    resultadosAlumnos = [];

    var panel = document.getElementById('admin-panel');
    panel.innerHTML =
      '<div class="validacion">' +
        '<aside class="validacion__lado">' +
          '<div class="validacion__buscador">' +
            '<div class="field field--icon">' +
              '<span class="field__icon"><i data-lucide="search"></i></span>' +
              '<input class="input" type="search" id="val-buscar" placeholder="DNI, legajo, apellido o nombre..." autocomplete="off" aria-label="Buscar alumno">' +
            '</div>' +
            '<button type="button" class="btn btn--ghost btn--icon btn--sm" id="val-refrescar" title="Actualizar lista" aria-label="Actualizar lista">' +
              '<i data-lucide="refresh-cw"></i>' +
            '</button>' +
          '</div>' +
          '<p class="validacion__info" id="val-info">Cargando alumnos...</p>' +
          '<div class="validacion__resultados" id="val-resultados"></div>' +
        '</aside>' +
        '<section class="validacion__detalle" id="val-detalle" aria-live="polite"></section>' +
      '</div>';

    iconos(panel);

    var input = document.getElementById('val-buscar');
    input.addEventListener('input', function () {
      window.clearTimeout(timerAlumno);
      var valor = this.value.trim();
      timerAlumno = window.setTimeout(function () { cargarAlumnos(valor); }, 250);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        this.value = '';
        cargarAlumnos('');
        this.focus();
      }
      if (e.key === 'Enter' && resultadosAlumnos.length) {
        e.preventDefault();
        seleccionarAlumno(resultadosAlumnos[0].id_alumno);
      }
    });

    document.getElementById('val-refrescar').addEventListener('click', function () {
      cargarAlumnos(input.value.trim());
    });

    document.getElementById('val-resultados').addEventListener('click', function (e) {
      var btn = e.target.closest('.val-alumno');
      if (btn) { seleccionarAlumno(Number(btn.getAttribute('data-id'))); }
    });

    pintarDetalleVacio();
    cargarAlumnos('');

    window.setTimeout(function () { input.focus(); }, 40);
  }

  function cargarAlumnos(buscar) {
    var cont = document.getElementById('val-resultados');
    var info = document.getElementById('val-info');
    if (!cont) { return; }

    info.textContent = buscar ? 'Buscando...' : 'Cargando pendientes...';
    cont.innerHTML =
      '<div class="val-cargando">' +
        '<div class="skeleton skeleton--line" style="width: 90%"></div>' +
        '<div class="skeleton skeleton--line" style="width: 70%"></div>' +
        '<div class="skeleton skeleton--line" style="width: 82%"></div>' +
      '</div>';

    apiCursadasGet({ accion: 'alumnos', buscar: buscar || '' })
      .then(function (r) {
        if (!r.ok) {
          info.textContent = 'No se pudo cargar la lista.';
          cont.innerHTML = '';
          toastError(r.mensaje || 'No se pudieron cargar los alumnos.');
          return;
        }
        resultadosAlumnos = r.alumnos || [];
        pintarResultados(buscar);
      })
      .catch(function () {
        info.textContent = 'Error de conexión.';
        cont.innerHTML = '';
        toastError('No se pudo consultar la lista de alumnos.');
      });
  }

  function pintarResultados(buscar) {
    var cont = document.getElementById('val-resultados');
    var info = document.getElementById('val-info');
    if (!cont) { return; }

    if (!resultadosAlumnos.length) {
      info.textContent = buscar ? 'Sin resultados.' : 'No hay cursadas pendientes.';
      cont.innerHTML =
        '<div class="val-lista-vacia">' +
          '<i data-lucide="user-check"></i>' +
          '<p>' + (buscar ? 'No encontramos alumnos con esa búsqueda.' : 'No hay alumnos con cursadas pendientes para validar.') + '</p>' +
        '</div>';
      iconos(cont);
      return;
    }

    info.textContent = buscar
      ? resultadosAlumnos.length + (resultadosAlumnos.length === 1 ? ' resultado' : ' resultados') + ' para "' + buscar + '"'
      : resultadosAlumnos.length + (resultadosAlumnos.length === 1 ? ' alumno pendiente' : ' alumnos pendientes');

    var html = '';
    resultadosAlumnos.forEach(function (a) {
      var pendientes = Number(a.pendientes) || 0;
      var activo = alumnoActual && Number(alumnoActual.id_alumno) === Number(a.id_alumno);
      html +=
        '<button type="button" class="val-alumno' + (activo ? ' is-active' : '') + '" data-id="' + a.id_alumno + '">' +
          '<span class="val-alumno__avatar">' + esc(iniciales(a.nombre_completo)) + '</span>' +
          '<span class="val-alumno__info">' +
            '<span class="val-alumno__nombre">' + esc(a.nombre_completo || 'Alumno') + '</span>' +
            '<span class="val-alumno__meta">DNI ' + esc(a.numero_documento || '-') +
              (a.legajo ? ' · Leg. ' + esc(a.legajo) : '') + '</span>' +
            (a.carreras ? '<span class="val-alumno__carreras">' + esc(a.carreras) + '</span>' : '') +
          '</span>' +
          '<span class="val-alumno__badge badge ' + (pendientes > 0 ? 'badge--warning' : 'badge--success') + '">' +
            (pendientes > 0 ? pendientes + ' pend.' : 'Validado') +
          '</span>' +
        '</button>';
    });

    cont.innerHTML = html;
    iconos(cont);
  }

  function seleccionarAlumno(id) {
    if (!id) { return; }
    var detalle = document.getElementById('val-detalle');
    detalle.innerHTML =
      '<div class="card"><div class="card__body">' +
        '<div class="skeleton skeleton--text" style="width: 35%"></div>' +
        '<div class="skeleton skeleton--line" style="width: 60%; margin-top: 12px;"></div>' +
        '<div class="skeleton skeleton--line" style="width: 85%; margin-top: 18px;"></div>' +
      '</div></div>';

    apiCursadasGet({ accion: 'materias', id_alumno: id })
      .then(function (r) {
        if (!r.ok) {
          pintarDetalleVacio();
          toastError(r.mensaje || 'No se pudo cargar el alumno.');
          return;
        }

        alumnoActual = r.alumno;
        materiasActuales = r.materias || [];
        if (r.resumen && Number(r.resumen.pendientes) > 0) {
          filtroMaterias = 'pendiente';
        } else if (r.resumen && Number(r.resumen.no_aprobadas) > 0) {
          filtroMaterias = 'no_aprobada';
        } else {
          filtroMaterias = 'todas';
        }

        var input = document.getElementById('val-buscar');
        pintarResultados(input ? input.value.trim() : '');
        pintarDetalle();

        if (window.matchMedia('(max-width: 1080px)').matches) {
          detalle.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(function () {
        pintarDetalleVacio();
        toastError('No se pudo consultar el alumno.');
      });
  }

  function pintarDetalle() {
    var detalle = document.getElementById('val-detalle');
    if (!detalle) { return; }
    if (!alumnoActual) {
      pintarDetalleVacio();
      return;
    }

    var conteo = contarEstados();
    var nombre = alumnoActual.nombre_completo || 'Alumno';
    var carrerasHtml = '';
    (alumnoActual.carreras || []).forEach(function (c) {
      carrerasHtml += '<span class="badge badge--neutral">' + esc(c.nombre_carrera_corto || c.nombre_carrera) + '</span>';
    });

    var filtros = [
      ['pendiente', 'Pendientes', conteo.pendiente],
      ['aprobada', 'Aprobadas', conteo.aprobada],
      ['no_aprobada', 'No aprobadas', conteo.no_aprobada],
      ['final_aprobada', 'Final aprobada', conteo.final_aprobada],
      ['todas', 'Todas', conteo.total]
    ];

    var tabsHtml = '';
    filtros.forEach(function (f) {
      tabsHtml +=
        '<button type="button" class="val-tab' + (filtroMaterias === f[0] ? ' is-active' : '') + '" data-filtro="' + f[0] + '">' +
          esc(f[1]) + ' <span>' + f[2] + '</span>' +
        '</button>';
    });

    detalle.innerHTML =
      '<div class="card val-detalle__head">' +
        '<div class="card__body">' +
          '<div class="val-detalle__cabecera">' +
            '<div class="val-detalle__identidad">' +
              '<h2 class="val-detalle__nombre">' + esc(nombre) + '</h2>' +
              '<p class="val-detalle__meta">DNI ' + esc(alumnoActual.numero_documento || '-') +
                (alumnoActual.legajo ? ' · Legajo ' + esc(alumnoActual.legajo) : '') +
                (alumnoActual.email ? ' · ' + esc(alumnoActual.email) : '') +
              '</p>' +
              (carrerasHtml ? '<div class="val-detalle__carreras">' + carrerasHtml + '</div>' : '') +
            '</div>' +
            '<div class="val-resumen">' +
              '<div class="val-resumen__item"><span class="val-resumen__num">' + conteo.pendiente + '</span><span>Pendientes</span></div>' +
              '<div class="val-resumen__item val-resumen__item--ok"><span class="val-resumen__num">' + conteo.aprobada + '</span><span>Aprobadas</span></div>' +
              '<div class="val-resumen__item val-resumen__item--error"><span class="val-resumen__num">' + conteo.no_aprobada + '</span><span>No aprobadas</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="val-tabs">' + tabsHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<div id="val-materias"></div>';

    iconos(detalle);

    var tabs = detalle.querySelectorAll('[data-filtro]');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        filtroMaterias = this.getAttribute('data-filtro');
        pintarDetalle();
      });
    }

    pintarMaterias();
  }

  function pintarMaterias() {
    var cont = document.getElementById('val-materias');
    if (!cont) { return; }

    var lista = materiasActuales.filter(function (m) {
      return filtroMaterias === 'todas' || m.estado === filtroMaterias;
    });

    if (!lista.length) {
      var titulo = 'Sin materias';
      var texto = 'No hay materias cargadas para este alumno.';
      var accion = '';

      if (!materiasActuales.length) {
        titulo = 'Sin materias cargadas';
        texto = 'El alumno no tiene materias en matriculación ni en su historial académico.';
      } else if (filtroMaterias === 'pendiente') {
        titulo = 'No quedan cursadas pendientes';
        texto = 'Este alumno ya tiene todas sus cursadas validadas.';
        if (hayOtroPendiente()) {
          accion = '<div class="empty__action"><button type="button" class="btn btn--primary" id="val-siguiente">' +
                     '<i data-lucide="arrow-right"></i> Ir al siguiente alumno' +
                   '</button></div>';
        }
      } else {
        titulo = 'Sin materias en este estado';
        texto = 'Probá con otro filtro para ver las demás materias del alumno.';
      }

      cont.innerHTML =
        '<div class="empty val-vacio">' +
          '<div class="empty__icon"><i data-lucide="' + (filtroMaterias === 'pendiente' && materiasActuales.length ? 'check-circle-2' : 'book-open') + '"></i></div>' +
          '<div class="empty__title">' + esc(titulo) + '</div>' +
          '<p class="empty__text">' + esc(texto) + '</p>' +
          accion +
        '</div>';
      iconos(cont);

      var siguiente = document.getElementById('val-siguiente');
      if (siguiente) { siguiente.addEventListener('click', siguienteAlumno); }
      return;
    }

    var html = '<div class="val-materias">';
    lista.forEach(function (m) {
      var key = m.id_carrera + '-' + m.id_materia;
      var meta = [];
      if (m.anio_cursada > 0) { meta.push('<span><i data-lucide="book-open"></i>' + m.anio_cursada + '° año</span>'); }
      if (m.carrera_corta || m.carrera) { meta.push('<span>' + esc(m.carrera_corta || m.carrera) + '</span>'); }
      if (m.anio_matriculacion > 0) { meta.push('<span>Cursada ' + m.anio_matriculacion + '</span>'); }
      var asistencia = etiquetaAsistencia(m.tipo_asistencia);
      if (asistencia) { meta.push('<span>' + esc(asistencia) + '</span>'); }

      var extra = [];
      if (m.nota > 0) { extra.push('Nota ' + m.nota); }
      if (m.anio_regular > 0) { extra.push('Regular ' + m.anio_regular); }
      if (m.fecha_mod) { extra.push('Actualizado ' + fechaCorta(m.fecha_mod)); }

      html +=
        '<article class="val-materia" id="val-materia-' + key + '">' +
          '<div class="val-materia__main">' +
            '<div class="val-materia__title">' +
              '<span>' + esc(m.materia) + '</span>' +
              '<span class="badge ' + esc(m.badge) + '">' + esc(m.estado_texto) + '</span>' +
            '</div>' +
            '<div class="val-materia__meta">' + meta.join('') + '</div>' +
            (extra.length ? '<div class="val-materia__extra">' + esc(extra.join(' · ')) + '</div>' : '') +
          '</div>' +
          '<div class="val-materia__actions" data-key="' + key + '">' + accionesMateria(m) + '</div>' +
        '</article>';
    });
    html += '</div>';

    cont.innerHTML = html;
    iconos(cont);

    var botones = cont.querySelectorAll('[data-validar]');
    for (var i = 0; i < botones.length; i++) {
      (function (boton) {
        var key = boton.getAttribute('data-key');
        var estado = boton.getAttribute('data-validar');
        var materia = null;
        for (var j = 0; j < materiasActuales.length; j++) {
          if (materiasActuales[j].id_carrera + '-' + materiasActuales[j].id_materia === key) {
            materia = materiasActuales[j];
            break;
          }
        }
        if (!materia) { return; }
        boton.addEventListener('click', function () { validarMateria(materia, estado, boton); });
      })(botones[i]);
    }
  }

  function accionesMateria(m) {
    if (!m.puede_validar) {
      return '<span class="val-materia__final"><i data-lucide="check-circle-2"></i> Final aprobada</span>';
    }

    var key = m.id_carrera + '-' + m.id_materia;
    var aprobada = m.estado === 'aprobada';
    var noAprobada = m.estado === 'no_aprobada';

    return '' +
      '<button type="button" class="btn btn--sm ' + (aprobada ? 'btn--success' : 'btn--outline') + '" ' +
        'data-validar="aprobada" data-key="' + key + '"' + (aprobada ? ' disabled' : '') + '>' +
        '<i data-lucide="check"></i> ' + (aprobada ? 'Aprobada' : 'Aprobar') +
      '</button>' +
      '<button type="button" class="btn btn--sm ' + (noAprobada ? 'btn--danger' : 'btn--outline text-danger') + '" ' +
        'data-validar="no_aprobada" data-key="' + key + '"' + (noAprobada ? ' disabled' : '') + '>' +
        '<i data-lucide="x"></i> ' + (noAprobada ? 'No aprobada' : 'No aprobar') +
      '</button>';
  }

  function validarMateria(materia, estado, boton) {
    if (!alumnoActual || !materia || !materia.puede_validar) { return; }

    var fila = boton.closest('.val-materia');
    var botones = fila ? fila.querySelectorAll('[data-validar]') : [];
    for (var i = 0; i < botones.length; i++) {
      botones[i].disabled = true;
      botones[i].classList.add('is-loading');
    }

    apiCursadasPost({
      accion: 'validar',
      id_alumno: alumnoActual.id_alumno,
      id_carrera: materia.id_carrera,
      id_materia: materia.id_materia,
      estado: estado
    }).then(function (r) {
      if (!r.ok) {
        toastError(r.mensaje || 'No se pudo validar la cursada.');
        pintarMaterias();
        return;
      }

      materia.estado = r.estado;
      materia.estado_texto = r.estado === 'aprobada' ? 'Cursada aprobada' : 'Cursada no aprobada';
      materia.badge = r.estado === 'aprobada' ? 'badge--success' : 'badge--error';
      materia.validado_regular = r.validado_regular;
      materia.anio_regular = r.anio_regular;
      materia.fecha_mod = r.fecha_mod;
      materia.puede_validar = true;

      actualizarPendientesAlumno();
      pintarDetalle();

      toast({
        tipo: r.estado === 'aprobada' ? 'success' : 'warning',
        titulo: r.estado === 'aprobada' ? 'Cursada aprobada' : 'Cursada no aprobada',
        texto: materia.materia
      });
    }).catch(function () {
      toastError('No se pudo guardar la validación.');
      pintarMaterias();
    });
  }

  function actualizarPendientesAlumno() {
    if (!alumnoActual) { return; }

    var pendientes = 0;
    materiasActuales.forEach(function (m) {
      if (m.estado === 'pendiente') { pendientes++; }
    });

    resultadosAlumnos.forEach(function (a) {
      if (Number(a.id_alumno) === Number(alumnoActual.id_alumno)) {
        a.pendientes = pendientes;
      }
    });

    var btn = document.querySelector('.val-alumno[data-id="' + alumnoActual.id_alumno + '"]');
    var badge = btn ? btn.querySelector('.val-alumno__badge') : null;
    if (badge) {
      badge.className = 'val-alumno__badge badge ' + (pendientes > 0 ? 'badge--warning' : 'badge--success');
      badge.textContent = pendientes > 0 ? pendientes + ' pend.' : 'Validado';
    }
  }

  function hayOtroPendiente() {
    if (!alumnoActual) { return false; }
    return resultadosAlumnos.some(function (a) {
      return Number(a.id_alumno) !== Number(alumnoActual.id_alumno) && Number(a.pendientes) > 0;
    });
  }

  function siguienteAlumno() {
    if (!alumnoActual || !resultadosAlumnos.length) { return; }
    var indice = -1;
    for (var i = 0; i < resultadosAlumnos.length; i++) {
      if (Number(resultadosAlumnos[i].id_alumno) === Number(alumnoActual.id_alumno)) {
        indice = i;
        break;
      }
    }
    for (var k = 1; k <= resultadosAlumnos.length; k++) {
      var candidato = resultadosAlumnos[(indice + k) % resultadosAlumnos.length];
      if (Number(candidato.id_alumno) !== Number(alumnoActual.id_alumno) && Number(candidato.pendientes) > 0) {
        seleccionarAlumno(candidato.id_alumno);
        return;
      }
    }
    toast({ tipo: 'info', titulo: 'Todo al día', texto: 'No hay otros alumnos con cursadas pendientes.' });
  }

  /* =============================== Inscripciones a finales =============================== */

  function fechaHoraCorta(valor) {
    if (!valor) { return ''; }
    var texto = String(valor);
    var fecha = fechaCorta(texto);
    var hora = texto.length >= 16 ? texto.slice(11, 16) : '';
    return hora ? fecha + ' ' + hora : fecha;
  }

  function activarFinales() {
    modo = 'finales';
    actual = null;
    finalAlumno = null;
    finalInscripciones = [];
    finalOpciones = null;
    finalResultados = [];
    finalFiltro = 'todas';
    marcarActivo('finales');
    renderFinales();
  }

  function renderFinales() {
    var panel = document.getElementById('admin-panel');
    panel.innerHTML =
      '<div class="validacion">' +
        '<aside class="validacion__lado">' +
          '<div class="validacion__buscador">' +
            '<div class="field field--icon">' +
              '<span class="field__icon"><i data-lucide="search"></i></span>' +
              '<input class="input" type="search" id="fin-buscar" placeholder="DNI, legajo, apellido o nombre..." autocomplete="off" aria-label="Buscar alumno">' +
            '</div>' +
            '<button type="button" class="btn btn--ghost btn--icon btn--sm" id="fin-refrescar" title="Actualizar lista" aria-label="Actualizar lista">' +
              '<i data-lucide="refresh-cw"></i>' +
            '</button>' +
          '</div>' +
          '<p class="validacion__info" id="fin-info">Cargando alumnos...</p>' +
          '<div class="validacion__resultados" id="fin-resultados"></div>' +
        '</aside>' +
        '<section class="validacion__detalle" id="fin-detalle" aria-live="polite"></section>' +
      '</div>';

    iconos(panel);

    var input = document.getElementById('fin-buscar');
    input.addEventListener('input', function () {
      window.clearTimeout(timerFinal);
      var valor = this.value.trim();
      timerFinal = window.setTimeout(function () { cargarAlumnosFinales(valor); }, 250);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        this.value = '';
        cargarAlumnosFinales('');
        this.focus();
      }
      if (e.key === 'Enter' && finalResultados.length) {
        e.preventDefault();
        seleccionarAlumnoFinal(finalResultados[0].id_alumno);
      }
    });

    document.getElementById('fin-refrescar').addEventListener('click', function () {
      cargarAlumnosFinales(input.value.trim());
    });

    document.getElementById('fin-resultados').addEventListener('click', function (e) {
      var btn = e.target.closest('.val-alumno');
      if (btn) { seleccionarAlumnoFinal(Number(btn.getAttribute('data-id'))); }
    });

    pintarDetalleFinalVacio();
    cargarAlumnosFinales('');

    window.setTimeout(function () { input.focus(); }, 40);
  }

  function cargarAlumnosFinales(buscar) {
    var cont = document.getElementById('fin-resultados');
    var info = document.getElementById('fin-info');
    if (!cont) { return; }

    info.textContent = buscar ? 'Buscando...' : 'Cargando alumnos...';
    cont.innerHTML =
      '<div class="val-cargando">' +
        '<div class="skeleton skeleton--line" style="width: 90%"></div>' +
        '<div class="skeleton skeleton--line" style="width: 70%"></div>' +
        '<div class="skeleton skeleton--line" style="width: 82%"></div>' +
      '</div>';

    apiFinalesGet({ accion: 'alumnos', buscar: buscar || '' })
      .then(function (r) {
        if (!r.ok) {
          info.textContent = 'No se pudo cargar la lista.';
          cont.innerHTML = '';
          toastError(r.mensaje || 'No se pudieron cargar los alumnos.');
          return;
        }
        finalResultados = r.alumnos || [];
        pintarResultadosFinales(buscar);
      })
      .catch(function () {
        info.textContent = 'Error de conexión.';
        cont.innerHTML = '';
        toastError('No se pudo consultar la lista de alumnos.');
      });
  }

  function pintarResultadosFinales(buscar) {
    var cont = document.getElementById('fin-resultados');
    var info = document.getElementById('fin-info');
    if (!cont) { return; }

    if (!finalResultados.length) {
      info.textContent = buscar ? 'Sin resultados.' : 'No hay alumnos para mostrar.';
      cont.innerHTML =
        '<div class="val-lista-vacia">' +
          '<i data-lucide="user"></i>' +
          '<p>' + (buscar ? 'No encontramos alumnos con esa búsqueda.' : 'No hay alumnos cargados.') + '</p>' +
        '</div>';
      iconos(cont);
      return;
    }

    info.textContent = buscar
      ? finalResultados.length + (finalResultados.length === 1 ? ' resultado' : ' resultados') + ' para "' + buscar + '"'
      : finalResultados.length + (finalResultados.length === 1 ? ' alumno' : ' alumnos');

    var html = '';
    finalResultados.forEach(function (a) {
      var activos = Number(a.finales_activos) || 0;
      var activo = finalAlumno && Number(finalAlumno.id_alumno) === Number(a.id_alumno);
      var badgeClase = activos > 0 ? 'badge--info' : 'badge--neutral';
      var badgeTexto = activos > 0
        ? activos + (activos === 1 ? ' final' : ' finales')
        : 'Sin finales';

      html +=
        '<button type="button" class="val-alumno' + (activo ? ' is-active' : '') + '" data-id="' + a.id_alumno + '">' +
          '<span class="val-alumno__avatar">' + esc(iniciales(a.nombre_completo)) + '</span>' +
          '<span class="val-alumno__info">' +
            '<span class="val-alumno__nombre">' + esc(a.nombre_completo || 'Alumno') + '</span>' +
            '<span class="val-alumno__meta">DNI ' + esc(a.numero_documento || '-') +
              (a.legajo ? ' · Leg. ' + esc(a.legajo) : '') + '</span>' +
            (a.carreras ? '<span class="val-alumno__carreras">' + esc(a.carreras) + '</span>' : '') +
          '</span>' +
          '<span class="val-alumno__badge badge ' + badgeClase + '">' + esc(badgeTexto) + '</span>' +
        '</button>';
    });

    cont.innerHTML = html;
    iconos(cont);
  }

  function pintarDetalleFinalVacio() {
    var detalle = document.getElementById('fin-detalle');
    if (!detalle) { return; }
    detalle.innerHTML =
      '<div class="empty val-vacio">' +
        '<div class="empty__icon"><i data-lucide="book-open"></i></div>' +
        '<div class="empty__title">Buscá un alumno para gestionar sus finales</div>' +
        '<p class="empty__text">Podés buscar por DNI, legajo, apellido o nombre. Desde acá vas a poder inscribir, editar o dar de baja un final.</p>' +
      '</div>';
    iconos(detalle);
  }

  function seleccionarAlumnoFinal(id) {
    if (!id) { return; }
    var detalle = document.getElementById('fin-detalle');
    detalle.innerHTML =
      '<div class="card"><div class="card__body">' +
        '<div class="skeleton skeleton--text" style="width: 35%"></div>' +
        '<div class="skeleton skeleton--line" style="width: 60%; margin-top: 12px;"></div>' +
        '<div class="skeleton skeleton--line" style="width: 85%; margin-top: 18px;"></div>' +
      '</div></div>';

    apiFinalesGet({ accion: 'alumno', id_alumno: id })
      .then(function (r) {
        if (!r.ok) {
          pintarDetalleFinalVacio();
          toastError(r.mensaje || 'No se pudo cargar el alumno.');
          return;
        }

        finalAlumno = r.alumno;
        finalInscripciones = r.inscripciones || [];
        finalOpciones = r.opciones || {};
        finalFiltro = 'todas';

        var input = document.getElementById('fin-buscar');
        pintarResultadosFinales(input ? input.value.trim() : '');
        pintarDetalleFinal();

        if (window.matchMedia('(max-width: 1080px)').matches) {
          detalle.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
      .catch(function () {
        pintarDetalleFinalVacio();
        toastError('No se pudo consultar el alumno.');
      });
  }

  function contarFinales() {
    var conteo = { activa: 0, baja: 0, cerrada: 0, total: finalInscripciones.length };
    finalInscripciones.forEach(function (i) {
      if (conteo[i.estado] !== undefined) { conteo[i.estado]++; }
    });
    return conteo;
  }

  function pintarDetalleFinal() {
    var detalle = document.getElementById('fin-detalle');
    if (!detalle) { return; }
    if (!finalAlumno) {
      pintarDetalleFinalVacio();
      return;
    }

    var conteo = contarFinales();
    var nombre = finalAlumno.nombre_completo || 'Alumno';
    var carrerasHtml = '';
    (finalAlumno.carreras || []).forEach(function (c) {
      carrerasHtml += '<span class="badge badge--neutral">' + esc(c.nombre_carrera_corto || c.nombre_carrera) + '</span>';
    });

    var filtros = [
      ['todas', 'Todas', conteo.total],
      ['activa', 'Activas', conteo.activa],
      ['baja', 'Dadas de baja', conteo.baja],
      ['cerrada', 'Cerradas', conteo.cerrada]
    ];

    var tabsHtml = '';
    filtros.forEach(function (f) {
      tabsHtml +=
        '<button type="button" class="val-tab' + (finalFiltro === f[0] ? ' is-active' : '') + '" data-filtro="' + f[0] + '">' +
          esc(f[1]) + ' <span>' + f[2] + '</span>' +
        '</button>';
    });

    detalle.innerHTML =
      '<div class="card val-detalle__head">' +
        '<div class="card__body">' +
          '<div class="val-detalle__cabecera">' +
            '<div class="val-detalle__identidad">' +
              '<h2 class="val-detalle__nombre">' + esc(nombre) + '</h2>' +
              '<p class="val-detalle__meta">DNI ' + esc(finalAlumno.numero_documento || '-') +
                (finalAlumno.legajo ? ' · Legajo ' + esc(finalAlumno.legajo) : '') +
                (finalAlumno.email ? ' · ' + esc(finalAlumno.email) : '') +
              '</p>' +
              (carrerasHtml ? '<div class="val-detalle__carreras">' + carrerasHtml + '</div>' : '') +
            '</div>' +
            '<div class="finales__cabecera-acciones">' +
              '<button type="button" class="btn btn--primary" id="fin-nueva"><i data-lucide="plus"></i> Nueva inscripción</button>' +
              '<div class="val-resumen">' +
                '<div class="val-resumen__item"><span class="val-resumen__num">' + conteo.activa + '</span><span>Activas</span></div>' +
                '<div class="val-resumen__item"><span class="val-resumen__num">' + conteo.baja + '</span><span>Bajas</span></div>' +
                '<div class="val-resumen__item"><span class="val-resumen__num">' + conteo.total + '</span><span>Total</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="val-tabs">' + tabsHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<div id="fin-lista"></div>';

    iconos(detalle);

    document.getElementById('fin-nueva').addEventListener('click', function () {
      abrirFormularioFinal(null);
    });

    var tabs = detalle.querySelectorAll('[data-filtro]');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        finalFiltro = this.getAttribute('data-filtro');
        pintarDetalleFinal();
      });
    }

    pintarListaFinales();
  }

  function pintarListaFinales() {
    var cont = document.getElementById('fin-lista');
    if (!cont) { return; }

    var lista = finalInscripciones.filter(function (i) {
      return finalFiltro === 'todas' || i.estado === finalFiltro;
    });

    if (!lista.length) {
      var titulo = finalInscripciones.length ? 'Sin inscripciones en este filtro' : 'Sin inscripciones a finales';
      var texto = finalInscripciones.length
        ? 'Probá con otro filtro para ver las inscripciones del alumno.'
        : 'Este alumno todavía no tiene finales registrados.';
      var accion = finalInscripciones.length
        ? ''
        : '<div class="empty__action"><button type="button" class="btn btn--primary" id="fin-nueva-vacio">' +
            '<i data-lucide="plus"></i> Nueva inscripción' +
          '</button></div>';

      cont.innerHTML =
        '<div class="empty">' +
          '<div class="empty__icon"><i data-lucide="calendar-x"></i></div>' +
          '<div class="empty__title">' + titulo + '</div>' +
          '<p class="empty__text">' + texto + '</p>' +
          accion +
        '</div>';
      iconos(cont);

      var b = document.getElementById('fin-nueva-vacio');
      if (b) { b.addEventListener('click', function () { abrirFormularioFinal(null); }); }
      return;
    }

    var html = '<div class="final-lista">';
    lista.forEach(function (i) {
      var clases = 'final-item';
      if (i.estado === 'baja') { clases += ' final-item--baja'; }
      if (i.estado === 'cerrada') { clases += ' final-item--cerrada'; }

      var badges = '<span class="badge ' + esc(i.badge) + '">' + esc(i.estado_texto) + '</span>';
      if (!i.verificada) { badges += '<span class="badge badge--warning">Sin verificar</span>'; }
      if (i.final_aprobada) { badges += '<span class="badge badge--info">Final aprobada</span>'; }

      var acciones = '';
      if (i.puede_editar) {
        acciones += '<button type="button" class="btn btn--outline btn--sm" data-editar="' + i.id_inscripcion + '">' +
                      '<i data-lucide="pencil"></i> Editar' +
                    '</button>';
      }
      if (i.puede_baja) {
        acciones += '<button type="button" class="btn btn--ghost btn--sm text-danger" data-estado="B" data-id="' + i.id_inscripcion + '">' +
                      '<i data-lucide="x-circle"></i> Dar de baja' +
                    '</button>';
      }
      if (i.puede_reactivar) {
        acciones += '<button type="button" class="btn btn--outline btn--sm text-success" data-estado="A" data-id="' + i.id_inscripcion + '">' +
                      '<i data-lucide="check-circle-2"></i> Reactivar' +
                    '</button>';
      }

      html +=
        '<article class="' + clases + '">' +
          '<div class="final-item__main">' +
            '<div class="final-item__title">' +
              '<span class="final-item__materia">' + esc(i.materia) + '</span>' +
              badges +
            '</div>' +
            '<p class="final-item__meta">' + esc(i.carrera) + '</p>' +
            '<p class="final-item__meta">Año ' + esc(i.anio) + ' · ' + esc(i.turno) + ' · ' + esc(i.llamado_texto) + '</p>' +
            '<p class="final-item__extra">Inscripto el ' + esc(fechaHoraCorta(i.fecha_hora)) + '</p>' +
          '</div>' +
          '<div class="final-item__actions">' + acciones + '</div>' +
        '</article>';
    });
    html += '</div>';

    cont.innerHTML = html;
    iconos(cont);

    var editables = cont.querySelectorAll('[data-editar]');
    for (var e = 0; e < editables.length; e++) {
      editables[e].addEventListener('click', function () {
        var id = Number(this.getAttribute('data-editar'));
        var inscripcion = finalInscripciones.filter(function (i) {
          return Number(i.id_inscripcion) === id;
        })[0];
        if (inscripcion) { abrirFormularioFinal(inscripcion); }
      });
    }

    var estados = cont.querySelectorAll('[data-estado]');
    for (var s = 0; s < estados.length; s++) {
      estados[s].addEventListener('click', function () {
        var id = Number(this.getAttribute('data-id'));
        var estado = this.getAttribute('data-estado');
        var inscripcion = finalInscripciones.filter(function (i) {
          return Number(i.id_inscripcion) === id;
        })[0];
        if (inscripcion) { cambiarEstadoFinal(inscripcion, estado); }
      });
    }
  }

  function abrirFormularioFinal(inscripcion) {
    if (!finalAlumno || !finalOpciones) {
      toastError('Primero seleccioná un alumno.');
      return;
    }
    if (!finalOpciones.carreras || !finalOpciones.carreras.length) {
      toastError('El alumno no tiene carreras asociadas para inscribir un final.');
      return;
    }

    var esNuevo = !inscripcion;
    var idInscripcion = inscripcion ? inscripcion.id_inscripcion : null;

    var carrerasHtml = '';
    finalOpciones.carreras.forEach(function (c) {
      carrerasHtml += '<option value="' + c.id_carrera + '">' + esc(c.nombre_carrera) + '</option>';
    });

    var turnosHtml = '';
    (finalOpciones.turnos || []).forEach(function (t) {
      turnosHtml += '<option value="' + t.id_turno + '">' + esc(t.turno) + '</option>';
    });

    var anios = (finalOpciones.anios || []).slice();
    if (inscripcion && anios.indexOf(inscripcion.anio) === -1) { anios.push(inscripcion.anio); }
    if (!anios.length) { anios.push(new Date().getFullYear()); }
    anios.sort(function (a, b) { return b - a; });
    var aniosHtml = '';
    anios.forEach(function (a) {
      aniosHtml += '<option value="' + a + '">' + a + '</option>';
    });

    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="modal__dialog modal__dialog--wide">' +
        '<form class="modal__form" id="fin-form" novalidate>' +
          '<div class="modal__header">' +
            '<span class="modal__icon modal__icon--warning"><i data-lucide="' + (esNuevo ? 'plus' : 'pencil') + '"></i></span>' +
            '<div class="modal__head-text">' +
              '<div class="modal__title">' + (esNuevo ? 'Nueva inscripción a final' : 'Editar inscripción a final') + '</div>' +
            '</div>' +
            '<button type="button" class="modal__close btn btn--ghost btn--icon btn--sm" data-cerrar aria-label="Cerrar"><i data-lucide="x"></i></button>' +
          '</div>' +
          '<div class="modal__body">' +
            '<div class="grid grid--2">' +
              '<div class="field field--full">' +
                '<label class="label" for="fin-carrera">Carrera</label>' +
                '<select class="select" id="fin-carrera">' + carrerasHtml + '</select>' +
              '</div>' +
              '<div class="field field--full">' +
                '<label class="label" for="fin-materia">Materia</label>' +
                '<select class="select" id="fin-materia"></select>' +
                '<p class="field__hint" id="fin-materia-hint"></p>' +
              '</div>' +
              '<div class="field">' +
                '<label class="label" for="fin-anio">Año</label>' +
                '<select class="select" id="fin-anio">' + aniosHtml + '</select>' +
              '</div>' +
              '<div class="field">' +
                '<label class="label" for="fin-turno">Turno</label>' +
                '<select class="select" id="fin-turno">' + turnosHtml + '</select>' +
              '</div>' +
              '<div class="field">' +
                '<label class="label" for="fin-llamado">Llamado</label>' +
                '<select class="select" id="fin-llamado">' +
                  '<option value="1">1.º llamado</option>' +
                  '<option value="2">2.º llamado</option>' +
                '</select>' +
              '</div>' +
              '<div class="field field--full">' +
                '<p class="field__hint" id="fin-mesa-hint"></p>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal__footer">' +
            '<button type="button" class="btn btn--outline" data-cerrar>Cancelar</button>' +
            '<button type="submit" class="btn btn--primary" id="fin-guardar"><i data-lucide="check-circle-2"></i> Guardar</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    document.body.appendChild(modal);
    bloquearScrollPagina();
    iconos(modal);

    var selCarrera = modal.querySelector('#fin-carrera');
    var selMateria = modal.querySelector('#fin-materia');
    var selAnio = modal.querySelector('#fin-anio');
    var selTurno = modal.querySelector('#fin-turno');
    var selLlamado = modal.querySelector('#fin-llamado');
    var hintMateria = modal.querySelector('#fin-materia-hint');
    var hintMesa = modal.querySelector('#fin-mesa-hint');

    function cerrar() {
      modal.classList.remove('is-open');
      document.removeEventListener('keydown', alTeclado);
      window.setTimeout(function () {
        if (modal.parentNode) { modal.parentNode.removeChild(modal); }
        liberarScrollPagina();
      }, 180);
    }
    function alTeclado(e) { if (e.key === 'Escape') { cerrar(); } }

    function pintarMaterias(idCarrera, idSeleccionada) {
      var carrera = finalOpciones.carreras.filter(function (c) {
        return Number(c.id_carrera) === Number(idCarrera);
      })[0];

      selMateria.innerHTML = '';
      if (!carrera || !carrera.materias || !carrera.materias.length) {
        selMateria.innerHTML = '<option value="">Sin materias en el plan</option>';
        hintMateria.textContent = 'No hay materias cargadas para esta carrera.';
        return;
      }

      var haySeleccion = false;
      carrera.materias.forEach(function (m) {
        var otraActiva = m.inscripcion_activa
          && (!idInscripcion || Number(m.inscripcion_activa) !== Number(idInscripcion));
        var bloqueada = m.final_aprobada || otraActiva;

        var etiqueta = m.nombre_materia + ' — ' + m.anio_cursada + '.º año';
        if (m.final_aprobada) {
          etiqueta += ' (final aprobada)';
        } else if (otraActiva) {
          etiqueta += ' (ya inscripto)';
        }

        var sel = idSeleccionada !== null && idSeleccionada !== undefined
          && Number(m.id_materia) === Number(idSeleccionada) ? ' selected' : '';
        if (sel) { haySeleccion = true; }

        selMateria.innerHTML +=
          '<option value="' + m.id_materia + '"' + sel + (bloqueada ? ' disabled' : '') + '>' +
            esc(etiqueta) +
          '</option>';
      });

      if (!haySeleccion) {
        var primera = selMateria.querySelector('option:not([disabled])');
        if (primera) { primera.selected = true; }
      }

      var elegida = carrera.materias.filter(function (m) {
        return Number(m.id_materia) === Number(selMateria.value);
      })[0];
      if (!elegida) {
        hintMateria.textContent = 'No hay materias disponibles para inscribir.';
      } else if (!elegida.regular && !elegida.matriculada) {
        hintMateria.textContent = 'Atención: la materia no figura como cursada regular del alumno.';
      } else if (!elegida.regular) {
        hintMateria.textContent = 'Atención: la cursada no está marcada como regular.';
      } else {
        hintMateria.textContent = '';
      }
    }

    function pintarMesa() {
      var anio = Number(selAnio.value);
      var idTurno = Number(selTurno.value);
      var mesa = (finalOpciones.mesas || []).filter(function (m) {
        return Number(m.anio_mesas) === anio && Number(m.id_turno) === idTurno;
      })[0];

      if (!mesa) {
        hintMesa.textContent = 'No hay parámetros de mesa cargados para ese año y turno.';
        return;
      }

      var texto = 'Mesa: ' + (mesa.fecha_inicio ? fechaCorta(mesa.fecha_inicio) : 'sin fecha de inicio') +
        ' al ' + (mesa.fecha_fin ? fechaCorta(mesa.fecha_fin) : 'sin fecha de fin');
      if (mesa.tope_mesas !== null && mesa.tope_mesas !== undefined) {
        texto += ' · Tope: ' + mesa.tope_mesas;
      }
      hintMesa.textContent = texto;
    }

    selCarrera.value = inscripcion ? String(inscripcion.id_carrera) : String(finalOpciones.carreras[0].id_carrera);
    selAnio.value = String(inscripcion ? inscripcion.anio : anios[0]);
    selTurno.value = String(inscripcion ? inscripcion.id_turno : (finalOpciones.turnos[0] ? finalOpciones.turnos[0].id_turno : ''));
    selLlamado.value = String(inscripcion ? inscripcion.id_llamado : 1);

    pintarMaterias(selCarrera.value, inscripcion ? inscripcion.id_materia : null);
    pintarMesa();

    selCarrera.addEventListener('change', function () {
      pintarMaterias(this.value, null);
    });
    selMateria.addEventListener('change', function () {
      var carrera = finalOpciones.carreras.filter(function (c) {
        return Number(c.id_carrera) === Number(selCarrera.value);
      })[0];
      var materia = carrera ? carrera.materias.filter(function (m) {
        return Number(m.id_materia) === Number(selMateria.value);
      })[0] : null;
      if (!materia) {
        hintMateria.textContent = '';
      } else if (!materia.regular && !materia.matriculada) {
        hintMateria.textContent = 'Atención: la materia no figura como cursada regular del alumno.';
      } else if (!materia.regular) {
        hintMateria.textContent = 'Atención: la cursada no está marcada como regular.';
      } else {
        hintMateria.textContent = '';
      }
    });
    selAnio.addEventListener('change', pintarMesa);
    selTurno.addEventListener('change', pintarMesa);

    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('[data-cerrar]')) { cerrar(); }
    });
    document.addEventListener('keydown', alTeclado);

    modal.querySelector('#fin-form').addEventListener('submit', function (e) {
      e.preventDefault();

      var idCarrera = Number(selCarrera.value);
      var idMateria = Number(selMateria.value);
      var anio = Number(selAnio.value);
      var idTurno = Number(selTurno.value);
      var idLlamado = Number(selLlamado.value);

      if (!idCarrera || !idMateria || !anio || !idTurno || !idLlamado) {
        toastError('Completá carrera, materia, año, turno y llamado.');
        return;
      }

      var cuerpo = {
        accion: 'guardar',
        id_alumno: finalAlumno.id_alumno,
        id_carrera: idCarrera,
        id_materia: idMateria,
        anio: anio,
        id_turno: idTurno,
        id_llamado: idLlamado
      };
      if (idInscripcion) { cuerpo.id_inscripcion = idInscripcion; }

      var btn = modal.querySelector('#fin-guardar');
      btn.disabled = true;
      btn.classList.add('is-loading');

      apiFinalesPost(cuerpo)
        .then(function (r) {
          btn.disabled = false;
          btn.classList.remove('is-loading');
          if (!r.ok) {
            toastError(r.mensaje || 'No se pudo guardar la inscripción.');
            return;
          }

          cerrar();
          toast({ tipo: 'success', titulo: 'Listo', texto: r.mensaje });
          var id = finalAlumno.id_alumno;
          seleccionarAlumnoFinal(id);
          var buscar = document.getElementById('fin-buscar');
          cargarAlumnosFinales(buscar ? buscar.value.trim() : '');
        })
        .catch(function () {
          btn.disabled = false;
          btn.classList.remove('is-loading');
          toastError('Error de red o del servidor.');
        });
    });

    requestAnimationFrame(function () {
      modal.classList.add('is-open');
      selCarrera.focus();
    });
  }

  function cambiarEstadoFinal(inscripcion, estado) {
    if (!inscripcion) { return; }

    var esBaja = estado === 'B';
    var ejecutar = function () {
      apiFinalesPost({
        accion: 'estado',
        id_inscripcion: inscripcion.id_inscripcion,
        estado: estado
      }).then(function (r) {
        if (!r.ok) {
          toastError(r.mensaje || 'No se pudo actualizar la inscripción.');
          return;
        }

        toast({ tipo: 'success', titulo: 'Listo', texto: r.mensaje });
        var id = inscripcion.id_alumno;
        seleccionarAlumnoFinal(id);
        var buscar = document.getElementById('fin-buscar');
        cargarAlumnosFinales(buscar ? buscar.value.trim() : '');
      }).catch(function () {
        toastError('Error de red o del servidor.');
      });
    };

    if (!esBaja) {
      ejecutar();
      return;
    }

    confirmar({
      titulo: '¿Dar de baja la inscripción?',
      texto: inscripcion.materia + ' · ' + inscripcion.turno + ' · ' + inscripcion.llamado_texto,
      confirmar: 'Dar de baja',
      tipo: 'danger'
    }).then(function (ok) { if (ok) { ejecutar(); } });
  }

  function pintarUsuario(usuario) {
    var nombre = ((usuario.nombre || '') + ' ' + (usuario.apellido || '')).trim();
    if (!nombre) { nombre = usuario.usuario || 'Preceptor'; }
    var nombreEl = document.getElementById('panel-usuario-nombre');
    var avatarEl = document.getElementById('panel-usuario-avatar');
    if (nombreEl) { nombreEl.textContent = nombre; }
    if (avatarEl) { avatarEl.textContent = iniciales(nombre); }
  }

  function verificarAcceso() {
    return fetch('controlador/verificar_sesion.php')
      .then(function (r) { return r.json(); })
      .then(function (datos) {
        if (!datos.ok || !datos.usuario) { return null; }
        var u = datos.usuario;
        if (u.tipo !== 'personal' || u.rol !== 'preceptor') { return null; }
        return u;
      })
      .catch(function () { return null; });
  }

  function cerrarSesion() {
    fetch('controlador/cerrar_sesion.php', { method: 'POST' })
      .catch(function () { /* ignorar */ })
      .then(function () { window.location.href = 'login.html'; });
  }

  function iniciarPanel() {
    var cargando = document.getElementById('cargando');
    if (cargando) { cargando.classList.add('oculto'); }
    document.getElementById('admin').classList.remove('oculto');
    renderNav();
    activarValidacion();
  }

  function cargarEsquema() {
    apiGet({ accion: 'esquema' })
      .then(function (r) {
        if (!r.ok || !r.entidades) {
          toastError(r.mensaje || 'No se pudo cargar el esquema de administración.');
          return;
        }
        esquema = r.entidades;
        porClave = {};
        esquema.forEach(function (e) { porClave[e.clave] = e; });
        renderNav();
      })
      .catch(function () {
        toastError('No se pudo cargar el esquema de administración.');
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    iconos();

    var btnSalir = document.getElementById('btn-cerrar-sesion');
    if (btnSalir) {
      btnSalir.addEventListener('click', function () {
        confirmar({
          titulo: '¿Cerrar sesión?',
          texto: 'Vas a salir del panel de preceptores.',
          confirmar: 'Cerrar sesión',
          tipo: 'danger'
        }).then(function (ok) { if (ok) { cerrarSesion(); } });
      });
    }

    verificarAcceso().then(function (usuario) {
      if (!usuario) {
        window.location.href = 'login.html';
        return;
      }
      pintarUsuario(usuario);
      iniciarPanel();
      cargarEsquema();
    });
  });
})();
