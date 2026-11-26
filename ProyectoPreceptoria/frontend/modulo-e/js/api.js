const API_BASE = 'http://localhost:3000/api';

/**
 * Cliente HTTP del Módulo E (Inscripción a Materias y Gestión Académica)
 * Conectado 100% a la base de datos única MySQL (clementina), sin datos ficticios ni fallbacks locales.
 */
export const api = {
  async getCarreras() {
    const res = await fetch(`${API_BASE}/catalogos/carreras`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'No se pudieron obtener las carreras');
    return Array.isArray(json.data) ? json.data : [];
  },

  async saveCarrera(carrera) {
    const res = await fetch(`${API_BASE}/catalogos/carreras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(carrera)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al guardar la carrera');
    return json.data;
  },

  async deleteCarrera(idCarrera) {
    const res = await fetch(`${API_BASE}/catalogos/carreras/${Number(idCarrera)}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al eliminar la carrera');
    return json;
  },

  async getAlumnos() {
    const res = await fetch(`${API_BASE}/catalogos/alumnos`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'No se pudieron obtener los alumnos');
    return Array.isArray(json.data) ? json.data : [];
  },

  async getAlumnoDetalle(idAlumno) {
    const res = await fetch(`${API_BASE}/catalogos/alumnos/${Number(idAlumno)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Alumno no encontrado');
    return json.data;
  },

  async getMateriasCarrera(idCarrera, idAlumno = null) {
    const carreraId = Number(idCarrera);
    const url = idAlumno
      ? `${API_BASE}/catalogos/carreras/${carreraId}/materias?idAlumno=${Number(idAlumno)}`
      : `${API_BASE}/catalogos/carreras/${carreraId}/materias`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'No se pudieron obtener las materias');

    const materiasRaw = Array.isArray(json.data?.materias) ? json.data.materias : [];
    const nroPorMateria = new Map();
    materiasRaw.forEach((m, idx) => {
      nroPorMateria.set(Number(m.id_materia), String(m.nro || idx + 1));
    });

    return {
      materias: materiasRaw.map((m, idx) => {
        const nro = nroPorMateria.get(Number(m.id_materia)) || String(idx + 1);
        const corrs = Array.isArray(m.correlativas) ? m.correlativas : [];
        const corrsOrdenadas = corrs
          .map((c) => ({
            nro: nroPorMateria.get(Number(c.id_materia_correlativa)) || String(c.id_materia_correlativa),
            nombre: c.nombre_materia_correlativa || ''
          }))
          .sort((a, b) => Number(a.nro) - Number(b.nro));

        const cvaTexto = corrsOrdenadas.length > 0
          ? corrsOrdenadas.map((c) => c.nro).join(' - ')
          : '—';
        const cvaTooltip = corrsOrdenadas.length > 0
          ? `Correlativas: ${corrsOrdenadas.map((c) => `${c.nro} (${c.nombre})`).join(', ')}`
          : 'Sin correlativas';

        return {
          ...m,
          nro,
          cva: cvaTexto,
          cva_tooltip: cvaTooltip,
          horas: m.horas || m.carga_horaria_semanal || 4
        };
      }),
      sedes_turnos: Array.isArray(json.data?.sedes_turnos) ? json.data.sedes_turnos : []
    };
  },

  async saveMateria(idCarrera, materia) {
    const res = await fetch(`${API_BASE}/catalogos/carreras/${Number(idCarrera)}/materias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(materia)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al guardar la materia');
    return json.data;
  },

  async deleteMateria(idCarrera, idMateria) {
    const res = await fetch(`${API_BASE}/catalogos/carreras/${Number(idCarrera)}/materias/${Number(idMateria)}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al eliminar la materia');
    return json;
  },

  async saveHorario(idCarrera, idMateria, horario) {
    const res = await fetch(`${API_BASE}/catalogos/horarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...horario,
        id_carrera: Number(idCarrera),
        id_materia: Number(idMateria)
      })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al guardar el horario');
    return json.data;
  },

  async deleteHorario(idCarrera, idMateria, idHorario) {
    const res = await fetch(`${API_BASE}/catalogos/horarios/${Number(idHorario)}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al eliminar el horario');
    return json;
  },

  async getCargaHoraria(idAlumno, idCarrera = null, materiasIds = []) {
    let url = `${API_BASE}/estudiantes/${Number(idAlumno)}/carga-horaria`;
    const params = new URLSearchParams();
    if (idCarrera) params.append('idCarrera', idCarrera);
    if (materiasIds.length > 0) params.append('materias', materiasIds.join(','));
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al consultar carga horaria');
    return json.data;
  },

  async inscribirMaterias(payload) {
    const res = await fetch(`${API_BASE}/inscripciones-materias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(json.message || 'Error al procesar la inscripción');
      err.data = json;
      err.bloqueos = json.bloqueos;
      err.codigo = json.codigo;
      throw err;
    }
    return json.data;
  },

  async getReporteInscripciones(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.carrera) params.append('carrera', filtros.carrera);
    if (filtros.anio) params.append('anio', filtros.anio);
    if (filtros.ciclo_lectivo) params.append('ciclo_lectivo', filtros.ciclo_lectivo);
    if (filtros.situacion) params.append('situacion', filtros.situacion);

    const res = await fetch(`${API_BASE}/reportes/inscripciones?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al obtener el reporte de inscripciones');
    return json.data;
  }
};
