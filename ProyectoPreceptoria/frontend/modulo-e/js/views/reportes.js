import { api } from '../api.js';

export async function initReportesView(container, notify) {
  let carreras = [];
  let filtros = {
    carrera: '',
    anio: '',
    ciclo_lectivo: '2026',
    situacion: ''
  };

  let reporte = {
    metricas: {
      total_alumnos_inscriptos: 0,
      distribucion_asistencia: {},
      distribucion_por_anio_cursada: {}
    },
    inscripciones: []
  };

  let cargando = false;
  let alumnoSeleccionado = null;

  // Render base template
  container.innerHTML = `
    <div class="reportes-view view-fade-in">
      <div class="page-header">
        <h2 class="page-title">
          Reportes de Inscripción para Equipo de Gestión
        </h2>
        <p class="page-subtitle">
          Auditoría y análisis de inscripciones a cursada con <strong>4 filtros combinables</strong>:
          carrera, año de cursada, ciclo lectivo y situación académica (recursantes, atraso académico, libres y regulares).
        </p>
      </div>

      <!-- Panel de Filtros Combinables con Botón Buscar -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <h3 class="card-title" style="margin: 0;">
            Filtros de Búsqueda
          </h3>
          <div style="display: flex; gap: 0.6rem;">
            <button
              type="button"
              id="rep-btn-limpiar"
              class="btn-reset"
            >
              Limpiar Filtros
            </button>
            <button
              type="button"
              id="rep-btn-buscar"
              class="btn-search"
            >
              Buscar
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <!-- Filtro 1: Carrera -->
          <div class="form-group" style="margin: 0;">
            <label class="form-label">1. Carrera:</label>
            <select id="rep-filtro-carrera" class="form-select">
              <option value="">Todas las carreras</option>
            </select>
          </div>

          <!-- Filtro 2: Año de cursada -->
          <div class="form-group" style="margin: 0;">
            <label class="form-label">2. Año de Cursada:</label>
            <select id="rep-filtro-anio" class="form-select">
              <option value="">Todos los años</option>
              <option value="2">2º Año</option>
              <option value="3">3º Año</option>
            </select>
          </div>

          <!-- Filtro 3: Ciclo Lectivo -->
          <div class="form-group" style="margin: 0;">
            <label class="form-label">3. Ciclo Lectivo (Cohorte):</label>
            <select id="rep-filtro-ciclo" class="form-select">
              <option value="">Todos los ciclos</option>
              <option value="2026" selected>2026 (Actual)</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <!-- Filtro 4: Situación Académica -->
          <div class="form-group" style="margin: 0;">
            <label class="form-label">4. Situación Académica:</label>
            <select id="rep-filtro-situacion" class="form-select">
              <option value="">Todas las situaciones</option>
              <option value="regular">Presencial / Regular</option>
              <option value="libre">Libre</option>
              <option value="recursante">Recursante</option>
              <option value="atraso">Con Atraso Académico</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tarjetas de Métricas Resumen (3 tarjetas ubicadas debajo de los filtros) -->
      <div id="rep-metricas-container" class="stats-grid" style="margin-bottom: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
        <!-- Rellenado dinámicamente -->
      </div>

      <!-- Tabla de Resultados Agrupada por Alumno -->
      <div class="card" style="padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem;">
          <h3 id="rep-resultados-titulo" style="font-size: 1.1rem; font-weight: 700; margin: 0;">
            Resultados (Cargando...)
          </h3>
          <span id="rep-cargando-indicador" style="display: none; font-size: 0.85rem; color: var(--primary);">Buscando registros...</span>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Legajo</th>
                <th>Estudiante</th>
                <th>Documento</th>
                <th>Carrera</th>
                <th style="text-align: center;">Materias Inscriptas</th>
                <th style="text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody id="rep-tabla-cuerpo">
              <!-- Rellenado dinámicamente -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Contenedor de la Tarjeta Flotante no invasiva de Detalle de Materias -->
      <div id="rep-burbuja-container"></div>
    </div>
  `;

  // Referencias a elementos
  const selCarrera = container.querySelector('#rep-filtro-carrera');
  const selAnio = container.querySelector('#rep-filtro-anio');
  const selCiclo = container.querySelector('#rep-filtro-ciclo');
  const selSituacion = container.querySelector('#rep-filtro-situacion');
  const btnBuscar = container.querySelector('#rep-btn-buscar');
  const btnLimpiar = container.querySelector('#rep-btn-limpiar');
  const metricasContainer = container.querySelector('#rep-metricas-container');
  const resultadosTitulo = container.querySelector('#rep-resultados-titulo');
  const cargandoIndicador = container.querySelector('#rep-cargando-indicador');
  const tablaCuerpo = container.querySelector('#rep-tabla-cuerpo');
  const burbujaContainer = container.querySelector('#rep-burbuja-container');

  // Función para agrupar inscripciones por estudiante
  const agruparInscripciones = (filas) => {
    const mapaAlumnos = new Map();
    for (const fila of filas) {
      if (!mapaAlumnos.has(fila.id_alumno)) {
        mapaAlumnos.set(fila.id_alumno, {
          id_alumno: fila.id_alumno,
          legajo: fila.legajo,
          apellidos: fila.apellidos,
          nombres: fila.nombres,
          numero_documento: fila.numero_documento,
          nombre_carrera: fila.nombre_carrera,
          nombre_carrera_corto: fila.nombre_carrera_corto,
          materias: []
        });
      }

      const esRecursante =
        fila.condicion_cursada === 'Recursa' ||
        String(fila.situacion_asistencia).toLowerCase().includes('recursa') ||
        Boolean(fila.es_recursa);

      mapaAlumnos.get(fila.id_alumno).materias.push({
        id_materia: fila.id_materia,
        nombre_materia: fila.nombre_materia,
        anio_cursada: fila.anio_cursada,
        situacion_asistencia: fila.situacion_asistencia,
        condicion_cursada: esRecursante ? 'Recursa' : 'Cursa',
        turno: fila.turno,
        nombre_sede: fila.nombre_sede
      });
    }
    return Array.from(mapaAlumnos.values());
  };

  // Renderizar las 3 tarjetas de métricas
  const renderMetricas = () => {
    const { metricas } = reporte;
    const distAnio = metricas?.distribucion_por_anio_cursada || {};
    const distAsistencia = metricas?.distribucion_asistencia || {};

    const anioItems = Object.keys(distAnio).length > 0
      ? Object.entries(distAnio).map(([k, v]) => `
          <span style="margin-right: 0.75rem; display: inline-block;">
            ${k}: <strong style="color: var(--accent-purple, #6366f1);">${v}</strong>
          </span>
        `).join('')
      : '<span style="font-size: 0.9rem; color: var(--text-muted);">Sin datos</span>';

    const asistenciaItems = Object.keys(distAsistencia).length > 0
      ? Object.entries(distAsistencia).map(([k, v]) => `
          <span style="margin-right: 0.75rem; display: inline-block;">
            ${k}: <strong style="color: var(--success, #10b981);">${v}</strong>
          </span>
        `).join('')
      : '<span style="font-size: 0.9rem; color: var(--text-muted);">Sin datos</span>';

    metricasContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Alumnos Matriculados</div>
        <div class="stat-value" style="color: var(--primary);">
          ${metricas?.total_alumnos_inscriptos || 0}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
          ${metricas?.total_inscripciones_materias || 0} ${metricas?.total_inscripciones_materias === 1 ? 'materia inscripta' : 'materias inscriptas'} en total
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Distribución por Año</div>
        <div style="font-size: 1.1rem; font-weight: 700; margin-top: 0.5rem; color: var(--text-primary);">
          ${anioItems}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
          Alumnos únicos cursando cada año
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Modalidad Asistencia</div>
        <div style="font-size: 1.1rem; font-weight: 700; margin-top: 0.5rem; color: var(--text-primary);">
          ${asistenciaItems}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
          Materias en cursada Presencial / Libre
        </div>
      </div>
    `;
  };

  // Renderizar la tabla de alumnos agrupados
  const renderTablaResultados = () => {
    const alumnos = agruparInscripciones(reporte.inscripciones || []);
    resultadosTitulo.textContent = `Resultados (${alumnos.length} estudiantes matriculados)`;

    if (alumnos.length === 0) {
      tablaCuerpo.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            No se encontraron inscripciones para los filtros seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tablaCuerpo.innerHTML = alumnos.map((al) => `
      <tr>
        <td><code style="color: var(--primary); font-weight: 600;">${al.legajo || 'S/L'}</code></td>
        <td style="font-weight: 600;">${al.apellidos}, ${al.nombres}</td>
        <td>${al.numero_documento}</td>
        <td>${al.nombre_carrera_corto || al.nombre_carrera}</td>
        <td style="text-align: center;">
          <span class="badge badge-info" style="font-weight: 700;">
            ${al.materias.length} ${al.materias.length === 1 ? 'materia' : 'materias'}
          </span>
        </td>
        <td style="text-align: center;">
          <button
            type="button"
            class="btn btn-secondary rep-btn-ver-detalles"
            data-alumno-id="${al.id_alumno}"
            style="padding: 0.35rem 0.85rem; font-size: 0.82rem; white-space: nowrap;"
          >
            Ver Detalles
          </button>
        </td>
      </tr>
    `).join('');

    // Binds para los botones "Ver Detalles"
    tablaCuerpo.querySelectorAll('.rep-btn-ver-detalles').forEach(btn => {
      btn.addEventListener('click', () => {
        const idAl = Number(btn.getAttribute('data-alumno-id'));
        const alumno = alumnos.find(a => a.id_alumno === idAl);
        if (alumno) {
          alumnoSeleccionado = alumno;
          renderBurbujaDetalles();
        }
      });
    });
  };

  // Renderizar la tarjeta flotante no invasiva en la esquina inferior derecha
  const renderBurbujaDetalles = () => {
    if (!alumnoSeleccionado) {
      burbujaContainer.innerHTML = '';
      return;
    }

    const { materias } = alumnoSeleccionado;

    burbujaContainer.innerHTML = `
      <div 
        class="burbuja-detalle-reporte"
        role="region"
        aria-label="Detalle de materias del estudiante seleccionado"
      >
        <!-- Cabecera de la Tarjeta Flotante -->
        <div style="background: #f0f9ff; padding: 0.85rem 1.25rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #bae6fd;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="background: var(--primary); color: #ffffff; font-weight: 800; font-size: 0.72rem; padding: 0.22rem 0.6rem; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase;">
              Materias Inscriptas
            </span>
            <strong style="color: #0369a1; font-size: 0.95rem;">
              ${alumnoSeleccionado.apellidos}, ${alumnoSeleccionado.nombres}
            </strong>
          </div>
          <button
            type="button"
            id="rep-btn-cerrar-burbuja-x"
            style="background: none; border: none; cursor: pointer; font-weight: 800; font-size: 1.25rem; color: #0369a1; line-height: 1;"
            title="Cerrar detalle"
          >
            ×
          </button>
        </div>

        <!-- Cuerpo de la Tarjeta Flotante -->
        <div style="padding: 1rem 1.25rem; overflow-y: auto; flex: 1;">
          <!-- Info rápida del estudiante -->
          <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.85rem; padding-bottom: 0.65rem; border-bottom: 1px solid var(--border);">
            <span>Legajo: <strong style="color: var(--primary);">${alumnoSeleccionado.legajo || 'S/L'}</strong></span>
            <span>·</span>
            <span>DNI: <strong>${alumnoSeleccionado.numero_documento}</strong></span>
            <span>·</span>
            <span>${alumnoSeleccionado.nombre_carrera_corto || alumnoSeleccionado.nombre_carrera}</span>
          </div>

          <!-- Tabla de Asignaturas con Cursa/Recursa (sin columna Asistencia) -->
          <div style="border-radius: 8px; border: 1px solid var(--border); overflow: hidden;">
            <table class="custom-table" style="margin: 0; font-size: 0.85rem;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 0.55rem 0.75rem;">Espacio Curricular</th>
                  <th style="text-align: center; padding: 0.55rem 0.5rem; width: 70px;">Año</th>
                  <th style="text-align: center; padding: 0.55rem 0.5rem; width: 100px;">Condición</th>
                  <th style="padding: 0.55rem 0.75rem;">Turno</th>
                </tr>
              </thead>
              <tbody>
                ${materias.map((m) => {
                  const esRecursa = m.condicion_cursada === 'Recursa';
                  return `
                    <tr>
                      <td style="font-weight: 600; color: var(--text-primary); padding: 0.6rem 0.75rem;">
                        ${m.nombre_materia}
                      </td>
                      <td style="text-align: center; padding: 0.6rem 0.5rem;">
                        <span class="badge badge-info">${m.anio_cursada}º</span>
                      </td>
                      <td style="text-align: center; padding: 0.6rem 0.5rem;">
                        ${esRecursa 
                          ? '<span class="badge" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: 700;">Recursa</span>'
                          : '<span class="badge" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: 700;">Cursa</span>'
                        }
                      </td>
                      <td style="font-size: 0.8rem; color: var(--text-secondary); padding: 0.6rem 0.75rem;">
                        ${m.turno || 'Vespertino'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pie de la Tarjeta Flotante -->
        <div style="padding: 0.75rem 1.25rem; background: #f8fafc; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.82rem; color: var(--text-secondary);">
            Total: <strong>${materias.length}</strong> ${materias.length === 1 ? 'materia inscripta' : 'materias inscriptas'}
          </span>
          <button
            type="button"
            id="rep-btn-cerrar-burbuja"
            class="btn-secondary"
            style="padding: 0.35rem 0.9rem; font-size: 0.8rem;"
          >
            Cerrar
          </button>
        </div>
      </div>
    `;

    burbujaContainer.querySelector('#rep-btn-cerrar-burbuja-x').addEventListener('click', () => {
      alumnoSeleccionado = null;
      renderBurbujaDetalles();
    });

    burbujaContainer.querySelector('#rep-btn-cerrar-burbuja').addEventListener('click', () => {
      alumnoSeleccionado = null;
      renderBurbujaDetalles();
    });
  };

  // Ejecución de búsqueda bajo demanda
  const ejecutarBusqueda = async () => {
    cargando = true;
    cargandoIndicador.style.display = 'inline';
    btnBuscar.disabled = true;
    btnBuscar.textContent = 'Buscando...';

    filtros = {
      carrera: selCarrera.value,
      anio: selAnio.value,
      ciclo_lectivo: selCiclo.value,
      situacion: selSituacion.value
    };

    try {
      const datos = await api.getReporteInscripciones(filtros);
      reporte = datos;
      renderMetricas();
      renderTablaResultados();
      // Si el alumno seleccionado ya no figura en los resultados, cerrar su burbuja
      if (alumnoSeleccionado) {
        const sigueExistiendo = (reporte.inscripciones || []).some(f => f.id_alumno === alumnoSeleccionado.id_alumno);
        if (!sigueExistiendo) {
          alumnoSeleccionado = null;
          renderBurbujaDetalles();
        }
      }
    } catch (err) {
      if (notify) notify('Error al cargar reporte de gestión', 'error');
    } finally {
      cargando = false;
      cargandoIndicador.style.display = 'none';
      btnBuscar.disabled = false;
      btnBuscar.textContent = 'Buscar';
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    selCarrera.value = '';
    selAnio.value = '';
    selCiclo.value = '2026';
    selSituacion.value = '';
    ejecutarBusqueda();
  };

  // Inicialización de carreras y primera búsqueda
  try {
    carreras = await api.getCarreras();
    selCarrera.innerHTML = `
      <option value="">Todas las carreras</option>
      ${carreras.map(c => `<option value="${c.id_carrera}">${c.nombre_carrera}</option>`).join('')}
    `;
    await ejecutarBusqueda();
  } catch (err) {
    console.error(err);
  }

  // Event Listeners
  btnBuscar.addEventListener('click', ejecutarBusqueda);
  btnLimpiar.addEventListener('click', limpiarFiltros);
}

