-- =====================================================================
-- Datos de prueba para "Inscripción a finales" y "Próximos finales"
-- ISFT N.º 182 "Clementina"
--
-- Requiere haber importado antes docs/esquema_normalizado.sql (ese script
-- ya crea los usuarios de prueba alumno@clementina.edu.ar / admin).
--
-- Es un script para una base LOCAL de prueba: usa IDs fijos y actualiza
-- esos registros si ya existen. No borra datos de otras tablas, salvo las
-- inscripciones del alumno de prueba (id_alumno = 1) para dejar la
-- pantalla lista para volver a probar.
--
-- Importar con:
--   mysql -u root --default-character-set=utf8mb4 clementina < datos_prueba_finales.sql
-- =====================================================================

USE clementina;

-- ---------------------------------------------------------------------
-- Catálogos y estructura académica
-- ---------------------------------------------------------------------
INSERT INTO turnos (id_turno, turno) VALUES
  (1, 'Febrero'),
  (2, 'Agosto'),
  (3, 'Diciembre')
ON DUPLICATE KEY UPDATE turno = VALUES(turno);

INSERT INTO sedes (id_sede, nombre_sede) VALUES
  (1, 'Sede central')
ON DUPLICATE KEY UPDATE nombre_sede = VALUES(nombre_sede);

INSERT INTO carreras
  (id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto, titulo)
VALUES
  (1, 'RES-001', 'Tecnicatura Superior en Desarrollo de Software',
   'Desarrollo de Software', 'Técnico Superior en Desarrollo de Software'),
  (2, 'RES-002', 'Tecnicatura Superior en Enfermería',
   'Enfermería', 'Técnico Superior en Enfermería')
ON DUPLICATE KEY UPDATE
  nombre_carrera = VALUES(nombre_carrera),
  nombre_carrera_corto = VALUES(nombre_carrera_corto),
  titulo = VALUES(titulo);

INSERT INTO materias (id_materia, nombre_materia) VALUES
  (1, 'Programación I'),
  (2, 'Programación II'),
  (3, 'Base de Datos'),
  (4, 'Redes'),
  (5, 'Matemática'),
  (6, 'Anatomía'),
  (7, 'Práctica Profesional'),
  (8, 'Inglés Técnico'),
  (9, 'Gestión de Proyectos')
ON DUPLICATE KEY UPDATE nombre_materia = VALUES(nombre_materia);

INSERT INTO carrera_materias (id_carrera, id_materia, anio_cursada) VALUES
  (1, 1, 1),
  (1, 5, 1),
  (1, 8, 1),
  (1, 2, 2),
  (1, 3, 2),
  (1, 4, 3),
  (1, 9, 3),
  (2, 6, 1),
  (2, 7, 3)
ON DUPLICATE KEY UPDATE anio_cursada = VALUES(anio_cursada);

INSERT INTO correlatividades (id_carrera, id_materia, id_materia_correlativa) VALUES
  (1, 2, 1),
  (1, 3, 1),
  (1, 4, 3),
  (1, 9, 4)
ON DUPLICATE KEY UPDATE
  id_materia_correlativa = VALUES(id_materia_correlativa);

-- ---------------------------------------------------------------------
-- Alumno de prueba (id 1) en Desarrollo de Software
-- ---------------------------------------------------------------------
INSERT INTO matriculacion
  (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta)
VALUES
  (1, 1, 2024, 1, 1, NOW())
ON DUPLICATE KEY UPDATE
  anio_inscripcion = VALUES(anio_inscripcion),
  id_turno = VALUES(id_turno),
  id_sede = VALUES(id_sede);

-- Aprobadas: Programación I e Inglés Técnico.
-- Regular sin aprobar: Matemática. El resto queda como Libre.
INSERT INTO historial_academico
  (id_alumno, id_carrera, id_materia, anio_regular, nota, fecha_aprobacion)
VALUES
  (1, 1, 1, 2024, 8, '2024-12-10'),
  (1, 1, 5, 2024, 0, NULL),
  (1, 1, 8, 2024, 7, '2024-12-12')
ON DUPLICATE KEY UPDATE
  anio_regular = VALUES(anio_regular),
  nota = VALUES(nota),
  fecha_aprobacion = VALUES(fecha_aprobacion);

-- ---------------------------------------------------------------------
-- Períodos de mesas
-- ---------------------------------------------------------------------
-- El primero queda vigente durante noviembre de 2026. Los otros dos
-- sirven para ver el listado y la expansión de "Próximos finales".
INSERT INTO parametros_mesas
  (id_registro, anio_mesas, id_turno, fecha_inicio, fecha_fin, tope_mesas)
VALUES
  (1, 2026, 3, '2026-11-01', '2026-11-30', 3),
  (2, 2027, 1, '2027-02-01', '2027-02-28', 4),
  (3, 2027, 2, '2027-08-01', '2027-08-31', 4)
ON DUPLICATE KEY UPDATE
  anio_mesas = VALUES(anio_mesas),
  id_turno = VALUES(id_turno),
  fecha_inicio = VALUES(fecha_inicio),
  fecha_fin = VALUES(fecha_fin),
  tope_mesas = VALUES(tope_mesas);

-- Dejar al alumno de prueba sin inscripciones para repetir la prueba.
DELETE FROM inscripciones WHERE id_alumno = 1;
