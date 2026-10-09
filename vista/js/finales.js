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
    return p.length === 3 && p[0] !== '0000' ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }

  /* Días que faltan hasta una fecha "AAAA-MM-DD" (0 = es hoy, negativo = ya pasó). */
  function diasHasta(iso) {
    var p = String(iso || '').substring(0, 10).split('-');
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((new Date(+p[0], p[1] - 1, +p[2]) - hoy) / 86400000);
  }

  function plazo(dias) {
    return dias <= 0 ? 'hoy' : dias === 1 ? 'mañana' : 'en ' + dias + ' días';
  }

  /* Para buscar sin importar mayúsculas ni tildes. */
  function sinAcentos(texto) {
    return String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
      var paraAbrir = diasHasta(periodo.fecha_inicio);
      if (paraAbrir > 0) {
        return alerta('info', 'calendar-clock',
          turno + ' — la inscripción todavía no abrió. Abre el ' + fecha(periodo.fecha_inicio) +
          ' (' + plazo(paraAbrir) + ').');
      }
      return alerta('warning', 'alert-triangle',
        turno + ' — la inscripción está cerrada (' + rango + '). Ya no se pueden hacer cambios.');
    }

    var cupo = '';
    if (periodo.tope > 0) {
      cupo = ' Llevás ' + cantidad + ' de ' + periodo.tope + ' mesas' +
             (cantidad >= periodo.tope ? ': llegaste al máximo del turno.' : '.');
    }

    /* Los últimos días el aviso pasa a amarillo para que no se pase la fecha. */
    var cierre = diasHasta(periodo.fecha_fin);
    var urgente = cierre <= 3;
    var cuando = 'Cierra ' + plazo(cierre) + '.';
    return alerta(urgente ? 'warning' : 'success', urgente ? 'clock' : 'check-circle-2',
      turno + ' — inscripción abierta ' + rango + '. ' +
      (urgente ? '<strong>' + cuando + '</strong>' : cuando) + cupo);
  }

  /* Error al cargar, con un botón para volver a intentar sin recargar la página. */
  function errorDeCarga(contenedor, mensaje) {
    contenedor.innerHTML =
      alerta('error', 'x-circle', esc(mensaje || 'Error de red o del servidor.')) +
      '<div class="mt-3"><button type="button" class="btn btn--outline btn--sm" data-accion="reintentar">' +
      'Reintentar</button></div>';
    App.iconos(contenedor);
  }

  /* true si el alumno ya llegó al tope de mesas del turno. */
  function sinCupo(datos) {
    return !!datos.periodo && datos.periodo.tope > 0 &&
           datos.inscripciones.length >= datos.periodo.tope;
  }

  /* Con un solo llamado no hace falta elegirlo ni mostrarlo. */
  function variosLlamados(datos) {
    return Object.keys(datos.llamados).length > 1;
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

  /*
   * Una materia en la lista: nombre y carrera arriba, detalle en una línea
   * y el estado debajo. `detalle` es una lista de textos ya escapados.
   */
  function item(m, detalle, estado, accion) {
    return '<li class="exam-item">' +
             '<div class="exam-item__body">' +
               '<div class="exam-item__title">' + esc(m.materia) + '</div>' +
               '<div class="exam-item__meta"><span>' + esc(m.carrera) + '</span></div>' +
               '<div class="exam-item__meta">' +
                 detalle.filter(Boolean).map(function (d) { return '<span>' + d + '</span>'; }).join('') +
               '</div>' +
               '<div class="mt-2">' + estado + '</div>' +
             '</div>' +
             (accion ? '<div class="exam-item__side">' + accion + '</div>' : '') +
           '</li>';
  }

  function botonCancelar(m) {
    return '<button type="button" class="btn btn--outline btn--sm" data-accion="cancelar"' +
           datosFila(m) + '>Cancelar</button>';
  }

  function datosFila(m) {
    return ' data-carrera="' + m.id_carrera + '" data-materia="' + m.id_materia +
           '" data-nombre="' + esc(m.materia) + '"';
  }

  /* ------------------------------------------------------------------ */
  /* Inscripción a finales                                               */
  /* ------------------------------------------------------------------ */

  /* inscripto | correlativas | cerrado | disponible */
  function estadoMateria(m, datos) {
    if (m.llamado !== null) { return 'inscripto'; }
    if (m.correlativas.length) { return 'correlativas'; }
    return datos.periodo && datos.periodo.abierto ? 'disponible' : 'cerrado';
  }

  function itemMateria(m, datos) {
    var varios = variosLlamados(datos);
    var tipo = estadoMateria(m, datos);
    var estado;
    var accion = '';

    if (tipo === 'inscripto') {
      estado = '<span class="badge badge--success">Inscripto' +
               (varios ? ' · ' + esc(datos.llamados[m.llamado] || '') : '') + '</span>';
      if (datos.periodo && datos.periodo.abierto) { accion = botonCancelar(m); }
    } else if (tipo === 'correlativas') {
      estado = '<span class="badge badge--warning">Faltan correlativas</span>' +
               '<div class="muted" style="font-size: .75rem; margin-top: 4px;">Te falta aprobar: ' +
               esc(m.correlativas.join(', ')) + '</div>';
    } else if (tipo === 'cerrado') {
      estado = '<span class="badge badge--neutral">Cerrado</span>';
    } else {
      var lleno = sinCupo(datos);
      estado = '<span class="badge badge--info">Disponible</span>';
      if (varios && !lleno) {
        accion = '<select class="select" style="width: auto;" aria-label="Llamado para ' + esc(m.materia) + '">' +
                 Object.keys(datos.llamados).map(function (id) {
                   return '<option value="' + id + '">' + esc(datos.llamados[id]) + '</option>';
                 }).join('') + '</select>';
      }
      accion += '<button type="button" class="btn btn--primary btn--sm" data-accion="inscribir"' +
                datosFila(m) + ' data-condicion="' + esc(m.condicion) + '"' +
                (lleno ? ' disabled title="Llegaste al máximo de mesas de este turno."' : '') +
                '>Inscribirme</button>';
    }

    return item(m, [esc(m.condicion)], estado, accion);
  }

  /* Lista separada por año de cursada (y por carrera, si el alumno tiene más de una). */
  function grupos(materias, datos) {
    var variasCarreras = datos.materias.some(function (m) {
      return m.id_carrera !== datos.materias[0].id_carrera;
    });
    var html = '';
    var clave = null;

    materias.forEach(function (m) {
      var actual = m.id_carrera + '-' + m.anio_cursada;
      if (actual !== clave) {
        html += (clave === null ? '' : '</ul>') +
                '<p class="stat__label ' + (clave === null ? 'mb-2' : 'mt-4 mb-2') + '">' +
                (variasCarreras ? esc(m.carrera) + ' · ' : '') + esc(m.anio_cursada) + '.º año</p>' +
                '<ul class="table-wrap">';
        clave = actual;
      }
      html += itemMateria(m, datos);
    });

    return html + '</ul>';
  }

  function iniciarInscripcion() {
    var cajaPeriodo = document.getElementById('periodo');
    var cajaMaterias = document.getElementById('materias');
    var cajaFiltros = document.getElementById('filtros');
    var cajaBuscar = document.getElementById('caja-buscar');
    var campoBuscar = document.getElementById('buscar-materia');
    var selectorAnio = document.getElementById('filtro-anio');
    var ultimo = null;        /* última respuesta del servidor */
    var filtro = 'todas';     /* todas | puedo | anotadas */

    /* Arma el desplegable con los años que tiene el alumno, sin perder el elegido. */
    function cargarAnios() {
      var elegido = selectorAnio.value;
      var anios = [];
      ultimo.materias.forEach(function (m) {
        if (anios.indexOf(m.anio_cursada) === -1) { anios.push(m.anio_cursada); }
      });
      anios.sort(function (a, b) { return a - b; });

      selectorAnio.innerHTML = '<option value="">Todos los años</option>' +
        anios.map(function (a) { return '<option value="' + esc(a) + '">' + esc(a) + '.º año</option>'; }).join('');
      selectorAnio.value = anios.map(String).indexOf(elegido) > -1 ? elegido : '';

      selectorAnio.hidden = anios.length < 2;                 /* con un solo año no hay qué filtrar */
      cajaBuscar.hidden = ultimo.materias.length <= 8;        /* con pocas materias no hace falta */
    }

    /* Dibuja la lista con el filtro y la búsqueda actuales, sin volver a pedir datos. */
    function pintar() {
      var anio = selectorAnio.value;
      var delAnio = ultimo.materias.filter(function (m) {
        return !anio || String(m.anio_cursada) === anio;
      });
      var estados = delAnio.map(function (m) { return estadoMateria(m, ultimo); });

      /* Los contadores de los botones respetan el año elegido. */
      var cuenta = {
        todas: estados.length,
        puedo: estados.filter(function (e) { return e === 'disponible'; }).length,
        anotadas: estados.filter(function (e) { return e === 'inscripto'; }).length
      };

      cajaFiltros.querySelectorAll('[data-filtro]').forEach(function (boton) {
        var nombre = boton.getAttribute('data-filtro');
        boton.setAttribute('aria-pressed', nombre === filtro ? 'true' : 'false');
        boton.querySelector('[data-cuenta]').textContent = '(' + cuenta[nombre] + ')';
      });

      var buscado = sinAcentos(campoBuscar.value.trim());
      var visibles = delAnio.filter(function (m, i) {
        if (filtro === 'puedo' && estados[i] !== 'disponible') { return false; }
        if (filtro === 'anotadas' && estados[i] !== 'inscripto') { return false; }
        return !buscado || sinAcentos(m.materia).indexOf(buscado) > -1;
      });

      cajaMaterias.innerHTML = visibles.length
        ? grupos(visibles, ultimo)
        : vacio('search', 'No hay materias para mostrar',
            'Probá con otro filtro o borrá la búsqueda.',
            '<button type="button" class="btn btn--outline" data-accion="ver-todas">Ver todas</button>');

      App.iconos();
    }

    function dibujar() {
      return cargar().then(function (datos) {
        if (!datos.ok) {
          cajaPeriodo.innerHTML = '';
          cajaFiltros.hidden = true;
          errorDeCarga(cajaMaterias, datos.mensaje);
          return;
        }

        ultimo = datos;
        cajaPeriodo.innerHTML = alertaPeriodo(datos.periodo, datos.inscripciones.length);
        cajaFiltros.hidden = !datos.materias.length;
        cargarAnios();

        if (!datos.materias.length) {
          cajaMaterias.innerHTML = vacio('calendar-x', 'No hay materias para rendir',
            'No encontramos materias pendientes de final en tus carreras.');
          App.iconos();
          return;
        }

        pintar();
      }).catch(function () {
        cajaFiltros.hidden = true;
        errorDeCarga(cajaMaterias);
      });
    }

    cajaFiltros.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-filtro]');
      if (!boton) { return; }
      filtro = boton.getAttribute('data-filtro');
      pintar();
    });

    campoBuscar.addEventListener('input', pintar);
    selectorAnio.addEventListener('change', pintar);

    cajaMaterias.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-accion]');
      if (!boton) { return; }

      var accion = boton.getAttribute('data-accion');
      if (accion === 'reintentar') { dibujar(); return; }
      if (accion === 'cancelar') { cancelar(boton, dibujar); return; }
      if (accion === 'ver-todas') {
        filtro = 'todas';
        campoBuscar.value = '';
        selectorAnio.value = '';
        pintar();
        return;
      }

      /* Inscribirse pide confirmación: en el celular es fácil tocar el botón sin querer. */
      var selector = boton.closest('.exam-item').querySelector('select');
      var llamado = selector ? selector.value : Object.keys(ultimo.llamados)[0];
      var tope = ultimo.periodo.tope;
      var quedan = tope - ultimo.inscripciones.length - 1;

      App.confirmar({
        titulo: '¿Inscribirte a este final?',
        texto: 'Vas a anotarte en la mesa de ' + boton.getAttribute('data-nombre') +
               ' como ' + boton.getAttribute('data-condicion').toLowerCase() + '.' +
               (tope <= 0 ? ''
                 : quedan <= 0 ? ' Con esta llegás al máximo de mesas del turno.'
                 : ' Después de esta te ' + (quedan === 1 ? 'queda 1 mesa' : 'quedan ' + quedan + ' mesas') +
                   ' en el turno.'),
        confirmar: 'Inscribirme',
        cancelar: 'Volver'
      }).then(function (ok) {
        if (!ok) { return; }
        ejecutar(boton, {
          accion: 'inscribir',
          id_carrera: boton.getAttribute('data-carrera'),
          id_materia: boton.getAttribute('data-materia'),
          id_llamado: llamado
        }, dibujar);
      });
    });

    return dibujar();
  }

  /* ------------------------------------------------------------------ */
  /* Mis finales                                                         */
  /* ------------------------------------------------------------------ */

  /* Datos personales para el comprobante: mismo endpoint que "Mis datos". */
  function cargarAlumno() {
    return fetch(App.controlador('mis_datos.php'))
      .then(function (resp) { return resp.json(); })
      .then(function (resp) { return resp.ok ? resp.datos : null; })
      .catch(function () { return null; });
  }

  function unir() {
    return Array.prototype.filter.call(arguments, Boolean).join(' ');
  }

  /* La condición (Regular / Libre) viene en `materias`, no en `inscripciones`. */
  function condiciones(materias) {
    var mapa = {};
    materias.forEach(function (m) { mapa[m.id_carrera + '-' + m.id_materia] = m.condicion; });
    return mapa;
  }

  /*
   * Fila de la tabla de "Mis finales". Tipo de documento, documento y legajo
   * son del alumno; el legajo se completa solo cuando el modelo lo devuelva.
   */
  function filaInscripcion(i, datos, alumno, condicion) {
    function celda(etiqueta, valor) {
      return '<td data-label="' + etiqueta + '">' +
             (valor == null || valor === '' ? '—' : esc(valor)) + '</td>';
    }

    alumno = alumno || {};

    return '<tr>' +
             celda('Tipo de documento', alumno.tipo_documento) +
             celda('Documento', alumno.numero_documento) +
             celda('Legajo', alumno.legajo) +
             celda('Carrera', i.carrera) +
             celda('Condición', condicion) +
             '<td data-label="Materia" class="col-main"><strong>' + esc(i.materia) + '</strong></td>' +
             '<td class="col-actions">' + (datos.periodo.abierto ? botonCancelar(i) : '') + '</td>' +
           '</tr>';
  }

  /* Comprobante: solo se ve al imprimir / guardar como PDF (comprobante.css). */
  function comprobante(datos, alumno, condicion) {
    var varios = variosLlamados(datos);
    var filaAlumno = alumno
      ? '<div><dt>Alumno</dt><dd>' +
          esc(unir(alumno.primer_apellido, alumno.otros_apellidos)) + ', ' +
          esc(unir(alumno.primer_nombre, alumno.otros_nombres)) + '</dd></div>' +
        '<div><dt>Documento</dt><dd>' +
          esc(unir(alumno.tipo_documento, alumno.numero_documento)) + '</dd></div>'
      : '';

    return '<header class="comprobante__head">' +
             '<img class="comprobante__logo" src="' + App.vista('estilo/logo-isft182.svg?v=3') + '" alt="">' +
             '<div>' +
               '<p class="comprobante__marca">Clementina · ISFT N.º 182</p>' +
               '<h1>Comprobante de inscripción a finales</h1>' +
             '</div>' +
           '</header>' +
           '<dl class="comprobante__datos">' + filaAlumno +
             '<div><dt>Turno</dt><dd>' + esc(datos.periodo.turno) + ' ' + esc(datos.periodo.anio) + '</dd></div>' +
             '<div><dt>Emitido</dt><dd id="comprobante-emitido"></dd></div>' +
           '</dl>' +
           '<table class="table">' +
             '<thead><tr><th>Materia</th><th>Carrera</th><th>Condición</th>' +
             (varios ? '<th>Llamado</th>' : '') + '<th>Inscripción</th></tr></thead><tbody>' +
             datos.inscripciones.map(function (i) {
               return '<tr><td><strong>' + esc(i.materia) + '</strong></td>' +
                      '<td>' + esc(i.carrera) + '</td>' +
                      '<td>' + esc(condicion[i.id_carrera + '-' + i.id_materia] || '') + '</td>' +
                      (varios ? '<td>' + esc(i.llamado) + '</td>' : '') +
                      '<td>' + fecha(i.fecha_inscripcion) + '</td></tr>';
             }).join('') +
           '</tbody></table>';
  }

  /* Abre el diálogo de impresión: desde ahí se imprime o se guarda como PDF. */
  function imprimirComprobante() {
    var titulo = document.title;
    var ahora = new Date();

    document.getElementById('comprobante-emitido').textContent =
      ahora.toLocaleDateString('es-AR') + ' ' +
      ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

    function restaurar() {
      document.title = titulo;
      window.removeEventListener('afterprint', restaurar);
    }

    /* El título de la página es el nombre que el navegador le propone al PDF. */
    document.title = 'Comprobante de inscripción a finales';
    window.addEventListener('afterprint', restaurar);
    window.print();
  }

  function iniciarMisFinales() {
    var cajaPeriodo = document.getElementById('periodo');
    var cajaLista = document.getElementById('inscripciones');
    var cajaComprobante = document.getElementById('comprobante');
    var botonComprobante = document.getElementById('btn-comprobante');
    var botonCompartir = document.getElementById('btn-compartir');
    var ultimo = null;        /* última respuesta del servidor y datos del alumno */
    var alumno = null;
    var botonInscribir = document.getElementById('btn-inscribir');
    var destinoInscribir = botonInscribir.getAttribute('href');
    var pedidoAlumno = cargarAlumno();

    function habilitarComprobante(hay) {
      var aviso = hay ? '' : 'Necesitás al menos una inscripción para generar el comprobante.';
      botonComprobante.disabled = botonCompartir.disabled = !hay;
      botonComprobante.title = hay ? 'Descargar o imprimir el comprobante en PDF' : aviso;
      botonCompartir.title = hay ? 'Compartir el resumen de tus inscripciones' : aviso;
    }

    /* Resumen en texto plano, para mandar por WhatsApp, mail, etc. */
    function resumen() {
      var condicion = condiciones(ultimo.materias);
      var lineas = ['Inscripción a finales · I.S.F.T. N.º 182',
                    'Turno ' + ultimo.periodo.turno + ' ' + ultimo.periodo.anio];
      if (alumno) {
        lineas.push(unir(alumno.primer_apellido, alumno.otros_apellidos) + ', ' +
                    unir(alumno.primer_nombre, alumno.otros_nombres) + ' · ' +
                    unir(alumno.tipo_documento, alumno.numero_documento));
      }
      lineas.push('');
      ultimo.inscripciones.forEach(function (i) {
        var c = condicion[i.id_carrera + '-' + i.id_materia];
        lineas.push('• ' + i.materia + (c ? ' (' + c + ')' : ''));
      });
      return lineas.join('\n');
    }

    /* En el celular abre el menú de compartir; si no existe, copia el resumen. */
    function compartir() {
      var texto = resumen();
      if (navigator.share) {
        navigator.share({ title: 'Mis finales', text: texto }).catch(function () { /* canceló */ });
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function () {
          App.toast({ tipo: 'success', titulo: 'Resumen copiado', texto: 'Pegalo donde quieras compartirlo.' });
        }, function () {
          App.toast({ tipo: 'error', titulo: 'No se pudo copiar', texto: 'Descargá el comprobante y compartilo desde ahí.' });
        });
        return;
      }
      App.toast({ tipo: 'error', titulo: 'No se puede compartir desde acá',
                  texto: 'Descargá el comprobante y compartilo desde ahí.' });
    }

    /* Si no hay forma de anotarse a otra mesa, el acceso queda apagado y dice por qué. */
    function bloquearInscripcion(motivo) {
      if (motivo) {
        botonInscribir.removeAttribute('href');
        botonInscribir.setAttribute('aria-disabled', 'true');
      } else {
        botonInscribir.setAttribute('href', destinoInscribir);
        botonInscribir.removeAttribute('aria-disabled');
      }
      botonInscribir.title = motivo;
    }

    function dibujar() {
      return Promise.all([cargar(), pedidoAlumno]).then(function (respuestas) {
        var datos = respuestas[0];

        if (!datos.ok) {
          cajaPeriodo.innerHTML = '';
          cajaComprobante.innerHTML = '';
          habilitarComprobante(false);
          errorDeCarga(cajaLista, datos.mensaje);
          return;
        }

        ultimo = datos;
        alumno = respuestas[1];

        var abierto = datos.periodo && datos.periodo.abierto;
        var hay = datos.inscripciones.length > 0;
        var condicion = condiciones(datos.materias);

        cajaPeriodo.innerHTML = alertaPeriodo(datos.periodo, datos.inscripciones.length);
        cajaComprobante.innerHTML = hay ? comprobante(datos, respuestas[1], condicion) : '';
        habilitarComprobante(hay);
        bloquearInscripcion(
          !datos.periodo ? 'Todavía no hay un turno de finales publicado.'
            : !abierto ? 'La inscripción de este turno está cerrada.'
            : sinCupo(datos) ? 'Llegaste al máximo de mesas de este turno.'
            : '');

        if (!hay) {
          cajaLista.innerHTML = vacio('inbox', 'Todavía no tenés inscripciones',
            'Cuando te anotes a una mesa final, vas a poder verla acá con su llamado y su estado.',
            '<a class="btn btn--outline" href="inscripcion_finales.html">' +
            '<i data-lucide="calendar-plus"></i>Ver materias disponibles</a>');
        } else {
          cajaLista.innerHTML =
            '<div class="table-wrap table-wrap--stack"><table class="table">' +
              '<thead><tr><th>Tipo de documento</th><th>Documento</th><th>Legajo</th>' +
              '<th>Carrera</th><th>Condición</th><th>Materia</th>' +
              '<th class="col-actions"></th></tr></thead><tbody>' +
              datos.inscripciones.map(function (i) {
                return filaInscripcion(i, datos, respuestas[1],
                  condicion[i.id_carrera + '-' + i.id_materia]);
              }).join('') +
            '</tbody></table></div>';
        }

        App.iconos();
      }).catch(function () {
        habilitarComprobante(false);
        errorDeCarga(cajaLista);
      });
    }

    cajaLista.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-accion]');
      if (!boton) { return; }
      if (boton.getAttribute('data-accion') === 'reintentar') { dibujar(); return; }
      cancelar(boton, dibujar);
    });

    botonComprobante.addEventListener('click', imprimirComprobante);
    botonCompartir.addEventListener('click', compartir);

    return dibujar();
  }

  window.Finales = {
    iniciarInscripcion: iniciarInscripcion,
    iniciarMisFinales: iniciarMisFinales
  };
})();
