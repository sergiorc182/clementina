import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Pool de conexiones a MySQL (XAMPP por defecto: localhost, root, sin contraseña)
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'srv568.hstgr.io',
  user: process.env.DB_USER || 'u714838186_clementina',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'u714838186_clementina',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificación inicial de conexión y migración incremental del Módulo E
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(' Conectado exitosamente a la base de datos MySQL (XAMPP)');

    // Migración incremental Módulo E y proyectoMarta
    try {
      await connection.query(
        `ALTER TABLE carrera_materias 
         ADD COLUMN IF NOT EXISTS carga_horaria_semanal TINYINT NOT NULL DEFAULT 4 
         COMMENT 'Carga horaria semanal (tope institucional 32 hs)'`
      );
      await connection.query(
        `ALTER TABLE historial_academico 
         ADD COLUMN IF NOT EXISTS observaciones VARCHAR(255) DEFAULT NULL`
      );
      await connection.query(
        `CREATE TABLE IF NOT EXISTS materia_horarios (
          id_horario  INT NOT NULL AUTO_INCREMENT,
          id_carrera  INT NOT NULL,
          id_materia  INT NOT NULL,
          dia_semana  ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado') NOT NULL,
          hora_inicio TIME NOT NULL,
          hora_fin    TIME NOT NULL,
          id_sede     INT DEFAULT 1,
          id_turno    INT DEFAULT 3,
          aula        VARCHAR(45) DEFAULT NULL,
          comision    VARCHAR(20) DEFAULT 'Única',
          PRIMARY KEY (id_horario),
          KEY fk_horario_carrera_materia (id_carrera, id_materia),
          KEY fk_horario_sede (id_sede),
          KEY fk_horario_turno (id_turno)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
      await connection.query(
        `INSERT IGNORE INTO tipos_personal (id_tipo_personal, descripcion) VALUES ('P', 'Preceptor/a'), ('D', 'Directivo/a')`
      );
      await connection.query(
        `INSERT IGNORE INTO personal (id_personal, apellidos, nombres, usuario_sistema, id_tipo_personal)
         VALUES (1, 'González', 'Marta', 'mgonzalez', 'P'), (2, 'Silva', 'Roberto', 'rsilva', 'P')`
      );
    } catch (_) { }

    connection.release();
  } catch (error) {
    console.error(' Error al conectar con MySQL:', error.message);
  }
};
