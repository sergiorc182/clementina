import * as alumnoModel from '../models/alumnoModel.js';

/**
 * CAPA CONTROLADOR (CONTROLLER)
 * Maneja las solicitudes HTTP, procesa los datos de entrada (params, query, body),
 * invoca a los métodos del modelo y devuelve respuestas JSON normalizadas.
 */

// CRUD: Obtener todos los alumnos
export const obtenerTodos = async (req, res) => {
  try {
    const alumnos = await alumnoModel.getAll();
    res.status(200).json({ success: true, total: alumnos.length, data: alumnos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener alumnos', error: error.message });
  }
};

// 1. RUTA GET POR PARÁMETRO (req.params)
// Ejemplo: GET /api/alumnos/1
export const obtenerPorParametro = async (req, res) => {
  try {
    const { id } = req.params; // Extraído desde la URL como parámetro de ruta
    const alumno = await alumnoModel.getById(id);

    if (!alumno) {
      return res.status(404).json({
        success: false,
        message: `Alumno con ID ${id} no encontrado en base de datos clementina`,
        metodo: 'GET por Parámetro (req.params)'
      });
    }

    res.status(200).json({
      success: true,
      metodo: 'GET por Parámetro (req.params)',
      parametroRecibido: { id },
      data: alumno
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en búsqueda por parámetro', error: error.message });
  }
};

// 2. RUTA GET POR QUERY STRING (req.query)
// Ejemplo: GET /api/alumnos/busqueda/query?carrera=Sistemas
export const obtenerPorQuery = async (req, res) => {
  try {
    const { carrera } = req.query; // Extraído desde el query string de la URL
    
    if (carrera === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar el parámetro query ?carrera=nombre'
      });
    }

    const alumnos = await alumnoModel.getByCarrera(carrera);
    res.status(200).json({
      success: true,
      metodo: 'GET por Query (req.query)',
      queryRecibido: { carrera },
      totalResultados: alumnos.length,
      data: alumnos
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en búsqueda por query', error: error.message });
  }
};

// 3. RUTA GET POR BODY (req.body)
// Ejemplo: GET /api/alumnos/busqueda/body con payload JSON: { "carrera": "Sistemas" }
export const obtenerPorBody = async (req, res) => {
  try {
    const { carrera } = req.body; // Extraído desde el cuerpo de la petición (JSON)

    if (!carrera) {
      return res.status(400).json({
        success: false,
        message: 'Debe enviar un JSON en el body con la propiedad { "carrera": "nombre" }'
      });
    }

    const alumnos = await alumnoModel.getByCarrera(carrera);
    res.status(200).json({
      success: true,
      metodo: 'GET por Body (req.body)',
      bodyRecibido: req.body,
      totalResultados: alumnos.length,
      data: alumnos
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en búsqueda por body', error: error.message });
  }
};

// Obtener catálogo de carreras de clementina
export const obtenerCarreras = async (req, res) => {
  try {
    const carreras = await alumnoModel.getCarreras();
    res.status(200).json({ success: true, data: carreras });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener carreras', error: error.message });
  }
};

// CRUD: Crear alumno
export const crear = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      email,
      carrera,
      numero_documento,
      id_tipo_documento,
      legajo,
      crear_usuario,
      password_inicial
    } = req.body;

    if (!nombre || !apellido || !email || !carrera) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: nombre, apellido, email y carrera'
      });
    }

    const nuevoAlumno = await alumnoModel.create({
      nombre,
      apellido,
      email,
      carrera,
      numero_documento,
      id_tipo_documento,
      legajo,
      crear_usuario,
      password_inicial
    });

    res.status(201).json({
      success: true,
      message: 'Alumno registrado y matriculado correctamente',
      data: nuevoAlumno,
      usuario_creado: nuevoAlumno?.usuario_creado || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear alumno', error: error.message });
  }
};

// CRUD: Actualizar alumno
export const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, carrera, numero_documento } = req.body;

    if (!nombre || !apellido || !email || !carrera) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: nombre, apellido, email y carrera'
      });
    }

    const actualizado = await alumnoModel.update(id, {
      nombre,
      apellido,
      email,
      carrera,
      numero_documento
    });

    if (!actualizado) {
      return res.status(404).json({
        success: false,
        message: `Alumno con ID ${id} no encontrado en base de datos clementina`
      });
    }

    res.status(200).json({ success: true, message: 'Alumno actualizado con éxito en clementina' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar alumno', error: error.message });
  }
};

// CRUD: Eliminar alumno
export const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await alumnoModel.remove(id);

    if (!eliminado) {
      return res.status(404).json({
        success: false,
        message: `Alumno con ID ${id} no encontrado en base de datos clementina`
      });
    }

    res.status(200).json({ success: true, message: `Alumno #${id} eliminado correctamente de clementina` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar alumno', error: error.message });
  }
};
