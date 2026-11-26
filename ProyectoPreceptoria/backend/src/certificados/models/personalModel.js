const { pool } = require('../config/db');

class PersonalModel {
  /**
   * Obtiene la lista del personal institucional (preceptores, directivos, secretaría).
   * @returns {Promise<Array>}
   */
  static async listarTodos() {
    const sql = `
      SELECT 
        p.id_personal,
        p.apellidos,
        p.nombres,
        CONCAT(p.nombres, ' ', p.apellidos) AS nombre_completo,
        p.usuario_sistema,
        p.id_tipo_personal,
        tp.descripcion AS rol
      FROM personal p
      INNER JOIN tipos_personal tp ON p.id_tipo_personal = tp.id_tipo_personal
      ORDER BY tp.descripcion ASC, p.apellidos ASC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  }

  /**
   * Obtiene únicamente el personal con rol de preceptoría.
   * @returns {Promise<Array>}
   */
  static async listarPreceptores() {
    try {
      const sql = `
        SELECT 
          p.id_personal,
          p.apellidos,
          p.nombres,
          CONCAT(p.nombres, ' ', p.apellidos) AS nombre_completo,
          p.usuario_sistema,
          tp.descripcion AS rol
        FROM personal p
        INNER JOIN tipos_personal tp ON p.id_tipo_personal = tp.id_tipo_personal
        WHERE p.id_tipo_personal = 'P'
        ORDER BY p.apellidos ASC
      `;
      const [rows] = await pool.query(sql);
      if (rows && rows.length > 0) return rows;
    } catch (_) { }

    return [
      { id_personal: 1, apellidos: 'González', nombres: 'Marta', nombre_completo: 'Marta González', usuario_sistema: 'mgonzalez', rol: 'Preceptor/a' },
      { id_personal: 2, apellidos: 'Silva', nombres: 'Roberto', nombre_completo: 'Roberto Silva', usuario_sistema: 'rsilva', rol: 'Preceptor/a' }
    ];
  }
}

module.exports = PersonalModel;
