-- Ejecutar sobre la base `clementina` (XAMPP). Requiere esquema_normalizado.sql aplicado.

INSERT INTO tipos_personal (id_tipo_personal, descripcion)
VALUES ('D','Docente')
ON DUPLICATE KEY UPDATE descripcion=VALUES(descripcion);

CREATE TABLE IF NOT EXISTS docente_asignaciones (
  id_asignacion BIGINT NOT NULL AUTO_INCREMENT,
  id_personal   INT NOT NULL,
  id_carrera    INT NOT NULL,
  id_materia    INT NOT NULL,
  PRIMARY KEY (id_asignacion),
  UNIQUE KEY uq_docente_carrera_materia (id_personal, id_carrera, id_materia),
  KEY fk_da_carrera_materia (id_carrera, id_materia),
  CONSTRAINT fk_da_personal FOREIGN KEY (id_personal)
    REFERENCES personal (id_personal) ON DELETE CASCADE,
  CONSTRAINT fk_da_cm FOREIGN KEY (id_carrera, id_materia)
    REFERENCES carrera_materias (id_carrera, id_materia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
