const MatriculacionModel = require('../models/MatriculacionModel');
const CarreraModel = require('../models/CarreraModel');

class ReporteService {
  /**
   * Genera el reporte de inscripciones con filtros combinables y métricas resumidas
   * @param {Object} filtros
   * @param {number} [filtros.idCarrera]
   * @param {number} [filtros.anioCursada]
   * @param {number} [filtros.cicloLectivo]
   * @param {string} [filtros.situacion] ('libre', 'regular', 'recursante', 'atraso')
   */
  static async generarReporte(filtros = {}) {
    const filas = await MatriculacionModel.getReporteInscripciones(filtros);

    // Calcular estadísticas agregadas
    const alumnosUnicos = new Set();
    const distribucionAsistencia = {};
    const alumnosPorAnioMap = new Map();
    const distribucionMaterias = {};

    for (const f of filas) {
      alumnosUnicos.add(f.id_alumno);

      // Conteo por tipo de asistencia a nivel de materias inscriptas
      const tipo = f.situacion_asistencia || 'No especificado';
      distribucionAsistencia[tipo] = (distribucionAsistencia[tipo] || 0) + 1;

      // Conteo de alumnos únicos por año de cursada (2º, 3º)
      const anio = `Año ${f.anio_cursada}`;
      if (!alumnosPorAnioMap.has(anio)) {
        alumnosPorAnioMap.set(anio, new Set());
      }
      alumnosPorAnioMap.get(anio).add(f.id_alumno);

      // Conteo por materia
      distribucionMaterias[f.nombre_materia] = (distribucionMaterias[f.nombre_materia] || 0) + 1;
    }

    const distribucionAnio = {};
    for (const [anio, setAlumnos] of alumnosPorAnioMap.entries()) {
      distribucionAnio[anio] = setAlumnos.size;
    }

    return {
      filtros_aplicados: {
        idCarrera: filtros.idCarrera ? Number(filtros.idCarrera) : 'Todas',
        anioCursada: filtros.anioCursada ? Number(filtros.anioCursada) : 'Todos',
        cicloLectivo: filtros.cicloLectivo ? Number(filtros.cicloLectivo) : 'Todos',
        situacion: filtros.situacion || 'Todas'
      },
      metricas: {
        total_inscripciones_materias: filas.length,
        total_alumnos_inscriptos: alumnosUnicos.size,
        distribucion_asistencia: distribucionAsistencia,
        distribucion_por_anio_cursada: distribucionAnio
      },
      inscripciones: filas
    };
  }
}

module.exports = ReporteService;
