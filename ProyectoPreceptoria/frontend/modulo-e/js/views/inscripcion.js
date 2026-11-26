import { api } from '../api.js';
import {
  generarFormularioMatriculacionPdf,
  imprimirODescargarPdf
} from '../services/pdfStamper.js';

export async function initInscripcionView(container, onNotify, currentRole = 'preceptor', alumnoLogueado = null) {
  const isAlumno = currentRole === 'alumno';

  // 1. Estado de Catálogos (cargados desde MySQL clementina)
  let carreras = [];
  let alumnos = [];
  let idCarreraSeleccionada = (isAlumno && alumnoLogueado && alumnoLogueado.id_carrera)
    ? alumnoLogueado.id_carrera
    : 1;

  // 2. Filtros de Búsqueda
  let filtroLegajo = '';
  let filtroDni = '';
  let filtroApellido = '';

  // 3. Alumno Activo / Seleccionado
  let alumnoSeleccionado = (isAlumno && alumnoLogueado) ? alumnoLogueado : null;
  let alumnoElegidoEnLista = (isAlumno && alumnoLogueado) ? alumnoLogueado : null;
  let alumnosFiltrados = [];
  let busquedaRealizada = false;

  // 4. Formulario de Datos del Alumno (Campos del Formulario A5a vacíos hasta presionar "Cargar Planilla")
  const createEmptyFormData = () => ({
    apellido_nombres: '',
    dni: '',
    legajo: '',
    fecha_nacimiento: '',
    ciudad_nacimiento: '',
    provincia_nacimiento: '',
    nacionalidad: '',
    estado_civil: '',
    sexo: '',
    edad: '',
    hijos: '',
    domicilio: '',
    numero: '',
    piso: '',
    depto: '',
    localidad_barrio: '',
    partido: '',
    codigo_postal: '',
    celular: '',
    mail: ''
  });

  let formData = createEmptyFormData();

  // 5. Materias y Selecciones de Cursada
  let materias = [];
  let loadingMaterias = false;
  let enviando = false;

  // Mapa de selecciones: id_materia -> 'curso' | 'recursa'
  let materiasSeleccionadas = new Map();
  let hasRenderedOnce = false;

  // Estado para el popover anclado al botón "Ver Detalle" de conflictos
  let burbujaConflicto = null;
  let burbujaAnchorRect = null;
  let cleanupPopoverListeners = null;

  // Control de edición del formulario de datos del estudiante (Modo lectura por defecto)
  let editandoDatosAlumno = false;
  let formDataOriginal = null;

  // Mapa de notas y datos académicos en la tabla: id_materia -> { nota_num, nota_letra, fecha, cursada }
  let datosAcademicos = {};
  // Control de edición de calificaciones y materias validadas por parte del preceptor
  let editandoNotas = false;
  let datosAcademicosOriginales = null;

  // Sincronizar datos personales y académicos a partir de un estudiante
  const syncFormDataFromAlumno = (al) => {
    if (!al) return;
    const nuevoData = {
      apellido_nombres: al.apellido_nombres || `${al.primer_apellido || ''}, ${al.primer_nombre || ''}`,
      dni: al.numero_documento ? String(al.numero_documento) : '',
      legajo: al.legajo || '',
      fecha_nacimiento: al.fecha_nacimiento || '',
      ciudad_nacimiento: al.ciudad_nacimiento || '',
      provincia_nacimiento: al.provincia_nacimiento || '',
      nacionalidad: al.nacionalidad || 'Argentina',
      estado_civil: al.estado_civil || 'Soltero',
      sexo: al.sexo || 'M',
      edad: al.edad ? String(al.edad) : '',
      hijos: al.hijos !== undefined ? String(al.hijos) : (al.cantidad_hijos !== undefined ? String(al.cantidad_hijos) : '0'),
      domicilio: al.domicilio || al.calle || '',
      numero: al.numero ? String(al.numero) : '',
      piso: al.piso || '—',
      depto: al.depto || '—',
      localidad_barrio: al.localidad_barrio || '',
      partido: al.partido || '',
      codigo_postal: al.codigo_postal ? String(al.codigo_postal) : '',
      celular: al.celular || '',
      mail: al.mail || al.email || ''
    };

    formData = nuevoData;
    formDataOriginal = { ...nuevoData };
    editandoDatosAlumno = false;

    const notasIniciales = al.notas_previas ? { ...al.notas_previas } : {};
    datosAcademicos = notasIniciales;
    datosAcademicosOriginales = JSON.parse(JSON.stringify(notasIniciales));
    editandoNotas = false;

    if (al.id_carrera) {
      idCarreraSeleccionada = al.id_carrera;
    }
  };

  // Helper para determinar si un campo de datos personales del alumno está bloqueado para edición
  const isCampoBloqueado = (nombreCampo) => {
    if (!editandoDatosAlumno) return true;
    if (isAlumno && (nombreCampo === 'dni' || nombreCampo === 'legajo')) return true;
    return false;
  };

  // Verificación de superposición de horarios entre materias
  const verificarSuperposicionHoraria = (materiaNueva, idSeleccionadas, listaMaterias) => {
    if (!materiaNueva.horarios || materiaNueva.horarios.length === 0) return null;

    const toMin = (str) => {
      if (!str) return 0;
      const [h, m] = str.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    for (const idSel of idSeleccionadas) {
      if (Number(idSel) === Number(materiaNueva.id_materia)) continue;
      const otra = listaMaterias.find(m => Number(m.id_materia) === Number(idSel));
      if (!otra || !otra.horarios || otra.horarios.length === 0) continue;

      for (const hNueva of materiaNueva.horarios) {
        for (const hOtra of otra.horarios) {
          const dia1 = (hNueva.dia_semana || '').trim().toLowerCase();
          const dia2 = (hOtra.dia_semana || '').trim().toLowerCase();
          if (dia1 === dia2) {
            const ini1 = toMin(hNueva.hora_inicio);
            const fin1 = toMin(hNueva.hora_fin);
            const ini2 = toMin(hOtra.hora_inicio);
            const fin2 = toMin(hOtra.hora_fin);

            if (ini1 < fin2 && fin1 > ini2) {
              return {
                tipo: 'horario',
                materiaNueva,
                otraMateria: otra,
                dia: hNueva.dia_semana,
                franjaNueva: `${hNueva.hora_inicio} a ${hNueva.hora_fin}`,
                aulaNueva: hNueva.aula || 'Aula a coordinar',
                franjaOtra: `${hOtra.hora_inicio} a ${hOtra.hora_fin}`,
                aulaOtra: hOtra.aula || 'Aula a coordinar',
                motivo: `Superposición horaria el ${hNueva.dia_semana} (${hNueva.hora_inicio}-${hNueva.hora_fin}) con ${otra.nombre_materia}`
              };
            }
          }
        }
      }
    }
    return null;
  };

  // Mapa de materias que tienen conflicto horario con las ya seleccionadas
  const getConflictosActivos = () => {
    const idsSel = Array.from(materiasSeleccionadas.keys());
    const mapa = new Map();
    if (idsSel.length === 0) return mapa;

    materias.forEach((m) => {
      if (materiasSeleccionadas.has(m.id_materia)) return;
      const conf = verificarSuperposicionHoraria(m, idsSel, materias);
      if (conf) {
        mapa.set(m.id_materia, conf);
      }
    });
    return mapa;
  };

  // Cargar asignaturas según carrera e historial
  const cargarMaterias = async () => {
    loadingMaterias = true;
    try {
      const idAlumno = alumnoSeleccionado ? alumnoSeleccionado.id_alumno : null;
      const res = await api.getMateriasCarrera(idCarreraSeleccionada, idAlumno);
      materias = res.materias || [];
      materiasSeleccionadas.clear();
    } catch (err) {
      if (onNotify) onNotify('Error al cargar asignaturas de la carrera', 'error');
    } finally {
      loadingMaterias = false;
    }
  };

  // Toggle de Curso Presencial vs Recursa Presencial
  const toggleTipoAsistencia = (idMateria, tipo) => {
    const materia = materias.find(m => Number(m.id_materia) === Number(idMateria));
    if (!materia) return;

    const academico = datosAcademicos[idMateria] || {};
    const yaAprobada = Boolean(
      (academico.nota_num && !isNaN(Number(academico.nota_num)) && Number(academico.nota_num) >= 4) ||
      (academico.nota_num && academico.fecha) ||
      (academico.cursada && academico.fecha && academico.nota_num) ||
      (materia.aprobada === true)
    );
    if (yaAprobada) {
      if (onNotify) onNotify(`La materia "${materia.nombre_materia}" ya cuenta con sus notas validadas por Preceptoría. No se encuentra disponible para anotarse.`, 'info');
      return;
    }

    const actual = materiasSeleccionadas.get(idMateria);
    if (actual === tipo) {
      materiasSeleccionadas.delete(idMateria);
      if (burbujaConflicto && (burbujaConflicto.materiaNueva?.id_materia === idMateria || burbujaConflicto.otraMateria?.id_materia === idMateria)) {
        burbujaConflicto = null;
      }
      actualizarSeccionMaterias();
      return;
    }

    if (!materia.habilitada && materia.motivo_bloqueo) {
      burbujaConflicto = {
        tipo: 'correlatividad',
        materiaNueva: materia,
        motivo: materia.motivo_bloqueo,
        correlativas: materia.correlativas || []
      };
      if (onNotify) onNotify(materia.motivo_bloqueo || 'No cumple con las correlatividades para cursar esta materia', 'error');
      actualizarSeccionMaterias();
      return;
    }

    const idsSel = Array.from(materiasSeleccionadas.keys());
    const conflicto = verificarSuperposicionHoraria(materia, idsSel, materias);
    if (conflicto) {
      burbujaConflicto = conflicto;
      if (onNotify) onNotify(`Superposición horaria: ${materia.nombre_materia} coincide el día ${conflicto.dia} con ${conflicto.otraMateria.nombre_materia}. Hacé clic en "Ver Detalle" para ver el reporte.`, 'error');
      actualizarSeccionMaterias();
      return;
    }

    materiasSeleccionadas.set(idMateria, tipo);
    if (burbujaConflicto) {
      burbujaConflicto = null;
    }
    actualizarSeccionMaterias();
  };

  // Manejar cambios en las notas / fechas de la tabla de materias
  const handleAcademicoChange = (idMateria, field, value) => {
    if (!datosAcademicos[idMateria]) {
      datosAcademicos[idMateria] = {};
    }
    datosAcademicos[idMateria][field] = value;

    const matAcad = datosAcademicos[idMateria];
    const esValidada = Boolean(
      (matAcad.nota_num && !isNaN(Number(matAcad.nota_num)) && Number(matAcad.nota_num) >= 4) ||
      (matAcad.nota_num && matAcad.fecha) ||
      (matAcad.cursada && matAcad.fecha && matAcad.nota_num)
    );
    if (esValidada && materiasSeleccionadas.has(idMateria)) {
      materiasSeleccionadas.delete(idMateria);
      actualizarSeccionMaterias();
    }
  };

  // Filtrar alumnos según la carrera seleccionada y los filtros de búsqueda
  const filtrarAlumnosActuales = () => {
    const legajoLower = filtroLegajo.trim().toLowerCase();
    const dniLower = filtroDni.trim().toLowerCase();
    const apellidoLower = filtroApellido.trim().toLowerCase();

    return alumnos.filter(a => {
      const cumpleCarrera = !idCarreraSeleccionada || Number(a.id_carrera) === Number(idCarreraSeleccionada);
      const cumpleLegajo = !legajoLower ||
        (a.legajo && a.legajo.toLowerCase().includes(legajoLower));
      const cumpleDni = !dniLower ||
        (a.numero_documento && String(a.numero_documento).toLowerCase().includes(dniLower));
      const cumpleApellido = !apellidoLower ||
        (a.primer_apellido && a.primer_apellido.toLowerCase().includes(apellidoLower)) ||
        (a.apellido_nombres && a.apellido_nombres.toLowerCase().includes(apellidoLower));
      return cumpleCarrera && cumpleLegajo && cumpleDni && cumpleApellido;
    });
  };

  // Búsqueda manual de alumnos
  const handleBuscarAlumnos = () => {
    const legajoLower = filtroLegajo.trim().toLowerCase();
    const dniLower = filtroDni.trim().toLowerCase();
    const apellidoLower = filtroApellido.trim().toLowerCase();

    const resultado = filtrarAlumnosActuales();

    alumnosFiltrados = resultado;
    busquedaRealizada = true;

    if (resultado.length > 0) {
      if (!resultado.some(a => a.id_alumno === alumnoElegidoEnLista?.id_alumno)) {
        alumnoElegidoEnLista = resultado[0];
      }
    } else {
      alumnoElegidoEnLista = null;
    }

    if (legajoLower || dniLower || apellidoLower) {
      if (onNotify) onNotify(`Búsqueda finalizada: ${resultado.length} alumno(s) encontrado(s) en la carrera seleccionada`, resultado.length > 0 ? 'success' : 'warning');
    } else {
      if (onNotify) onNotify(
        resultado.length > 0
          ? `Mostrando alumnos de la carrera seleccionada (${resultado.length})`
          : 'No hay alumnos registrados en la carrera seleccionada',
        resultado.length > 0 ? 'info' : 'warning'
      );
    }
    render();
  };

  // Limpiar filtros de búsqueda
  const handleLimpiarFiltros = () => {
    filtroLegajo = '';
    filtroDni = '';
    filtroApellido = '';
    alumnosFiltrados = [];
    alumnoElegidoEnLista = null;
    busquedaRealizada = false;
    if (onNotify) onNotify('Filtros de búsqueda restablecidos', 'info');
    render();
  };

  // Cargar en la Planilla A5a el alumno elegido en el listado
  const handleCargarPlanilla = async () => {
    if (!alumnoElegidoEnLista) {
      if (onNotify) onNotify('Por favor seleccione un alumno del listado antes de cargar la planilla.', 'warning');
      return;
    }
    let detalleCompleto = alumnoElegidoEnLista;
    try {
      const det = await api.getAlumnoDetalle(alumnoElegidoEnLista.id_alumno || alumnoElegidoEnLista.id);
      if (det) detalleCompleto = { ...alumnoElegidoEnLista, ...det };
    } catch (_) {}

    alumnoSeleccionado = detalleCompleto;
    syncFormDataFromAlumno(alumnoSeleccionado);
    await cargarMaterias();
    const nombre = detalleCompleto.apellido_nombres || `${detalleCompleto.primer_apellido || ''}, ${detalleCompleto.primer_nombre || ''}`;
    if (onNotify) onNotify(`Planilla A5a cargada con éxito para ${nombre.trim()}.`, 'success');
    render();
  };

  // Habilitar / Guardar / Cancelar Edición de Datos del Alumno
  const handleHabilitarEdicion = () => {
    formDataOriginal = { ...formData };
    editandoDatosAlumno = true;
    if (onNotify) onNotify('Edición de datos habilitada. Puede modificar los campos y presionar "Guardar Datos".', 'info');
    render();
  };

  const handleGuardarDatosAlumno = () => {
    if (!formData.apellido_nombres || !formData.dni) {
      if (onNotify) onNotify('El Apellido/Nombres y el DNI son campos obligatorios.', 'error');
      return;
    }

    if (alumnoSeleccionado) {
      alumnoSeleccionado.apellido_nombres = formData.apellido_nombres;
      alumnoSeleccionado.numero_documento = formData.dni;
      alumnoSeleccionado.legajo = formData.legajo;
      alumnoSeleccionado.fecha_nacimiento = formData.fecha_nacimiento;
      alumnoSeleccionado.ciudad_nacimiento = formData.ciudad_nacimiento;
      alumnoSeleccionado.provincia_nacimiento = formData.provincia_nacimiento;
      alumnoSeleccionado.nacionalidad = formData.nacionalidad;
      alumnoSeleccionado.estado_civil = formData.estado_civil;
      alumnoSeleccionado.sexo = formData.sexo;
      alumnoSeleccionado.edad = formData.edad;
      alumnoSeleccionado.hijos = formData.hijos;
      alumnoSeleccionado.domicilio = formData.domicilio;
      alumnoSeleccionado.numero = formData.numero;
      alumnoSeleccionado.piso = formData.piso;
      alumnoSeleccionado.depto = formData.depto;
      alumnoSeleccionado.localidad_barrio = formData.localidad_barrio;
      alumnoSeleccionado.partido = formData.partido;
      alumnoSeleccionado.codigo_postal = formData.codigo_postal;
      alumnoSeleccionado.celular = formData.celular;
      alumnoSeleccionado.mail = formData.mail;
    }

    formDataOriginal = { ...formData };
    editandoDatosAlumno = false;
    if (onNotify) onNotify('Datos del estudiante guardados y actualizados con éxito.', 'success');
    render();
  };

  const handleCancelarEdicion = () => {
    if (formDataOriginal) {
      formData = { ...formDataOriginal };
    }
    editandoDatosAlumno = false;
    if (onNotify) onNotify('Edición cancelada. Se restablecieron los datos anteriores.', 'info');
    render();
  };

  // Habilitar / Guardar / Cancelar Edición de Notas Validadas (Preceptoría)
  const handleHabilitarEdicionNotas = () => {
    datosAcademicosOriginales = JSON.parse(JSON.stringify(datosAcademicos));
    editandoNotas = true;
    if (onNotify) onNotify('Edición de calificaciones habilitada. Puede modificar las notas de las materias validadas y presionar "Guardar Calificaciones".', 'info');
    render();
  };

  const handleGuardarNotas = () => {
    if (alumnoSeleccionado) {
      alumnoSeleccionado.notas_previas = JSON.parse(JSON.stringify(datosAcademicos));
    }
    datosAcademicosOriginales = JSON.parse(JSON.stringify(datosAcademicos));
    editandoNotas = false;
    if (onNotify) onNotify('Calificaciones institucionales guardadas y actualizadas con éxito.', 'success');
    render();
  };

  const handleCancelarEdicionNotas = () => {
    if (datosAcademicosOriginales) {
      datosAcademicos = JSON.parse(JSON.stringify(datosAcademicosOriginales));
    }
    editandoNotas = false;
    if (onNotify) onNotify('Edición cancelada. Se restablecieron las calificaciones anteriores.', 'info');
    render();
  };

  // Confirmar e Inscribir Materias
  const handleGuardarInscripcion = async () => {
    if (!alumnoSeleccionado) {
      if (onNotify) onNotify('Primero debe buscar un alumno y presionar "Cargar Planilla".', 'error');
      return;
    }

    if (materiasSeleccionadas.size === 0) {
      if (onNotify) onNotify('Debe seleccionar al menos una materia para formalizar la matrícula.', 'error');
      return;
    }

    const totalHoras = materiasSeleccionadas.size * 4;
    const limiteMaximoHoras = 32;
    if (totalHoras > limiteMaximoHoras) {
      if (onNotify) onNotify(`Tope institucional excedido (${totalHoras} hs solicitadas / máximo ${limiteMaximoHoras} hs). Reduzca la carga horaria.`, 'error');
      return;
    }

    enviando = true;
    render();
    try {
      const arrayMaterias = Array.from(materiasSeleccionadas.entries()).map(([idMateria, tipo]) => ({
        id_materia: idMateria,
        tipo_asistencia: tipo === 'recursa' ? '2' : '1'
      }));

      const payload = {
        id_alumno: alumnoSeleccionado.id_alumno,
        id_carrera: Number(idCarreraSeleccionada),
        id_turno: 3,
        id_sede: 1,
        ciclo_lectivo: 2026,
        materias: arrayMaterias,
        datos_formulario_a5a: formData
      };

      await api.inscribirMaterias(payload);
      if (onNotify) onNotify(`Inscripción confirmada. Formulario A5a guardado con éxito (${arrayMaterias.length} materias).`, 'success');
    } catch (err) {
      if (onNotify) onNotify(err.message || 'Error al guardar la inscripción', 'error');
    } finally {
      enviando = false;
      render();
    }
  };

  // Renderizador de una fila de materia
  const renderFilaMateria = (m, conflictosActivos) => {
    const seleccion = materiasSeleccionadas.get(m.id_materia);
    const esCurso = seleccion === 'curso';
    const esRecursa = seleccion === 'recursa';
    const academico = datosAcademicos[m.id_materia] || {};
    const conflicto = conflictosActivos.get(m.id_materia);

    const yaAprobada = Boolean(
      (academico.nota_num && !isNaN(Number(academico.nota_num)) && Number(academico.nota_num) >= 4) ||
      (academico.nota_num && academico.fecha) ||
      (academico.cursada && academico.fecha && academico.nota_num) ||
      (m.aprobada === true)
    );

    const deshabilitada = (!m.habilitada) || (Boolean(conflicto) && !seleccion);
    const isNotaBloqueada = isAlumno || !editandoNotas;

    return `
      <tr style="background: ${yaAprobada ? '#f8fafc' : conflicto ? '#fff5f5' : 'transparent'};">
        <td style="text-align: center;">${m.anio_cursada}</td>
        <td style="text-align: center;">${m.nro}</td>
        <td style="text-align: center; ${m.cva && m.cva !== '—' ? 'font-weight: 700; color: var(--primary);' : 'color: var(--text-muted);'}" title="${m.cva_tooltip || 'Sin correlativas'}">${m.cva || '—'}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-weight: 600; ${yaAprobada ? 'color: #475569;' : ''}">
              ${m.nombre_materia}
            </span>

            ${yaAprobada ? `
              <span class="badge-materia-validada" title="Materia con calificaciones validadas">
                <span class="tilde-icono-validada">✓</span> Validada
              </span>
            ` : ''}

            ${(!yaAprobada && !m.habilitada && m.motivo_bloqueo) ? `
              <div class="no-print" style="display: inline-flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                <span class="badge-corr-adeuda" title="${m.motivo_bloqueo}">
                  ${Number(m.anio_cursada) === 1 ? '1º Año (Fuera de alcance)' : 'Adeuda Correlativa'}
                </span>
                <button
                  type="button"
                  class="btn-ver-conflicto btn-ver-conflicto-corr"
                  data-conflicto-correlativa="${m.id_materia}"
                  title="Ver información detallada del motivo de bloqueo"
                >
                  Ver Detalle
                </button>
              </div>
            ` : ''}

            ${(!yaAprobada && conflicto) ? `
              <div class="no-print" style="display: inline-flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                <span class="badge-horario-conflicto">
                  Superposición Horaria
                </span>
                <button
                  type="button"
                  class="btn-ver-conflicto"
                  data-conflicto-horario="${m.id_materia}"
                  title="Ver información detallada del cruce de horarios"
                >
                  Ver Detalle
                </button>
              </div>
            ` : ''}
          </div>

          ${!yaAprobada ? (
        m.horarios && m.horarios.length > 0 ? `
              <div class="no-print" style="margin-top: 0.25rem; font-size: 0.75rem; color: #0284c7; font-weight: 600;">
                ${m.horarios.map(h => `${h.dia_semana} ${h.hora_inicio}-${h.hora_fin} (${h.aula || 'Aula a coordinar'})`).join(' | ')}
              </div>
            ` : `
              <div class="no-print" style="margin-top: 0.2rem; font-size: 0.72rem; color: var(--text-muted);">
                Horario a coordinar
              </div>
            `
      ) : ''}
        </td>

        <!-- Celda Curso Presencial -->
        <td class="checkbox-cell">
          ${yaAprobada ? `
            <span 
              class="text-no-disponible" 
              title="Materia con notas ya validadas por Preceptoría. No disponible para anotarse."
            >
              —
            </span>
          ` : `
            <input 
              type="checkbox" 
              data-materia-id="${m.id_materia}"
              data-tipo="curso"
              ${esCurso ? 'checked' : ''}
              ${deshabilitada ? 'disabled' : ''}
              title="${!m.habilitada
        ? (m.motivo_bloqueo || '')
        : conflicto
          ? `Inhabilitada: ${conflicto.motivo}`
          : 'Inscribir como Curso Presencial'
      }"
            />
          `}
        </td>

        <!-- Celda Recursa Presencial -->
        <td class="checkbox-cell">
          ${yaAprobada ? `
            <span 
              class="text-no-disponible" 
              title="Materia con notas ya validadas por Preceptoría. No disponible para anotarse."
            >
              —
            </span>
          ` : `
            <input 
              type="checkbox" 
              data-materia-id="${m.id_materia}"
              data-tipo="recursa"
              ${esRecursa ? 'checked' : ''}
              ${deshabilitada ? 'disabled' : ''}
              title="${!m.habilitada
        ? (m.motivo_bloqueo || '')
        : conflicto
          ? `Inhabilitada: ${conflicto.motivo}`
          : 'Inscribir como Recursa Presencial'
      }"
            />
          `}
        </td>

        <!-- Columnas de Notas Oficiales -->
        <td class="input-cell">
          <input 
            type="text" 
            class="cell-input ${isNotaBloqueada ? 'cell-input-readonly' : 'cell-input-editing'}"
            ${isNotaBloqueada ? 'readonly' : ''} 
            data-academico-materia="${m.id_materia}"
            data-academico-field="nota_num"
            value="${academico.nota_num || ''}" 
            placeholder="—"
            title="${isAlumno
        ? 'Calificación oficial validada por Preceptoría (Solo lectura)'
        : isNotaBloqueada
          ? 'Calificación validada. Presione \"Habilitar Edición\" para modificar'
          : 'Editar calificación numérica'
      }"
          />
        </td>
        <td class="input-cell">
          <input 
            type="text" 
            class="cell-input ${isNotaBloqueada ? 'cell-input-readonly' : 'cell-input-editing'}"
            ${isNotaBloqueada ? 'readonly' : ''} 
            data-academico-materia="${m.id_materia}"
            data-academico-field="nota_letra"
            value="${academico.nota_letra || ''}" 
            placeholder="—"
            title="${isAlumno
        ? 'Calificación en letras validada por Preceptoría (Solo lectura)'
        : isNotaBloqueada
          ? 'Calificación validada. Presione \"Habilitar Edición\" para modificar'
          : 'Editar calificación en letras'
      }"
          />
        </td>
        <td class="input-cell">
          <input 
            type="text" 
            class="cell-input ${isNotaBloqueada ? 'cell-input-readonly' : 'cell-input-editing'}"
            ${isNotaBloqueada ? 'readonly' : ''} 
            data-academico-materia="${m.id_materia}"
            data-academico-field="fecha"
            value="${academico.fecha || ''}" 
            placeholder="dd/mm/aaaa"
            title="${isAlumno
        ? 'Fecha de acreditación validada por Preceptoría (Solo lectura)'
        : isNotaBloqueada
          ? 'Fecha validada. Presione \"Habilitar Edición\" para modificar'
          : 'Editar fecha de acreditación (dd/mm/aaaa)'
      }"
          />
        </td>
        <td class="input-cell">
          <input 
            type="text" 
            class="cell-input ${isNotaBloqueada ? 'cell-input-readonly' : 'cell-input-editing'}"
            ${isNotaBloqueada ? 'readonly' : ''} 
            data-academico-materia="${m.id_materia}"
            data-academico-field="cursada"
            value="${academico.cursada || ''}" 
            placeholder="Año"
            title="${isAlumno
        ? 'Ciclo lectivo validado por Preceptoría (Solo lectura)'
        : isNotaBloqueada
          ? 'Ciclo lectivo validado. Presione \"Habilitar Edición\" para modificar'
          : 'Editar ciclo lectivo de cursada'
      }"
          />
        </td>
      </tr>
    `;
  };

  // Renderizador de un grupo de año en la tabla
  const renderGrupoAnio = (lista, titulo, conflictosActivos) => {
    if (!lista || lista.length === 0) return '';
    return `
      <tr>
        <td colspan="10" class="year-group">${titulo}</td>
      </tr>
      <tr class="subtable-header-row">
        <th style="width: 50px; text-align: center;">Año</th>
        <th style="width: 50px; text-align: center;">N°</th>
        <th style="width: 70px; text-align: center;">CVA</th>
        <th>Espacio Curricular / Asignatura</th>
        <th style="width: 85px; text-align: center;">Curso Pres.</th>
        <th style="width: 85px; text-align: center;">Recursa Pres.</th>
        <th style="width: 90px; text-align: center;">Notas (núm)</th>
        <th style="width: 95px; text-align: center;">Notas (letra)</th>
        <th style="width: 105px; text-align: center;">Fecha (dd/mm/aaaa)</th>
        <th style="width: 120px; text-align: center;">Cursada Aprob. (Año)</th>
      </tr>
      ${lista.map(m => renderFilaMateria(m, conflictosActivos)).join('')}
    `;
  };

  // Popover compacto anclado al costado del botón "Ver Detalle" (sin fondo oscuro ni invasivo)
  const renderBurbujaConflictoModal = () => {
    if (cleanupPopoverListeners) {
      cleanupPopoverListeners();
      cleanupPopoverListeners = null;
    }

    let portal = document.getElementById('inscripcion-conflicto-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'inscripcion-conflicto-portal';
      portal.className = 'no-print';
      document.body.appendChild(portal);
    }

    if (!burbujaConflicto) {
      portal.innerHTML = '';
      return;
    }

    const esHorario = burbujaConflicto.tipo === 'horario';

    portal.innerHTML = `
      <div
        id="conflicto-popover-card"
        class="burbuja-conflicto-popover ${esHorario ? 'bubble-horario' : 'bubble-correlatividad'}"
        role="tooltip"
      >
        <div style="background: ${esHorario ? '#fee2e2' : '#fef3c7'}; padding: 0.55rem 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; border-bottom: 1px solid ${esHorario ? '#fecaca' : '#fde68a'};">
          <strong style="color: ${esHorario ? '#991b1b' : '#92400e'}; font-size: 0.84rem;">
            ${esHorario ? 'Superposición Horaria' : 'Detalle de Requisito'}
          </strong>
          <button
            type="button"
            id="btn-cerrar-burbuja"
            style="background: none; border: none; cursor: pointer; font-weight: 800; font-size: 1.1rem; color: ${esHorario ? '#991b1b' : '#92400e'}; line-height: 1; padding: 0 2px;"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <div style="padding: 0.8rem 0.9rem; font-size: 0.82rem; color: #334155; line-height: 1.45;">
          ${esHorario ? `
            <p style="margin: 0 0 0.5rem 0;">
              <strong>${burbujaConflicto.materiaNueva.nombre_materia}</strong> coincide el <strong>${burbujaConflicto.dia}</strong> (${burbujaConflicto.franjaNueva}) con <strong>${burbujaConflicto.otraMateria.nombre_materia}</strong> (${burbujaConflicto.franjaOtra}).
            </p>
            <div style="font-size: 0.76rem; color: var(--text-muted);">
              Desmarcá la otra materia o consultá por otra comisión.
            </div>
          ` : `
            <div style="font-weight: 600; color: #92400e; margin-bottom: ${burbujaConflicto.correlativas?.length ? '0.5rem' : '0'};">
              ${burbujaConflicto.motivo || 'Adeuda correlativas obligatorias.'}
            </div>
            ${(burbujaConflicto.correlativas && burbujaConflicto.correlativas.length > 0) ? `
              <ul style="margin: 0; padding-left: 1.1rem; font-size: 0.79rem;">
                ${burbujaConflicto.correlativas.map(c => `
                  <li style="margin-bottom: 0.2rem;">
                    <strong>${c.nombre_materia_correlativa}</strong>:
                    <span style="font-weight: 700; color: ${c.cumplida ? '#16a34a' : '#dc2626'};">${c.estado || (c.cumplida ? 'Cumplida' : 'Adeuda')}</span>
                  </li>
                `).join('')}
              </ul>
            ` : ''}
          `}
        </div>
      </div>
    `;

    const card = portal.querySelector('#conflicto-popover-card');
    if (card) {
      const margin = 12;
      const cardRect = card.getBoundingClientRect();
      let left = window.innerWidth - cardRect.width - margin;
      let top = 96;

      if (burbujaAnchorRect) {
        // Ubicar preferentemente al costado derecho del botón "Ver Detalle"
        left = burbujaAnchorRect.right + 10;
        if (left + cardRect.width > window.innerWidth - margin) {
          left = burbujaAnchorRect.left - cardRect.width - 10;
        }
        if (left < margin) {
          left = Math.max(margin, Math.min(burbujaAnchorRect.left, window.innerWidth - cardRect.width - margin));
        }

        top = burbujaAnchorRect.top - 6;
        if (top + cardRect.height > window.innerHeight - margin) {
          top = Math.max(margin, window.innerHeight - cardRect.height - margin);
        }
        if (top < margin) top = margin;
      }

      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(top)}px`;
    }

    const cerrar = () => {
      burbujaConflicto = null;
      burbujaAnchorRect = null;
      renderBurbujaConflictoModal();
    };

    portal.querySelector('#btn-cerrar-burbuja')?.addEventListener('click', cerrar);

    const onOutsideClick = (ev) => {
      if (card && !card.contains(ev.target) && !ev.target.closest('.btn-ver-conflicto')) {
        cerrar();
      }
    };
    const onScrollOrResize = () => cerrar();

    setTimeout(() => {
      document.addEventListener('click', onOutsideClick);
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
    }, 0);

    cleanupPopoverListeners = () => {
      document.removeEventListener('click', onOutsideClick);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  };

  // Render del panel de carga horaria (reutilizable en actualizaciones parciales sin saltos)
  const renderWorkloadInnerHtml = () => {
    const totalHoras = materiasSeleccionadas.size * 4;
    const limiteMaximoHoras = 32;
    const cargaExcedida = totalHoras > limiteMaximoHoras;
    const porcentajeCarga = Math.min(100, Math.round((totalHoras / limiteMaximoHoras) * 100));

    return `
      <div class="workload-stats">
        <div class="workload-stat-item">
          <span class="workload-stat-label">Carga Solicitada</span>
          <span class="workload-stat-value ${cargaExcedida ? 'exceeded' : ''}">
            ${totalHoras} hs <span style="font-size: 0.8rem; font-weight: 500;">/ sem</span>
          </span>
        </div>
        <div class="workload-stat-item">
          <span class="workload-stat-label">Materias Seleccionadas</span>
          <span class="workload-stat-value" style="color: var(--primary-light);">
            ${materiasSeleccionadas.size}
          </span>
        </div>
        <div class="workload-stat-item">
          <span class="workload-stat-label">Tope Institucional</span>
          <span class="workload-stat-value" style="color: var(--text-main);">
            ${limiteMaximoHoras} hs
          </span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 1rem; flex: 1; justify-content: flex-end;">
        <div class="workload-bar-container">
          <div 
            class="workload-bar-fill ${cargaExcedida ? 'exceeded' : ''}" 
            style="width: ${porcentajeCarga}%;"
          ></div>
        </div>
        ${cargaExcedida ? `
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--danger);">
            Excede tope institucional de 32 hs
          </span>
        ` : ''}
      </div>
    `;
  };

  // Enlazar solo los eventos de la tabla de materias (para actualización parcial sin reconstruir toda la vista)
  const bindMateriasTbodyEvents = () => {
    const tbody = container.querySelector('#inscripcion-materias-tbody');
    if (!tbody) return;

    tbody.querySelectorAll('input[data-academico-materia]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idMat = Number(e.target.getAttribute('data-academico-materia'));
        const field = e.target.getAttribute('data-academico-field');
        handleAcademicoChange(idMat, field, e.target.value);
      });
    });

    tbody.querySelectorAll('input[type="checkbox"][data-materia-id]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const idMat = Number(e.target.getAttribute('data-materia-id'));
        const tipo = e.target.getAttribute('data-tipo');
        toggleTipoAsistencia(idMat, tipo);
      });
    });

    tbody.querySelectorAll('.btn-ver-conflicto-corr').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idMat = Number(btn.getAttribute('data-conflicto-correlativa'));
        if (burbujaConflicto && burbujaConflicto.tipo === 'correlatividad' && Number(burbujaConflicto.materiaNueva?.id_materia) === idMat) {
          burbujaConflicto = null;
          burbujaAnchorRect = null;
          renderBurbujaConflictoModal();
          return;
        }
        const m = materias.find(x => Number(x.id_materia) === idMat);
        if (m) {
          burbujaAnchorRect = btn.getBoundingClientRect();
          burbujaConflicto = {
            tipo: 'correlatividad',
            materiaNueva: m,
            motivo: m.motivo_bloqueo,
            correlativas: m.correlativas || []
          };
          renderBurbujaConflictoModal();
        }
      });
    });

    tbody.querySelectorAll('.btn-ver-conflicto[data-conflicto-horario]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idMat = Number(btn.getAttribute('data-conflicto-horario'));
        if (burbujaConflicto && burbujaConflicto.tipo === 'horario' && Number(burbujaConflicto.materiaNueva?.id_materia) === idMat) {
          burbujaConflicto = null;
          burbujaAnchorRect = null;
          renderBurbujaConflictoModal();
          return;
        }
        const conflictosActivos = getConflictosActivos();
        const conf = conflictosActivos.get(idMat);
        if (conf) {
          burbujaAnchorRect = btn.getBoundingClientRect();
          burbujaConflicto = conf;
          renderBurbujaConflictoModal();
        }
      });
    });
  };

  // Actualización quirúrgica de la tabla y el medidor al tildar/destildar materias (cero saltos de pantalla)
  const actualizarSeccionMaterias = () => {
    const workloadPanel = container.querySelector('#inscripcion-workload-panel');
    const tbody = container.querySelector('#inscripcion-materias-tbody');
    if (!workloadPanel || !tbody) {
      render();
      return;
    }

    const prevScrollY = window.scrollY;
    const totalHoras = materiasSeleccionadas.size * 4;
    const cargaExcedida = totalHoras > 32;
    const conflictosActivos = getConflictosActivos();
    const materiasPorAnio = {
      anio1: materias.filter(m => m.anio_cursada === 1),
      anio2: materias.filter(m => m.anio_cursada === 2),
      anio3: materias.filter(m => m.anio_cursada === 3)
    };

    workloadPanel.innerHTML = renderWorkloadInnerHtml();
    tbody.innerHTML = `
      ${renderGrupoAnio(materiasPorAnio.anio1, '1ER AÑO', conflictosActivos)}
      ${renderGrupoAnio(materiasPorAnio.anio2, '2DO AÑO', conflictosActivos)}
      ${renderGrupoAnio(materiasPorAnio.anio3, '3ER AÑO', conflictosActivos)}
    `;

    const btnConfirmar = container.querySelector('#btn-confirmar-inscripcion');
    if (btnConfirmar) {
      btnConfirmar.disabled = Boolean(enviando || materiasSeleccionadas.size === 0 || cargaExcedida);
    }

    bindMateriasTbodyEvents();
    renderBurbujaConflictoModal();

    if (window.scrollY !== prevScrollY) {
      window.scrollTo({ top: prevScrollY, behavior: 'instant' });
    }
  };

  // Render principal
  const render = () => {
    const prevScrollY = window.scrollY;
    const yaRenderizo = hasRenderedOnce;
    const totalHoras = materiasSeleccionadas.size * 4;
    const limiteMaximoHoras = 32;
    const cargaExcedida = totalHoras > limiteMaximoHoras;

    const carreraActual =
      carreras.find(c => Number(c.id_carrera) === Number(idCarreraSeleccionada)) ||
      carreras[0] || {
        id_carrera: idCarreraSeleccionada,
        nombre_carrera: 'Cargando carrera...',
        nro_resolucion: '',
        titulo: ''
      };

    const materiasPorAnio = {
      anio1: materias.filter(m => m.anio_cursada === 1),
      anio2: materias.filter(m => m.anio_cursada === 2),
      anio3: materias.filter(m => m.anio_cursada === 3)
    };

    const conflictosActivos = getConflictosActivos();

    container.innerHTML = `
      <div class="inscripcion-view${yaRenderizo ? '' : ' view-fade-in'}" style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- 1. ENCABEZADO INSTITUCIONAL -->
        <header class="page-header no-print">
          <div>
            <h1>${isAlumno ? 'Mi Inscripción a Materias' : 'Gestión de Inscripciones'}</h1>
            <p>
              ${isAlumno
        ? 'Completá tu selección de materias para el Ciclo Lectivo 2026. Verificá correlatividades y horarios de cátedra.'
        : 'Selección de carrera, filtros de búsqueda de estudiantes y matriculación en Formulario A5a (Preceptoría).'
      }
            </p>
          </div>
          <div class="header-badge">
            ${isAlumno ? 'Portal del Estudiante · ISFT 182' : 'I.S.F.T. Nº 182 · Preceptoría'}
          </div>
        </header>

        <!-- Si es Alumno: Banner de Bienvenida y datos del estudiante -->
        ${isAlumno ? `
          <div class="card student-welcome-card no-print" style="border-left: 4px solid var(--primary); background: #f8fafc; padding: 1.25rem 1.5rem;">
            <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.15rem;">
                ${(formData.apellido_nombres ? formData.apellido_nombres.charAt(0) : 'E').toUpperCase()}
              </div>
              <div style="flex: 1;">
                <span class="badge badge-info" style="margin-bottom: 0.35rem;">Sesión Activa</span>
                <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--primary); margin: 0.2rem 0;">
                  ${alumnoSeleccionado ? (alumnoSeleccionado.apellido_nombres || `${alumnoSeleccionado.primer_apellido || ''}, ${alumnoSeleccionado.primer_nombre || ''}`) : 'Estudiante'}
                </h2>
                <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.9rem; color: #475569; margin-top: 0.4rem;">
                  <div>DNI: <strong>${formData.dni}</strong></div>
                  <div>Legajo: <strong>${formData.legajo}</strong></div>
                  <div>Carrera: <strong>${carreraActual.nombre_carrera} (${carreraActual.nro_resolucion})</strong></div>
                </div>
              </div>
            </div>
          </div>
        ` : `
          <!-- 2. FILTRO DE CARRERA (Solo preceptor) -->
          <div class="card no-print">
            <div class="form-group" style="max-width: 600px;">
              <label>Carrera</label>
              <select id="select-carrera">
                ${carreras.map(c => `
                  <option value="${c.id_carrera}" ${Number(c.id_carrera) === Number(idCarreraSeleccionada) ? 'selected' : ''}>
                    ${c.nombre_carrera} (${c.nro_resolucion})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- 3. FILTROS DE BÚSQUEDA (Solo preceptor) -->
          <div class="card filters-card no-print">
            <div style="margin-bottom: 1rem; font-weight: 700; font-size: 1rem; color: var(--primary);">
              Filtros de búsqueda de alumnos
            </div>
            <div class="filters-grid">
              <div class="form-group">
                <label>Nro. legajo</label>
                <input 
                  type="text" 
                  id="filtro-legajo"
                  placeholder="Ej: 2024-001" 
                  value="${filtroLegajo}"
                />
              </div>
              <div class="form-group">
                <label>DNI</label>
                <input 
                  type="text" 
                  id="filtro-dni"
                  placeholder="Sin puntos" 
                  value="${filtroDni}"
                />
              </div>
              <div class="form-group">
                <label>Apellido</label>
                <input 
                  type="text" 
                  id="filtro-apellido"
                  placeholder="Apellido del alumno" 
                  value="${filtroApellido}"
                />
              </div>
              <button type="button" class="btn-search" id="btn-buscar">
                Buscar
              </button>
              <button type="button" class="btn-reset" id="btn-limpiar" title="Limpiar filtros">
                Limpiar
              </button>
            </div>
          </div>

          <!-- 4. RESULTADOS DE LA BÚSQUEDA (Solo preceptor y únicamente después de presionar Buscar) -->
          ${busquedaRealizada ? `
            <div class="results-header no-print">
              <h2>Resultados de la búsqueda</h2>
              <div class="results-actions">
                <span class="results-count">${alumnosFiltrados.length} resultados</span>
                <button 
                  type="button"
                  class="btn-cargar-planilla"
                  id="btn-cargar-planilla"
                  ${!alumnoElegidoEnLista ? 'disabled' : ''}
                  title="${alumnoElegidoEnLista ? `Cargar Planilla A5a de ${alumnoElegidoEnLista.primer_apellido || alumnoElegidoEnLista.apellido_nombres}` : 'Seleccione un alumno del listado'}"
                >
                  Cargar Planilla
                </button>
              </div>
            </div>
            
            <div class="card results-table-card no-print">
              <div class="results-table-header">
                <div>Nro. legajo</div>
                <div>DNI</div>
                <div>Alumno</div>
                <div>Carrera Registrada</div>
                <div style="text-align: center;">Planilla</div>
              </div>

              ${alumnosFiltrados.length === 0 ? `
                <div class="empty-state">
                  No se encontraron registros que coincidan con los filtros seleccionados.
                </div>
              ` : (
          alumnosFiltrados.map((a) => {
            const esElegido = alumnoElegidoEnLista && alumnoElegidoEnLista.id_alumno === a.id_alumno;
            const esCargado = alumnoSeleccionado && alumnoSeleccionado.id_alumno === a.id_alumno;
            return `
                    <div 
                      class="student-row ${esElegido ? 'selected' : ''} ${esCargado ? 'loaded-student' : ''}"
                      data-id-alumno="${a.id_alumno}"
                      title="Haga clic para seleccionar al alumno y luego pulse 'Cargar Planilla'"
                    >
                      <div style="font-weight: 600; color: var(--primary);">${a.legajo || ''}</div>
                      <div>${a.numero_documento || ''}</div>
                      <div style="font-weight: 600;">${a.apellido_nombres || `${a.primer_apellido || ''}, ${a.primer_nombre || ''}`}</div>
                      <div style="font-size: 0.85rem; color: var(--text-muted);">${a.carrera || carreraActual.nombre_carrera}</div>
                      <div style="text-align: center;">
                        ${esCargado ? `
                          <div class="badge-tilde-azul" title="Alumno cargado en la planilla activa">
                            <span class="tilde-icono-azul">✓</span>
                            <span class="tilde-texto-azul">Cargado</span>
                          </div>
                        ` : `
                          <span class="tilde-vacio">—</span>
                        `}
                      </div>
                    </div>
                  `;
          }).join('')
        )}
            </div>
          ` : ''}
        `}

        <!-- 5. PLANILLA DE MATRICULACIÓN (FORMULARIO A5a) -->
        <div class="planilla-card" id="planilla-matriculacion">
          
          <!-- Encabezado Planilla -->
          <div class="planilla-header">
            <div>
              <h2>DIRECCIÓN DE EDUCACIÓN SUPERIOR - INSTITUTO SUPERIOR DE FORMACIÓN TÉCNICA Nº 182</h2>
              <p>Planilla de Matriculación - Formulario A5a</p>
            </div>
            <div class="badge-form">FORM A5a</div>
          </div>

          <!-- Datos Principales de la Carrera -->
          <div class="data-grid" style="border-bottom: none;">
            <div class="data-field col-6">
              <label>Carrera</label>
              <div class="value" style="color: var(--primary); font-weight: 700;">
                ${(carreraActual.nombre_carrera || '').toUpperCase()}
              </div>
            </div>
            <div class="data-field col-6 no-border-right">
              <label>Título a Obtener</label>
              <div class="value" style="color: var(--text-muted);">
                ${carreraActual.titulo || 'Técnico Superior'}
              </div>
            </div>
            <div class="data-field col-6">
              <label>Resolución</label>
              <div class="value">${carreraActual.nro_resolucion || ''}</div>
            </div>
            <div class="data-field col-6 no-border-right">
              <label>Año Lectivo</label>
              <div class="value" style="color: var(--text-muted); font-weight: 600;">2026</div>
            </div>
          </div>

          <!-- Sección: Datos del Alumno -->
          <div class="section-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; padding: 0.65rem 1.25rem;">
            <div>
              <span>Datos del Alumno</span>
              <span class="no-print" style="font-size: 0.74rem; text-transform: none; color: ${editandoDatosAlumno ? 'var(--primary)' : 'var(--text-muted)'}; margin-left: 0.75rem; font-weight: 600;">
                ${editandoDatosAlumno ? 'Modo de Edición Habilitado' : 'Datos Bloqueados para Edición Directa'}
              </span>
            </div>

            <div class="no-print" style="display: flex; gap: 0.5rem; align-items: center;">
              ${!editandoDatosAlumno ? `
                <button
                  type="button"
                  class="btn-secondary"
                  id="btn-habilitar-edicion-alumno"
                  style="padding: 0.35rem 0.85rem; font-size: 0.8rem; font-weight: 700; border-radius: 6px;"
                  title="Habilitar edición de los datos del estudiante"
                >
                  Habilitar Edición
                </button>
              ` : `
                <button
                  type="button"
                  class="btn-primary"
                  id="btn-guardar-datos-alumno"
                  style="padding: 0.35rem 0.95rem; font-size: 0.8rem; font-weight: 700; border-radius: 6px;"
                  title="Guardar las modificaciones en la ficha del estudiante"
                >
                  Guardar Datos
                </button>
                <button
                  type="button"
                  class="btn-secondary"
                  id="btn-cancelar-edicion-alumno"
                  style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; border-radius: 6px;"
                  title="Cancelar y restablecer datos anteriores"
                >
                  Cancelar
                </button>
              `}
            </div>
          </div>
          
          <div class="data-grid">
            <!-- Fila 1 -->
            <div class="data-field col-6">
              <label>Apellido y Nombres</label>
              <input 
                type="text" 
                data-field="apellido_nombres"
                value="${formData.apellido_nombres || ''}" 
                placeholder="Apellido y Nombres"
                ${isCampoBloqueado('apellido_nombres') ? 'readonly' : ''}
                class="${isCampoBloqueado('apellido_nombres') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-3">
              <label>DNI</label>
              <input 
                type="text" 
                data-field="dni"
                value="${formData.dni || ''}" 
                placeholder="Número de documento"
                ${isCampoBloqueado('dni') ? 'readonly' : ''}
                class="${isCampoBloqueado('dni') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-3 no-border-right">
              <label>Nro. Legajo</label>
              <input 
                type="text" 
                data-field="legajo"
                value="${formData.legajo || ''}" 
                placeholder="Legajo"
                ${isCampoBloqueado('legajo') ? 'readonly' : ''}
                class="${isCampoBloqueado('legajo') ? 'input-locked' : 'input-editing'}"
              />
            </div>

            <!-- Fila 2 -->
            <div class="data-field col-4">
              <label>Fecha de Nacimiento</label>
              <input 
                type="text" 
                data-field="fecha_nacimiento"
                value="${formData.fecha_nacimiento || ''}" 
                placeholder="AAAA-MM-DD"
                ${isCampoBloqueado('fecha_nacimiento') ? 'readonly' : ''}
                class="${isCampoBloqueado('fecha_nacimiento') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-4">
              <label>Ciudad de Nacimiento</label>
              <input 
                type="text" 
                data-field="ciudad_nacimiento"
                value="${formData.ciudad_nacimiento || ''}" 
                placeholder="Ciudad de Nacimiento"
                ${isCampoBloqueado('ciudad_nacimiento') ? 'readonly' : ''}
                class="${isCampoBloqueado('ciudad_nacimiento') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-4 no-border-right">
              <label>Provincia de Nacimiento</label>
              <input 
                type="text" 
                data-field="provincia_nacimiento"
                value="${formData.provincia_nacimiento || ''}" 
                placeholder="Provincia"
                ${isCampoBloqueado('provincia_nacimiento') ? 'readonly' : ''}
                class="${isCampoBloqueado('provincia_nacimiento') ? 'input-locked' : 'input-editing'}"
              />
            </div>

            <!-- Fila 3 -->
            <div class="data-field col-3">
              <label>Nacionalidad</label>
              <input 
                type="text" 
                data-field="nacionalidad"
                value="${formData.nacionalidad || ''}" 
                ${isCampoBloqueado('nacionalidad') ? 'readonly' : ''}
                class="${isCampoBloqueado('nacionalidad') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-3">
              <label>Estado Civil</label>
              <input 
                type="text" 
                data-field="estado_civil"
                value="${formData.estado_civil || ''}" 
                ${isCampoBloqueado('estado_civil') ? 'readonly' : ''}
                class="${isCampoBloqueado('estado_civil') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-2">
              <label>Sexo</label>
              <input 
                type="text" 
                data-field="sexo"
                value="${formData.sexo || ''}" 
                ${isCampoBloqueado('sexo') ? 'readonly' : ''}
                class="${isCampoBloqueado('sexo') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-4 no-border-right">
              <label>Edad</label>
              <input 
                type="text" 
                data-field="edad"
                value="${formData.edad || ''}" 
                ${isCampoBloqueado('edad') ? 'readonly' : ''}
                class="${isCampoBloqueado('edad') ? 'input-locked' : 'input-editing'}"
              />
            </div>

            <!-- Fila 4 -->
            <div class="data-field col-1">
              <label>Hijos</label>
              <input 
                type="text" 
                data-field="hijos"
                value="${formData.hijos || ''}" 
                ${isCampoBloqueado('hijos') ? 'readonly' : ''}
                class="${isCampoBloqueado('hijos') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-5">
              <label>Domicilio</label>
              <input 
                type="text" 
                data-field="domicilio"
                value="${formData.domicilio || ''}" 
                placeholder="Calle"
                ${isCampoBloqueado('domicilio') ? 'readonly' : ''}
                class="${isCampoBloqueado('domicilio') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-2">
              <label>Número</label>
              <input 
                type="text" 
                data-field="numero"
                value="${formData.numero || ''}" 
                placeholder="N°"
                ${isCampoBloqueado('numero') ? 'readonly' : ''}
                class="${isCampoBloqueado('numero') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-2">
              <label>Piso</label>
              <input 
                type="text" 
                data-field="piso"
                value="${formData.piso || ''}" 
                placeholder="Piso"
                ${isCampoBloqueado('piso') ? 'readonly' : ''}
                class="${isCampoBloqueado('piso') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-2 no-border-right">
              <label>Depto.</label>
              <input 
                type="text" 
                data-field="depto"
                value="${formData.depto || ''}" 
                placeholder="Depto"
                ${isCampoBloqueado('depto') ? 'readonly' : ''}
                class="${isCampoBloqueado('depto') ? 'input-locked' : 'input-editing'}"
              />
            </div>

            <!-- Fila 5 -->
            <div class="data-field col-4">
              <label>Localidad / Barrio</label>
              <input 
                type="text" 
                data-field="localidad_barrio"
                value="${formData.localidad_barrio || ''}" 
                placeholder="Localidad o Barrio"
                ${isCampoBloqueado('localidad_barrio') ? 'readonly' : ''}
                class="${isCampoBloqueado('localidad_barrio') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-5">
              <label>Partido</label>
              <input 
                type="text" 
                data-field="partido"
                value="${formData.partido || ''}" 
                placeholder="Partido"
                ${isCampoBloqueado('partido') ? 'readonly' : ''}
                class="${isCampoBloqueado('partido') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-3 no-border-right">
              <label>Cód. Postal</label>
              <input 
                type="text" 
                data-field="codigo_postal"
                value="${formData.codigo_postal || ''}" 
                placeholder="CP"
                ${isCampoBloqueado('codigo_postal') ? 'readonly' : ''}
                class="${isCampoBloqueado('codigo_postal') ? 'input-locked' : 'input-editing'}"
              />
            </div>

            <!-- Fila 6 -->
            <div class="data-field col-4">
              <label>N° Celular</label>
              <input 
                type="text" 
                data-field="celular"
                value="${formData.celular || ''}" 
                placeholder="Ej: 11-1234-5678"
                ${isCampoBloqueado('celular') ? 'readonly' : ''}
                class="${isCampoBloqueado('celular') ? 'input-locked' : 'input-editing'}"
              />
            </div>
            <div class="data-field col-8 no-border-right">
              <label>Mail</label>
              <input 
                type="text" 
                data-field="mail"
                value="${formData.mail || ''}" 
                placeholder="correo@ejemplo.com"
                ${isCampoBloqueado('mail') ? 'readonly' : ''}
                class="${isCampoBloqueado('mail') ? 'input-locked' : 'input-editing'}"
              />
            </div>
          </div>

          <!-- Medidor Reactivo de Carga Horaria Institucional -->
          <div class="workload-panel" id="inscripcion-workload-panel">
            ${renderWorkloadInnerHtml()}
          </div>

          <!-- Barra de Control de Calificaciones Validadas -->
          <div class="section-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; padding: 0.65rem 1.25rem; border-top: 1px solid var(--border);">
            <div>
              <span>Materias y Calificaciones Acreditadas</span>
              <span class="no-print" style="font-size: 0.74rem; text-transform: none; color: ${editandoNotas ? 'var(--primary)' : 'var(--text-muted)'}; margin-left: 0.75rem; font-weight: 600;">
                ${isAlumno
        ? 'Historial y Planilla Oficial (Solo Lectura)'
        : editandoNotas
          ? 'Modo de Edición de Calificaciones Habilitado'
          : 'Calificaciones Validadas · Bloqueadas para Edición Directa'
      }
              </span>
            </div>

            ${!isAlumno ? `
              <div class="no-print" style="display: flex; gap: 0.5rem; align-items: center;">
                ${!editandoNotas ? `
                  <button
                    type="button"
                    class="btn-secondary"
                    id="btn-habilitar-edicion-notas"
                    style="padding: 0.35rem 0.85rem; font-size: 0.8rem; font-weight: 700; border-radius: 6px;"
                    title="Habilitar edición de las calificaciones validadas del estudiante"
                  >
                    Habilitar Edición
                  </button>
                ` : `
                  <button
                    type="button"
                    class="btn-primary"
                    id="btn-guardar-notas"
                    style="padding: 0.35rem 0.95rem; font-size: 0.8rem; font-weight: 700; border-radius: 6px;"
                    title="Guardar las calificaciones modificadas en el legajo del alumno"
                  >
                    Guardar Calificaciones
                  </button>
                  <button
                    type="button"
                    class="btn-secondary"
                    id="btn-cancelar-edicion-notas"
                    style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600; border-radius: 6px;"
                    title="Cancelar y restablecer las calificaciones anteriores"
                  >
                    Cancelar
                  </button>
                `}
              </div>
            ` : ''}
          </div>

          <!-- Tabla de Materias (con agrupación por 1º, 2º y 3º año) -->
          <div class="table-responsive">
            <table>
              <tbody id="inscripcion-materias-tbody">
                ${renderGrupoAnio(materiasPorAnio.anio1, '1ER AÑO', conflictosActivos)}
                ${renderGrupoAnio(materiasPorAnio.anio2, '2DO AÑO', conflictosActivos)}
                ${renderGrupoAnio(materiasPorAnio.anio3, '3ER AÑO', conflictosActivos)}
              </tbody>
            </table>
          </div>

          <!-- Pie del Formulario A5a - Declaración Jurada y Firmas Institucionales -->
          <div class="planilla-footer">
            <h3>DECLARACIÓN JURADA</h3>
            <p>
              Tomamos conocimiento y aceptamos las normas y reglamentaciones vigentes del instituto. Incluido los cambios introducidos por el nuevo Régimen Académico Marco (RAM). El presente formulario tiene carácter de DECLARACIÓN JURADA.
            </p>

            <!-- Espacio de Firmas: Visible EXCLUSIVAMENTE en la hoja impresa (oculto en pantalla) -->
            <div class="firmas-container only-print">
              <div class="firma-line">
                Firma y Aclaración del Estudiante
              </div>
              <div class="firma-line">
                Firma y Sello de Preceptoría
              </div>
            </div>
          </div>

          <!-- Barra de Acciones del Formulario -->
          <div class="actions-bar no-print">
            <button 
              type="button"
              class="btn-secondary"
              id="btn-restablecer-materias"
              title="Restablecer selección de materias"
            >
              Restablecer Selección
            </button>

            <button 
              type="button"
              class="btn-secondary"
              id="btn-imprimir-formulario"
              title="Imprimir Formulario A5a en hoja A4"
            >
              Imprimir Formulario A5a
            </button>

            <button 
              type="button"
              class="btn-primary"
              id="btn-confirmar-inscripcion"
              ${(enviando || materiasSeleccionadas.size === 0 || cargaExcedida) ? 'disabled' : ''}
            >
              ${enviando ? 'Guardando...' : 'Confirmar e Inscribir Materias'}
            </button>
          </div>

        </div>

      </div>
    `;

    hasRenderedOnce = true;
    bindEvents();
    renderBurbujaConflictoModal();
    if (yaRenderizo && window.scrollY !== prevScrollY) {
      window.scrollTo({ top: prevScrollY, behavior: 'instant' });
    }
  };

  // Enlazar eventos de la vista
  const bindEvents = () => {
    // 1. Inputs de datos del formulario del alumno (edición reactiva)
    container.querySelectorAll('input[data-field]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const field = e.target.getAttribute('data-field');
        formData[field] = e.target.value;
      });
    });

    // 2. Botones de edición de datos personales
    const btnHabEdicion = container.querySelector('#btn-habilitar-edicion-alumno');
    if (btnHabEdicion) btnHabEdicion.addEventListener('click', handleHabilitarEdicion);

    const btnGuardarDatos = container.querySelector('#btn-guardar-datos-alumno');
    if (btnGuardarDatos) btnGuardarDatos.addEventListener('click', handleGuardarDatosAlumno);

    const btnCancEdicion = container.querySelector('#btn-cancelar-edicion-alumno');
    if (btnCancEdicion) btnCancEdicion.addEventListener('click', handleCancelarEdicion);

    // 3. Botones de edición de calificaciones (solo preceptor)
    const btnHabNotas = container.querySelector('#btn-habilitar-edicion-notas');
    if (btnHabNotas) btnHabNotas.addEventListener('click', handleHabilitarEdicionNotas);

    const btnGuardarNotas = container.querySelector('#btn-guardar-notas');
    if (btnGuardarNotas) btnGuardarNotas.addEventListener('click', handleGuardarNotas);

    const btnCancNotas = container.querySelector('#btn-cancelar-edicion-notas');
    if (btnCancNotas) btnCancNotas.addEventListener('click', handleCancelarEdicionNotas);

    // 4, 5 y 6. Eventos de la tabla de materias (inputs académicos, checkboxes y Ver Detalle)
    bindMateriasTbodyEvents();

    // 8. Barra de acciones
    const btnRestablecer = container.querySelector('#btn-restablecer-materias');
    if (btnRestablecer) {
      btnRestablecer.addEventListener('click', () => {
        materiasSeleccionadas.clear();
        burbujaConflicto = null;
        actualizarSeccionMaterias();
      });
    }

    const btnImprimir = container.querySelector('#btn-imprimir-formulario');
    if (btnImprimir) {
      btnImprimir.addEventListener('click', async () => {
        try {
          btnImprimir.disabled = true;
          btnImprimir.textContent = 'Generando PDF Oficial...';
          if (onNotify) onNotify('Generando Formulario Oficial A5a con el formato del Instituto...', 'info');

          const carreraSel = carreras.find(c => c.id_carrera === Number(idCarreraSeleccionada)) || carreras[0];
          const pdfRes = await generarFormularioMatriculacionPdf({
            carrera: carreraSel,
            formData,
            materias,
            selecciones: materiasSeleccionadas,
            datosAcademicos
          });

          imprimirODescargarPdf(pdfRes, 'print');
          if (onNotify) onNotify('Formulario A5a generado exitosamente con el formato oficial del Instituto.', 'success');
        } catch (err) {
          console.error('Error al generar PDF oficial:', err);
          if (onNotify) onNotify('Error al generar el PDF oficial: ' + (err.message || 'Error desconocido'), 'error');
        } finally {
          btnImprimir.disabled = false;
          btnImprimir.textContent = 'Imprimir Formulario A5a';
        }
      });
    }

    const btnConfirmar = container.querySelector('#btn-confirmar-inscripcion');
    if (btnConfirmar) {
      btnConfirmar.addEventListener('click', handleGuardarInscripcion);
    }

    // 9. Elementos específicos de Preceptoría (Carrera, Búsqueda, Resultados)
    if (!isAlumno) {
      // Cambio de carrera
      const selectCarrera = container.querySelector('#select-carrera');
      if (selectCarrera) {
        selectCarrera.addEventListener('change', async (e) => {
          idCarreraSeleccionada = Number(e.target.value);
          if (alumnoSeleccionado && Number(alumnoSeleccionado.id_carrera) !== Number(idCarreraSeleccionada)) {
            alumnoSeleccionado = null;
            formData = createEmptyFormData();
            formDataOriginal = null;
            datosAcademicos = {};
            datosAcademicosOriginales = null;
            editandoDatosAlumno = false;
            editandoNotas = false;
          }
          if (busquedaRealizada) {
            alumnosFiltrados = filtrarAlumnosActuales();
            alumnoElegidoEnLista = alumnosFiltrados.length > 0 ? alumnosFiltrados[0] : null;
          }
          await cargarMaterias();
          render();
        });
      }

      // Filtros de búsqueda
      const inpLegajo = container.querySelector('#filtro-legajo');
      const inpDni = container.querySelector('#filtro-dni');
      const inpApellido = container.querySelector('#filtro-apellido');

      if (inpLegajo) inpLegajo.addEventListener('input', (e) => { filtroLegajo = e.target.value; });
      if (inpDni) inpDni.addEventListener('input', (e) => { filtroDni = e.target.value; });
      if (inpApellido) inpApellido.addEventListener('input', (e) => { filtroApellido = e.target.value; });

      [inpLegajo, inpDni, inpApellido].forEach(inp => {
        if (inp) {
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleBuscarAlumnos();
          });
        }
      });

      const btnBuscar = container.querySelector('#btn-buscar');
      if (btnBuscar) btnBuscar.addEventListener('click', handleBuscarAlumnos);

      const btnLimpiar = container.querySelector('#btn-limpiar');
      if (btnLimpiar) btnLimpiar.addEventListener('click', handleLimpiarFiltros);

      const btnCargarPlanilla = container.querySelector('#btn-cargar-planilla');
      if (btnCargarPlanilla) btnCargarPlanilla.addEventListener('click', handleCargarPlanilla);

      // Clic en fila de alumno en resultados
      container.querySelectorAll('.student-row[data-id-alumno]').forEach(fila => {
        fila.addEventListener('click', () => {
          const idAl = Number(fila.getAttribute('data-id-alumno'));
          const al = alumnosFiltrados.find(a => a.id_alumno === idAl);
          if (al) {
            alumnoElegidoEnLista = al;
            render();
          }
        });
      });
    }
  };

  // Sincronizar datos del alumno inicial
  syncFormDataFromAlumno(alumnoSeleccionado);

  if (isAlumno && alumnoSeleccionado?.id_carrera) {
    idCarreraSeleccionada = alumnoSeleccionado.id_carrera;
  } else if (isAlumno && alumnoLogueado?.id_carrera) {
    idCarreraSeleccionada = alumnoLogueado.id_carrera;
  }

  render();

  (async () => {
    let cargaCatalogosOk = true;
    try {
      if (isAlumno) {
        const targetId = Number(alumnoLogueado?.id_alumno || alumnoLogueado?.id || 0);
        if (targetId > 0) {
          try {
            const det = await api.getAlumnoDetalle(targetId);
            if (det) {
              alumnoSeleccionado = det;
              alumnoElegidoEnLista = det;
              syncFormDataFromAlumno(det);
            }
          } catch (err) {
            console.error('Error al cargar detalle alumno:', err);
          }
        }
        if (alumnoSeleccionado?.id_carrera) {
          idCarreraSeleccionada = Number(alumnoSeleccionado.id_carrera);
        } else if (alumnoLogueado?.id_carrera) {
          idCarreraSeleccionada = Number(alumnoLogueado.id_carrera);
        }
      }

      try {
        const [c, a] = await Promise.all([api.getCarreras(), api.getAlumnos()]);
        if (c && c.length > 0) carreras = c;
        if (a && a.length > 0) {
          alumnos = a;
          alumnosFiltrados = [];
          if (!isAlumno) {
            alumnoSeleccionado = null;
            alumnoElegidoEnLista = null;
            formData = createEmptyFormData();
            datosAcademicos = {};
          } else if (alumnoSeleccionado) {
            const idx = alumnos.findIndex((al) => Number(al.id_alumno || al.id) === Number(alumnoSeleccionado.id_alumno || alumnoSeleccionado.id));
            if (idx >= 0) alumnos[idx] = { ...alumnos[idx], ...alumnoSeleccionado };
          }
        }
        if (isAlumno && alumnoSeleccionado?.id_carrera) {
          idCarreraSeleccionada = Number(alumnoSeleccionado.id_carrera);
        }
      } catch (err) {
        cargaCatalogosOk = false;
        console.error('Error al cargar catǭlogos:', err);
        if (onNotify) onNotify('No se pudieron cargar carreras/lista. Se intentará usar tu carrera asignada.', 'warning');
      }
    } catch (err) {
      cargaCatalogosOk = false;
      console.error('Error init:', err);
    }

    if (isAlumno && !alumnoSeleccionado?.id_carrera && alumnoLogueado?.id_carrera) {
      idCarreraSeleccionada = Number(alumnoLogueado.id_carrera);
    }

    await cargarMaterias();
    if (!cargaCatalogosOk && carreras.length === 0 && idCarreraSeleccionada) {
      carreras = [{ id_carrera: idCarreraSeleccionada, nombre_carrera: 'Tu carrera (asignada)', nro_resolucion: '' }];
    }
    render();
  })();
}
