const { query } = require('../config/db');

class CarreraModel {
  /**
   * Obtiene todas las carreras activas
   */
  static async findAll() {
    const sql = `
      SELECT 
        id_carrera,
        nro_resolucion,
        nombre_carrera,
        nombre_carrera_corto,
        titulo,
        color_r,
        color_g,
        color_b
      FROM carreras
      ORDER BY nombre_carrera
    `;
    return await query(sql);
  }

  /**
   * Obtiene una carrera por ID
   * @param {number} idCarrera
   */
  static async findById(idCarrera) {
    const sql = `
      SELECT 
        id_carrera,
        nro_resolucion,
        nombre_carrera,
        nombre_carrera_corto,
        titulo
      FROM carreras
      WHERE id_carrera = ?
    `;
    const rows = await query(sql, [idCarrera]);
    return rows[0] || null;
  }

  /**
   * Obtiene las materias del plan de una carrera, con su año de cursada (1, 2, 3)
   * @param {number} idCarrera
   * @param {number} [anioCursada] Opcional: filtrar por año de cursada
   */
  static async getMaterias(idCarrera, anioCursada = null) {
    let sql = `
      SELECT 
        cm.id_carrera,
        cm.id_materia,
        cm.anio_cursada,
        COALESCE(cm.carga_horaria_semanal, 4) AS carga_horaria_semanal,
        m.nombre_materia
      FROM carrera_materias cm
      INNER JOIN materias m ON cm.id_materia = m.id_materia
      WHERE cm.id_carrera = ?
    `;
    const params = [idCarrera];

    if (anioCursada) {
      sql += ' AND cm.anio_cursada = ?';
      params.push(anioCursada);
    }

    sql += ' ORDER BY cm.anio_cursada, m.nombre_materia';
    return await query(sql, params);
  }

  /**
   * Obtiene los horarios asignados a las materias de una carrera
   * @param {number} idCarrera
   * @param {number} [idMateria] Opcional
   */
  static async getHorarios(idCarrera, idMateria = null) {
    let sql = `
      SELECT 
        id_horario,
        id_carrera,
        id_materia,
        dia_semana,
        hora_inicio,
        hora_fin,
        aula,
        comision
      FROM materia_horarios
      WHERE id_carrera = ?
    `;
    const params = [idCarrera];
    if (idMateria) {
      sql += ' AND id_materia = ?';
      params.push(idMateria);
    }
    sql += ' ORDER BY FIELD(dia_semana, "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"), hora_inicio';
    return await query(sql, params);
  }

  /**
   * Obtiene las sedes y turnos disponibles para una carrera
   * @param {number} idCarrera
   */
  static async getSedesYTurnos(idCarrera) {
    const sql = `
      SELECT 
        cst.id_carrera,
        cst.id_sede,
        s.nombre_sede,
        cst.id_turno,
        t.turno
      FROM carrera_sede_turno cst
      INNER JOIN sedes s ON cst.id_sede = s.id_sede
      INNER JOIN turnos t ON cst.id_turno = t.id_turno
      WHERE cst.id_carrera = ?
    `;
    return await query(sql, [idCarrera]);
  }

  /**
   * Guarda o actualiza un horario de cursada
   */
  static async saveHorario(data) {
    if (data.id_horario) {
      const sql = `
        UPDATE materia_horarios
        SET dia_semana = ?, hora_inicio = ?, hora_fin = ?, aula = ?, comision = ?
        WHERE id_horario = ?
      `;
      await query(sql, [data.dia_semana, data.hora_inicio, data.hora_fin, data.aula, data.comision, data.id_horario]);
      return data;
    } else {
      const sql = `
        INSERT INTO materia_horarios (id_carrera, id_materia, dia_semana, hora_inicio, hora_fin, aula, comision)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const res = await query(sql, [data.id_carrera, data.id_materia, data.dia_semana, data.hora_inicio, data.hora_fin, data.aula, data.comision]);
      return { ...data, id_horario: res.insertId };
    }
  }

  /**
   * Elimina un horario de cursada
   */
  static async deleteHorario(idHorario) {
    const sql = `DELETE FROM materia_horarios WHERE id_horario = ?`;
    return await query(sql, [idHorario]);
  }

  /**
   * Crea o actualiza una carrera en MySQL (carreras)
   */
  static async saveCarrera(data) {
    if (data.id_carrera) {
      await query(
        `UPDATE carreras
         SET nro_resolucion = ?, nombre_carrera = ?, nombre_carrera_corto = ?, titulo = ?, fecha_mod = NOW()
         WHERE id_carrera = ?`,
        [
          data.nro_resolucion || '',
          data.nombre_carrera,
          data.nombre_carrera_corto || data.nombre_carrera.slice(0, 45),
          data.titulo || data.nombre_carrera,
          Number(data.id_carrera)
        ]
      );
      return await this.findById(Number(data.id_carrera));
    } else {
      const rows = await query('SELECT COALESCE(MAX(id_carrera), 0) + 1 AS next_id FROM carreras');
      const nextId = rows[0].next_id;
      await query(
        `INSERT INTO carreras (id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto, titulo, fecha_alta)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          nextId,
          data.nro_resolucion || 'S/N',
          data.nombre_carrera,
          data.nombre_carrera_corto || data.nombre_carrera.slice(0, 45),
          data.titulo || data.nombre_carrera
        ]
      );
      return await this.findById(nextId);
    }
  }

  /**
   * Elimina una carrera en MySQL
   */
  static async deleteCarrera(idCarrera) {
    await query('DELETE FROM carreras WHERE id_carrera = ?', [Number(idCarrera)]);
    return { success: true };
  }

  /**
   * Crea o actualiza una materia dentro de una carrera en MySQL (materias + carrera_materias)
   */
  static async saveMateria(idCarrera, data) {
    const cId = Number(idCarrera);
    if (data.id_materia) {
      const mId = Number(data.id_materia);
      await query('UPDATE materias SET nombre_materia = ? WHERE id_materia = ?', [data.nombre_materia, mId]);
      await query(
        `UPDATE carrera_materias SET anio_cursada = ?, carga_horaria_semanal = ? WHERE id_carrera = ? AND id_materia = ?`,
        [Number(data.anio_cursada || 1), Number(data.horas || data.carga_horaria_semanal || 4), cId, mId]
      );
      return { id_carrera: cId, id_materia: mId, nombre_materia: data.nombre_materia, anio_cursada: Number(data.anio_cursada || 1), carga_horaria_semanal: Number(data.horas || data.carga_horaria_semanal || 4) };
    } else {
      const rows = await query('SELECT COALESCE(MAX(id_materia), 0) + 1 AS next_id FROM materias');
      const nextId = rows[0].next_id;
      await query('INSERT INTO materias (id_materia, nombre_materia) VALUES (?, ?)', [nextId, data.nombre_materia]);
      await query(
        `INSERT INTO carrera_materias (id_carrera, id_materia, anio_cursada, carga_horaria_semanal) VALUES (?, ?, ?, ?)`,
        [cId, nextId, Number(data.anio_cursada || 1), Number(data.horas || data.carga_horaria_semanal || 4)]
      );
      return { id_carrera: cId, id_materia: nextId, nombre_materia: data.nombre_materia, anio_cursada: Number(data.anio_cursada || 1), carga_horaria_semanal: Number(data.horas || data.carga_horaria_semanal || 4) };
    }
  }

  /**
   * Desvincula una materia de una carrera en MySQL
   */
  static async deleteMateria(idCarrera, idMateria) {
    await query('DELETE FROM carrera_materias WHERE id_carrera = ? AND id_materia = ?', [Number(idCarrera), Number(idMateria)]);
    return { success: true };
  }
}

module.exports = CarreraModel;
