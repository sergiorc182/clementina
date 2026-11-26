const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { queryOne, queryAll, run } = require('../database/db');
const { logAction } = require('./auditService');

const USER_SELECT = `
  SELECT u.*, r.name as role_name,
         a.primer_apellido as alumno_apellido,
         a.primer_nombre as alumno_nombre,
         a.legajo as alumno_legajo
  FROM users u
  JOIN roles r ON u.role_id = r.id
  LEFT JOIN alumnos a ON u.id_alumno = a.id_alumno
`;

function invalidCredentials() {
  const err = new Error('Credenciales inválidas.');
  err.statusCode = 401;
  return err;
}

function noPasswordConfigured() {
  const err = new Error('La cuenta no tiene una contraseña configurada. Contacte a la administración.');
  err.statusCode = 403;
  return err;
}

function inactiveUser() {
  const err = new Error('Este usuario se encuentra desactivado. Contacte a la administración.');
  err.statusCode = 403;
  return err;
}

function missingRole(roleName) {
  const err = new Error(`No existe el rol ${roleName} configurado en el sistema.`);
  err.statusCode = 500;
  return err;
}

function joinName(parts) {
  return parts.filter(Boolean).join(' ').trim();
}

function passwordMatches(password, hash) {
  if (!hash) return false;
  try {
    return bcrypt.compareSync(String(password), hash);
  } catch (_) {
    return false;
  }
}

class AuthService {
  /**
   * Obtiene la lista de códigos de permisos asignados al rol de un usuario.
   * @param {number} roleId
   * @returns {Promise<string[]>}
   */
  static async getPermissionsByRoleId(roleId) {
    const rows = await queryAll(`
      SELECT p.code
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `, [roleId]);
    return rows.map(r => r.code);
  }

  static async findPortalUserByEmail(email) {
    return queryOne(`${USER_SELECT} WHERE LOWER(u.email) = ? LIMIT 1`, [String(email).toLowerCase()]);
  }

  static async findPortalUserById(id) {
    return queryOne(`${USER_SELECT} WHERE u.id = ? LIMIT 1`, [id]);
  }

  static async findPortalUserByAlumno(idAlumno) {
    return queryOne(`${USER_SELECT} WHERE u.id_alumno = ? LIMIT 1`, [idAlumno]);
  }

  static async findPortalUserByPersonal(idPersonal) {
    return queryOne(`${USER_SELECT} WHERE u.id_personal = ? LIMIT 1`, [idPersonal]);
  }

  static async findRoleByName(name) {
    return queryOne('SELECT id, name FROM roles WHERE name = ? LIMIT 1', [name]);
  }

  static async findAlumnoById(idAlumno) {
    return queryOne(`
      SELECT id_alumno, numero_documento, legajo, primer_apellido, otros_apellidos,
             primer_nombre, otros_nombres, email, password_hash
      FROM alumnos
      WHERE id_alumno = ?
      LIMIT 1
    `, [idAlumno]);
  }

  static async findPersonalById(idPersonal) {
    return queryOne(`
      SELECT id_personal, apellidos, nombres, usuario_sistema, password_hash, id_tipo_personal
      FROM personal
      WHERE id_personal = ?
      LIMIT 1
    `, [idPersonal]);
  }

  static async findAlumnoByIdentifier(identifier) {
    const clean = String(identifier).toLowerCase();
    const numeric = String(identifier).replace(/[.\s-]/g, '');
    const conditions = ['LOWER(email) = ?', 'LOWER(legajo) = ?'];
    const params = [clean, clean];

    if (/^\d+$/.test(numeric)) {
      conditions.push('numero_documento = ?', "REPLACE(REPLACE(legajo, '.', ''), '-', '') = ?");
      params.push(numeric, numeric);
    }

    return queryOne(`
      SELECT id_alumno, numero_documento, legajo, primer_apellido, otros_apellidos,
             primer_nombre, otros_nombres, email, password_hash
      FROM alumnos
      WHERE ${conditions.join(' OR ')}
      LIMIT 1
    `, params);
  }

  static async findPersonalByIdentifier(identifier) {
    return queryOne(`
      SELECT id_personal, apellidos, nombres, usuario_sistema, password_hash, id_tipo_personal
      FROM personal
      WHERE LOWER(usuario_sistema) = ?
      LIMIT 1
    `, [String(identifier).toLowerCase()]);
  }

  static async ensurePortalUserFromAlumno(alumno) {
    const linked = await this.findPortalUserByAlumno(alumno.id_alumno);
    if (linked) {
      if (linked.password_hash !== alumno.password_hash) {
        await run('UPDATE users SET password_hash = ? WHERE id = ?', [alumno.password_hash, linked.id]);
        return this.findPortalUserById(linked.id);
      }
      return linked;
    }

    const role = await this.findRoleByName('ALUMNO');
    if (!role) throw missingRole('ALUMNO');

    let email = String(alumno.email || '').trim().toLowerCase();
    if (!email) email = `alumno-${alumno.id_alumno}@institucion.local`;
    const emailOwner = await queryOne('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
    if (emailOwner) email = `alumno-${alumno.id_alumno}-${email}`;

    const firstName = joinName([alumno.primer_nombre, alumno.otros_nombres]).slice(0, 100) || 'Estudiante';
    const lastName = joinName([alumno.primer_apellido, alumno.otros_apellidos]).slice(0, 100) || 'Institucional';

    const result = await run(`
      INSERT INTO users (email, password_hash, first_name, last_name, role_id, id_alumno, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [email, alumno.password_hash, firstName, lastName, role.id, alumno.id_alumno]);

    return this.findPortalUserById(result.lastInsertRowid);
  }

  static async ensurePortalUserFromPersonal(personal) {
    const linked = await this.findPortalUserByPersonal(personal.id_personal);
    if (linked) {
      if (linked.password_hash !== personal.password_hash) {
        await run('UPDATE users SET password_hash = ? WHERE id = ?', [personal.password_hash, linked.id]);
        return this.findPortalUserById(linked.id);
      }
      return linked;
    }

    const roleName = personal.id_tipo_personal === 'A'
      ? 'PRECEPTOR'
      : personal.id_tipo_personal === 'D'
        ? 'DOCENTE'
        : 'ADMINISTRATIVO';
    const role = await this.findRoleByName(roleName);
    if (!role) throw missingRole(roleName);

    const email = `personal-${personal.id_personal}@institucion.local`;
    const firstName = String(personal.nombres || '').trim().slice(0, 100) || 'Usuario';
    const lastName = String(personal.apellidos || '').trim().slice(0, 100) || 'Institucional';

    const result = await run(`
      INSERT INTO users (email, password_hash, first_name, last_name, role_id, id_personal, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [email, personal.password_hash, firstName, lastName, role.id, personal.id_personal]);

    return this.findPortalUserById(result.lastInsertRowid);
  }

  static async buildLoginResult(user, ipAddress, actionType = 'AUTH_LOGIN') {
    if (!user || !user.is_active) throw inactiveUser();

    const permissions = await this.getPermissionsByRoleId(user.role_id);

    const tokenPayload = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role_name,
      roleId: user.role_id,
      idAlumno: user.id_alumno || null,
      alumnoApellido: user.alumno_apellido || null,
      alumnoLegajo: user.alumno_legajo || null,
      permissions
    };

    const token = jwt.sign(tokenPayload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
    });

    await logAction({
      userId: user.id,
      userEmail: user.email,
      userName: `${user.first_name} ${user.last_name}`,
      actionType,
      entity: 'auth',
      entityId: String(user.id),
      previousValues: null,
      newValues: { message: 'Inicio de sesión exitoso', role: user.role_name },
      ipAddress
    });

    return {
      token,
      user: tokenPayload
    };
  }

  /**
   * Inicia sesión con DNI, legajo, email o usuario institucional y genera el token compartido.
   */
  static async login(identifier, password, ipAddress = '127.0.0.1') {
    const rawIdentifier = String(identifier ?? '').trim();
    if (!rawIdentifier || !password) {
      const err = new Error('Identificador y contraseña son obligatorios.');
      err.statusCode = 400;
      throw err;
    }

    const portalUser = await this.findPortalUserByEmail(rawIdentifier.toLowerCase());
    if (portalUser) {
      if (!portalUser.is_active) throw inactiveUser();
      if (passwordMatches(password, portalUser.password_hash)) {
        return this.buildLoginResult(portalUser, ipAddress);
      }
    }

    const alumno = await this.findAlumnoByIdentifier(rawIdentifier);
    if (alumno) {
      if (!alumno.password_hash) throw noPasswordConfigured();
      if (!passwordMatches(password, alumno.password_hash)) throw invalidCredentials();
      const linkedUser = await this.ensurePortalUserFromAlumno(alumno);
      return this.buildLoginResult(linkedUser, ipAddress);
    }

    const personal = await this.findPersonalByIdentifier(rawIdentifier);
    if (personal) {
      if (!personal.password_hash) throw noPasswordConfigured();
      if (!passwordMatches(password, personal.password_hash)) throw invalidCredentials();
      const linkedUser = await this.ensurePortalUserFromPersonal(personal);
      return this.buildLoginResult(linkedUser, ipAddress);
    }

    throw invalidCredentials();
  }

  /**
   * Verifica un token JWT y comprueba el estado actual en MySQL.
   */
  static async verifyToken(token) {
    if (!token) {
      const err = new Error('Token no provisto.');
      err.statusCode = 401;
      throw err;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (jwtError) {
      const err = new Error(jwtError.name === 'TokenExpiredError' ? 'El token ha expirado.' : 'Token inválido.');
      err.statusCode = 401;
      throw err;
    }

    const user = await queryOne(`
      SELECT u.id, u.is_active, u.role_id, u.id_alumno, r.name AS role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [decoded.id]);
    if (!user || !user.is_active) {
      const err = new Error('El usuario asociado a esta sesión ya no está activo.');
      err.statusCode = 403;
      throw err;
    }

    const livePermissions = await this.getPermissionsByRoleId(user.role_id);

    return {
      ...decoded,
      role: user.role_name,
      roleId: user.role_id,
      idAlumno: user.id_alumno || null,
      permissions: livePermissions
    };
  }

  /**
   * Cierre de sesión (auditable).
   */
  static async logout(user, ipAddress = '127.0.0.1') {
    if (user && user.id) {
      await logAction({
        userId: user.id,
        userEmail: user.email,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        actionType: 'AUTH_LOGOUT',
        entity: 'auth',
        entityId: String(user.id),
        previousValues: null,
        newValues: { message: 'Cierre de sesión registrado' },
        ipAddress
      });
    }
    return { success: true, message: 'Sesión cerrada correctamente.' };
  }
}

module.exports = AuthService;
