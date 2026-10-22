/**
 * abm.js — Panel de administración genérico de Clementina.
 *
 * Consume controlador/abm.php. El esquema (entidades y campos) llega desde el
 * servidor, así que la interfaz se arma sola: barra lateral de entidades,
 * tabla de registros y formulario en un modal.
 */
(function () {
  'use strict';

  var esquema = [];
  var porClave = {};
  var actual = null;
  var filas = [];
  var timerBuscar = null;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function apiGet(params) {
    var q = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch(App.controlador('abm.php') + '?' + q).then(function (r) { return r.json(); });
  }

  function apiPost(obj) {
    return fetch(App.controlador('abm.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }).then(function (r) { return r.json(); });
  }

  /* =============================== Barra lateral =============================== */

  function renderNav() {
    var grupos = [];
    var indice = {};
    esquema.forEach(function (e) {
      if (!indice[e.grupo]) { indice[e.grupo] = []; grupos.push(e.grupo); }
      indice[e.grupo].push(e);
    });

    var html = '';
    grupos.forEach(function (g) {
      html += '<div class="admin__group">';
      html += '<div class="admin__group-title">' + esc(g) + '</div>';
      indice[g].forEach(function (e) {
        html += '<button type="button" class="admin__nav-item" data-clave="' + esc(e.clave) + '">' +
                  esc(e.titulo) +
                '</button>';
      });
      html += '</div>';
    });

    var nav = document.getElementById('admin-nav');
    nav.innerHTML = html;
    nav.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.admin__nav-item');
      if (btn) { seleccionar(btn.getAttribute('data-clave')); }
    });
  }

  function marcarActivo(clave) {
    var items = document.querySelectorAll('.admin__nav-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-active', items[i].getAttribute('data-clave') === clave);
    }
  }

  /* =============================== Panel =============================== */

  function seleccionar(clave) {
    actual = porClave[clave];
    if (!actual) { return; }
    marcarActivo(clave);
    renderPanel();
    cargarFilas('');
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
            '<input class="input" type="search" id="abm-buscar" placeholder="Buscar…" value="' + esc(buscar || '') + '">' +
          '</div>' +
          '<button type="button" class="btn btn--primary" id="abm-nuevo"><i data-lucide="plus"></i> Nuevo</button>' +
        '</div>' +
      '</div>' +
      '<div id="abm-tabla"></div>';

    App.iconos(panel);

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
          '<p class="empty__text">No hay datos para mostrar en «' + esc(actual.titulo) + '». Podés crear el primero.</p>' +
          '<div class="empty__action"><button type="button" class="btn btn--primary" id="abm-nuevo-vacio"><i data-lucide="plus"></i> Nuevo</button></div>' +
        '</div>';
      App.iconos(cont);
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
    App.iconos(cont);

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
    else if (campo.tipo === 'tel') { tipo = 'tel'; }
    else if (campo.tipo === 'password') { tipo = 'password'; }

    var pista = campo.tipo === 'password'
      ? (valor ? 'Dejá vacío para conservar la actual.' : (campo.pista || ''))
      : (campo.pista || '');

    return '<input class="input" type="' + tipo + '" id="' + id + '" data-col="' + esc(campo.col) + '" value="' + esc(val) + '"' + req + extra + '>' +
           (pista ? '<p class="field__hint">' + esc(pista) + '</p>' : '');
  }

  function campoHtml(campo, valor, esNuevo) {
    // Clave autoincremental: oculta al crear, de solo lectura al editar.
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
    App.iconos(modal);

    function cerrar() {
      modal.classList.remove('is-open');
      document.removeEventListener('keydown', alTeclado);
      window.setTimeout(function () { if (modal.parentNode) { modal.parentNode.removeChild(modal); } }, 180);
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
          App.toast({ tipo: 'success', titulo: 'Listo', texto: r.mensaje });
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
    App.confirmar({
      titulo: '¿Eliminar ' + etiqueta + '?',
      texto: 'Esta acción no se puede deshacer.',
      confirmar: 'Eliminar',
      tipo: 'danger'
    }).then(function (ok) {
      if (!ok) { return; }
      apiPost({ accion: 'eliminar', entidad: actual.clave, pk: pkDe(fila) })
        .then(function (r) {
          if (r.ok) {
            App.toast({ tipo: 'success', titulo: 'Eliminado', texto: r.mensaje });
            cargarFilas(document.getElementById('abm-buscar').value);
          } else {
            toastError(r.mensaje || 'No se pudo eliminar.');
          }
        })
        .catch(function () { toastError('Error de red o del servidor.'); });
    });
  }

  function toastError(texto) {
    App.toast({ tipo: 'error', titulo: 'Error', texto: texto });
  }

  /* =============================== Arranque =============================== */

  function cargarEsquema() {
    apiGet({ accion: 'esquema' })
      .then(function (r) {
        if (!r.ok || !r.entidades) { toastError(r.mensaje || 'No se pudo cargar el esquema.'); return; }
        esquema = r.entidades;
        esquema.forEach(function (e) { porClave[e.clave] = e; });
        document.getElementById('cargando').classList.add('oculto');
        document.getElementById('admin').classList.remove('oculto');
        renderNav();
        if (esquema.length) { seleccionar(esquema[0].clave); }
      })
      .catch(function () { toastError('No se pudo cargar el esquema.'); });
  }

  App.montarLayout({ protegida: true }).then(function (usuario) {
    if (!usuario) { return; }
    var esPreceptor = usuario.tipo === 'personal' && usuario.rol === 'preceptor';
    if (!esPreceptor) {
      App.toast({ tipo: 'error', titulo: 'Acceso denegado', texto: 'No tenés permisos para administrar los datos.' });
      window.setTimeout(function () { window.location.href = App.raiz() + '/index.html'; }, 1200);
      return;
    }
    cargarEsquema();
  });
})();
