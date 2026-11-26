import { Router } from 'express';
import {
  obtenerTodos,
  obtenerPorParametro,
  obtenerPorQuery,
  obtenerPorBody,
  obtenerCarreras,
  crear,
  actualizar,
  eliminar
} from '../controllers/alumnoController.js';

const router = Router();

/**
 * RUTAS DE ALUMNOS Y CARRERAS (Base de datos 'clementina' - MVC)
 */

// Catálogo de carreras existentes en clementina
router.get('/catalogo/carreras', obtenerCarreras);

// 1. GET por Query: /api/alumnos/busqueda/query?carrera=...
router.get('/busqueda/query', obtenerPorQuery);

// 2. GET por Body: /api/alumnos/busqueda/body
router.get('/busqueda/body', obtenerPorBody);

// 3. GET por Parámetro: /api/alumnos/:id
router.get('/:id', obtenerPorParametro);

// CRUD básico
router.get('/', obtenerTodos);
router.post('/', crear);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

export default router;
