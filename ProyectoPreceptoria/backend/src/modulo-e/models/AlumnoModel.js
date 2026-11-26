const { query } = require('../config/db');

class AlumnoModel {
  /**
   * Obtiene un alumno por su ID con todos sus datos filiatorios y domicilio
   * @param {number} idAlumno
   */
  static async findById(idAlumno) {
    const sql = `
      SELECT 
        a.id_alumno,
        a.id_tipo_documento,
        td.descripcion AS tipo_documento,
        a.numero_documento,
        a.legajo,
        a.primer_apellido,
        a.otros_apellidos,
        a.primer_nombre,
        a.otros_nombres,
        CONCAT(a.primer_apellido, ' ', COALESCE(a.otros_apellidos, '')) AS apellidos,
        CONCAT(a.primer_nombre, ' ', COALESCE(a.otros_nombres, '')) AS nombres,
        CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), ''), ', ', a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), '')) AS apellido_nombres,
        a.email,
        a.email AS mail,
        m.id_carrera,
        c.nombre_carrera AS carrera,
        c.nro_resolucion AS resolucion,
        COALESCE(m.anio_inscripcion, YEAR(CURDATE())) AS anio_lectivo,
        DATE_FORMAT(a.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
        TIMESTAMPDIFF(YEAR, a.fecha_nacimiento, CURDATE()) AS edad,
        a.sexo,
        a.estado_civil,
        a.cantidad_hijos,
        a.cantidad_hijos AS hijos,
        p.nacionalidad,
        loc.nombre AS ciudad_nacimiento,
        prov.nombre AS provincia_nacimiento,
        d.calle,
        d.calle AS domicilio,
        d.numero,
        d.piso,
        d.depto,
        d.telefono_principal AS celular,
        d.telefono_alternativo,
        d_loc.nombre AS localidad_barrio,
        part.nombre AS partido,
        cp.codigo_postal
      FROM alumnos a
      LEFT JOIN matriculacion m ON a.id_alumno = m.id_alumno
      LEFT JOIN carreras c ON m.id_carrera = c.id_carrera
      LEFT JOIN tipos_documento td ON a.id_tipo_documento = td.id_tipo_documento
      LEFT JOIN paises p ON a.id_pais_nacimiento = p.id_pais
      LEFT JOIN localidades loc ON a.id_localidad_nacimiento = loc.id_localidad
      LEFT JOIN provincias prov ON loc.id_provincia = prov.id_provincia
      LEFT JOIN domicilios_alumno d ON a.id_alumno = d.id_alumno
      LEFT JOIN localidades d_loc ON d.id_localidad = d_loc.id_localidad
      LEFT JOIN partidos part ON d_loc.id_partido = part.id_partido
      LEFT JOIN codigos_postales cp ON d.id_codigo_postal = cp.id_codigo_postal
      WHERE a.id_alumno = ?
    `;
    const rows = await query(sql, [idAlumno]);
    if (!rows[0]) return null;

    const alumno = rows[0];
    // Cargar notas previas desde historial_academico
    try {
      const histRows = await query(
        `SELECT id_materia, nota, DATE_FORMAT(fecha_aprobacion, '%d/%m/%Y') AS fecha, anio_regular AS cursada
         FROM historial_academico
         WHERE id_alumno = ? AND (validado_examen = 'T' OR nota >= 4)`,
        [idAlumno]
      );
      const notasMap = {};
      const numLetras = { 4: 'Cuatro', 5: 'Cinco', 6: 'Seis', 7: 'Siete', 8: 'Ocho', 9: 'Nueve', 10: 'Diez' };
      histRows.forEach((h) => {
        notasMap[h.id_materia] = {
          nota_num: String(h.nota || ''),
          nota_letra: numLetras[Number(h.nota)] || String(h.nota || ''),
          fecha: h.fecha || '',
          cursada: String(h.cursada || '')
        };
      });
      alumno.notas_previas = notasMap;
    } catch (_) {
      alumno.notas_previas = {};
    }

    return alumno;
  }

  /**
   * Obtiene todos los alumnos con datos clave para búsqueda
   */
  static async findAll() {
    const sql = `
      SELECT 
        a.id_alumno,
        a.id_tipo_documento,
        a.numero_documento,
        a.legajo,
        a.primer_apellido,
        a.otros_apellidos,
        a.primer_nombre,
        a.otros_nombres,
        CONCAT(a.primer_apellido, ' ', COALESCE(a.otros_apellidos, '')) AS apellidos,
        CONCAT(a.primer_nombre, ' ', COALESCE(a.otros_nombres, '')) AS nombres,
        CONCAT(a.primer_apellido, ', ', a.primer_nombre) AS apellido_nombres,
        a.email,
        a.email AS mail,
        m.id_carrera,
        COALESCE(c.nombre_carrera, 'Sin Carrera Asignada') AS carrera,
        c.nro_resolucion AS resolucion,
        DATE_FORMAT(a.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
        TIMESTAMPDIFF(YEAR, a.fecha_nacimiento, CURDATE()) AS edad,
        a.sexo,
        a.estado_civil,
        a.cantidad_hijos,
        a.cantidad_hijos AS hijos,
        p.nacionalidad,
        loc.nombre AS ciudad_nacimiento,
        prov.nombre AS provincia_nacimiento,
        d.calle,
        d.calle AS domicilio,
        d.numero,
        d.piso,
        d.depto,
        d.telefono_principal AS celular,
        d_loc.nombre AS localidad_barrio,
        part.nombre AS partido,
        cp.codigo_postal
      FROM alumnos a
      LEFT JOIN matriculacion m ON a.id_alumno = m.id_alumno
      LEFT JOIN carreras c ON m.id_carrera = c.id_carrera
      LEFT JOIN paises p ON a.id_pais_nacimiento = p.id_pais
      LEFT JOIN localidades loc ON a.id_localidad_nacimiento = loc.id_localidad
      LEFT JOIN provincias prov ON loc.id_provincia = prov.id_provincia
      LEFT JOIN domicilios_alumno d ON a.id_alumno = d.id_alumno
      LEFT JOIN localidades d_loc ON d.id_localidad = d_loc.id_localidad
      LEFT JOIN partidos part ON d_loc.id_partido = part.id_partido
      LEFT JOIN codigos_postales cp ON d.id_codigo_postal = cp.id_codigo_postal
      ORDER BY a.primer_apellido, a.primer_nombre
      LIMIT 100
    `;
    return await query(sql);
  }

  /**
   * Obtiene el domicilio registrado de un alumno
   * @param {number} idAlumno
   */
  static async getDomicilio(idAlumno) {
    const sql = `
      SELECT 
        d.id_domicilio,
        d.calle,
        d.numero,
        d.piso,
        d.depto,
        d.telefono_principal,
        d.telefono_alternativo,
        l.nombre AS localidad,
        part.nombre AS partido,
        p.nombre AS provincia,
        cp.codigo_postal
      FROM domicilios_alumno d
      LEFT JOIN localidades l ON d.id_localidad = l.id_localidad
      LEFT JOIN partidos part ON l.id_partido = part.id_partido
      LEFT JOIN codigos_postales cp ON d.id_codigo_postal = cp.id_codigo_postal
      LEFT JOIN provincias p ON l.id_provincia = p.id_provincia
      WHERE d.id_alumno = ?
      LIMIT 1
    `;
    const rows = await query(sql, [idAlumno]);
    return rows[0] || null;
  }
}

module.exports = AlumnoModel;
