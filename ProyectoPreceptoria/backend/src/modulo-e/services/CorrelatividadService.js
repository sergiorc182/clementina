const CorrelatividadModel = require('../models/CorrelatividadModel');
const HistorialAcademicoModel = require('../models/HistorialAcademicoModel');
const CarreraModel = require('../models/CarreraModel');

class CorrelatividadService {
  /**
   * Helper para verificar si un valor de la BD representa 'verdadero'
   * @param {string|number} val 
   */
  static esVerdadero(val) {
    if (val === null || val === undefined) return false;
    const str = String(val).trim().toUpperCase();
    return str === '1' || str === 'T' || str === 'V' || str === 'S' || str === 'TRUE';
  }

  /**
   * Valida si un alumno cumple con las correlatividades para un conjunto de materias
   * Regla de negocio: La materia correlativa debe estar regularizada (validado_regular = 1/T/V)
   * o aprobada por examen final (validado_examen = 1/T/V o fecha_aprobacion no nula).
   * 
   * @param {number} idAlumno
   * @param {number} idCarrera
   * @param {Array<number>} idsMateriasSeleccionadas
   * @returns {Promise<{ valido: boolean, bloqueos: Array<Object>, detalles: Array<Object> }>}
   */
  static async validarCorrelativas(idAlumno, idCarrera, idsMateriasSeleccionadas) {
    // 1. Obtener historial académico completo del alumno en la carrera
    const historial = await HistorialAcademicoModel.getByAlumnoYCarrera(idAlumno, idCarrera);
    
    // Mapear historial por id_materia para acceso rápido
    const mapaHistorial = new Map();
    for (const h of historial) {
      const estaRegular = this.esVerdadero(h.validado_regular);
      const estaAprobada = this.esVerdadero(h.validado_examen) || (h.fecha_aprobacion !== null && h.fecha_aprobacion !== undefined);
      mapaHistorial.set(h.id_materia, {
        ...h,
        regularizada: estaRegular,
        aprobada: estaAprobada,
        cumpleCorrelativa: estaRegular || estaAprobada
      });
    }

    // 2. Obtener información de las materias de la carrera
    const materiasCarrera = await CarreraModel.getMaterias(idCarrera);
    const mapaMateriasCarrera = new Map(materiasCarrera.map(m => [m.id_materia, m]));

    const bloqueos = [];
    const detalles = [];

    // 3. Evaluar cada materia solicitada
    for (const idMateria of idsMateriasSeleccionadas) {
      const infoMateria = mapaMateriasCarrera.get(idMateria);
      const nombreMateria = infoMateria ? infoMateria.nombre_materia : `Materia #${idMateria}`;
      const anioCursada = infoMateria ? infoMateria.anio_cursada : null;

      // Restricción de alcance: 1º año no entra en esta etapa (2º y 3º año)
      if (anioCursada === 1) {
        bloqueos.push({
          id_materia: idMateria,
          nombre_materia: nombreMateria,
          anio_cursada: 1,
          motivo: 'Inscripción de 1º año excluida en esta etapa del sistema (Alcance: 2º y 3º año).'
        });
        continue;
      }

      // Obtener correlativas directas requeridas
      const correlativas = await CorrelatividadModel.getCorrelativasDeMateria(idCarrera, idMateria);

      const faltantes = [];
      for (const corr of correlativas) {
        const estadoEnHistorial = mapaHistorial.get(corr.id_materia_correlativa);
        const cumple = estadoEnHistorial && estadoEnHistorial.cumpleCorrelativa;

        if (!cumple) {
          faltantes.push({
            id_materia_correlativa: corr.id_materia_correlativa,
            nombre_correlativa: corr.nombre_materia_correlativa,
            motivo: 'Requiere cursada regularizada (validado_regular = 1) o final aprobado.'
          });
        }
      }

      if (faltantes.length > 0) {
        bloqueos.push({
          id_materia: idMateria,
          nombre_materia: nombreMateria,
          anio_cursada: anioCursada,
          correlativas_faltantes: faltantes,
          motivo: `Correlativas no cumplidas: ${faltantes.map(f => f.nombre_correlativa).join(', ')}`
        });
      } else {
        detalles.push({
          id_materia: idMateria,
          nombre_materia: nombreMateria,
          habilitada: true
        });
      }
    }

    return {
      valido: bloqueos.length === 0,
      bloqueos,
      detalles
    };
  }
}

module.exports = CorrelatividadService;
