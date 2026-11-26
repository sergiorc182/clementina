const { pool } = require('../config/db');

class AlumnoModel {
  /**
   * Busca alumnos por DNI o Apellido/Nombre.
   * @param {string} termino - Criterio de búsqueda.
   * @returns {Promise<Array>} Lista de alumnos coincidentes.
   */
  static async buscar(termino = '') {
    const queryTerm = `%${termino.trim()}%`;
    const sql = `
      SELECT 
        a.id_alumno,
        a.id_tipo_documento,
        a.numero_documento,
        a.primer_apellido,
        a.otros_apellidos,
        a.primer_nombre,
        a.otros_nombres,
        CONCAT(a.primer_apellido, ' ', COALESCE(a.otros_apellidos, ''), ', ', a.primer_nombre, ' ', COALESCE(a.otros_nombres, '')) AS nombre_completo,
        a.email,
        a.fecha_nacimiento,
        a.sexo
      FROM alumnos a
      WHERE 
        CAST(a.numero_documento AS CHAR) LIKE ?
        OR a.primer_apellido LIKE ?
        OR a.primer_nombre LIKE ?
      ORDER BY a.primer_apellido ASC, a.primer_nombre ASC
      LIMIT 20
    `;
    const [rows] = await pool.query(sql, [queryTerm, queryTerm, queryTerm]);
    return rows;
  }

  /**
   * Obtiene un alumno por su ID.
   * @param {number|string} idAlumno
   * @returns {Promise<Object|null>}
   */
  static async obtenerPorId(idAlumno) {
    const sql = `
      SELECT 
        a.id_alumno,
        a.id_tipo_documento,
        a.numero_documento,
        a.primer_apellido,
        a.otros_apellidos,
        a.primer_nombre,
        a.otros_nombres,
        CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), ''), ', ', a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), '')) AS nombre_completo,
        a.email,
        a.fecha_nacimiento,
        a.sexo,
        d.calle,
        d.numero AS numero_calle,
        d.piso,
        d.depto,
        d.telefono_principal,
        d.telefono_alternativo,
        loc.nombre AS localidad,
        prov.nombre AS provincia
      FROM alumnos a
      LEFT JOIN domicilios_alumno d ON a.id_alumno = d.id_alumno
      LEFT JOIN localidades loc ON d.id_localidad = loc.id_localidad
      LEFT JOIN provincias prov ON loc.id_provincia = prov.id_provincia
      WHERE a.id_alumno = ?
    `;
    const [rows] = await pool.query(sql, [idAlumno]);
    return rows[0] || null;
  }

  /**
   * Obtiene las carreras en las que está matriculado un alumno.
   * @param {number|string} idAlumno
   * @returns {Promise<Array>}
   */
  static async obtenerCarrerasMatriculadas(idAlumno) {
    const sql = `
      SELECT 
        m.id_alumno,
        m.id_carrera,
        m.anio_inscripcion,
        m.id_turno,
        t.turno,
        m.id_sede,
        s.nombre_sede,
        m.tomo_matriz,
        m.folio_matriz,
        c.nombre_carrera,
        c.nombre_carrera_corto,
        c.nro_resolucion,
        c.titulo
      FROM matriculacion m
      INNER JOIN carreras c ON m.id_carrera = c.id_carrera
      LEFT JOIN turnos t ON m.id_turno = t.id_turno
      LEFT JOIN sedes s ON m.id_sede = s.id_sede
      WHERE m.id_alumno = ?
      ORDER BY m.anio_inscripcion DESC
    `;
    const [rows] = await pool.query(sql, [idAlumno]);
    return rows;
  }
}

module.exports = AlumnoModel;
