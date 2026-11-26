const { queryAll, queryOne, run, transaction } = require('../database/db');
const { logAction } = require('./auditService');

const VALID_ESTADOS = ['Borrador', 'GRIS', 'AMARILLO', 'VERDE', 'ROJO'];

class SheetService {
  /**
   * Obtiene la lista real de carreras institucionales desde MySQL (`carreras`).
   */
  static async getOfficialCareers() {
    const rows = await queryAll('SELECT nombre_carrera FROM carreras ORDER BY nombre_carrera ASC');
    return rows.map(r => r.nombre_carrera);
  }

  /**
   * Obtiene las materias reales asociadas a una carrera o todas las materias desde MySQL.
   */
  static async getSubjectsByCareer(carrera = null) {
    if (carrera) {
      return await queryAll(`
        SELECT m.id_materia as id,
               cm.id_carrera,
               CONCAT('MAT-', m.id_materia) as code,
               m.nombre_materia as name,
               c.nombre_carrera as career,
               cm.anio_cursada as year_level
        FROM carrera_materias cm
        JOIN materias m ON cm.id_materia = m.id_materia
        JOIN carreras c ON cm.id_carrera = c.id_carrera
        WHERE c.nombre_carrera = ? OR c.nombre_carrera LIKE ? OR c.nombre_carrera_corto = ?
        ORDER BY cm.anio_cursada ASC, m.nombre_materia ASC
      `, [carrera, `%${carrera}%`, carrera]);
    }
    return await queryAll(`
      SELECT m.id_materia as id,
             cm.id_carrera,
             CONCAT('MAT-', m.id_materia) as code,
             m.nombre_materia as name,
             c.nombre_carrera as career,
             cm.anio_cursada as year_level
      FROM carrera_materias cm
      JOIN materias m ON cm.id_materia = m.id_materia
      JOIN carreras c ON cm.id_carrera = c.id_carrera
      ORDER BY c.nombre_carrera ASC, cm.anio_cursada ASC, m.nombre_materia ASC
    `);
  }

  /**
   * Resuelve (id_carrera, id_materia) reales de MySQL para cumplir las FK de official_sheets.
   */
  static async resolveCarreraMateria(carreraNombre, materiaNombre, idCarrera = null, idMateria = null) {
    if (idCarrera && idMateria) {
      const exists = await queryOne(
        'SELECT id_carrera, id_materia FROM carrera_materias WHERE id_carrera = ? AND id_materia = ?',
        [idCarrera, idMateria]
      );
      if (exists) return exists;
    }

    // Buscar por carrera + materia exacta o parcial
    const exactMatch = await queryOne(`
      SELECT cm.id_carrera, cm.id_materia, c.nombre_carrera, m.nombre_materia
      FROM carrera_materias cm
      JOIN carreras c ON cm.id_carrera = c.id_carrera
      JOIN materias m ON cm.id_materia = m.id_materia
      WHERE (c.nombre_carrera = ? OR c.nombre_carrera LIKE ? OR c.nombre_carrera_corto = ?)
        AND (m.nombre_materia = ? OR m.nombre_materia LIKE ?)
      LIMIT 1
    `, [carreraNombre, `%${carreraNombre}%`, carreraNombre, materiaNombre, `%${materiaNombre}%`]);

    if (exactMatch) {
      return { id_carrera: exactMatch.id_carrera, id_materia: exactMatch.id_materia };
    }

    // Buscar cualquier materia de esa carrera
    const careerMatch = await queryOne(`
      SELECT cm.id_carrera, cm.id_materia
      FROM carrera_materias cm
      JOIN carreras c ON cm.id_carrera = c.id_carrera
      WHERE c.nombre_carrera = ? OR c.nombre_carrera LIKE ? OR c.nombre_carrera_corto = ?
      ORDER BY cm.anio_cursada ASC, cm.id_materia ASC
      LIMIT 1
    `, [carreraNombre, `%${carreraNombre}%`, carreraNombre]);

    if (careerMatch) {
      return { id_carrera: careerMatch.id_carrera, id_materia: careerMatch.id_materia };
    }

    const fallback = await queryOne('SELECT id_carrera, id_materia FROM carrera_materias LIMIT 1');
    if (!fallback) {
      const err = new Error('No existen carreras o materias cargadas en la base de datos MySQL (carrera_materias).');
      err.statusCode = 400;
      throw err;
    }
    return fallback;
  }

  /**
   * Lista las planillas oficiales (Mesas y Actas) desde MySQL aplicando RLS.
   */
  static async getSheets({ actor, sheetType = null, carrera = null, estado = null, search = '', onlyMine = false }) {
    const conditions = [];
    const params = [];

    if (sheetType) {
      conditions.push('s.sheet_type = ?');
      params.push(sheetType.toUpperCase());
    }
    if (carrera) {
      conditions.push('(s.carrera = ? OR s.carrera LIKE ?)');
      params.push(carrera, `%${carrera}%`);
    }
    if (estado) {
      conditions.push('s.estado = ?');
      params.push(estado);
    }
    if (search) {
      conditions.push('(s.materia LIKE ? OR s.libro_numero LIKE ? OR s.docente_titular LIKE ? OR s.carrera LIKE ?)');
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }
    if (onlyMine && actor?.id) {
      conditions.push('s.user_id_creador = ?');
      params.push(actor.id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT s.*,
             CONCAT(u.first_name, ' ', u.last_name) as creador_nombre,
             u.email as creador_email
      FROM official_sheets s
      JOIN users u ON s.user_id_creador = u.id
      ${whereClause}
      ORDER BY s.updated_at DESC, s.id DESC
    `;

    const sheets = await queryAll(sql, params);

    return sheets.map(s => {
      let rowsData = [];
      try {
        rowsData = typeof s.rows_data === 'string' ? JSON.parse(s.rows_data) : (s.rows_data || []);
      } catch {
        rowsData = [];
      }

      const isCreator = actor && Number(s.user_id_creador) === Number(actor.id);
      const isAdmin = actor && actor.role === 'ADMINISTRADOR';
      const isPreceptor = actor && actor.role === 'PRECEPTOR';

      let canEdit = false;
      if (isAdmin) {
        canEdit = true;
      } else if (isPreceptor) {
        canEdit = false;
      } else if (isCreator) {
        canEdit = ['Borrador', 'ROJO', 'Rojo'].includes(s.estado);
      }

      return {
        ...s,
        rows_data: rowsData,
        alumnos_count: rowsData.length,
        is_creator: isCreator,
        can_edit: canEdit,
        is_read_only: !canEdit
      };
    });
  }

  /**
   * Obtiene una planilla específica por ID validando permisos.
   */
  static async getSheetById(id, actor) {
    const sheet = await queryOne(`
      SELECT s.*,
             CONCAT(u.first_name, ' ', u.last_name) as creador_nombre,
             u.email as creador_email
      FROM official_sheets s
      JOIN users u ON s.user_id_creador = u.id
      WHERE s.id = ?
    `, [id]);

    if (!sheet) {
      const error = new Error('La planilla o mesa solicitada no existe.');
      error.statusCode = 404;
      throw error;
    }

    let rowsData = [];
    try {
      rowsData = typeof sheet.rows_data === 'string' ? JSON.parse(sheet.rows_data) : (sheet.rows_data || []);
    } catch {
      rowsData = [];
    }

    const isCreator = actor && Number(sheet.user_id_creador) === Number(actor.id);
    const isAdmin = actor && actor.role === 'ADMINISTRADOR';
    const isPreceptor = actor && actor.role === 'PRECEPTOR';

    let canEdit = false;
    if (isAdmin) {
      canEdit = true;
    } else if (isPreceptor) {
      canEdit = false;
    } else if (isCreator) {
      canEdit = ['Borrador', 'ROJO', 'Rojo'].includes(sheet.estado);
    }

    return {
      ...sheet,
      rows_data: rowsData,
      alumnos_count: rowsData.length,
      is_creator: isCreator,
      can_edit: canEdit,
      is_read_only: !canEdit
    };
  }

  /**
   * Crea una nueva Mesa de Examen o Acta Volante en MySQL (Docente o Administrador).
   */
  static async createSheet(sheetData, actor) {
    if (!actor || (actor.role !== 'DOCENTE' && actor.role !== 'ADMINISTRADOR')) {
      const err = new Error('Solo los docentes y administradores pueden crear mesas o actas de examen.');
      err.statusCode = 403;
      throw err;
    }

    const {
      sheetType = 'MESA_EXAMEN',
      carrera,
      materia,
      idCarrera = null,
      idMateria = null,
      libroNumero = '',
      folioNumero = '',
      fecha = new Date().toISOString().split('T')[0],
      docenteTitular = `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
      docenteSuplente = '',
      primerVocal = '',
      segundoVocal = '',
      rows = [],
      action = 'BORRADOR'
    } = sheetData;

    if (!carrera || !carrera.trim()) {
      const err = new Error('La carrera es obligatoria.');
      err.statusCode = 400;
      throw err;
    }
    if (!materia || !materia.trim()) {
      const err = new Error('La materia es obligatoria.');
      err.statusCode = 400;
      throw err;
    }

    const resolved = await this.resolveCarreraMateria(carrera.trim(), materia.trim(), idCarrera, idMateria);
    const estado = (action === 'CODIFICAR' || action === 'CERRAR') ? 'GRIS' : 'Borrador';
    const rowsJson = JSON.stringify(Array.isArray(rows) ? rows : []);

    return await transaction(async () => {
      const result = await run(`
        INSERT INTO official_sheets (
          sheet_type, user_id_creador, id_carrera, id_materia, carrera, materia,
          libro_numero, folio_numero, fecha,
          docente_titular, docente_suplente, primer_vocal, segundo_vocal,
          rows_data, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sheetType.toUpperCase(),
        actor.id,
        resolved.id_carrera,
        resolved.id_materia,
        carrera.trim(),
        materia.trim(),
        String(libroNumero || '').trim(),
        String(folioNumero || '').trim(),
        String(fecha || '').trim(),
        String(docenteTitular || '').trim(),
        String(docenteSuplente || '').trim(),
        String(primerVocal || '').trim(),
        String(segundoVocal || '').trim(),
        rowsJson,
        estado
      ]);

      const newId = result.lastInsertRowid;

      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        actionType: 'OFFICIAL_SHEET_CREATED',
        entity: 'official_sheets',
        entityId: String(newId),
        previousValues: null,
        newValues: {
          id: newId,
          sheetType,
          carrera,
          materia,
          estado,
          alumnos: rows.length
        },
        ipAddress: actor.ipAddress || '127.0.0.1'
      });

      return await SheetService.getSheetById(newId, actor);
    });
  }

  /**
   * Actualiza una Mesa o Acta existente respetando RLS estricto.
   */
  static async updateSheet(id, sheetData, actor) {
    const existing = await queryOne('SELECT * FROM official_sheets WHERE id = ?', [id]);
    if (!existing) {
      const err = new Error('La planilla que intenta editar no existe.');
      err.statusCode = 404;
      throw err;
    }

    const isAdmin = actor && actor.role === 'ADMINISTRADOR';
    const isPreceptor = actor && actor.role === 'PRECEPTOR';
    const isCreator = actor && Number(existing.user_id_creador) === Number(actor.id);

    if (isPreceptor) {
      const err = new Error('Solo lectura. El perfil de preceptor no tiene autorización para modificar ni eliminar actas o mesas.');
      err.statusCode = 403;
      throw err;
    }

    if (!isAdmin) {
      if (!isCreator) {
        const err = new Error('Acceso denegado: Cada profesor solo puede editar las actas y mesas que él mismo creó.');
        err.statusCode = 403;
        throw err;
      }

      if (!['Borrador', 'ROJO', 'Rojo'].includes(existing.estado)) {
        const err = new Error(`Acceso bloqueado: La planilla se encuentra en estado '${existing.estado}' y solo puede ser modificada si está en Borrador o si fue Rechazada (Rojo).`);
        err.statusCode = 403;
        throw err;
      }
    }

    const {
      carrera = existing.carrera,
      materia = existing.materia,
      libroNumero = existing.libro_numero,
      folioNumero = existing.folio_numero,
      fecha = existing.fecha,
      docenteTitular = existing.docente_titular,
      docenteSuplente = existing.docente_suplente,
      primerVocal = existing.primer_vocal,
      segundoVocal = existing.segundo_vocal,
      rows = null,
      action = null
    } = sheetData;

    let nuevoEstado = existing.estado;
    if (action === 'CODIFICAR' || action === 'CERRAR') {
      nuevoEstado = 'GRIS';
    } else if (isAdmin && sheetData.estado) {
      nuevoEstado = sheetData.estado;
    }

    const resolved = await this.resolveCarreraMateria(carrera.trim(), materia.trim(), existing.id_carrera, existing.id_materia);
    const rowsJson = rows !== null
      ? JSON.stringify(rows)
      : (typeof existing.rows_data === 'string' ? existing.rows_data : JSON.stringify(existing.rows_data || []));

    return await transaction(async () => {
      await run(`
        UPDATE official_sheets
        SET id_carrera = ?,
            id_materia = ?,
            carrera = ?,
            materia = ?,
            libro_numero = ?,
            folio_numero = ?,
            fecha = ?,
            docente_titular = ?,
            docente_suplente = ?,
            primer_vocal = ?,
            segundo_vocal = ?,
            rows_data = ?,
            estado = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [
        resolved.id_carrera,
        resolved.id_materia,
        carrera.trim(),
        materia.trim(),
        String(libroNumero || '').trim(),
        String(folioNumero || '').trim(),
        String(fecha || '').trim(),
        String(docenteTitular || '').trim(),
        String(docenteSuplente || '').trim(),
        String(primerVocal || '').trim(),
        String(segundoVocal || '').trim(),
        rowsJson,
        nuevoEstado,
        id
      ]);

      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        actionType: (action === 'CODIFICAR' || action === 'CERRAR') ? 'OFFICIAL_SHEET_CODIFIED' : 'OFFICIAL_SHEET_UPDATED',
        entity: 'official_sheets',
        entityId: String(id),
        previousValues: { estado: existing.estado },
        newValues: { estado: nuevoEstado, alumnos: Array.isArray(rows) ? rows.length : 'sin cambios' },
        ipAddress: actor.ipAddress || '127.0.0.1'
      });

      return await SheetService.getSheetById(id, actor);
    });
  }

  /**
   * Cambia el estado del semáforo de una Mesa o Acta (Solo ADMINISTRADOR).
   */
  static async updateStatus(id, { estado, observacionesAdmin = '' }, actor) {
    if (!actor || actor.role !== 'ADMINISTRADOR') {
      const err = new Error('Solo el Administrador tiene autorización para cambiar el estado de validación (semáforo) de actas y mesas.');
      err.statusCode = 403;
      throw err;
    }

    if (!VALID_ESTADOS.includes(estado)) {
      const err = new Error(`Estado no válido. Opciones: ${VALID_ESTADOS.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const existing = await queryOne('SELECT * FROM official_sheets WHERE id = ?', [id]);
    if (!existing) {
      const err = new Error('La planilla no existe.');
      err.statusCode = 404;
      throw err;
    }

    return await transaction(async () => {
      await run(`
        UPDATE official_sheets
        SET estado = ?,
            observaciones_admin = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [estado, observacionesAdmin || '', id]);

      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        actionType: 'OFFICIAL_SHEET_STATUS_CHANGED',
        entity: 'official_sheets',
        entityId: String(id),
        previousValues: { estado: existing.estado, observaciones: existing.observaciones_admin },
        newValues: { estado, observaciones: observacionesAdmin },
        ipAddress: actor.ipAddress || '127.0.0.1'
      });

      return await SheetService.getSheetById(id, actor);
    });
  }

  /**
   * Elimina una planilla (Admin o Docente si está en Borrador).
   */
  static async deleteSheet(id, actor) {
    const existing = await queryOne('SELECT * FROM official_sheets WHERE id = ?', [id]);
    if (!existing) {
      const err = new Error('La planilla no existe.');
      err.statusCode = 404;
      throw err;
    }

    const isAdmin = actor && actor.role === 'ADMINISTRADOR';
    const isCreator = actor && Number(existing.user_id_creador) === Number(actor.id);

    if (!isAdmin && (!isCreator || existing.estado !== 'Borrador')) {
      const err = new Error('Solo se pueden eliminar planillas en estado Borrador creadas por usted, o por un Administrador.');
      err.statusCode = 403;
      throw err;
    }

    return await transaction(async () => {
      await run('DELETE FROM official_sheets WHERE id = ?', [id]);

      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        actionType: 'OFFICIAL_SHEET_DELETED',
        entity: 'official_sheets',
        entityId: String(id),
        previousValues: { id, sheet_type: existing.sheet_type, materia: existing.materia },
        newValues: null,
        ipAddress: actor.ipAddress || '127.0.0.1'
      });

      return { success: true, id };
    });
  }
}

module.exports = SheetService;
