const ExamService = require('../services/examService');

class AcademicController {
  /**
   * Si el usuario autenticado tiene rol ALUMNO, devuelve su idAlumno (o -1 si no tiene alumno asociado)
   * para restringir estrictamente la consulta a sus propios registros académicos.
   */
  static getRestrictedStudentId(req) {
    if (String(req.user?.role || '').toUpperCase() === 'ALUMNO') {
      return req.user.idAlumno ? Number(req.user.idAlumno) : -1;
    }
    return null;
  }

  static async getAcademicRecords(req, res, next) {
    try {
      const { page, limit, search, subjectId, color, career, tipoExamen } = req.query;
      const restrictedStudentId = AcademicController.getRestrictedStudentId(req);
      const records = await ExamService.getAcademicRecords({
        page,
        limit,
        search,
        subjectId,
        color,
        career,
        tipoExamen,
        restrictedStudentId
      });
      return res.status(200).json({
        success: true,
        data: records
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCareers(req, res, next) {
    try {
      const restrictedStudentId = AcademicController.getRestrictedStudentId(req);
      const careers = await ExamService.getCareers(restrictedStudentId);
      return res.status(200).json({
        success: true,
        data: careers
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubjects(req, res, next) {
    try {
      const restrictedStudentId = AcademicController.getRestrictedStudentId(req);
      const subjects = await ExamService.getSubjects(restrictedStudentId);
      return res.status(200).json({
        success: true,
        data: subjects
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStudents(req, res, next) {
    try {
      const restrictedStudentId = AcademicController.getRestrictedStudentId(req);
      const students = await ExamService.getStudents(restrictedStudentId);
      return res.status(200).json({
        success: true,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/academic/validacion  o  PATCH /api/v1/resultados/:id/validacion
   * Cambia el estado del semáforo (GREEN / ORANGE / RED) y/o corrige Tipo de Examen (Promoción / Regular / Libre / Equivalencia).
   */
  static async validateGrade(req, res, next) {
    try {
      if (String(req.user?.role || '').toUpperCase() === 'ALUMNO') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Los alumnos no pueden validar ni modificar calificaciones.'
          }
        });
      }
      const actor = {
        ...req.user,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };
      const result = req.params.id
        ? await ExamService.validateGradeById(req.params.id, req.body, actor)
        : await ExamService.validateGrade(req.body, actor);

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Validación de nota y estado del semáforo actualizados en MySQL y auditados.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AcademicController;
