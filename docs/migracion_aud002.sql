ALTER TABLE alumnos
  ADD COLUMN activacion_token_hash CHAR(64) NULL DEFAULT NULL AFTER confirmacion_registro,
  ADD COLUMN activacion_expira_en DATETIME NULL DEFAULT NULL AFTER activacion_token_hash,
  ADD COLUMN activacion_usada_en DATETIME NULL DEFAULT NULL AFTER activacion_expira_en,
  ADD INDEX idx_alumno_activacion_hash (activacion_token_hash);
