/**
 * ControlFinales (Vanilla JS):
 * Vista principal de Control y Verificación de Inscripciones a Exámenes Finales.
 */

import { crearFiltroBuscador } from './FiltroBuscador.js';
import {
  crearListadoInscripcionesFinales,
  INSTANCIAS_CATALOGO
} from './ListadoInscripcionesFinales.js';
import {
  leerUsuarioDesdeCookies,
  guardarUsuarioEnCookies,
  inicializarCookiePorDefecto
} from '../utils/cookies.js';

const API_BASE = 'http://localhost:3000/api';

export { INSTANCIAS_CATALOGO };

export const esInstanciaPasada = (instanciaId, anio, fechaReferencia = new Date()) => {
  if (!instanciaId || !anio) return false;
  const anioNum = Number(anio);
  const anioActual = fechaReferencia.getFullYear();

  if (anioNum < anioActual) return true;
  if (anioNum > anioActual) return false;

  const item = INSTANCIAS_CATALOGO.find((i) => i.id === Number(instanciaId));
  if (!item) return false;

  const limite = new Date(anioNum, item.mesFin, item.diaFin, 23, 59, 59, 999);
  return fechaReferencia > limite;
};

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function crearControlFinales(container, initialProps = {}) {
  inicializarCookiePorDefecto();
  let sesionCookie = leerUsuarioDesdeCookies();

  let mostrarListadoGeneral = false;
  let listadoGeneralInstance = null;

  let alumnosList = initialProps.alumnos || [];
  let alumnoSeleccionado = '';
  let carreraSeleccionada = '';
  let materias = [];
  let materiaSeleccionada = '';
  let modalidad = '';
  let turnoInstancia = '';
  let idLlamado = '';

  const anioActual = new Date().getFullYear();
  let anioTurno = anioActual;

  let esExcepcion = false;
  let motivoExcepcion = '';

  let evaluacion = null;
  let evaluando = false;
  let inscribiendo = false;
  let historialAlumno = [];
  let cargandoHistorial = false;
  let mensaje = null;
  let mensajeTimeout = null;

  let rendicionCalificar = null;
  let notaInput = 4;
  let ausenteInput = false;

  // Instancias de FiltroBuscador persistentes
  let filtroAlumnoInstance = null;
  let filtroMateriaInstance = null;

  // Estructura DOM principal persistente para evitar perder foco en los inputs
  container.innerHTML = `
    <div class="finales-container">
      <div id="cookieSessionBarSlot"></div>
      <div id="topNotificationSlot"></div>
      <div id="listadoGeneralSlot" style="display: none;"></div>
      <div id="inscripcionViewSlot">
        <div class="card">
          <div id="cardHeaderInscripcionSlot" class="card-header header-con-resumen"></div>
          <form id="formInscribirFinal" class="form-grid">
            <div class="form-group">
              <div id="alumnoFijoSlot" style="display: none;"></div>
              <div id="filtroAlumnoSlot"></div>
            </div>

            <div class="form-group">
              <div id="filtroMateriaSlot"></div>
            </div>

            <div class="form-group">
              <label for="modalidadSelect">Modalidad de Inscripción:</label>
              <select id="modalidadSelect" required>
                <option value="">-- Seleccione modalidad --</option>
                <option value="REGULAR">Regular (Con cursada regularizada)</option>
                <option value="LIBRE">Libre (Verifica correlativa previa regular o aprobada)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="anioTurno">Año del Turno:</label>
              <input id="anioTurno" type="number" min="2020" max="2035" required />
            </div>

            <div class="form-group" id="turnoInstanciaGroupSlot"></div>

            <div class="form-group">
              <label for="llamadoSelect">Llamado:</label>
              <select id="llamadoSelect" required>
                <option value="">-- Seleccione llamado --</option>
                <option value="1">1° Llamado</option>
                <option value="2">2° Llamado</option>
              </select>
            </div>

            <div id="exceptionBoxSlot" class="form-group full-width exception-box" style="display: none;"></div>

            <div id="conditionsPanelSlot" class="full-width conditions-panel"></div>

            <div id="bottomNotificationSlot" class="full-width"></div>

            <div id="formActionsSlot" class="form-actions full-width"></div>
          </form>
        </div>

        <div id="historialCardSlot" class="card mt-4"></div>
        <div id="modalCalificarSlot"></div>
      </div>
    </div>
  `;

  const cookieSessionBarSlot = container.querySelector('#cookieSessionBarSlot');
  const topNotificationSlot = container.querySelector('#topNotificationSlot');
  const listadoGeneralSlot = container.querySelector('#listadoGeneralSlot');
  const inscripcionViewSlot = container.querySelector('#inscripcionViewSlot');
  const cardHeaderInscripcionSlot = container.querySelector('#cardHeaderInscripcionSlot');
  const formInscribirFinal = container.querySelector('#formInscribirFinal');
  const alumnoFijoSlot = container.querySelector('#alumnoFijoSlot');
  const filtroAlumnoSlot = container.querySelector('#filtroAlumnoSlot');
  const filtroMateriaSlot = container.querySelector('#filtroMateriaSlot');
  const modalidadSelect = container.querySelector('#modalidadSelect');
  const anioTurnoInput = container.querySelector('#anioTurno');
  const turnoInstanciaGroupSlot = container.querySelector('#turnoInstanciaGroupSlot');
  const llamadoSelect = container.querySelector('#llamadoSelect');
  const exceptionBoxSlot = container.querySelector('#exceptionBoxSlot');
  const conditionsPanelSlot = container.querySelector('#conditionsPanelSlot');
  const bottomNotificationSlot = container.querySelector('#bottomNotificationSlot');
  const formActionsSlot = container.querySelector('#formActionsSlot');
  const historialCardSlot = container.querySelector('#historialCardSlot');
  const modalCalificarSlot = container.querySelector('#modalCalificarSlot');

  // Inicializar los dos FiltroBuscador
  filtroAlumnoInstance = crearFiltroBuscador(filtroAlumnoSlot, {
    label: 'Alumno (Filtro Activo):',
    id: 'filtroAlumno',
    placeholder: 'Seleccione o busque un alumno por apellido, nombre o DNI...',
    items: [],
    selectedId: '',
    onSelect: (item) => {
      seleccionarAlumno(item.id || item.id_alumno);
    },
    getItemKey: (item) => item.id || item.id_alumno,
    getItemLabel: (item) =>
      `${item.apellido || item.primer_apellido || ''}, ${item.nombre || item.primer_nombre || ''}`,
    getItemSubLabel: (item) =>
      `DNI: ${item.numero_documento || 'S/D'} • ${item.carrera || 'Sin carrera'}`,
    filterFn: (item, termino) => {
      const nombre = (item.nombre || item.primer_nombre || '').toLowerCase();
      const apellido = (item.apellido || item.primer_apellido || '').toLowerCase();
      const dni = String(item.numero_documento || '');
      const legajo = (item.legajo || '').toLowerCase();
      const id = String(item.id || item.id_alumno || '');
      const carrera = (item.carrera || '').toLowerCase();
      return (
        nombre.includes(termino) ||
        apellido.includes(termino) ||
        dni.includes(termino) ||
        legajo.includes(termino) ||
        id.includes(termino) ||
        carrera.includes(termino)
      );
    }
  });

  filtroMateriaInstance = crearFiltroBuscador(filtroMateriaSlot, {
    label: 'Materia a rendir (Filtro Activo):',
    id: 'filtroMateria',
    placeholder: 'Primero seleccione un alumno para listar sus materias...',
    items: [],
    selectedId: '',
    disabled: true,
    onSelect: (item) => {
      materiaSeleccionada = item.id_materia;
      renderAll();
      dispararValidacion();
    },
    getItemKey: (item) => item.id_materia,
    getItemLabel: (item) => item.nombre_materia,
    getItemSubLabel: (item) => `Año ${item.anio_cursada}° de cursada`,
    filterFn: (item, termino) => {
      const nombre = (item.nombre_materia || '').toLowerCase();
      const anio = String(item.anio_cursada || '');
      return nombre.includes(termino) || anio.includes(termino);
    }
  });

  const mostrarMensaje = (texto, tipo = 'success') => {
    if (window.ISFTNotify) {
      window.ISFTNotify(texto, tipo);
    }
  };

  const obtenerAlumnoActualObj = () => {
    return (
      alumnosList.find((a) => String(a.id || a.id_alumno) === String(alumnoSeleccionado)) || null
    );
  };

  const obtenerNombreAlumnoFijo = () => {
    const al = obtenerAlumnoActualObj();
    if (al) {
      const ap = al.apellido || al.primer_apellido || '';
      const nom = al.nombre || al.primer_nombre || '';
      return `${ap}, ${nom}`.trim();
    }
    return sesionCookie.nombreAlumno || 'Alumno Registrado';
  };

  const cargarMaterias = async (cId) => {
    try {
      const res = await fetch(`${API_BASE}/finales/materias/${cId}`);
      const data = await res.json();
      if (data.success) {
        materias = data.data;
        renderFiltros();
      }
    } catch (err) {
      console.error('Error al cargar materias:', err);
    }
  };

  const cargarHistorial = async (aId) => {
    cargandoHistorial = true;
    renderHistorial();
    try {
      const res = await fetch(`${API_BASE}/finales/alumno/${aId}`);
      const data = await res.json();
      if (data.success) {
        historialAlumno = data.data;
      }
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      cargandoHistorial = false;
      renderAll();
    }
  };

  const seleccionarAlumno = (nuevoId) => {
    alumnoSeleccionado = nuevoId;
    if (!alumnoSeleccionado) {
      carreraSeleccionada = '';
      materias = [];
      materiaSeleccionada = '';
      historialAlumno = [];
      evaluacion = null;
      renderAll();
      return;
    }

    const al = alumnosList.find((a) => String(a.id || a.id_alumno) === String(alumnoSeleccionado));
    if (al) {
      const cId = al.id_carrera || 1;
      carreraSeleccionada = cId;
      materiaSeleccionada = '';
      evaluacion = null;
      renderAll();
      cargarMaterias(cId);
      cargarHistorial(alumnoSeleccionado);
    }
  };

  const dispararValidacion = () => {
    if (!alumnoSeleccionado || !carreraSeleccionada || !materiaSeleccionada) {
      evaluacion = null;
      renderConditionsAndActions();
      return;
    }

    const esUsuarioAlumno = sesionCookie.esAlumno;
    const instanciaFallback =
      INSTANCIAS_CATALOGO.find((inst) => !esInstanciaPasada(inst.id, anioTurno))?.id || 3;

    evaluando = true;
    renderConditionsAndActions();

    fetch(`${API_BASE}/finales/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_alumno: alumnoSeleccionado,
        id_carrera: carreraSeleccionada,
        id_materia: materiaSeleccionada,
        anio_turno: anioTurno,
        turno_instancia: turnoInstancia ? Number(turnoInstancia) : instanciaFallback,
        modalidad: modalidad || 'REGULAR',
        es_excepcion: esUsuarioAlumno ? false : esExcepcion,
        tipo_usuario: sesionCookie.tipoUsuario
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          evaluacion = data.data;
        } else {
          evaluacion = null;
        }
      })
      .catch((err) => {
        console.error('Error al evaluar condiciones:', err);
        evaluacion = null;
      })
      .finally(() => {
        evaluando = false;
        renderConditionsAndActions();
      });
  };

  const aplicarReglasRolAlumno = () => {
    if (sesionCookie.esAlumno) {
      esExcepcion = false;
      motivoExcepcion = '';
      mostrarListadoGeneral = false;

      if (alumnosList.length > 0) {
        let alumnoObjetivo = null;
        if (sesionCookie.idAlumno) {
          alumnoObjetivo = alumnosList.find(
            (a) => Number(a.id || a.id_alumno) === Number(sesionCookie.idAlumno)
          );
        }
        if (!alumnoObjetivo && sesionCookie.nombreAlumno) {
          const buscado = sesionCookie.nombreAlumno.toLowerCase();
          alumnoObjetivo = alumnosList.find((a) => {
            const nombreComp = `${a.apellido || a.primer_apellido || ''}, ${a.nombre || a.primer_nombre || ''}`.toLowerCase();
            return nombreComp.includes(buscado);
          });
        }
        if (!alumnoObjetivo) {
          alumnoObjetivo = alumnosList[0];
        }
        if (alumnoObjetivo) {
          const idObj = alumnoObjetivo.id || alumnoObjetivo.id_alumno;
          if (String(alumnoSeleccionado) !== String(idObj)) {
            seleccionarAlumno(idObj);
            return;
          }
        }
      }
    }
    renderAll();
  };

  // Eventos de los controles estáticos del formulario
  modalidadSelect.addEventListener('change', (e) => {
    modalidad = e.target.value;
    renderConditionsAndActions();
    dispararValidacion();
  });

  anioTurnoInput.value = anioTurno;
  anioTurnoInput.addEventListener('input', (e) => {
    anioTurno = e.target.value;
    if (turnoInstancia && esInstanciaPasada(turnoInstancia, anioTurno)) {
      turnoInstancia = '';
    }
    renderTurnoSelect();
    renderConditionsAndActions();
    dispararValidacion();
  });

  llamadoSelect.addEventListener('change', (e) => {
    idLlamado = e.target.value ? Number(e.target.value) : '';
    renderConditionsAndActions();
  });

  // Calcular evaluación derivada para las tarjetas
  const calcularEstadoCondiciones = () => {
    const esUsuarioAlumno = sesionCookie.esAlumno;
    const modalidadEfectiva = modalidad || evaluacion?.modalidad || 'REGULAR';
    const esLibreSeleccionado = modalidadEfectiva === 'LIBRE';

    let condReg = null;
    if (evaluacion) {
      const backendReg = evaluacion.condiciones?.regularidad || null;
      if (esLibreSeleccionado) {
        const exceptuada = Boolean(backendReg?.exceptuadaLibre);
        condReg = {
          cumple: !exceptuada,
          esModalidadLibre: true,
          exceptuadaLibre: exceptuada,
          tipoEspacio: backendReg?.tipoEspacio || 'Asignatura',
          detalle: exceptuada
            ? (backendReg?.detalle || 'No se puede inscribir como libre: este espacio curricular está exceptuado por normativa institucional (Práctica / Taller / Seminario).')
            : 'Modalidad LIBRE habilitada: El espacio curricular admite examen libre (se validan correlatividades previas).'
        };
      } else {
        condReg = backendReg;
      }
    }

    let condCorr = null;
    if (evaluacion) {
      const backendCorr = evaluacion.condiciones?.correlatividades;
      if (
        !backendCorr ||
        backendCorr.tieneCorrelativas === false ||
        (Array.isArray(backendCorr.correlativas) && backendCorr.correlativas.length === 0)
      ) {
        condCorr = {
          cumple: true,
          tieneCorrelativas: false,
          correlativas: [],
          detalle:
            'Cumplida: La materia no posee espacios curriculares anteriores requeridos como correlativos.'
        };
      } else {
        condCorr = backendCorr;
      }
    }

    const condNoAp = evaluacion?.condiciones?.noAprobada || null;

    let condPlazo = null;
    if (evaluacion) {
      if (esLibreSeleccionado) {
        condPlazo = {
          cumple: true,
          esModalidadLibre: true,
          detalle: 'En Modalidad LIBRE no aplica el límite de 8 turnos de regularidad.'
        };
      } else {
        condPlazo = evaluacion.condiciones?.plazoTurnos || null;
      }
    }

    let condFallas = null;
    if (evaluacion && evaluacion.condiciones?.limiteFallas) {
      const baseFallas = evaluacion.condiciones.limiteFallas;
      const fallasSinAusentes = Array.isArray(baseFallas.historialFallas)
        ? baseFallas.historialFallas.filter(
          (f) => !String(f.tipoFalla || '').toUpperCase().includes('AUSENTE')
        )
        : null;

      const cantFallasReales =
        fallasSinAusentes !== null
          ? fallasSinAusentes.length
          : Number(baseFallas.cantidadFallas || 0);
      const cumple = esLibreSeleccionado ? true : cantFallasReales <= 3;

      condFallas = {
        ...baseFallas,
        cumple,
        cantidadFallas: cantFallasReales,
        detalle:
          cantFallasReales === 0
            ? 'No registra aplazos en exámenes finales de esta materia. (Los ausentes no computan como falla).'
            : cantFallasReales <= 3
              ? `Registra ${cantFallasReales} aplazo(s) de 3 permitidos. (Los ausentes no computan como falla).`
              : esLibreSeleccionado
                ? `Registra ${cantFallasReales} aplazos previos en cursada regular, pero rinde en Modalidad LIBRE.`
                : `Límite superado: Registra ${cantFallasReales} aplazos (más de 3). Debe recursar.`
      };
    }

    const condVigencia = turnoInstancia
      ? evaluacion?.condiciones?.vigenciaTurno || {
        cumple: !esInstanciaPasada(turnoInstancia, anioTurno),
        pendiente: false,
        detalle: esInstanciaPasada(turnoInstancia, anioTurno)
          ? 'El período seleccionado ya finalizó.'
          : 'El turno seleccionado se encuentra vigente para inscripción.'
      }
      : {
        cumple: false,
        pendiente: true,
        detalle: 'Seleccione una instancia de turno para comprobar su vigencia.'
      };

    const cumpleCondicionesBase = Boolean(
      evaluacion &&
      (esLibreSeleccionado
        ? condReg?.cumple && condCorr?.cumple && condNoAp?.cumple
        : condReg?.cumple &&
        condNoAp?.cumple &&
        condPlazo?.cumple &&
        condFallas?.cumple &&
        condCorr?.cumple)
    );

    const aptoEfectivo = Boolean(
      evaluacion &&
      ((!esUsuarioAlumno && esExcepcion) ||
        (cumpleCondicionesBase && condVigencia?.cumple && !condVigencia?.pendiente))
    );

    const todosCamposSeleccionados = Boolean(
      alumnoSeleccionado &&
      materiaSeleccionada &&
      modalidad &&
      turnoInstancia &&
      idLlamado
    );

    const yaInscriptoEnEsteTurno = Boolean(
      materiaSeleccionada &&
      anioTurno &&
      turnoInstancia &&
      idLlamado &&
      historialAlumno.some(
        (r) =>
          r.estado !== 'BAJA' &&
          Number(r.id_materia) === Number(materiaSeleccionada) &&
          Number(r.anio_turno) === Number(anioTurno) &&
          Number(r.turno_instancia) === Number(turnoInstancia) &&
          Number(r.id_llamado || 1) === Number(idLlamado)
      )
    );

    return {
      modalidadEfectiva,
      condReg,
      condCorr,
      condNoAp,
      condPlazo,
      condFallas,
      condVigencia,
      cumpleCondicionesBase,
      aptoEfectivo,
      todosCamposSeleccionados,
      yaInscriptoEnEsteTurno
    };
  };

  // Manejar envío de formulario de inscripción
  formInscribirFinal.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (inscribiendo) return;

    if (
      !alumnoSeleccionado ||
      !materiaSeleccionada ||
      !modalidad ||
      !turnoInstancia ||
      !idLlamado
    ) {
      mostrarMensaje(
        'Por favor complete todos los campos desplegables antes de confirmar la inscripción',
        'error'
      );
      return;
    }

    const esUsuarioAlumno = sesionCookie.esAlumno;
    const excepcionActiva = !esUsuarioAlumno && esExcepcion;

    if (excepcionActiva && !motivoExcepcion.trim()) {
      mostrarMensaje('Debe especificar el motivo de la inscripción por excepción', 'error');
      return;
    }

    const { aptoEfectivo } = calcularEstadoCondiciones();

    inscribiendo = true;
    mensaje = null;
    renderNotifications();
    renderConditionsAndActions();

    const payloadBase = {
      id_alumno: Number(alumnoSeleccionado),
      id_carrera: Number(carreraSeleccionada),
      id_materia: Number(materiaSeleccionada),
      anio_turno: Number(anioTurno),
      turno_instancia: Number(turnoInstancia),
      id_llamado: Number(idLlamado),
      modalidad: modalidad,
      es_excepcion: excepcionActiva,
      motivo_excepcion: excepcionActiva ? motivoExcepcion : null,
      tipo_usuario: sesionCookie.tipoUsuario
    };

    try {
      let res = await fetch(`${API_BASE}/finales/inscribir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBase)
      });

      let data = await res.json();

      if (
        !data.success &&
        aptoEfectivo &&
        !excepcionActiva &&
        data.message &&
        data.message.includes('Inscripción rechazada')
      ) {
        res = await fetch(`${API_BASE}/finales/inscribir`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payloadBase,
            es_excepcion: true,
            motivo_excepcion:
              modalidad === 'LIBRE'
                ? 'Inscripción en Modalidad LIBRE (Correlatividades cumplidas)'
                : 'Inscripción ordinaria (Ausentes no computan como falla)'
          })
        });
        data = await res.json();
      }

      if (data.success) {
        const msgExito =
          modalidad === 'LIBRE' && !excepcionActiva
            ? 'Inscripción en modalidad LIBRE registrada correctamente.'
            : `${data.data?.mensaje || 'Inscripción a examen final registrada correctamente.'}`;
        mostrarMensaje(msgExito, 'success');
        esExcepcion = false;
        motivoExcepcion = '';
        await cargarHistorial(alumnoSeleccionado);
      } else {
        mostrarMensaje(`${data.message || 'No se pudo completar la inscripción'}`, 'error');
      }
    } catch (err) {
      mostrarMensaje('Error de conexión al intentar inscribir en el servidor', 'error');
    } finally {
      inscribiendo = false;
      renderAll();
    }
  });

  // La sesión y rol vienen autenticados desde el Login centralizado (sin barra de cambio de rol de prueba)
  const renderCookieBar = () => {
    if (cookieSessionBarSlot) {
      cookieSessionBarSlot.innerHTML = '';
    }
  };

  const renderNotifications = () => {
    if (topNotificationSlot) topNotificationSlot.innerHTML = '';
    if (bottomNotificationSlot) bottomNotificationSlot.innerHTML = '';
  };

  const renderCardHeader = () => {
    const esUsuarioAlumno = sesionCookie.esAlumno;
    cardHeaderInscripcionSlot.innerHTML = `
      <div>
        <h3>Control y Verificación de Inscripciones a Exámenes Finales</h3>
        <p class="tab-description">
          Valida automáticamente el estado de <strong>regularidad</strong> o <strong>correlatividades para modalidad libre</strong>, límite de <strong>8 turnos</strong> desde regularización, tope de <strong>hasta 3 aplazos</strong> (los ausentes no cuentan como falla)${!esUsuarioAlumno ? ' y la opción de <strong>inscripción por excepción</strong>' : ''
      }.
        </p>
      </div>
      ${!esUsuarioAlumno
        ? `
        <button type="button" id="btnIrListadoGeneral" class="btn btn-primary">
          Ver Listado de Finales Inscriptos
        </button>
      `
        : ''
      }
    `;

    const btnIrListado = cardHeaderInscripcionSlot.querySelector('#btnIrListadoGeneral');
    if (btnIrListado) {
      btnIrListado.addEventListener('click', () => {
        mostrarListadoGeneral = true;
        renderSubView();
      });
    }
  };

  const renderFiltros = () => {
    const esUsuarioAlumno = sesionCookie.esAlumno;
    if (esUsuarioAlumno) {
      filtroAlumnoSlot.style.display = 'none';
      alumnoFijoSlot.style.display = '';
      const nombreAlumnoFijo = obtenerNombreAlumnoFijo();
      const al = obtenerAlumnoActualObj();
      alumnoFijoSlot.innerHTML = `
        <div class="alumno-fijo-group">
          <label for="alumnoFijoInput">Alumno:</label>
          <input
            id="alumnoFijoInput"
            type="text"
            class="input-alumno-bloqueado"
            value="${escapeHtml(nombreAlumnoFijo)}"
            readonly
            disabled
          />
          ${al
          ? `<small class="alumno-fijo-sublabel">DNI: ${escapeHtml(al.numero_documento || 'S/D')} • ${escapeHtml(al.carrera || 'Sin carrera')}</small>`
          : ''
        }
        </div>
      `;
    } else {
      alumnoFijoSlot.style.display = 'none';
      filtroAlumnoSlot.style.display = '';
      filtroAlumnoInstance.update({
        items: alumnosList,
        selectedId: alumnoSeleccionado
      });
    }

    filtroMateriaInstance.update({
      items: materias,
      selectedId: materiaSeleccionada,
      disabled: !alumnoSeleccionado,
      placeholder: alumnoSeleccionado
        ? 'Seleccione o busque una materia por nombre o año...'
        : 'Primero seleccione un alumno para listar sus materias...'
    });
  };

  const renderTurnoSelect = () => {
    const pasadaActual = turnoInstancia && esInstanciaPasada(turnoInstancia, anioTurno);
    const opcionesHtml = INSTANCIAS_CATALOGO.map((inst) => {
      const pasada = esInstanciaPasada(inst.id, anioTurno);
      const texto = `${inst.id} - ${inst.nombre} ${pasada ? '(Período anterior a hoy - Desactivado)' : '🟢 (Período Vigente)'
        }`;
      return `<option value="${inst.id}" ${pasada ? 'disabled' : ''} ${String(turnoInstancia) === String(inst.id) ? 'selected' : ''
        }>${escapeHtml(texto)}</option>`;
    }).join('');

    turnoInstanciaGroupSlot.innerHTML = `
      <div class="label-with-hint">
        <label for="turnoInstancia">Instancia de Turno:</label>
        ${pasadaActual ? '<span class="badge-aviso-desactivado">Período desactivado</span>' : ''}
      </div>
      <select
        id="turnoInstancia"
        class="${pasadaActual ? 'select-desactivado' : ''}"
        required
      >
        <option value="">-- Seleccione instancia de turno --</option>
        ${opcionesHtml}
      </select>
      ${pasadaActual
        ? `
        <small class="error-text">
          El período seleccionado corresponde a un momento anterior a hoy y se encuentra deshabilitado para nuevas inscripciones.
        </small>
      `
        : ''
      }
    `;

    const sel = turnoInstanciaGroupSlot.querySelector('#turnoInstancia');
    if (sel) {
      sel.addEventListener('change', (e) => {
        turnoInstancia = e.target.value ? Number(e.target.value) : '';
        renderTurnoSelect();
        renderConditionsAndActions();
        dispararValidacion();
      });
    }
  };

  const renderExceptionBox = () => {
    const esUsuarioAlumno = sesionCookie.esAlumno;
    if (esUsuarioAlumno) {
      exceptionBoxSlot.style.display = 'none';
      exceptionBoxSlot.innerHTML = '';
      return;
    }

    exceptionBoxSlot.style.display = '';
    exceptionBoxSlot.innerHTML = `
      <label class="checkbox-label">
        <input
          id="chkEsExcepcion"
          type="checkbox"
          ${esExcepcion ? 'checked' : ''}
        />
        <strong>Inscribir por Excepción</strong> (Omite todas las restricciones reglamentarias)
      </label>
      ${esExcepcion
        ? `
        <input
          id="inputMotivoExcepcion"
          type="text"
          placeholder="Motivo de la excepción (ej: Autorización directiva, mesa especial, etc.)"
          value="${escapeHtml(motivoExcepcion)}"
          class="mt-2"
          required
        />
      `
        : ''
      }
    `;

    const chk = exceptionBoxSlot.querySelector('#chkEsExcepcion');
    if (chk) {
      chk.addEventListener('change', (e) => {
        esExcepcion = e.target.checked;
        renderExceptionBox();
        renderConditionsAndActions();
        dispararValidacion();
      });
    }

    const inputMotivo = exceptionBoxSlot.querySelector('#inputMotivoExcepcion');
    if (inputMotivo) {
      inputMotivo.addEventListener('input', (e) => {
        motivoExcepcion = e.target.value;
      });
    }
  };

  const renderConditionsAndActions = () => {
    const esUsuarioAlumno = sesionCookie.esAlumno;
    const {
      modalidadEfectiva,
      condReg,
      condCorr,
      condNoAp,
      condPlazo,
      condFallas,
      condVigencia,
      cumpleCondicionesBase,
      aptoEfectivo,
      todosCamposSeleccionados,
      yaInscriptoEnEsteTurno
    } = calcularEstadoCondiciones();

    const obtenerClaseTarjeta = (cond) => {
      if (!evaluacion || !cond || cond.pendiente) return 'pending';
      return cond.cumple ? 'pass' : 'fail';
    };

    const obtenerIconoTarjeta = (cond) => {
      if (!evaluacion || !cond || cond.pendiente) return '...';
      return cond.cumple ? '[OK]' : '[No cumple]';
    };

    let verdictHtml = '';
    if (!alumnoSeleccionado || !materiaSeleccionada) {
      verdictHtml = `
        <div class="verdict-banner verdict-pending">
          <span>
            <strong>PENDIENTE DE VERIFICACIÓN:</strong> Seleccione alumno, materia, modalidad, turno y llamado para validar la inscripción.
          </span>
        </div>
      `;
    } else if (yaInscriptoEnEsteTurno) {
      const nombreTurno =
        INSTANCIAS_CATALOGO.find((i) => i.id === Number(turnoInstancia))?.nombre || '';
      verdictHtml = `
        <div class="verdict-banner verdict-pass">
          <span>
            <strong>INSCRIPCIÓN REGISTRADA:</strong> El alumno ya se encuentra inscripto para rendir esta materia en el turno (${escapeHtml(nombreTurno)} ${escapeHtml(anioTurno)}) y ${escapeHtml(idLlamado)}° llamado seleccionados.
          </span>
        </div>
      `;
    } else if (evaluando) {
      verdictHtml = `
        <div class="verdict-banner verdict-pending">
          <span><strong>VERIFICANDO CONDICIONES...</strong> Consultando historial académico y correlatividades.</span>
        </div>
      `;
    } else if (evaluacion) {
      const bannerClass =
        (!esUsuarioAlumno && esExcepcion) || (aptoEfectivo && todosCamposSeleccionados)
          ? 'verdict-pass'
          : cumpleCondicionesBase && !todosCamposSeleccionados
            ? 'verdict-pending'
            : 'verdict-fail';

      let innerSpan = '';
      if (!esUsuarioAlumno && esExcepcion) {
        innerSpan = `<span><strong>MODO EXCEPCIÓN ACTIVADO:</strong> Se autorizará la inscripción omitiendo las restricciones.</span>`;
      } else if (aptoEfectivo && todosCamposSeleccionados) {
        innerSpan = `<span><strong>ALUMNO HABILITADO (${escapeHtml(modalidadEfectiva)}):</strong> Cumple con todas las condiciones reglamentarias para rendir.</span>`;
      } else if (cumpleCondicionesBase && !todosCamposSeleccionados) {
        innerSpan = `<span><strong>CONDICIONES ACADÉMICAS CUMPLIDAS (${escapeHtml(modalidadEfectiva)}):</strong> Complete la selección de modalidad, instancia de turno y llamado para confirmar.</span>`;
      } else {
        innerSpan = `<span><strong>INSCRIPCIÓN BLOQUEADA:</strong> No cumple los requisitos reglamentarios para la modalidad ${escapeHtml(modalidadEfectiva)}.${!esUsuarioAlumno
            ? ' Requiere recursar, cambiar a modalidad libre o inscripción por excepción.'
            : ''
          }</span>`;
      }

      verdictHtml = `<div class="verdict-banner ${bannerClass}">${innerSpan}</div>`;
    } else {
      verdictHtml = `
        <div class="verdict-banner verdict-fail">
          <span>No se pudo conectar con el servidor de validación. Intente nuevamente.</span>
        </div>
      `;
    }

    conditionsPanelSlot.innerHTML = `
      <h4>
        Evaluación de Condiciones Reglamentarias${modalidad ? ` (Modalidad: ${escapeHtml(modalidadEfectiva)})` : ''
      }:
      </h4>

      <div class="conditions-grid">
        <div class="condition-card ${obtenerClaseTarjeta(condReg)}">
          <div class="condition-header">
            <span>${obtenerIconoTarjeta(condReg)}</span>
            <strong>${modalidadEfectiva === 'LIBRE' ? '1. Condición Libre' : '1. Estado Regular'}</strong>
          </div>
          <p>${escapeHtml(condReg ? condReg.detalle : 'Seleccione un alumno y una materia para verificar el estado de regularidad.')}</p>
        </div>

        <div class="condition-card ${obtenerClaseTarjeta(condNoAp)}">
          <div class="condition-header">
            <span>${obtenerIconoTarjeta(condNoAp)}</span>
            <strong>2. No Aprobada Aún</strong>
          </div>
          <p>${escapeHtml(condNoAp ? condNoAp.detalle : 'Verifica que el estudiante no tenga el examen final ya aprobado.')}</p>
        </div>

        <div class="condition-card ${obtenerClaseTarjeta(condPlazo)}">
          <div class="condition-header">
            <span>${obtenerIconoTarjeta(condPlazo)}</span>
            <strong>3. Plazo de 8 Turnos</strong>
          </div>
          <p>${escapeHtml(condPlazo ? condPlazo.detalle : 'Verifica que no hayan transcurrido más de 8 turnos desde la regularización.')}</p>
        </div>

        <div class="condition-card ${obtenerClaseTarjeta(condFallas)}">
          <div class="condition-header">
            <span>${obtenerIconoTarjeta(condFallas)}</span>
            <strong>4. Fallas (${condFallas ? `${condFallas.cantidadFallas} de 3 máx.` : 'Máx. 3 aplazos'})</strong>
          </div>
          <p>${escapeHtml(condFallas ? condFallas.detalle : 'Verifica que no supere los 3 aplazos permitidos (los ausentes no computan como falla).')}</p>
        </div>

        <div class="condition-card ${obtenerClaseTarjeta(condCorr)}">
          <div class="condition-header">
            <span>${obtenerIconoTarjeta(condCorr)}</span>
            <strong>5. Correlatividades ${modalidadEfectiva === 'LIBRE' ? '(Req. Libre)' : '(Previas)'}</strong>
          </div>
          <p>${escapeHtml(condCorr ? condCorr.detalle : 'Verifica que el espacio curricular anterior figure regular o con final aprobado.')}</p>
        </div>

        <div class="condition-card ${obtenerClaseTarjeta(condVigencia)}">
          <div class="condition-header">
            <span>${obtenerIconoTarjeta(condVigencia)}</span>
            <strong>6. Período Vigente</strong>
          </div>
          <p>${escapeHtml(condVigencia ? condVigencia.detalle : 'Seleccione una instancia de turno para comprobar su vigencia.')}</p>
        </div>
      </div>

      ${verdictHtml}
    `;

    const btnDisabled =
      inscribiendo ||
      yaInscriptoEnEsteTurno ||
      !todosCamposSeleccionados ||
      !aptoEfectivo ||
      evaluando ||
      (!(esExcepcion && !esUsuarioAlumno) && esInstanciaPasada(turnoInstancia, anioTurno));

    const btnClass =
      aptoEfectivo && todosCamposSeleccionados && !yaInscriptoEnEsteTurno
        ? 'btn-primary'
        : 'btn-secondary';

    let btnText = `Confirmar Inscripción a Final${modalidad ? ` (${modalidad === 'LIBRE' ? 'Libre' : 'Regular'})` : ''
      }`;
    if (inscribiendo) {
      btnText = 'Registrando inscripción...';
    } else if (yaInscriptoEnEsteTurno) {
      btnText = 'Inscripción Ya Registrada en este Turno y Llamado';
    } else if (evaluando) {
      btnText = 'Verificando...';
    } else if (!esUsuarioAlumno && esExcepcion) {
      btnText = 'Inscribir por Excepción';
    }

    formActionsSlot.innerHTML = `
      <button
        type="submit"
        class="btn ${btnClass}"
        ${btnDisabled ? 'disabled' : ''}
      >
        ${escapeHtml(btnText)}
      </button>
    `;
  };

  const obtenerHistorialPorMateria = () => {
    if (!historialAlumno || historialAlumno.length === 0) return [];
    const mapa = new Map();

    historialAlumno.forEach((rend) => {
      const idMat = rend.id_materia;
      if (!mapa.has(idMat)) {
        mapa.set(idMat, {
          id_materia: idMat,
          nombre_materia: rend.nombre_materia,
          anio_regular: rend.anio_regular,
          validado_regular: rend.validado_regular,
          rendiciones: []
        });
      }
      mapa.get(idMat).rendiciones.push(rend);
    });

    const grupos = Array.from(mapa.values());

    grupos.forEach((grupo) => {
      grupo.rendiciones.sort((a, b) => {
        if (Number(b.anio_turno) !== Number(a.anio_turno)) {
          return Number(b.anio_turno) - Number(a.anio_turno);
        }
        if (Number(b.turno_instancia) !== Number(a.turno_instancia)) {
          return Number(b.turno_instancia) - Number(a.turno_instancia);
        }
        if (Number(b.id_llamado || 1) !== Number(a.id_llamado || 1)) {
          return Number(b.id_llamado || 1) - Number(a.id_llamado || 1);
        }
        if (a.fecha_examen && b.fecha_examen && a.fecha_examen !== b.fecha_examen) {
          return new Date(b.fecha_examen) - new Date(a.fecha_examen);
        }
        return Number(b.id_rendicion) - Number(a.id_rendicion);
      });

      const rendAprobada = grupo.rendiciones.find(
        (r) => r.estado === 'APROBADO' || (r.nota !== null && r.nota >= 4)
      );
      const fallas = grupo.rendiciones.filter(
        (r) =>
          !r.es_ausente &&
          r.estado !== 'AUSENTE' &&
          (r.es_falla || (r.nota !== null && r.nota < 4) || r.estado === 'DESAPROBADO')
      );
      const tieneInscripto = grupo.rendiciones.some((r) => r.estado === 'INSCRIPTO');

      grupo.aprobada = Boolean(rendAprobada);
      grupo.notaAprobada = rendAprobada ? rendAprobada.nota : null;
      grupo.cantidadFallas = fallas.length;
      grupo.tieneInscripto = tieneInscripto;
    });

    grupos.sort((a, b) =>
      a.nombre_materia.localeCompare(b.nombre_materia, 'es', { sensitivity: 'base' })
    );

    return grupos;
  };

  const renderHistorial = () => {
    const esUsuarioAlumno = sesionCookie.esAlumno;
    const historialPorMateria = obtenerHistorialPorMateria();

    let bodyHtml = '';
    if (!alumnoSeleccionado) {
      bodyHtml = `<p class="empty-text">Seleccione un alumno para visualizar su historial de finales rendidos e inscripciones.</p>`;
    } else if (cargandoHistorial) {
      bodyHtml = `<p class="loading-text">Cargando historial de finales...</p>`;
    } else if (historialAlumno.length === 0) {
      bodyHtml = `<p class="empty-text">El alumno no registra rendiciones ni inscripciones a finales aún.</p>`;
    } else {
      let gruposHtml = '';
      historialPorMateria.forEach((grupo) => {
        const subtitulo =
          grupo.validado_regular === 'T' && Number(grupo.anio_regular) > 0
            ? `Cursada regular: Ciclo Lectivo ${grupo.anio_regular}`
            : 'Sin cursada regular registrada';

        let badgeEstadoHtml = `<span class="badge-regular-ok">Sin aplazos (0 fallas)</span>`;
        if (grupo.aprobada) {
          badgeEstadoHtml = `<span class="badge-ok">APROBADA (Nota: ${escapeHtml(grupo.notaAprobada)})</span>`;
        } else if (grupo.cantidadFallas >= 4) {
          badgeEstadoHtml = `<span class="badge-falla-bloqueada"> ${grupo.cantidadFallas} Fallas (Debe recursar)</span>`;
        } else if (grupo.cantidadFallas > 0) {
          badgeEstadoHtml = `<span class="badge-falla"> ${grupo.cantidadFallas} Falla${grupo.cantidadFallas !== 1 ? 's' : ''
            } (${grupo.cantidadFallas}/3 máx.)</span>`;
        }

        let filasHtml = '';
        grupo.rendiciones.forEach((rend, idx) => {
          const esFalla =
            !rend.es_ausente &&
            rend.estado !== 'AUSENTE' &&
            (rend.es_falla ||
              (rend.nota !== null && rend.nota < 4) ||
              rend.estado === 'DESAPROBADO');

          let notaCell = `<span class="text-muted">Pendiente</span>`;
          if (rend.es_ausente) {
            notaCell = `<span class="text-danger font-weight-bold">Ausente</span>`;
          } else if (rend.nota !== null && rend.nota !== undefined) {
            notaCell = `<strong class="${rend.nota >= 4 ? 'nota-aprobada' : 'nota-desaprobada'}">${escapeHtml(rend.nota)}</strong>`;
          }

          let computaCell = `<span class="text-muted">No computa</span>`;
          if (esFalla) {
            computaCell = `<span class="badge-falla"> Falla (Aplazo)</span>`;
          } else if (rend.es_ausente || rend.estado === 'AUSENTE') {
            computaCell = `<span class="text-muted">No computa (Ausente)</span>`;
          } else if (rend.estado === 'APROBADO') {
            computaCell = `<span class="badge-ok">Aprobada</span>`;
          }

          let condicionCell = `<span class="text-muted">Regular</span>`;
          if (
            rend.modalidad === 'LIBRE' ||
            String(rend.motivo_excepcion || '').includes('Modalidad LIBRE')
          ) {
            condicionCell = `<span class="badge-libre">Libre</span>`;
          } else if (
            rend.es_excepcion &&
            !String(rend.motivo_excepcion || '').includes('Ausentes no computan')
          ) {
            condicionCell = `<span class="badge-warning" title="${escapeHtml(rend.motivo_excepcion || 'Por excepción')}">Excepción</span>`;
          }

          const fechaStr = rend.fecha_examen
            ? escapeHtml(String(rend.fecha_examen).split('T')[0])
            : `<span class="text-muted">A rendir</span>`;

          filasHtml += `
            <tr class="${idx === 0 ? 'fila-mas-reciente' : ''}">
              <td>
                <span class="badge-id">#${escapeHtml(rend.id_rendicion)}</span>
                ${idx === 0
              ? `<span class="badge-reciente-tag" title="Instancia más reciente cronológicamente">A tope (Reciente)</span>`
              : ''
            }
              </td>
              <td><strong>${escapeHtml(rend.nombre_instancia)} ${escapeHtml(rend.anio_turno)}</strong></td>
              <td>${escapeHtml(rend.id_llamado)}° Llamado</td>
              <td>${fechaStr}</td>
              <td>
                <span class="status-badge status-${escapeHtml(String(rend.estado || '').toLowerCase())}">
                  ${escapeHtml(rend.estado)}
                </span>
              </td>
              <td>${notaCell}</td>
              <td>${computaCell}</td>
              <td>${condicionCell}</td>
              ${!esUsuarioAlumno
              ? `
                <td>
                  <button
                    type="button"
                    data-action="calificar-rend"
                    data-id="${escapeHtml(rend.id_rendicion)}"
                    class="btn btn-warning btn-sm"
                    title="Asentar nota o ausencia"
                  >
                    Calificar
                  </button>
                </td>
              `
              : ''
            }
            </tr>
          `;
        });

        gruposHtml += `
          <div class="materia-grupo-card">
            <div class="materia-grupo-header">
              <div class="materia-titulo-box">
                <h4 class="materia-nombre">
                   ${escapeHtml(grupo.nombre_materia)}
                </h4>
                <span class="materia-subtitulo">${escapeHtml(subtitulo)}</span>
              </div>

              <div class="materia-resumen-badges">
                <span class="badge-intentos">
                  ${grupo.rendiciones.length} instancia${grupo.rendiciones.length !== 1 ? 's' : ''} / turno${grupo.rendiciones.length !== 1 ? 's' : ''}
                </span>
                ${badgeEstadoHtml}
                ${grupo.tieneInscripto
            ? `<span class="status-badge status-inscripto">Inscripción Activa</span>`
            : ''
          }
              </div>
            </div>

            <div class="table-responsive">
              <table class="custom-table table-materia-rendiciones">
                <thead>
                  <tr>
                    <th style="width: 90px;">#ID</th>
                    <th>Turno e Instancia</th>
                    <th>Llamado</th>
                    <th>Fecha de Examen</th>
                    <th>Estado</th>
                    <th>Nota</th>
                    <th>¿Computa Falla?</th>
                    <th>Condición</th>
                    ${!esUsuarioAlumno ? `<th style="width: 100px;">Acción</th>` : ''}
                  </tr>
                </thead>
                <tbody>
                  ${filasHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;
      });

      bodyHtml = `<div class="materias-historial-container">${gruposHtml}</div>`;
    }

    historialCardSlot.innerHTML = `
      <div class="card-header">
        <div class="header-con-resumen">
          <h3>Listado de Finales Rendidos e Inscripciones (${historialAlumno.length})</h3>
          <span class="badge-count-materias">
            ${historialPorMateria.length} materia${historialPorMateria.length !== 1 ? 's' : ''} con historial
          </span>
        </div>
        <p class="tab-description">
          Rendiciones <strong>agrupadas por materia</strong> y ordenadas <strong>cronológicamente</strong> (lo más reciente a tope y lo más viejo debajo). <em>Nota: las ausencias no computan como falla.</em>
        </p>
      </div>
      ${bodyHtml}
    `;

    historialCardSlot
      .querySelectorAll('button[data-action="calificar-rend"]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const idRend = Number(btn.getAttribute('data-id'));
          const encontrada = historialAlumno.find((r) => Number(r.id_rendicion) === idRend);
          if (!encontrada) return;
          rendicionCalificar = encontrada;
          notaInput = encontrada.nota || 4;
          ausenteInput = Boolean(encontrada.es_ausente);
          renderModalCalificar();
        });
      });
  };

  const renderModalCalificar = () => {
    const esUsuarioAlumno = sesionCookie.esAlumno;
    if (esUsuarioAlumno || !rendicionCalificar) {
      modalCalificarSlot.innerHTML = '';
      return;
    }

    modalCalificarSlot.innerHTML = `
      <div class="modal-overlay">
        <div class="card modal-card">
          <div class="card-header">
            <h3>Asentar Calificación de Examen Final</h3>
            <p>
              <strong>${escapeHtml(rendicionCalificar.nombre_materia)}</strong> - ${escapeHtml(rendicionCalificar.nombre_instancia)} ${escapeHtml(rendicionCalificar.anio_turno)}
            </p>
          </div>
          <form id="formCalificarModal" class="form-grid">
            <div class="form-group full-width">
              <label class="checkbox-label">
                <input
                  id="chkAusenteModal"
                  type="checkbox"
                  ${ausenteInput ? 'checked' : ''}
                />
                <strong>Figurar como AUSENTE</strong> (No computa como falla)
              </label>
            </div>

            ${!ausenteInput
        ? `
              <div class="form-group full-width">
                <label for="notaModal">Calificación obtenida (1 a 10):</label>
                <input
                  id="notaModal"
                  type="number"
                  min="1"
                  max="10"
                  value="${escapeHtml(notaInput)}"
                  required
                />
                <small id="helpTextNotaModal" class="help-text">
                  ${notaInput >= 4 ? '🟢 Aprobado (>= 4)' : '🔴 Aplazo (< 4, cuenta como falla)'}
                </small>
              </div>
            `
        : ''
      }

            <div class="form-actions full-width">
              <button type="submit" class="btn btn-primary">
                Guardar Calificación
              </button>
              <button type="button" id="btnCancelarCalificarModal" class="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const chkAusente = modalCalificarSlot.querySelector('#chkAusenteModal');
    if (chkAusente) {
      chkAusente.addEventListener('change', (e) => {
        ausenteInput = e.target.checked;
        renderModalCalificar();
      });
    }

    const inputNota = modalCalificarSlot.querySelector('#notaModal');
    if (inputNota) {
      inputNota.addEventListener('input', (e) => {
        notaInput = Number(e.target.value);
        const helpEl = modalCalificarSlot.querySelector('#helpTextNotaModal');
        if (helpEl) {
          helpEl.textContent =
            notaInput >= 4 ? '🟢 Aprobado (>= 4)' : '🔴 Aplazo (< 4, cuenta como falla)';
        }
      });
    }

    const btnCancelar = modalCalificarSlot.querySelector('#btnCancelarCalificarModal');
    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => {
        rendicionCalificar = null;
        renderModalCalificar();
      });
    }

    const formModal = modalCalificarSlot.querySelector('#formCalificarModal');
    if (formModal) {
      formModal.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!rendicionCalificar) return;

        try {
          const res = await fetch(
            `${API_BASE}/finales/calificar/${rendicionCalificar.id_rendicion}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nota: ausenteInput ? null : notaInput,
                es_ausente: ausenteInput,
                fecha_examen: new Date().toISOString().split('T')[0]
              })
            }
          );

          const data = await res.json();
          if (data.success) {
            rendicionCalificar = null;
            renderModalCalificar();
            mostrarMensaje('Calificación / condición de examen actualizada');
            cargarHistorial(alumnoSeleccionado);
            dispararValidacion();
          } else {
            mostrarMensaje(data.message || 'Error al calificar', 'error');
          }
        } catch (err) {
          mostrarMensaje('Error al conectar con el servidor', 'error');
        }
      });
    }
  };

  const renderSubView = () => {
    const esUsuarioAlumno = sesionCookie.esAlumno;
    if (!esUsuarioAlumno && mostrarListadoGeneral) {
      inscripcionViewSlot.style.display = 'none';
      listadoGeneralSlot.style.display = '';
      listadoGeneralInstance = crearListadoInscripcionesFinales(listadoGeneralSlot, {
        alumnos: alumnosList,
        onVolver: () => {
          mostrarListadoGeneral = false;
          renderSubView();
        }
      });
    } else {
      listadoGeneralSlot.style.display = 'none';
      listadoGeneralSlot.innerHTML = '';
      listadoGeneralInstance = null;
      inscripcionViewSlot.style.display = '';
    }
  };

  const renderAll = () => {
    renderCookieBar();
    renderNotifications();
    renderSubView();
    renderCardHeader();
    renderFiltros();
    renderTurnoSelect();
    renderExceptionBox();
    renderConditionsAndActions();
    renderHistorial();
    renderModalCalificar();
  };

  const inicializarAlumnos = (lista) => {
    alumnosList = lista || [];
    const sesion = leerUsuarioDesdeCookies();
    if (sesion.esAlumno && alumnosList.length > 0) {
      const encontrado = sesion.idAlumno
        ? alumnosList.find((a) => Number(a.id || a.id_alumno) === Number(sesion.idAlumno))
        : alumnosList[0];
      const al = encontrado || alumnosList[0];
      seleccionarAlumno(al.id || al.id_alumno);
    } else {
      renderAll();
    }
  };

  if (alumnosList.length > 0) {
    inicializarAlumnos(alumnosList);
  } else {
    renderAll();
    fetch(`${API_BASE}/alumnos`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          inicializarAlumnos(data.data);
        }
      })
      .catch(() => { });
  }

  // Sincronización periódica con document.cookie
  const sincronizarCookies = () => {
    const nuevaSesion = leerUsuarioDesdeCookies();
    if (
      nuevaSesion.tipoUsuario !== sesionCookie.tipoUsuario ||
      nuevaSesion.idAlumno !== sesionCookie.idAlumno ||
      nuevaSesion.nombreAlumno !== sesionCookie.nombreAlumno
    ) {
      sesionCookie = nuevaSesion;
      aplicarReglasRolAlumno();
    }
  };

  window.addEventListener('cookie-usuario-actualizada', sincronizarCookies);
  window.addEventListener('focus', sincronizarCookies);
  const cookieInterval = setInterval(sincronizarCookies, 1000);

  return {
    update: (newProps = {}) => {
      if (newProps.alumnos && newProps.alumnos.length > 0) {
        const primeraCarga = alumnosList.length === 0;
        alumnosList = newProps.alumnos;
        if (primeraCarga && sesionCookie.esAlumno) {
          aplicarReglasRolAlumno();
        } else {
          renderFiltros();
          renderCookieBar();
          if (listadoGeneralInstance) {
            listadoGeneralInstance.update({ alumnos: alumnosList });
          }
        }
      }
    },
    destroy: () => {
      window.removeEventListener('cookie-usuario-actualizada', sincronizarCookies);
      window.removeEventListener('focus', sincronizarCookies);
      clearInterval(cookieInterval);
      if (filtroAlumnoInstance) filtroAlumnoInstance.destroy();
      if (filtroMateriaInstance) filtroMateriaInstance.destroy();
    }
  };
}
