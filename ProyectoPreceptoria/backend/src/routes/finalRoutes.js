import { Router } from 'express';
import {
  validarInscripcion,
  inscribir,
  obtenerHistorialAlumno,
  calificar,
  obtenerMaterias,
  obtenerListadoGeneral,
  darDeBaja,
  reasignar,
  obtenerAuditoria
} from '../controllers/finalController.js';

const router = Router();

/**
 * RUTAS DE CONTROL DE EXÁMENES FINALES (Integra funcionalidades de Módulo D)
 */

// 0. Listado general de inscripciones a finales (para Preceptores)
router.get('/', obtenerListadoGeneral);
router.get('/listado', obtenerListadoGeneral);

// 1. Evaluar condiciones reglamentarias previas a la inscripción (incluye excepción normativa Libre)
router.post('/validar', validarInscripcion);

// 2. Inscribir alumno a final (con validaciones o por excepción)
router.post('/inscribir', inscribir);

// 3. Consultar historial de intentos/finales por alumno
router.get('/alumno/:id_alumno', obtenerHistorialAlumno);

// 4. Asentar calificación o ausencia en un examen
router.put('/calificar/:id_rendicion', calificar);

// 5. Listar materias por carrera
router.get('/materias/:id_carrera', obtenerMaterias);

// 6. Reasignación de turno / llamado / modalidad con auditoría histórica (Módulo D)
router.patch('/:id_rendicion/reasignar', reasignar);

// 7. Baja lógica de inscripción sin borrado físico con auditoría (Módulo D)
router.delete('/:id_rendicion', darDeBaja);

// 8. Historial de auditoría de una inscripción (Módulo D)
router.get('/:id_rendicion/auditoria', obtenerAuditoria);

export default router;
