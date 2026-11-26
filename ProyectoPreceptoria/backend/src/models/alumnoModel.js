import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

/**
 * CAPA MODELO (MODEL) - Base de datos 'clementina'
 * Adaptado a la estructura de 'esquema_normalizado (2).sql'
 * Maneja las consultas SQL sobre las tablas 'alumnos', 'matriculacion' y 'carreras'.
 */

// Consulta base que une alumnos con su matriculación y carrera
const BASE_SELECT = `
  SELECT 
    a.id_alumno,
    a.id_alumno AS id,
    a.id_tipo_documento,
    a.numero_documento,
    a.legajo,
    a.primer_apellido,
    a.otros_apellidos,
    a.primer_nombre,
    a.otros_nombres,
    CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), '')) AS apellido,
    CONCAT(a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), '')) AS nombre,
    a.email,
    c.id_carrera,
    COALESCE(c.nombre_carrera, 'Sin Carrera Asignada') AS carrera,
    c.nombre_carrera_corto
  FROM alumnos a
  LEFT JOIN matriculacion m ON a.id_alumno = m.id_alumno
  LEFT JOIN carreras c ON m.id_carrera = c.id_carrera
`;

// Obtener todos los alumnos
export const getAll = async () => {
  const [rows] = await pool.query(`${BASE_SELECT} ORDER BY a.id_alumno DESC`);
  return rows;
};

// Obtener un alumno por su ID (usado en GET por parámetro)
export const getById = async (id) => {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE a.id_alumno = ?`, [id]);
  return rows[0] || null;
};

// Buscar alumnos por nombre o sigla de carrera (usado en GET por query y GET por body)
export const getByCarrera = async (carrera) => {
  const [rows] = await pool.query(
    `SELECT 
      a.id_alumno,
      a.id_alumno AS id,
      a.id_tipo_documento,
      a.numero_documento,
      a.legajo,
      a.primer_apellido,
      a.primer_nombre,
      CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), '')) AS apellido,
      CONCAT(a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), '')) AS nombre,
      a.email,
      c.id_carrera,
      c.nombre_carrera AS carrera,
      c.nombre_carrera_corto
    FROM alumnos a
    JOIN matriculacion m ON a.id_alumno = m.id_alumno
    JOIN carreras c ON m.id_carrera = c.id_carrera
    WHERE c.nombre_carrera LIKE ? OR c.nombre_carrera_corto LIKE ?
    ORDER BY a.id_alumno DESC`,
    [`%${carrera}%`, `%${carrera}%`]
  );
  return rows;
};

// Crear un nuevo alumno, matricularlo en la carrera y opcionalmente crear su usuario ALUMNO
export const create = async ({
  nombre,
  apellido,
  email,
  carrera,
  numero_documento,
  id_tipo_documento = 'DNI',
  legajo,
  crear_usuario = true,
  password_inicial = null
}) => {
  // 1. Resolver id_carrera
  let resolvedIdCarrera = 1;
  if (carrera) {
    const [carreraRows] = await pool.query(
      'SELECT id_carrera FROM carreras WHERE id_carrera = ? OR nombre_carrera = ? OR nombre_carrera LIKE ? OR nombre_carrera_corto = ? LIMIT 1',
      [carrera, carrera, `%${carrera}%`, carrera]
    );
    if (carreraRows.length > 0) {
      resolvedIdCarrera = carreraRows[0].id_carrera;
    }
  }

  // 2. Número de documento y legajo acordes a esquema_normalizado
  const docNum = numero_documento ? Number(numero_documento) : Math.floor(10000000 + Math.random() * 89999999);
  const leg = legajo || `LEG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  // 3. Insertar en tabla 'alumnos' de clementina
  const [resultAlumno] = await pool.query(
    `INSERT INTO alumnos 
      (id_tipo_documento, numero_documento, legajo, primer_apellido, primer_nombre, email, id_pais_nacimiento, alta_registro) 
     VALUES (?, ?, ?, ?, ?, ?, 'AR', NOW())`,
    [id_tipo_documento, docNum, leg, apellido, nombre, email]
  );
  const newId = resultAlumno.insertId;

  // 4. Insertar en tabla 'matriculacion' para asociar el alumno a la carrera (Turno Vespertino, Sede Central)
  await pool.query(
    `INSERT INTO matriculacion 
      (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta) 
     VALUES (?, ?, ?, 3, 1, NOW())`,
    [newId, resolvedIdCarrera, new Date().getFullYear()]
  );

  // 5. Crear automáticamente la cuenta de acceso al portal (rol ALUMNO) vinculada por id_alumno
  let usuarioCreado = null;
  if (crear_usuario !== false) {
    try {
      const cleanEmail = String(email || '').trim().toLowerCase();
      const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
      if (existingUsers.length > 0) {
        usuarioCreado = {
          creado: false,
          email: cleanEmail,
          motivo: 'Ya existía un usuario registrado con ese correo electrónico.'
        };
      } else {
        const [rolesRows] = await pool.query("SELECT id FROM roles WHERE name = 'ALUMNO' LIMIT 1");
        if (rolesRows.length > 0) {
          const roleIdAlumno = rolesRows[0].id;
          const plainPassword =
            password_inicial && String(password_inicial).trim().length >= 6
              ? String(password_inicial).trim()
              : String(docNum);
          const passwordHash = bcrypt.hashSync(plainPassword, bcrypt.genSaltSync(10));

          await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role_id, id_alumno, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [cleanEmail, passwordHash, String(nombre).trim(), String(apellido).trim(), roleIdAlumno, newId]
          );

          usuarioCreado = {
            creado: true,
            email: cleanEmail,
            password_inicial: plainPassword
          };
        }
      }
    } catch (userErr) {
      usuarioCreado = {
        creado: false,
        motivo: `No se pudo crear el usuario automáticamente: ${userErr.message}`
      };
    }
  }

  const alumnoCreado = await getById(newId);
  if (alumnoCreado && usuarioCreado) {
    alumnoCreado.usuario_creado = usuarioCreado;
  }
  return alumnoCreado;
};

// Actualizar un alumno existente
export const update = async (id, {
  nombre,
  apellido,
  email,
  carrera,
  numero_documento
}) => {
  // 1. Actualizar tabla alumnos
  const [result] = await pool.query(
    `UPDATE alumnos 
     SET primer_nombre = ?, primer_apellido = ?, email = ?, 
         numero_documento = COALESCE(?, numero_documento),
         fecha_ultima_actualizacion = NOW()
     WHERE id_alumno = ?`,
    [nombre, apellido, email, numero_documento || null, id]
  );

  if (result.affectedRows === 0) return false;

  // 2. Si se especificó carrera, actualizar la matrícula
  if (carrera) {
    const [carreraRows] = await pool.query(
      'SELECT id_carrera FROM carreras WHERE id_carrera = ? OR nombre_carrera = ? OR nombre_carrera LIKE ? OR nombre_carrera_corto = ? LIMIT 1',
      [carrera, carrera, `%${carrera}%`, carrera]
    );
    if (carreraRows.length > 0) {
      const idCarrera = carreraRows[0].id_carrera;
      const [matRows] = await pool.query('SELECT * FROM matriculacion WHERE id_alumno = ?', [id]);
      if (matRows.length > 0) {
        await pool.query(
          'UPDATE matriculacion SET id_carrera = ?, fecha_mod = NOW() WHERE id_alumno = ?',
          [idCarrera, id]
        );
      } else {
        await pool.query(
          'INSERT INTO matriculacion (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta) VALUES (?, ?, ?, 3, 1, NOW())',
          [id, idCarrera, new Date().getFullYear()]
        );
      }
    }
  }

  // 3. Sincronizar datos básicos del usuario vinculado (si existe)
  try {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const [emailConflict] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND (id_alumno IS NULL OR id_alumno != ?) LIMIT 1',
      [cleanEmail, id]
    );
    if (emailConflict.length === 0) {
      await pool.query(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = NOW() WHERE id_alumno = ?',
        [String(nombre).trim(), String(apellido).trim(), cleanEmail, id]
      );
    } else {
      await pool.query(
        'UPDATE users SET first_name = ?, last_name = ?, updated_at = NOW() WHERE id_alumno = ?',
        [String(nombre).trim(), String(apellido).trim(), id]
      );
    }
  } catch (_) {}

  return true;
};

// Eliminar un alumno
export const remove = async (id) => {
  // Limpiar o desvincular cuenta de usuario asociada si existe
  try {
    await pool.query('DELETE FROM users WHERE id_alumno = ?', [id]);
  } catch (_) {
    try {
      await pool.query('UPDATE users SET id_alumno = NULL, is_active = 0 WHERE id_alumno = ?', [id]);
    } catch (_) {}
  }

  // Eliminar referencias previas de FK
  await pool.query('DELETE FROM matriculacion WHERE id_alumno = ?', [id]);
  await pool.query('DELETE FROM domicilios_alumno WHERE id_alumno = ?', [id]);
  const [result] = await pool.query('DELETE FROM alumnos WHERE id_alumno = ?', [id]);
  return result.affectedRows > 0;
};

// Obtener catálogo de carreras registradas en clementina
export const getCarreras = async () => {
  const [rows] = await pool.query(
    'SELECT id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto, titulo FROM carreras ORDER BY id_carrera'
  );
  return rows;
};
