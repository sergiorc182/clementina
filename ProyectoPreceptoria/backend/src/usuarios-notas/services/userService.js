const bcrypt = require('bcryptjs');
const { queryAll, queryOne, run, transaction } = require('../database/db');
const { logAction } = require('./auditService');

class UserService {
  /**
   * Lista usuarios desde MySQL con paginación y filtros.
   */
  static async getUsers({ page = 1, limit = 20, search = '', roleId = null, isActive = null }) {
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }
    if (roleId) {
      conditions.push('u.role_id = ?');
      params.push(roleId);
    }
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      conditions.push('u.is_active = ?');
      params.push(Number(isActive) === 1 ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await queryOne(`SELECT COUNT(*) as total FROM users u ${whereClause}`, params);
    const total = countRow ? Number(countRow.total) : 0;

    const offset = (Number(page) - 1) * Number(limit);
    const users = await queryAll(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role_id, r.name as role_name,
             u.id_personal, u.id_alumno, u.is_active, u.created_at, u.updated_at,
             a.legajo AS alumno_legajo,
             CONCAT(a.primer_apellido, ', ', a.primer_nombre) AS alumno_nombre_completo
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN alumnos a ON u.id_alumno = a.id_alumno
      ${whereClause}
      ORDER BY u.id ASC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      data: users
    };
  }

  /**
   * Obtiene un usuario por ID.
   */
  static async getUserById(id) {
    const user = await queryOne(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role_id, r.name as role_name,
             u.id_personal, u.id_alumno, u.is_active, u.created_at, u.updated_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [id]);

    if (!user) {
      const err = new Error('Usuario no encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  /**
   * Crea un nuevo usuario y registra auditoría en MySQL.
   */
  static async createUser(userData, actor) {
    const { email, password, firstName, lastName, roleId, idAlumno } = userData;

    if (!email || !password || !firstName || !lastName || !roleId) {
      const err = new Error('Todos los campos son obligatorios (email, password, firstName, lastName, roleId).');
      err.statusCode = 400;
      throw err;
    }

    if (password.length < 6) {
      const err = new Error('La contraseña debe tener al menos 6 caracteres.');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      const err = new Error('Ya existe un usuario con este correo electrónico.');
      err.statusCode = 409;
      throw err;
    }

    const role = await queryOne('SELECT id, name FROM roles WHERE id = ?', [roleId]);
    if (!role) {
      const err = new Error('El rol especificado no existe.');
      err.statusCode = 400;
      throw err;
    }

    const linkedAlumnoId = role.name === 'ALUMNO' && idAlumno ? Number(idAlumno) : null;

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    return await transaction(async () => {
      const insert = await run(`
        INSERT INTO users (email, password_hash, first_name, last_name, role_id, id_alumno, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [cleanEmail, passwordHash, firstName.trim(), lastName.trim(), roleId, linkedAlumnoId]);

      const newId = insert.lastInsertRowid;

      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        actionType: 'USER_CREATED',
        entity: 'users',
        entityId: String(newId),
        previousValues: null,
        newValues: {
          id: newId,
          email: cleanEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          roleId,
          roleName: role.name,
          idAlumno: linkedAlumnoId
        },
        ipAddress: actor.ipAddress || '127.0.0.1'
      });

      return await this.getUserById(newId);
    });
  }

  /**
   * Actualiza datos de un usuario existente.
   */
  static async updateUser(id, updateData, actor) {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      const err = new Error('Usuario no encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const { firstName, lastName, roleId, password, idAlumno } = updateData;
    const prevValues = {
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: user.role_id,
      id_alumno: user.id_alumno
    };

    const newFirstName = firstName ? firstName.trim() : user.first_name;
    const newLastName = lastName ? lastName.trim() : user.last_name;
    const newRoleId = roleId ? Number(roleId) : user.role_id;
    const targetRole = await queryOne('SELECT id, name FROM roles WHERE id = ?', [newRoleId]);
    const newIdAlumno = targetRole?.name === 'ALUMNO'
      ? (idAlumno !== undefined ? (idAlumno ? Number(idAlumno) : null) : user.id_alumno)
      : null;

    let newPasswordHash = user.password_hash;
    let passwordChanged = false;
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        const err = new Error('La nueva contraseña debe tener al menos 6 caracteres.');
        err.statusCode = 400;
        throw err;
      }
      newPasswordHash = bcrypt.hashSync(password, 10);
      passwordChanged = true;
    }

    await transaction(async () => {
      await run(`
        UPDATE users
        SET first_name = ?, last_name = ?, role_id = ?, id_alumno = ?, password_hash = ?, updated_at = NOW()
        WHERE id = ?
      `, [newFirstName, newLastName, newRoleId, newIdAlumno, newPasswordHash, id]);

      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        actionType: 'USER_UPDATED',
        entity: 'users',
        entityId: String(id),
        previousValues: prevValues,
        newValues: {
          first_name: newFirstName,
          last_name: newLastName,
          role_id: newRoleId,
          id_alumno: newIdAlumno,
          password_changed: passwordChanged
        },
        ipAddress: actor.ipAddress || '127.0.0.1'
      });
    });

    return await this.getUserById(id);
  }

  /**
   * Activa o desactiva un usuario.
   */
  static async toggleUserStatus(id, isActive, actor) {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      const err = new Error('Usuario no encontrado.');
      err.statusCode = 404;
      throw err;
    }

    if (Number(actor.id) === Number(id) && !isActive) {
      const err = new Error('No puedes desactivar tu propia cuenta de usuario.');
      err.statusCode = 400;
      throw err;
    }

    const newStatus = isActive ? 1 : 0;
    const prevStatus = user.is_active;

    await transaction(async () => {
      await run(`
        UPDATE users
        SET is_active = ?, updated_at = NOW()
        WHERE id = ?
      `, [newStatus, id]);

      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        actionType: newStatus === 1 ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity: 'users',
        entityId: String(id),
        previousValues: { is_active: prevStatus },
        newValues: { is_active: newStatus },
        ipAddress: actor.ipAddress || '127.0.0.1'
      });
    });

    return await this.getUserById(id);
  }
}

module.exports = UserService;
