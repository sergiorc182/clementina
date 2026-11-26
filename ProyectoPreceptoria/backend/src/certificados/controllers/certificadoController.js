const AlumnoModel = require('../models/alumnoModel');
const CarreraModel = require('../models/carreraModel');
const HistorialAcademicoModel = require('../models/historialAcademicoModel');
const ParametroModel = require('../models/parametroModel');

/**
 * Normaliza y clasifica la condición del examen en los 4 tipos oficiales:
 * - Libre
 * - Regular
 * - Promoción
 * - Equivalencia
 */
function mapTipoExamen(tipoAlumno, observaciones = '', resolucion = '') {
  const tipo = (tipoAlumno || '').trim().toUpperCase();
  const obs = (observaciones || '').toLowerCase();

  if (tipo === 'E' || obs.includes('equiv') || (resolucion && resolucion.trim().length > 0)) {
    return 'Equivalencia';
  }
  if (tipo === 'L' || obs.includes('libre')) {
    return 'Libre';
  }
  if (tipo === 'P' || obs.includes('promoc')) {
    return 'Promoción';
  }
  return 'Regular';
}

class CertificadoController {
  /**
   * GET /api/certificados/porcentaje/:alumnoId/:carreraId
   * Calcula el porcentaje de materias aprobadas del alumno para una carrera,
   * discriminando aprobadas vs pendientes con actas, tomos y folios.
   */
  static async obtenerPorcentajeAprobadas(req, res, next) {
    try {
      const { alumnoId, carreraId } = req.params;

      // 1. Obtener datos del alumno
      const alumno = await AlumnoModel.obtenerPorId(alumnoId);
      if (!alumno) {
        return res.status(404).json({ error: 'Alumno no encontrado' });
      }

      // 2. Obtener datos de la carrera
      const carrera = await CarreraModel.obtenerPorId(carreraId);
      if (!carrera) {
        return res.status(404).json({ error: 'Carrera no encontrada' });
      }

      // 3. Obtener la matrícula del alumno en esta carrera
      const matriculaciones = await AlumnoModel.obtenerCarrerasMatriculadas(alumnoId);
      const matricula = matriculaciones.find(m => String(m.id_carrera) === String(carreraId));

      // 4. Obtener el plan de materias oficial de la carrera
      const planMaterias = await CarreraModel.obtenerPlanMaterias(carreraId);
      const totalMateriasPlan = planMaterias.length;

      if (totalMateriasPlan === 0) {
        return res.status(400).json({
          error: 'La carrera no posee materias configuradas en su plan de estudios.'
        });
      }

      // 5. Obtener materias aprobadas
      const aprobadas = await HistorialAcademicoModel.obtenerMateriasAprobadas(alumnoId, carreraId);
      const idsAprobadas = new Set(aprobadas.map(a => a.id_materia));

      // 6. Determinar materias pendientes
      const pendientes = planMaterias.filter(m => !idsAprobadas.has(m.id_materia));

      // 7. Cálculos numéricos y porcentuales
      const cantidadAprobadas = aprobadas.length;
      const cantidadPendientes = pendientes.length;
      const porcentajeExacto = (cantidadAprobadas / totalMateriasPlan) * 100;
      const porcentaje = Number(porcentajeExacto.toFixed(2));

      // Promedio de materias aprobadas
      const sumaNotas = aprobadas.reduce((acc, curr) => acc + Number(curr.nota || 0), 0);
      const promedio = cantidadAprobadas > 0 ? Number((sumaNotas / cantidadAprobadas).toFixed(2)) : 0;

      // Parámetros institucionales
      const params = await ParametroModel.obtenerGenerales();

      res.json({
        instituto: {
          nombre: params.nombre_instituto,
          cicloLectivo: params.ciclo_lectivo
        },
        alumno: {
          id: alumno.id_alumno,
          nombreCompleto: alumno.nombre_completo,
          tipoDocumento: alumno.id_tipo_documento,
          numeroDocumento: alumno.numero_documento,
          email: alumno.email
        },
        carrera: {
          id: carrera.id_carrera,
          nombre: carrera.nombre_carrera,
          resolucion: carrera.nro_resolucion,
          titulo: carrera.titulo,
          anioInscripcion: matricula ? matricula.anio_inscripcion : null,
          tomoMatriz: matricula ? matricula.tomo_matriz : null,
          folioMatriz: matricula ? matricula.folio_matriz : null
        },
        estadisticas: {
          totalMateriasPlan,
          cantidadAprobadas,
          cantidadPendientes,
          porcentajeAprobadas: porcentaje,
          porcentajeTexto: `${porcentaje}%`,
          promedioCalificaciones: promedio
        },
        materiasAprobadas: aprobadas.map(m => {
          const tipoExamen = mapTipoExamen(m.tipo_alumno, m.observaciones, m.resolucion);
          let textoEquivalencia = m.resolucion || '';
          if (!textoEquivalencia && tipoExamen === 'Equivalencia') {
            textoEquivalencia = (m.observaciones || '')
              .replace(/^aprobado por equivalencia:?\s*/i, '')
              .replace(/^equivalencia:?\s*/i, '')
              .trim();
          }

          return {
            idMateria: m.id_materia,
            codigoEspacio: m.codigo_espacio,
            anioCursada: m.anio_cursada,
            nombreMateria: m.nombre_materia,
            nota: m.nota,
            fechaAprobacion: m.fecha_aprobacion,
            tomoActa: m.tomo_acta,
            folioActa: m.folio_acta,
            tipoExamen, // 'Libre', 'Regular', 'Promoción' o 'Equivalencia'
            equivalenciaTexto: textoEquivalencia,
            condicion: tipoExamen === 'Equivalencia' && textoEquivalencia
              ? `Equivalencia (${textoEquivalencia})`
              : tipoExamen
          };
        }),
        materiasPendientes: pendientes.map(m => ({
          idMateria: m.id_materia,
          codigoEspacio: m.codigo_espacio,
          anioCursada: m.anio_cursada,
          nombreMateria: m.nombre_materia
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/certificados/constancia/:alumnoId/:carreraId
   * Genera la constancia formal institucional de porcentaje de materias aprobadas.
   */
  static async generarConstancia(req, res, next) {
    try {
      const { alumnoId, carreraId } = req.params;

      const alumno = await AlumnoModel.obtenerPorId(alumnoId);
      if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });

      const carrera = await CarreraModel.obtenerPorId(carreraId);
      if (!carrera) return res.status(404).json({ error: 'Carrera no encontrada' });

      const matriculaciones = await AlumnoModel.obtenerCarrerasMatriculadas(alumnoId);
      const matricula = matriculaciones.find(m => String(m.id_carrera) === String(carreraId));

      const planMaterias = await CarreraModel.obtenerPlanMaterias(carreraId);
      const totalMaterias = planMaterias.length;

      const aprobadas = await HistorialAcademicoModel.obtenerMateriasAprobadas(alumnoId, carreraId);
      const cantidadAprobadas = aprobadas.length;
      const porcentaje = Number(((cantidadAprobadas / totalMaterias) * 100).toFixed(2));

      const params = await ParametroModel.obtenerGenerales();
      const fechaActual = new Date();
      const fechaFormateada = fechaActual.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const nroConstancia = `CERT-PORC-${fechaActual.getFullYear()}-${String(alumno.id_alumno).padStart(4, '0')}-${String(carrera.id_carrera).padStart(2, '0')}`;

      // Texto formal sin número de legajo
      const textoCertificado = `El ${params.nombre_instituto} certifica que el/la estudiante ${alumno.nombre_completo}, titular del ${alumno.id_tipo_documento} N° ${alumno.numero_documento}, se encuentra debidamente inscripto/a en la carrera "${carrera.nombre_carrera}" (${carrera.nro_resolucion}). Habiendo registrado su situación académica al día de la fecha, consta que ha aprobado un total de ${cantidadAprobadas} (${numeroAPalabras(cantidadAprobadas)}) espacios curriculares sobre un total de ${totalMaterias} (${numeroAPalabras(totalMaterias)}) asignaturas que componen el plan de estudios correspondiente, lo que representa un ${porcentaje}% (${porcentaje} por ciento) de la carrera aprobada. A pedido del interesado y al solo efecto de ser presentado ante las autoridades que lo requieran, se expide el presente certificado en la localidad de San Miguel, a los ${fechaFormateada}.`;

      res.json({
        nroConstancia,
        fechaEmision: fechaFormateada,
        instituto: params.nombre_instituto,
        alumno: {
          nombreCompleto: alumno.nombre_completo,
          documento: `${alumno.id_tipo_documento} ${alumno.numero_documento}`,
          tomoMatriz: matricula ? matricula.tomo_matriz : '-',
          folioMatriz: matricula ? matricula.folio_matriz : '-'
        },
        carrera: {
          nombre: carrera.nombre_carrera,
          resolucion: carrera.nro_resolucion,
          titulo: carrera.titulo
        },
        porcentaje,
        totalMaterias,
        materiasAprobadas: cantidadAprobadas,
        textoCertificado,
        detalleMateriasAprobadas: aprobadas.map(a => {
          const tipoExamen = mapTipoExamen(a.tipo_alumno, a.observaciones, a.resolucion);
          const textoEquiv = a.resolucion || (a.observaciones || '').replace(/^aprobado por equivalencia:?\s*/i, '').trim();

          return {
            anio: a.anio_cursada,
            codigo: a.codigo_espacio,
            materia: a.nombre_materia,
            calificacion: a.nota,
            fecha: a.fecha_aprobacion,
            acta: `Libro ${a.tomo_acta} / Folio ${a.folio_acta}`,
            tipoExamen,
            equivalenciaTexto: textoEquiv,
            condicion: tipoExamen === 'Equivalencia' && textoEquiv
              ? `Equivalencia (${textoEquiv})`
              : tipoExamen
          };
        })
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/certificados/historial/:alumnoId/:carreraId/:materiaId
   * Actualiza el tipo de examen (Libre, Regular, Promoción, Equivalencia) y el texto de equivalencia.
   */
  static async actualizarCondicionMateria(req, res, next) {
    try {
      const { alumnoId, carreraId, materiaId } = req.params;
      const { tipoExamen, equivalenciaTexto } = req.body;

      if (!tipoExamen) {
        return res.status(400).json({ error: 'Debe especificar el tipo de examen (Libre, Regular, Promoción o Equivalencia).' });
      }

      const actualizado = await HistorialAcademicoModel.actualizarTipoExamen(
        alumnoId,
        carreraId,
        materiaId,
        tipoExamen,
        equivalenciaTexto
      );

      if (!actualizado) {
        return res.status(404).json({ error: 'No se encontró el registro académico para actualizar.' });
      }

      res.json({
        success: true,
        mensaje: 'Tipo de examen actualizado correctamente.',
        tipoExamen,
        equivalenciaTexto: (tipoExamen === 'Equivalencia' ? (equivalenciaTexto || '').trim() : '')
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/certificados/historial
   * Registra una materia como aprobada con su tipo de examen.
   */
  static async registrarAprobacionMateria(req, res, next) {
    try {
      const {
        idAlumno,
        idCarrera,
        idMateria,
        nota,
        fechaAprobacion,
        tomoActa,
        folioActa,
        tipoExamen,
        equivalenciaTexto
      } = req.body;

      if (!idAlumno || !idCarrera || !idMateria) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios (idAlumno, idCarrera, idMateria).' });
      }

      const guardado = await HistorialAcademicoModel.registrarAprobacion({
        idAlumno,
        idCarrera,
        idMateria,
        nota,
        fechaAprobacion,
        tomoActa,
        folioActa,
        tipoExamen,
        equivalenciaTexto
      });

      res.json({
        success: guardado,
        mensaje: 'Materia registrada exitosamente.'
      });
    } catch (error) {
      next(error);
    }
  }
}

function numeroAPalabras(num) {
  const palabras = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
    'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve', 'treinta'];
  return palabras[num] || String(num);
}

module.exports = CertificadoController;
