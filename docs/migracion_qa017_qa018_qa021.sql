-- Migración QA-017 / QA-018 / QA-021
-- Aplicar manualmente. No se ejecuta automáticamente.
-- Hacer backup lógico antes de aplicarla. No ejecutar DROP, TRUNCATE ni DELETE masivos.
--
-- PROCEDIMIENTO DE PREFLIGHT Y REINTENTO (ejecutar manualmente, con la BD correcta seleccionada):
--   MariaDB 10.4.32 no acepta ADD CONSTRAINT IF NOT EXISTS (error 1064). No usar DDL condicional.
--   1) FK existente y reglas:
--      SELECT tc.CONSTRAINT_NAME, rc.DELETE_RULE, rc.UPDATE_RULE
--      FROM information_schema.TABLE_CONSTRAINTS tc
--      JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
--        ON rc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
--       AND rc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
--       AND rc.TABLE_NAME = tc.TABLE_NAME
--      WHERE tc.CONSTRAINT_SCHEMA = DATABASE()
--        AND tc.TABLE_NAME = 'matriculacion'
--        AND tc.CONSTRAINT_NAME = 'fk_matr_carrera_sede_turno'
--        AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY';
--      Si devuelve una fila con DELETE_RULE = 'RESTRICT' y UPDATE_RULE = 'RESTRICT', la FK ya es válida: NO ejecutar el ALTER.
--      Si devuelve otra regla (por ejemplo CASCADE), detener y reportar: no borrar ni recrear la restricción sin autorización.
--   2) Columnas de la FK existente:
--      SELECT ORDINAL_POSITION, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
--      FROM information_schema.KEY_COLUMN_USAGE
--      WHERE CONSTRAINT_SCHEMA = DATABASE()
--        AND TABLE_NAME = 'matriculacion'
--        AND CONSTRAINT_NAME = 'fk_matr_carrera_sede_turno'
--      ORDER BY ORDINAL_POSITION;
--      Esperado: 1=id_carrera, 2=id_sede, 3=id_turno, referenciando carrera_sede_turno en el mismo orden.
--      Si difiere, detener y reportar: no alcanza con que el nombre coincida.
--   3) Huérfanos antes del ALTER:
--      SELECT COUNT(*) AS huerfanos
--      FROM matriculacion m
--      LEFT JOIN carrera_sede_turno cst
--        ON cst.id_carrera = m.id_carrera
--       AND cst.id_sede = m.id_sede
--       AND cst.id_turno = m.id_turno
--      WHERE cst.id_carrera IS NULL;
--      Si es mayor que 0, detener antes del ALTER. No eliminar matrículas ni ternas para forzar la FK.
--   4) Detalle histórico pendiente:
--      SELECT COUNT(*) AS sin_detalle
--      FROM matriculacion m
--      WHERE NOT EXISTS (
--        SELECT 1 FROM matriculacion_detalle md
--        WHERE md.id_alumno = m.id_alumno
--          AND md.id_carrera = m.id_carrera
--          AND md.anio_matriculacion = m.anio_inscripcion
--      );
--      El backfill siguiente es no destructivo, pero presume asistencia presencial ('1'): ejecutarlo solo tras revisión de preceptoría.
--   Reanudación: si el backfill se aplicó y el ALTER falló, no repetir el archivo completo. Corregir la causa con autorización,
--   repetir el preflight y ejecutar únicamente el ALTER cuando corresponda. Repetir el archivo completo duplica el error de constraint.
--   MariaDB realiza commit implícito en DDL: la migración completa NO es atómica.
--
-- QA-017: tope_mesas se interpreta por alumno y período (anio_mesas + id_turno):
--   NULL = sin límite; 0 = no se permiten inscripciones; N = máximo N inscripciones activas.
--   No se cambia el esquema: la semántica se aplica en InscripcionFinal con bloqueo FOR UPDATE.
--
-- QA-018: el derecho a evaluación exige matriculación cabecera + detalle de la materia
--   para el año académico de esa matrícula. Las filas históricas sin detalle deben
--   reconstruirse antes de habilitar el panel docente. La sentencia siguiente es no
--   destructiva (INSERT IGNORE) y presume asistencia presencial ('1'); revisar con
--   preceptoría antes de ejecutarla si existen situaciones especiales documentadas.
INSERT IGNORE INTO matriculacion_detalle
    (id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia)
SELECT m.id_alumno,
       m.id_carrera,
       m.anio_inscripcion,
       cm.id_materia,
       '1'
FROM matriculacion m
INNER JOIN carrera_materias cm ON cm.id_carrera = m.id_carrera;
--
-- QA-021: impedir que se elimine una combinación carrera/sede/turno con matrículas.
--   La restricción es RESTRICT por defecto: no borra, no desactiva y no cascadea datos.
ALTER TABLE matriculacion
  ADD CONSTRAINT fk_matr_carrera_sede_turno
  FOREIGN KEY (id_carrera, id_sede, id_turno)
  REFERENCES carrera_sede_turno (id_carrera, id_sede, id_turno);
