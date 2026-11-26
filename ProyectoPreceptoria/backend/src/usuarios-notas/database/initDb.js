const bcrypt = require('bcryptjs');
const { pool, queryOne, queryAll, run } = require('./db');

/**
 * Inicializa las tablas de Seguridad (RBAC), Auditoría y Validación de Notas
 * en la base de datos única MySQL (clementina), sin crear datos ficticios de alumnos ni materias.
 */
async function initDb() {
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS roles (
      id          INT NOT NULL AUTO_INCREMENT,
      name        VARCHAR(50) NOT NULL,
      description VARCHAR(255) DEFAULT NULL,
      is_active   TINYINT(1) NOT NULL DEFAULT 1,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_roles_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS permissions (
      id          INT NOT NULL AUTO_INCREMENT,
      code        VARCHAR(50) NOT NULL,
      name        VARCHAR(100) NOT NULL,
      description VARCHAR(255) DEFAULT NULL,
      module      VARCHAR(50) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_permissions_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id       INT NOT NULL,
      permission_id INT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      KEY fk_rp_permission (permission_id),
      CONSTRAINT fk_rp_role FOREIGN KEY (role_id)
        REFERENCES roles (id) ON DELETE CASCADE,
      CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id)
        REFERENCES permissions (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS users (
      id            INT NOT NULL AUTO_INCREMENT,
      email         VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name    VARCHAR(100) NOT NULL,
      last_name     VARCHAR(100) NOT NULL,
      role_id       INT NOT NULL,
      id_personal   INT DEFAULT NULL,
      id_alumno     BIGINT DEFAULT NULL,
      is_active     TINYINT(1) NOT NULL DEFAULT 1,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email),
      KEY fk_users_role (role_id),
      KEY fk_users_personal (id_personal),
      KEY fk_users_alumno (id_alumno),
      CONSTRAINT fk_users_role FOREIGN KEY (role_id)
        REFERENCES roles (id),
      CONSTRAINT fk_users_personal FOREIGN KEY (id_personal)
        REFERENCES personal (id_personal) ON DELETE SET NULL,
      CONSTRAINT fk_users_alumno FOREIGN KEY (id_alumno)
        REFERENCES alumnos (id_alumno) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id              BIGINT NOT NULL AUTO_INCREMENT,
      user_id         INT DEFAULT NULL,
      user_email      VARCHAR(255) DEFAULT NULL,
      user_name       VARCHAR(200) DEFAULT NULL,
      action_type     VARCHAR(50) NOT NULL,
      entity          VARCHAR(50) NOT NULL,
      entity_id       VARCHAR(50) DEFAULT NULL,
      previous_values JSON DEFAULT NULL,
      new_values      JSON DEFAULT NULL,
      ip_address      VARCHAR(45) DEFAULT NULL,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY fk_audit_user (user_id),
      KEY idx_audit_created_at (created_at),
      KEY idx_audit_entity (entity, entity_id),
      CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS student_subject_records (
      id                   BIGINT NOT NULL AUTO_INCREMENT,
      student_id           BIGINT NOT NULL,
      id_carrera           INT NOT NULL,
      id_materia           INT NOT NULL,
      academic_year        INT NOT NULL,
      cursada_status       VARCHAR(30) NOT NULL DEFAULT 'EN_CURSO',
      cursada_grade        DECIMAL(4,2) DEFAULT NULL,
      final_exam_grade     DECIMAL(4,2) DEFAULT NULL,
      traffic_light_color  ENUM('GREEN', 'YELLOW', 'ORANGE', 'RED', 'GRAY') NOT NULL DEFAULT 'GRAY',
      traffic_light_label  VARCHAR(100) NOT NULL DEFAULT 'Pendiente de Validación',
      traffic_light_reason TEXT NOT NULL,
      sheet_data           JSON DEFAULT NULL,
      updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_student_subject_year (student_id, id_carrera, id_materia, academic_year),
      KEY fk_ssr_alumno (student_id),
      KEY fk_ssr_carrera_materia (id_carrera, id_materia),
      CONSTRAINT fk_ssr_alumno FOREIGN KEY (student_id)
        REFERENCES alumnos (id_alumno) ON DELETE CASCADE,
      CONSTRAINT fk_ssr_carrera_materia FOREIGN KEY (id_carrera, id_materia)
        REFERENCES carrera_materias (id_carrera, id_materia) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS exam_results (
      id                 BIGINT NOT NULL AUTO_INCREMENT,
      student_subject_id BIGINT NOT NULL,
      evaluation_type    VARCHAR(30) NOT NULL,
      grade              DECIMAL(4,2) DEFAULT NULL,
      is_absent          TINYINT(1) NOT NULL DEFAULT 0,
      exam_date          DATE NOT NULL,
      observations       TEXT DEFAULT NULL,
      registered_by      INT NOT NULL,
      created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY fk_exam_ssr (student_subject_id),
      KEY fk_exam_user (registered_by),
      CONSTRAINT fk_exam_ssr FOREIGN KEY (student_subject_id)
        REFERENCES student_subject_records (id) ON DELETE CASCADE,
      CONSTRAINT fk_exam_user FOREIGN KEY (registered_by)
        REFERENCES users (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS official_sheets (
      id                  BIGINT NOT NULL AUTO_INCREMENT,
      sheet_type          ENUM('MESA_EXAMEN', 'ACTA_VOLANTE') NOT NULL,
      user_id_creador     INT NOT NULL,
      id_carrera          INT NOT NULL,
      id_materia          INT NOT NULL,
      carrera             VARCHAR(100) NOT NULL,
      materia             VARCHAR(100) NOT NULL,
      libro_numero        VARCHAR(20) DEFAULT '',
      folio_numero        VARCHAR(20) DEFAULT '',
      fecha               VARCHAR(20) DEFAULT '',
      docente_titular     VARCHAR(100) DEFAULT '',
      docente_suplente    VARCHAR(100) DEFAULT '',
      primer_vocal        VARCHAR(100) DEFAULT '',
      segundo_vocal       VARCHAR(100) DEFAULT '',
      rows_data           JSON NOT NULL,
      estado              VARCHAR(20) NOT NULL DEFAULT 'Borrador',
      observaciones_admin TEXT DEFAULT NULL,
      created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY fk_sheet_creator (user_id_creador),
      KEY fk_sheet_carrera_materia (id_carrera, id_materia),
      KEY idx_sheet_type (sheet_type),
      KEY idx_sheet_estado (estado),
      CONSTRAINT fk_sheet_creator FOREIGN KEY (user_id_creador)
        REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT fk_sheet_carrera_materia FOREIGN KEY (id_carrera, id_materia)
        REFERENCES carrera_materias (id_carrera, id_materia)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];

  for (const sql of ddlStatements) {
    await pool.query(sql);
  }

  await ensureDefaultRbac();
}

async function ensureDefaultRbac() {
  const rolesData = [
    { name: 'ADMINISTRADOR', description: 'Acceso total y configuración del sistema' },
    { name: 'ADMINISTRATIVO', description: 'Gestión de usuarios, estudiantes y consulta de auditoría' },
    { name: 'DOCENTE', description: 'Carga de notas y consulta de materias a cargo' },
    { name: 'PRECEPTOR', description: 'Visualización y control de actas volantes, mesas de examen y regularidad' },
    { name: 'ALUMNO', description: 'Estudiante institucional - Consulta de notas, cursadas y situación académica' },
    { name: 'CONSULTA', description: 'Solo lectura de registros y estado de notas' }
  ];

  for (const r of rolesData) {
    await run(
      'INSERT INTO roles (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)',
      [r.name, r.description]
    );
  }

  const permissionsData = [
    { code: 'AUTH_LOGIN', name: 'Iniciar Sesión', description: 'Acceso a la plataforma', module: 'AUTH' },
    { code: 'USERS_VIEW', name: 'Ver Usuarios', description: 'Listar y consultar usuarios', module: 'USERS' },
    { code: 'USERS_CREATE', name: 'Crear Usuario', description: 'Alta de nuevos usuarios', module: 'USERS' },
    { code: 'USERS_EDIT', name: 'Editar Usuario', description: 'Modificar datos de usuario', module: 'USERS' },
    { code: 'USERS_DEACTIVATE', name: 'Desactivar Usuario', description: 'Cambiar estado activo/inactivo', module: 'USERS' },
    { code: 'ROLES_VIEW', name: 'Ver Roles', description: 'Consultar roles y permisos', module: 'ROLES' },
    { code: 'ROLES_MANAGE', name: 'Gestionar Permisos', description: 'Asignar permisos a roles', module: 'ROLES' },
    { code: 'AUDIT_VIEW', name: 'Ver Auditoría', description: 'Consultar logs inmutables de auditoría', module: 'AUDIT' },
    { code: 'GRADES_VIEW', name: 'Ver Notas y Semáforo', description: 'Visualizar registros de notas y semáforo', module: 'ACADEMIC' },
    { code: 'GRADES_RECALCULATE', name: 'Recalcular Semáforo', description: 'Disparar recálculo de semáforo', module: 'ACADEMIC' },
    { code: 'EXAMS_CREATE', name: 'Cargar Examen', description: 'Registrar notas de parciales y finales', module: 'ACADEMIC' },
    { code: 'EXAMS_EDIT', name: 'Editar Examen', description: 'Modificar calificaciones de examen', module: 'ACADEMIC' }
  ];

  for (const p of permissionsData) {
    await run(
      'INSERT INTO permissions (code, name, description, module) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [p.code, p.name, p.description, p.module]
    );
  }

  const roles = await queryAll('SELECT id, name FROM roles');
  const perms = await queryAll('SELECT id, code FROM permissions');
  const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

  const existingPermsCount = await queryOne('SELECT COUNT(*) as total FROM role_permissions');
  if (!existingPermsCount || existingPermsCount.total === 0) {
    for (const p of perms) {
      await run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleMap.ADMINISTRADOR, p.id]);
      if (['USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DEACTIVATE', 'ROLES_VIEW', 'AUDIT_VIEW', 'GRADES_VIEW', 'EXAMS_CREATE', 'EXAMS_EDIT'].includes(p.code)) {
        await run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleMap.ADMINISTRATIVO, p.id]);
      }
      if (['GRADES_VIEW', 'EXAMS_CREATE', 'EXAMS_EDIT', 'GRADES_RECALCULATE'].includes(p.code)) {
        await run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleMap.DOCENTE, p.id]);
      }
      if (['GRADES_VIEW', 'USERS_VIEW', 'GRADES_RECALCULATE', 'AUDIT_VIEW'].includes(p.code)) {
        await run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleMap.PRECEPTOR, p.id]);
      }
      if (['GRADES_VIEW'].includes(p.code)) {
        await run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleMap.ALUMNO, p.id]);
        await run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleMap.CONSULTA, p.id]);
      }
    }
  } else {
    // Asegurar que PRECEPTOR siempre tenga permisos de validación de notas y consulta de auditoría
    for (const p of perms) {
      if (['GRADES_RECALCULATE', 'AUDIT_VIEW'].includes(p.code) && roleMap.PRECEPTOR) {
        await run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleMap.PRECEPTOR, p.id]);
      }
    }
  }

  const existingUsers = await queryOne('SELECT COUNT(*) as total FROM users');
  if (!existingUsers || existingUsers.total === 0) {
    const firstAlumno = await queryOne('SELECT id_alumno, primer_nombre, primer_apellido FROM alumnos ORDER BY id_alumno ASC LIMIT 1');
    const salt = bcrypt.genSaltSync(10);
    const defaultUsers = [
      { email: 'admin@institucion.edu', pass: 'Admin123!', first: 'Super', last: 'Administrador', role: 'ADMINISTRADOR', idAlumno: null },
      { email: 'secretaria@institucion.edu', pass: 'Admin123!', first: 'Mariana', last: 'López (Secretaría)', role: 'ADMINISTRATIVO', idAlumno: null },
      { email: 'docente.perez@institucion.edu', pass: 'Docente123!', first: 'Carlos', last: 'Pérez (Docente)', role: 'DOCENTE', idAlumno: null },
      { email: 'preceptor@institucion.edu', pass: 'Preceptor123!', first: 'Martín', last: 'Giménez (Preceptor)', role: 'PRECEPTOR', idAlumno: null },
      {
        email: 'alumno@institucion.edu',
        pass: 'Alumno123!',
        first: firstAlumno ? firstAlumno.primer_nombre : 'Estudiante',
        last: firstAlumno ? `${firstAlumno.primer_apellido} (Estudiante)` : 'Institucional',
        role: 'ALUMNO',
        idAlumno: firstAlumno ? firstAlumno.id_alumno : null
      },
      { email: 'consulta@institucion.edu', pass: 'Consulta123!', first: 'Ana', last: 'García (Auditor)', role: 'CONSULTA', idAlumno: null }
    ];

    for (const u of defaultUsers) {
      await run(
        'INSERT IGNORE INTO users (email, password_hash, first_name, last_name, role_id, id_alumno, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [u.email, bcrypt.hashSync(u.pass, salt), u.first, u.last, roleMap[u.role], u.idAlumno]
      );
    }
  }
}

module.exports = { initDb };
