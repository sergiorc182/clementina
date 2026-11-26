const MatriculacionModel = require('../models/MatriculacionModel');
const ParametrosModel = require('../models/ParametrosModel');

class CargaHorariaService {
  /**
   * Obtiene la carga horaria semanal asignada a una materia.
   * Utiliza el mapa de horas de la carrera si está provisto,
   * o el valor institucional parametrizado por defecto (4 hs).
   */
  static getHorasPorMateria(idMateria, mapaHoras = null) {
    if (mapaHoras && mapaHoras.has(Number(idMateria))) {
      return mapaHoras.get(Number(idMateria));
    }
    const horasDefault = Number(process.env.CARGA_HORARIA_DEFAULT_MATERIA) || 4;
    return horasDefault;
  }

  /**
   * Límite institucional de carga horaria semanal permitido para un alumno.
   */
  static getLimiteMaximoHoras() {
    return Number(process.env.MAX_CARGA_HORARIA_SEMANAL) || 32;
  }

  /**
   * Calcula y verifica la carga horaria actual y disponible para un estudiante
   * @param {number} idAlumno
   * @param {number} [idCarrera]
   * @param {Array<number>} [nuevasMateriasIds] Materias a simular o sumar
   */
  static async verificarCargaHoraria(idAlumno, idCarrera = null, nuevasMateriasIds = []) {
    const parametros = await ParametrosModel.getGenerales();
    const cicloLectivo = parametros.ciclo_lectivo || new Date().getFullYear();

    let materiasActuales = [];
    let mapaHoras = new Map();
    if (idCarrera) {
      materiasActuales = await MatriculacionModel.getDetalle(idAlumno, idCarrera, cicloLectivo);
      try {
        const { query } = require('../config/db');
        const rows = await query('SELECT id_materia, carga_horaria_semanal FROM carrera_materias WHERE id_carrera = ?', [idCarrera]);
        rows.forEach(r => mapaHoras.set(Number(r.id_materia), Number(r.carga_horaria_semanal || 4)));
      } catch (err) {
        // Fallback a mapa vacío
      }
    }

    const limiteMaximo = this.getLimiteMaximoHoras();

    // Horas de materias ya cursadas/matriculadas en este ciclo
    const horasActuales = materiasActuales.reduce((acc, m) => {
      return acc + this.getHorasPorMateria(m.id_materia, mapaHoras);
    }, 0);

    // Horas de las materias que se intentan agregar
    const horasNuevas = nuevasMateriasIds.reduce((acc, idMat) => {
      return acc + this.getHorasPorMateria(idMat, mapaHoras);
    }, 0);

    const horasTotales = horasActuales + horasNuevas;
    const horasDisponibles = Math.max(0, limiteMaximo - horasActuales);
    const excedido = horasTotales > limiteMaximo;

    return {
      id_alumno: Number(idAlumno),
      id_carrera: idCarrera ? Number(idCarrera) : null,
      ciclo_lectivo: cicloLectivo,
      limite_maximo_semanal: limiteMaximo,
      materias_actuales_count: materiasActuales.length,
      horas_actuales: horasActuales,
      horas_nuevas: horasNuevas,
      horas_totales_proyectadas: horasTotales,
      horas_disponibles: horasDisponibles,
      excedido: excedido,
      mensaje: excedido 
        ? `Carga horaria excedida: ${horasTotales} hs proyectadas superan el límite de ${limiteMaximo} hs semanales.`
        : `Carga horaria válida: ${horasTotales} hs de ${limiteMaximo} hs disponibles.`
    };
  }
}

module.exports = CargaHorariaService;
