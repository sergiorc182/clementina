-- Migración QA-014 / QA-015
-- Persistencia del estado de verificación de correo en MySQL/MariaDB.
--
-- Revisar antes de ejecutar:
--   1. Verificar que alumnos.confirmacion_registro exista (está en docs/esquema_normalizado.sql).
--   2. Hacer backup lógico de la base de datos.
--   3. Revisar cuentas con confirmacion_registro IS NULL: quedarán pendientes.
--   4. No copiar estados desde config/.registro_verificaciones.json: ese archivo
--      deja de ser fuente de verdad y puede estar ausente o corrupto.
--   5. Este archivo NO se ejecuta automáticamente. Aplicarlo manualmente en
--      el entorno correspondiente.
--
-- Tratamiento de cuentas existentes:
--   - confirmacion_registro NOT NULL: se consideran confirmadas; no se modifican.
--   - confirmacion_registro NULL: se consideran pendientes; deberán confirmar
--     mediante un token enviado al correo declarado o mediante reenvío.
--   - No se activa automáticamente ninguna cuenta de estado desconocido.
--   - Si el administrador valida por otro medio que ciertas cuentas son
--     legítimas, puede marcarlas explícitamente con la sentencia opcional
--     que aparece al final (NO ejecutar sin validación previa).

CREATE TABLE IF NOT EXISTS verificaciones_correo (
  id_verificacion  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_alumno        BIGINT NOT NULL,
  token_hash       CHAR(64) NOT NULL COMMENT 'SHA-256 del token; nunca token en texto plano',
  expira_en        DATETIME NOT NULL,
  usada_en         DATETIME DEFAULT NULL,
  revocada_en      DATETIME DEFAULT NULL,
  creado_en        DATETIME NOT NULL,
  PRIMARY KEY (id_verificacion),
  UNIQUE KEY uq_verificacion_token_hash (token_hash),
  KEY idx_verificacion_alumno_estado (id_alumno, usada_en, revocada_en, expira_en),
  CONSTRAINT fk_verificacion_alumno FOREIGN KEY (id_alumno)
    REFERENCES alumnos (id_alumno) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Opcional, SOLO después de validación fuera de banda:
-- UPDATE alumnos
--    SET confirmacion_registro = NOW(), fecha_ultima_actualizacion = NOW()
--  WHERE confirmacion_registro IS NULL
--    AND id_alumno IN (... IDs verificados manualmente ...);
