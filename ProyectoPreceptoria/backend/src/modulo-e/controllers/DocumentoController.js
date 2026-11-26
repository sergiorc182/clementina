const PdfService = require('../services/PdfService');

class DocumentoController {
  /**
   * GET /api/documentos/formulario-matriculacion/:idAlumno/:idCarrera
   * Descarga el Formulario de Matriculación en PDF
   */
  static async descargarFormularioMatriculacion(req, res, next) {
    try {
      const idAlumno = Number(req.params.idAlumno);
      const idCarrera = Number(req.params.idCarrera);
      const cicloLectivo = req.query.ciclo ? Number(req.query.ciclo) : null;

      const pdfBuffer = await PdfService.generarFormularioMatriculacion(idAlumno, idCarrera, cicloLectivo);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=formulario_matriculacion_${idAlumno}_${idCarrera}.pdf`);
      return res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documentos/planilla-asistencia/:idCarrera/:idMateria
   * Descarga la Planilla de Asistencia Editable en PDF
   */
  static async descargarPlanillaAsistencia(req, res, next) {
    try {
      const idCarrera = Number(req.params.idCarrera);
      const idMateria = Number(req.params.idMateria);
      const cicloLectivo = req.query.ciclo ? Number(req.query.ciclo) : null;

      const pdfBuffer = await PdfService.generarPlanillaAsistencia(idCarrera, idMateria, cicloLectivo);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=planilla_asistencia_carrera${idCarrera}_materia${idMateria}.pdf`);
      return res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DocumentoController;
