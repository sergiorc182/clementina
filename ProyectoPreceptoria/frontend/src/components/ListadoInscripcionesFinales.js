/**
 * ListadoInscripcionesFinales (Vanilla JS):
 * Vista de Preceptoría unificada con:
 * - Filtros combinables (Búsqueda DNI/Apellido/Legajo, Año, Turno, Llamado, Carrera, Materia, Estado).
 * - Calificación de exámenes finales.
 * - Funcionalidades integradas del Módulo D sobre MySQL clementina:
 *   1. Baja lógica de inscripción (sin borrado físico) con auditoría.
 *   2. Reasignación de turno / año / llamado / modalidad con auditoría histórica.
 *   3. Consulta del historial de auditoría por inscripción.
 *   4. Exportación a Excel (.xls) de planillas agrupadas por Carrera, Año y Materia.
 */

const API_BASE = 'http://localhost:3000/api';

export const INSTANCIAS_CATALOGO = [
  { id: 1, nombre: 'Febrero / Marzo', mesFin: 2, diaFin: 31 },
  { id: 2, nombre: 'Junio / Julio', mesFin: 6, diaFin: 31 },
  { id: 3, nombre: 'Diciembre', mesFin: 11, diaFin: 31 }
];

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatearFechaHora = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(val);
  }
};

export function crearListadoInscripcionesFinales(container, initialProps = {}) {
  let props = {
    alumnos: [],
    onVolver: null,
    ...initialProps
  };

  let inscripciones = [];
  let carreras = [];
  let todasMaterias = [];
  let cargando = false;
  let mensaje = null;
  let mensajeTimeout = null;

  // Filtros combinables
  let filtroBusqueda = '';
  let filtroAnio = '';
  let filtroTurno = '';
  let filtroLlamado = '';
  let filtroCarrera = '';
  let filtroMateria = '';
  let filtroEstado = 'ACTIVAS'; // 'ACTIVAS' (oculta BAJA) | 'TODAS' | 'INSCRIPTO' | 'APROBADO' | 'DESAPROBADO' | 'AUSENTE' | 'BAJA'

  // Modal Calificar
  let rendicionCalificar = null;
  let notaInput = 4;
  let ausenteInput = false;

  // Modal Reasignar (Módulo D)
  let rendicionReasignar = null;
  let reasigAnio = new Date().getFullYear();
  let reasigTurno = 1;
  let reasigLlamado = 1;
  let reasigModalidad = 'REGULAR';
  let reasigGuardando = false;

  // Modal Auditoría (Módulo D)
  let rendicionAuditoria = null;
  let logsAuditoria = [];
  let cargandoAuditoria = false;

  const mostrarMensaje = (texto, tipo = 'success') => {
    if (window.ISFTNotify) {
      window.ISFTNotify(texto, tipo);
    }
  };

  const obtenerAniosDisponibles = () => {
    const anioActual = new Date().getFullYear();
    const setAnios = new Set([anioActual + 1, anioActual, anioActual - 1, anioActual - 2]);
    inscripciones.forEach((item) => {
      if (item.anio_turno) setAnios.add(Number(item.anio_turno));
    });
    return Array.from(setAnios).sort((a, b) => b - a);
  };

  const obtenerMateriasDisponiblesFiltro = () => {
    const fuente = filtroCarrera
      ? todasMaterias.filter((m) => String(m.id_carrera) === String(filtroCarrera))
      : todasMaterias;

    const mapa = new Map();
    fuente.forEach((m) => {
      if (!mapa.has(m.id_materia)) {
        mapa.set(m.id_materia, m);
      }
    });

    inscripciones.forEach((r) => {
      if (!filtroCarrera || String(r.id_carrera) === String(filtroCarrera)) {
        if (!mapa.has(r.id_materia)) {
          mapa.set(r.id_materia, {
            id_materia: r.id_materia,
            nombre_materia: r.nombre_materia,
            id_carrera: r.id_carrera
          });
        }
      }
    });

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.nombre_materia || '').localeCompare(String(b.nombre_materia || ''), 'es')
    );
  };

  const obtenerInscripcionesFiltradas = () => {
    const term = filtroBusqueda.trim().toLowerCase();
    return inscripciones.filter((item) => {
      if (filtroEstado === 'ACTIVAS' && item.estado === 'BAJA') return false;
      if (filtroEstado !== 'ACTIVAS' && filtroEstado !== 'TODAS' && item.estado !== filtroEstado) return false;
      if (filtroAnio && Number(item.anio_turno) !== Number(filtroAnio)) return false;
      if (filtroTurno && Number(item.turno_instancia) !== Number(filtroTurno)) return false;
      if (filtroLlamado && Number(item.id_llamado || 1) !== Number(filtroLlamado)) return false;
      if (filtroCarrera && Number(item.id_carrera) !== Number(filtroCarrera)) return false;
      if (filtroMateria && Number(item.id_materia) !== Number(filtroMateria)) return false;
      if (term) {
        const hayMatch =
          String(item.numero_documento || '').toLowerCase().includes(term) ||
          String(item.primer_apellido || '').toLowerCase().includes(term) ||
          String(item.primer_nombre || '').toLowerCase().includes(term) ||
          `${item.primer_apellido || ''} ${item.primer_nombre || ''}`.toLowerCase().includes(term) ||
          String(item.legajo || '').toLowerCase().includes(term) ||
          String(item.nombre_materia || '').toLowerCase().includes(term);
        if (!hayMatch) return false;
      }
      return true;
    });
  };

  const cargarCatalogos = async () => {
    try {
      const resCarr = await fetch(`${API_BASE}/alumnos/catalogo/carreras`);
      const dataCarr = await resCarr.json();
      const listaCarreras = dataCarr.success && Array.isArray(dataCarr.data) ? dataCarr.data : [];
      carreras = listaCarreras;

      const promesasMat = listaCarreras.map((c) =>
        fetch(`${API_BASE}/finales/materias/${c.id_carrera}`)
          .then((r) => r.json())
          .then((d) => (d.success ? d.data : []))
          .catch(() => [])
      );
      const resultadosMat = await Promise.all(promesasMat);
      todasMaterias = resultadosMat.flat();
      render();
    } catch (err) {
      console.error('Error al cargar catálogos para filtros desde MySQL:', err);
    }
  };

  const cargarInscripciones = async () => {
    cargando = true;
    render();
    try {
      const res = await fetch(`${API_BASE}/finales/listado`);
      if (!res.ok) throw new Error('Error de conexión con el servidor');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        inscripciones = data.data;
      } else {
        inscripciones = [];
      }
    } catch (err) {
      inscripciones = [];
      mostrarMensaje('Error al cargar el listado de inscripciones a finales', 'error');
    } finally {
      cargando = false;
      render();
    }
  };

  /**
   * Exportación a Excel (.xls compatible con Microsoft Excel y LibreOffice Calc)
   * Integrada del Módulo D (InformePlanillasExcel): genera Resumen por Carrera/Año/Materia + Nómina Detallada.
   */
  const exportarExcel = (lista) => {
    if (!lista || lista.length === 0) {
      mostrarMensaje('No hay inscripciones visibles con los filtros actuales para exportar.', 'error');
      return;
    }

    // 1. Resumen agrupado por Carrera / Año / Materia / Turno
    const grupos = new Map();
    lista.forEach((ins) => {
      const key = `${ins.nombre_carrera}__${ins.anio_cursada || 1}__${ins.nombre_materia}__${ins.anio_turno}__${ins.nombre_instancia}`;
      if (!grupos.has(key)) {
        grupos.set(key, {
          carrera: ins.nombre_carrera || '',
          anioCursada: ins.anio_cursada ? `${ins.anio_cursada}° Año` : '—',
          materia: ins.nombre_materia || '',
          anioMesa: ins.anio_turno || '',
          turno: ins.nombre_instancia || '',
          regulares: 0,
          libres: 0,
          total: 0
        });
      }
      const g = grupos.get(key);
      g.total += 1;
      if (String(ins.modalidad || 'REGULAR').toUpperCase() === 'LIBRE') g.libres += 1;
      else g.regulares += 1;
    });

    const resumenRows = Array.from(grupos.values())
      .map(
        (g) => `
          <tr>
            <td>${escapeHtml(g.carrera)}</td>
            <td>${escapeHtml(g.anioCursada)}</td>
            <td>${escapeHtml(g.materia)}</td>
            <td>${escapeHtml(g.anioMesa)}</td>
            <td>${escapeHtml(g.turno)}</td>
            <td>${g.regulares}</td>
            <td>${g.libres}</td>
            <td><strong>${g.total}</strong></td>
          </tr>
        `
      )
      .join('');

    const detalleRows = lista
      .map(
        (ins, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>#${escapeHtml(ins.id_rendicion)}</td>
            <td>${escapeHtml(ins.primer_apellido)}, ${escapeHtml(ins.primer_nombre)}</td>
            <td>${escapeHtml(ins.numero_documento || '')}</td>
            <td>${escapeHtml(ins.legajo || '')}</td>
            <td>${escapeHtml(ins.nombre_carrera || '')}</td>
            <td>${escapeHtml(ins.anio_cursada ? `${ins.anio_cursada}° Año` : '')}</td>
            <td>${escapeHtml(ins.nombre_materia || '')}</td>
            <td>${escapeHtml(ins.anio_turno)}</td>
            <td>${escapeHtml(ins.nombre_instancia)}</td>
            <td>${escapeHtml(ins.id_llamado || 1)}° Llamado</td>
            <td>${escapeHtml(ins.modalidad || 'REGULAR')}</td>
            <td>${escapeHtml(ins.estado)}</td>
            <td>${ins.es_ausente ? 'Ausente' : (ins.nota !== null && ins.nota !== undefined ? escapeHtml(ins.nota) : 'A rendir')}</td>
          </tr>
        `
      )
      .join('');

    const htmlExcel = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; }
          th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; }
          h2, h3 { font-family: Calibri, Arial, sans-serif; color: #1e3a8a; }
        </style>
      </head>
      <body>
        <h2>ISFT Nº 182 — Planilla de Inscriptos a Exámenes Finales</h2>
        <p>Generado el ${escapeHtml(new Date().toLocaleString('es-AR'))} — Registros exportados: ${lista.length}</p>

        <h3>1. Resumen Agrupado por Carrera, Año y Materia</h3>
        <table>
          <thead>
            <tr>
              <th>Carrera</th>
              <th>Año Plan</th>
              <th>Materia</th>
              <th>Año Mesa</th>
              <th>Turno</th>
              <th>Regulares</th>
              <th>Libres</th>
              <th>Total Inscriptos</th>
            </tr>
          </thead>
          <tbody>${resumenRows}</tbody>
        </table>

        <br />
        <h3>2. Nómina Detallada de Inscriptos</h3>
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>ID</th>
              <th>Apellido y Nombre</th>
              <th>DNI</th>
              <th>Legajo</th>
              <th>Carrera</th>
              <th>Año Plan</th>
              <th>Materia</th>
              <th>Año Mesa</th>
              <th>Turno</th>
              <th>Llamado</th>
              <th>Condición</th>
              <th>Estado</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>${detalleRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + htmlExcel], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fechaTag = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `Planilla_Inscriptos_Finales_ISFT182_${fechaTag}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarMensaje(`Planilla Excel descargada (${lista.length} registros).`);
  };

  const abrirAuditoria = async (rend) => {
    rendicionAuditoria = rend;
    logsAuditoria = [];
    cargandoAuditoria = true;
    render();
    try {
      const res = await fetch(`${API_BASE}/finales/${rend.id_rendicion}/auditoria`);
      const data = await res.json();
      logsAuditoria = data.success && Array.isArray(data.data) ? data.data : [];
    } catch {
      logsAuditoria = [];
    } finally {
      cargandoAuditoria = false;
      render();
    }
  };

  const ejecutarBajaLogica = async (rend) => {
    const ok = window.confirm(
      `¿Confirmar BAJA LÓGICA de la inscripción #${rend.id_rendicion}?\n\nAlumno: ${rend.primer_apellido}, ${rend.primer_nombre}\nMateria: ${rend.nombre_materia}\nTurno: ${rend.nombre_instancia} ${rend.anio_turno}\n\nEl registro no se borrará físicamente; quedará en estado BAJA con trazabilidad en auditoría.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/finales/${rend.id_rendicion}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modificado_por: 'Preceptoría' })
      });
      const data = await res.json();
      if (data.success) {
        mostrarMensaje(`Inscripción #${rend.id_rendicion} dada de baja correctamente.`);
        cargarInscripciones();
      } else {
        mostrarMensaje(data.message || 'No se pudo dar de baja la inscripción.', 'error');
      }
    } catch {
      mostrarMensaje('Error de conexión al intentar dar de baja la inscripción.', 'error');
    }
  };

  const render = () => {
    const aniosDisponibles = obtenerAniosDisponibles();
    const materiasDisponiblesFiltro = obtenerMateriasDisponiblesFiltro();
    const inscripcionesFiltradas = obtenerInscripcionesFiltradas();
    const hayFiltrosActivos = Boolean(
      filtroBusqueda || filtroAnio || filtroTurno || filtroLlamado || filtroCarrera || filtroMateria || filtroEstado !== 'ACTIVAS'
    );

    let tablaHtml = '';
    if (cargando) {
      tablaHtml = `<p class="loading-text">Cargando listado general de finales inscriptos...</p>`;
    } else if (inscripcionesFiltradas.length === 0) {
      tablaHtml = `
        <p class="empty-text">
          No se encontraron inscripciones a finales que coincidan con los filtros seleccionados.
        </p>
      `;
    } else {
      let filasHtml = '';
      inscripcionesFiltradas.forEach((rend, idx) => {
        let condicionHtml = `<span class="text-muted">Regular</span>`;
        if (
          rend.modalidad === 'LIBRE' ||
          String(rend.motivo_excepcion || '').includes('Modalidad LIBRE')
        ) {
          condicionHtml = `<span class="badge-libre">Libre</span>`;
        } else if (
          rend.es_excepcion &&
          !String(rend.motivo_excepcion || '').includes('Ausentes no computan')
        ) {
          condicionHtml = `<span class="badge-warning" title="${escapeHtml(rend.motivo_excepcion || 'Por excepción')}">Excepción</span>`;
        }
        if (Number(rend.reasignada) === 1) {
          condicionHtml += ` <span class="badge-warning" style="font-size: 0.7rem;" title="Inscripción reasignada">Reasig.</span>`;
        }

        let notaHtml = `<span class="text-muted">A rendir</span>`;
        if (rend.estado === 'BAJA') {
          notaHtml = `<span class="text-muted" title="Baja: ${escapeHtml(formatearFechaHora(rend.fecha_baja))}">Dada de baja</span>`;
        } else if (rend.es_ausente) {
          notaHtml = `<span class="text-danger font-weight-bold">Ausente</span>`;
        } else if (rend.nota !== null && rend.nota !== undefined) {
          notaHtml = `<strong class="${rend.nota >= 4 ? 'nota-aprobada' : 'nota-desaprobada'}">${escapeHtml(rend.nota)}</strong>`;
        }

        const estadoLower = String(rend.estado || '').toLowerCase();
        const esModificable = rend.estado === 'INSCRIPTO' || rend.estado === 'AUSENTE';

        filasHtml += `
          <tr style="${rend.estado === 'BAJA' ? 'opacity: 0.65;' : ''}">
            <td><span class="badge-id">#${escapeHtml(rend.id_rendicion)}</span></td>
            <td><strong>${escapeHtml(rend.primer_apellido)}, ${escapeHtml(rend.primer_nombre)}</strong></td>
            <td><span class="badge-doc">${escapeHtml(rend.numero_documento || 'S/D')}</span></td>
            <td><span class="badge-carrera">${escapeHtml(rend.nombre_carrera)}</span></td>
            <td><strong>${escapeHtml(rend.nombre_materia)}</strong></td>
            <td>${escapeHtml(rend.anio_turno)}</td>
            <td>${escapeHtml(rend.nombre_instancia)}</td>
            <td>${escapeHtml(rend.id_llamado || 1)}° Llamado</td>
            <td>${condicionHtml}</td>
            <td><span class="status-badge status-${escapeHtml(estadoLower)}">${escapeHtml(rend.estado)}</span></td>
            <td>${notaHtml}</td>
            <td>
              <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${
                  rend.estado !== 'BAJA'
                    ? `<button type="button" data-action="calificar" data-idx="${idx}" class="btn btn-warning btn-sm" title="Asentar calificación o ausencia">Calificar</button>`
                    : ''
                }
                ${
                  esModificable
                    ? `<button type="button" data-action="reasignar" data-idx="${idx}" class="btn btn-secondary btn-sm" title="Reasignar turno, año, llamado o modalidad">Reasignar</button>
                       <button type="button" data-action="baja" data-idx="${idx}" class="btn btn-danger btn-sm" style="background:#dc2626;color:#fff;" title="Baja lógica sin borrado físico">Baja</button>`
                    : ''
                }
                <button type="button" data-action="auditoria" data-idx="${idx}" class="btn btn-secondary btn-sm" title="Ver historial de auditoría de esta inscripción">Historial</button>
              </div>
            </td>
          </tr>
        `;
      });

      tablaHtml = `
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 70px;">#ID</th>
                <th>Alumno</th>
                <th>DNI</th>
                <th>Carrera</th>
                <th>Materia</th>
                <th>Año</th>
                <th>Turno</th>
                <th>Llamado</th>
                <th>Condición</th>
                <th>Estado</th>
                <th>Nota</th>
                <th style="min-width: 220px;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filasHtml}
            </tbody>
          </table>
        </div>
      `;
    }

    // Modal 1: Calificar
    let modalHtml = '';
    if (rendicionCalificar) {
      modalHtml = `
        <div class="modal-overlay">
          <div class="card modal-card">
            <div class="card-header">
              <h3>Asentar Calificación de Examen Final</h3>
              <p>
                <strong>${escapeHtml(rendicionCalificar.primer_apellido)}, ${escapeHtml(rendicionCalificar.primer_nombre)}</strong>
                — ${escapeHtml(rendicionCalificar.nombre_materia)} (${escapeHtml(rendicionCalificar.nombre_instancia)} ${escapeHtml(rendicionCalificar.anio_turno)})
              </p>
            </div>
            <form id="formCalificarListado" class="form-grid">
              <div class="form-group full-width">
                <label class="checkbox-label">
                  <input id="chkAusenteListado" type="checkbox" ${ausenteInput ? 'checked' : ''} />
                  <strong>Figurar como AUSENTE</strong> (No computa como falla)
                </label>
              </div>

              ${
                !ausenteInput
                  ? `
                <div class="form-group full-width">
                  <label for="notaModalListado">Calificación obtenida (1 a 10):</label>
                  <input id="notaModalListado" type="number" min="1" max="10" value="${escapeHtml(notaInput)}" required />
                  <small id="helpNotaListado" class="help-text">
                    ${notaInput >= 4 ? '🟢 Aprobado (>= 4)' : '🔴 Aplazo (< 4, cuenta como falla)'}
                  </small>
                </div>
              `
                  : ''
              }

              <div class="form-actions full-width">
                <button type="submit" class="btn btn-primary">Guardar Calificación</button>
                <button type="button" id="btnCancelarModalListado" class="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // Modal 2: Reasignar Inscripción (Módulo D)
    if (rendicionReasignar) {
      modalHtml = `
        <div class="modal-overlay">
          <div class="card modal-card">
            <div class="card-header">
              <h3>Reasignar Inscripción a Examen Final (#${escapeHtml(rendicionReasignar.id_rendicion)})</h3>
              <p>
                <strong>${escapeHtml(rendicionReasignar.primer_apellido)}, ${escapeHtml(rendicionReasignar.primer_nombre)}</strong>
                — ${escapeHtml(rendicionReasignar.nombre_materia)}
              </p>
              <small class="help-text">El cambio quedará registrado en la auditoría histórica sin sobrescribir el historial previo.</small>
            </div>
            <form id="formReasignarListado" class="form-grid">
              <div class="form-group">
                <label for="reasigAnio">Año de Mesa:</label>
                <input id="reasigAnio" type="number" min="2024" max="2035" value="${escapeHtml(reasigAnio)}" required />
              </div>

              <div class="form-group">
                <label for="reasigTurno">Turno (Instancia):</label>
                <select id="reasigTurno" required>
                  ${INSTANCIAS_CATALOGO.map(
                    (inst) => `<option value="${inst.id}" ${Number(reasigTurno) === inst.id ? 'selected' : ''}>${inst.id} - ${escapeHtml(inst.nombre)}</option>`
                  ).join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="reasigLlamado">Llamado:</label>
                <select id="reasigLlamado" required>
                  <option value="1" ${Number(reasigLlamado) === 1 ? 'selected' : ''}>1° Llamado</option>
                  <option value="2" ${Number(reasigLlamado) === 2 ? 'selected' : ''}>2° Llamado</option>
                </select>
              </div>

              <div class="form-group">
                <label for="reasigModalidad">Modalidad:</label>
                <select id="reasigModalidad" required>
                  <option value="REGULAR" ${reasigModalidad === 'REGULAR' ? 'selected' : ''}>REGULAR</option>
                  <option value="LIBRE" ${reasigModalidad === 'LIBRE' ? 'selected' : ''}>LIBRE (sujeto a excepción normativa)</option>
                </select>
              </div>

              <div class="form-actions full-width">
                <button type="submit" class="btn btn-primary" ${reasigGuardando ? 'disabled' : ''}>
                  ${reasigGuardando ? 'Guardando...' : 'Confirmar Reasignación'}
                </button>
                <button type="button" id="btnCancelarReasignar" class="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // Modal 3: Historial de Auditoría (Módulo D)
    if (rendicionAuditoria) {
      modalHtml = `
        <div class="modal-overlay">
          <div class="card modal-card" style="max-width: 680px;">
            <div class="card-header">
              <h3>Historial de Auditoría — Inscripción #${escapeHtml(rendicionAuditoria.id_rendicion)}</h3>
              <p>
                <strong>${escapeHtml(rendicionAuditoria.primer_apellido)}, ${escapeHtml(rendicionAuditoria.primer_nombre)}</strong>
                — ${escapeHtml(rendicionAuditoria.nombre_materia)}
              </p>
            </div>
            <div style="padding: 12px 0;">
              ${
                cargandoAuditoria
                  ? '<p class="loading-text">Cargando historial de auditoría...</p>'
                  : logsAuditoria.length === 0
                    ? '<p class="empty-text">No hay movimientos de auditoría registrados para esta inscripción (fue cargada previamente o por seed inicial).</p>'
                    : `
                      <div class="table-responsive">
                        <table class="custom-table">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Acción</th>
                              <th>Anterior</th>
                              <th>Nuevo</th>
                              <th>Usuario</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${logsAuditoria
                              .map(
                                (log) => `
                                  <tr>
                                    <td>${escapeHtml(formatearFechaHora(log.fecha_cambio))}</td>
                                    <td><strong>${escapeHtml(log.accion)}</strong></td>
                                    <td>${escapeHtml(log.detalle_anterior || '—')}</td>
                                    <td>${escapeHtml(log.detalle_nuevo || '—')}</td>
                                    <td>${escapeHtml(log.modificado_por || 'Preceptoría')}</td>
                                  </tr>
                                `
                              )
                              .join('')}
                          </tbody>
                        </table>
                      </div>
                    `
              }
            </div>
            <div class="form-actions full-width">
              <button type="button" id="btnCerrarAuditoria" class="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="listado-general-finales">
        <div class="card">
          <div class="card-header header-con-resumen">
            <div>
              <h3>Listado General de Alumnos Inscriptos a Exámenes Finales</h3>
              <p class="tab-description">
                Vista unificada para <strong>Preceptoría</strong>. Permite filtrar inscripciones, <strong>calificar</strong>, <strong>reasignar turno/modalidad</strong>, aplicar <strong>baja lógica auditada</strong> y <strong>exportar planillas a Excel</strong>.
              </p>
            </div>

            <div class="header-actions-row">
              <button type="button" id="btnExportarExcelListado" class="btn btn-primary" ${inscripcionesFiltradas.length === 0 ? 'disabled' : ''}>
                Exportar Excel (.xls)
              </button>
              <button type="button" id="btnActualizarListado" class="btn btn-secondary" ${cargando ? 'disabled' : ''}>
                Actualizar
              </button>
              ${
                props.onVolver
                  ? `<button type="button" id="btnVolverInscripcion" class="btn btn-secondary">Volver a Inscripción de Finales</button>`
                  : ''
              }
            </div>
          </div>

          <div class="filtros-finales-panel">
            <div class="filtros-finales-header">
              <h4>Filtros de Búsqueda de Inscripciones</h4>
              <div class="filtros-resumen-derecha">
                <span class="badge-count-materias">
                  Mostrando ${inscripcionesFiltradas.length} de ${inscripciones.length} registros
                </span>
                ${
                  hayFiltrosActivos
                    ? `<button type="button" id="btnLimpiarFiltrosListado" class="btn btn-secondary btn-sm">Limpiar Filtros</button>`
                    : ''
                }
              </div>
            </div>

            <div class="filtros-finales-grid">
              <div class="form-group">
                <label for="filtroBusquedaTexto">Buscar (DNI / Apellido / Legajo):</label>
                <input id="filtroBusquedaTexto" type="text" placeholder="Ej: 40111222 o Pérez..." value="${escapeHtml(filtroBusqueda)}" />
              </div>

              <div class="form-group">
                <label for="filtroEstado">Estado:</label>
                <select id="filtroEstado">
                  <option value="ACTIVAS" ${filtroEstado === 'ACTIVAS' ? 'selected' : ''}>Activas (sin bajas)</option>
                  <option value="TODAS" ${filtroEstado === 'TODAS' ? 'selected' : ''}>Todas (incluye bajas)</option>
                  <option value="INSCRIPTO" ${filtroEstado === 'INSCRIPTO' ? 'selected' : ''}>INSCRIPTO</option>
                  <option value="APROBADO" ${filtroEstado === 'APROBADO' ? 'selected' : ''}>APROBADO</option>
                  <option value="DESAPROBADO" ${filtroEstado === 'DESAPROBADO' ? 'selected' : ''}>DESAPROBADO</option>
                  <option value="AUSENTE" ${filtroEstado === 'AUSENTE' ? 'selected' : ''}>AUSENTE</option>
                  <option value="BAJA" ${filtroEstado === 'BAJA' ? 'selected' : ''}>BAJA (Baja Lógica)</option>
                </select>
              </div>

              <div class="form-group">
                <label for="filtroAnio">Año:</label>
                <select id="filtroAnio">
                  <option value="">-- Todos los años --</option>
                  ${aniosDisponibles
                    .map((anio) => `<option value="${anio}" ${String(filtroAnio) === String(anio) ? 'selected' : ''}>${anio}</option>`)
                    .join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="filtroTurno">Turno (Instancia):</label>
                <select id="filtroTurno">
                  <option value="">-- Todos los turnos --</option>
                  ${INSTANCIAS_CATALOGO.map(
                    (inst) => `<option value="${inst.id}" ${String(filtroTurno) === String(inst.id) ? 'selected' : ''}>${inst.id} - ${escapeHtml(inst.nombre)}</option>`
                  ).join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="filtroLlamado">Llamado:</label>
                <select id="filtroLlamado">
                  <option value="">-- Todos los llamados --</option>
                  <option value="1" ${String(filtroLlamado) === '1' ? 'selected' : ''}>1° Llamado</option>
                  <option value="2" ${String(filtroLlamado) === '2' ? 'selected' : ''}>2° Llamado</option>
                </select>
              </div>

              <div class="form-group">
                <label for="filtroCarrera">Carrera:</label>
                <select id="filtroCarrera">
                  <option value="">-- Todas las carreras --</option>
                  ${carreras
                    .map((c) => `<option value="${c.id_carrera}" ${String(filtroCarrera) === String(c.id_carrera) ? 'selected' : ''}>${escapeHtml(c.nombre_carrera)}</option>`)
                    .join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="filtroMateria">Materia:</label>
                <select id="filtroMateria">
                  <option value="">-- Todas las materias --</option>
                  ${materiasDisponiblesFiltro
                    .map((m) => `<option value="${m.id_materia}" ${String(filtroMateria) === String(m.id_materia) ? 'selected' : ''}>${escapeHtml(m.nombre_materia)}</option>`)
                    .join('')}
                </select>
              </div>
            </div>
          </div>

          ${tablaHtml}
        </div>
        ${modalHtml}
      </div>
    `;

    // Eventos cabecera
    const btnExportar = container.querySelector('#btnExportarExcelListado');
    if (btnExportar) btnExportar.addEventListener('click', () => exportarExcel(inscripcionesFiltradas));

    const btnActualizar = container.querySelector('#btnActualizarListado');
    if (btnActualizar) btnActualizar.addEventListener('click', cargarInscripciones);

    const btnVolver = container.querySelector('#btnVolverInscripcion');
    if (btnVolver && props.onVolver) btnVolver.addEventListener('click', props.onVolver);

    const btnLimpiar = container.querySelector('#btnLimpiarFiltrosListado');
    if (btnLimpiar) {
      btnLimpiar.addEventListener('click', () => {
        filtroBusqueda = '';
        filtroEstado = 'ACTIVAS';
        filtroAnio = '';
        filtroTurno = '';
        filtroLlamado = '';
        filtroCarrera = '';
        filtroMateria = '';
        render();
      });
    }

    // Eventos filtros
    const inpBusqueda = container.querySelector('#filtroBusquedaTexto');
    if (inpBusqueda) {
      inpBusqueda.addEventListener('input', (e) => {
        filtroBusqueda = e.target.value;
        const pos = e.target.selectionStart;
        render();
        const refocused = container.querySelector('#filtroBusquedaTexto');
        if (refocused) {
          refocused.focus();
          refocused.setSelectionRange(pos, pos);
        }
      });
    }

    const selEstado = container.querySelector('#filtroEstado');
    if (selEstado) selEstado.addEventListener('change', (e) => { filtroEstado = e.target.value; render(); });

    const selAnio = container.querySelector('#filtroAnio');
    if (selAnio) selAnio.addEventListener('change', (e) => { filtroAnio = e.target.value; render(); });

    const selTurno = container.querySelector('#filtroTurno');
    if (selTurno) selTurno.addEventListener('change', (e) => { filtroTurno = e.target.value; render(); });

    const selLlamado = container.querySelector('#filtroLlamado');
    if (selLlamado) selLlamado.addEventListener('change', (e) => { filtroLlamado = e.target.value; render(); });

    const selCarrera = container.querySelector('#filtroCarrera');
    if (selCarrera) {
      selCarrera.addEventListener('change', (e) => {
        filtroCarrera = e.target.value;
        if (filtroCarrera && filtroMateria) {
          const pertenece = todasMaterias.some(
            (m) => String(m.id_carrera) === String(filtroCarrera) && String(m.id_materia) === String(filtroMateria)
          );
          if (!pertenece) filtroMateria = '';
        }
        render();
      });
    }

    const selMateria = container.querySelector('#filtroMateria');
    if (selMateria) selMateria.addEventListener('change', (e) => { filtroMateria = e.target.value; render(); });

    // Eventos botones por fila
    container.querySelectorAll('button[data-action="calificar"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rend = inscripcionesFiltradas[Number(btn.getAttribute('data-idx'))];
        if (!rend) return;
        rendicionCalificar = rend;
        notaInput = rend.nota || 4;
        ausenteInput = Boolean(rend.es_ausente);
        render();
      });
    });

    container.querySelectorAll('button[data-action="reasignar"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rend = inscripcionesFiltradas[Number(btn.getAttribute('data-idx'))];
        if (!rend) return;
        rendicionReasignar = rend;
        reasigAnio = Number(rend.anio_turno) || new Date().getFullYear();
        reasigTurno = Number(rend.turno_instancia) || 1;
        reasigLlamado = Number(rend.id_llamado) || 1;
        reasigModalidad = rend.modalidad || 'REGULAR';
        render();
      });
    });

    container.querySelectorAll('button[data-action="baja"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rend = inscripcionesFiltradas[Number(btn.getAttribute('data-idx'))];
        if (!rend) return;
        ejecutarBajaLogica(rend);
      });
    });

    container.querySelectorAll('button[data-action="auditoria"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rend = inscripcionesFiltradas[Number(btn.getAttribute('data-idx'))];
        if (!rend) return;
        abrirAuditoria(rend);
      });
    });

    // Eventos Modal Calificar
    const chkAusente = container.querySelector('#chkAusenteListado');
    if (chkAusente) chkAusente.addEventListener('change', (e) => { ausenteInput = e.target.checked; render(); });

    const inputNota = container.querySelector('#notaModalListado');
    if (inputNota) {
      inputNota.addEventListener('input', (e) => {
        notaInput = Number(e.target.value);
        const helpEl = container.querySelector('#helpNotaListado');
        if (helpEl) {
          helpEl.textContent = notaInput >= 4 ? '🟢 Aprobado (>= 4)' : '🔴 Aplazo (< 4, cuenta como falla)';
        }
      });
    }

    const btnCancelarModal = container.querySelector('#btnCancelarModalListado');
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', () => { rendicionCalificar = null; render(); });

    const formCalificar = container.querySelector('#formCalificarListado');
    if (formCalificar) {
      formCalificar.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!rendicionCalificar) return;
        try {
          const res = await fetch(`${API_BASE}/finales/calificar/${rendicionCalificar.id_rendicion}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nota: ausenteInput ? null : notaInput,
              es_ausente: ausenteInput,
              fecha_examen: new Date().toISOString().split('T')[0]
            })
          });
          const data = await res.json();
          if (data.success) {
            rendicionCalificar = null;
            mostrarMensaje('Calificación / estado del examen final actualizado correctamente.');
            cargarInscripciones();
          } else {
            mostrarMensaje(data.message || 'Error al calificar', 'error');
          }
        } catch {
          mostrarMensaje('Error al conectar con el servidor', 'error');
        }
      });
    }

    // Eventos Modal Reasignar
    const btnCancelarReasig = container.querySelector('#btnCancelarReasignar');
    if (btnCancelarReasig) btnCancelarReasig.addEventListener('click', () => { rendicionReasignar = null; render(); });

    const formReasignar = container.querySelector('#formReasignarListado');
    if (formReasignar) {
      formReasignar.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!rendicionReasignar) return;
        reasigGuardando = true;
        const payload = {
          anio_turno: Number(container.querySelector('#reasigAnio')?.value),
          turno_instancia: Number(container.querySelector('#reasigTurno')?.value),
          id_llamado: Number(container.querySelector('#reasigLlamado')?.value),
          modalidad: container.querySelector('#reasigModalidad')?.value || 'REGULAR',
          modificado_por: 'Preceptoría'
        };
        try {
          const res = await fetch(`${API_BASE}/finales/${rendicionReasignar.id_rendicion}/reasignar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            rendicionReasignar = null;
            mostrarMensaje('Inscripción reasignada con éxito y registrada en el historial de auditoría.');
            cargarInscripciones();
          } else {
            mostrarMensaje(data.message || 'No se pudo reasignar la inscripción.', 'error');
          }
        } catch {
          mostrarMensaje('Error al conectar con el servidor para reasignar.', 'error');
        } finally {
          reasigGuardando = false;
          render();
        }
      });
    }

    // Eventos Modal Auditoría
    const btnCerrarAuditoria = container.querySelector('#btnCerrarAuditoria');
    if (btnCerrarAuditoria) btnCerrarAuditoria.addEventListener('click', () => { rendicionAuditoria = null; render(); });
  };

  cargarCatalogos();
  cargarInscripciones();

  return {
    update: (newProps = {}) => {
      props = { ...props, ...newProps };
      render();
    }
  };
}
