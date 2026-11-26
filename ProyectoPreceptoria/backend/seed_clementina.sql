-- =====================================================================
-- SEED INTEGRAL DE BASE DE DATOS 'clementina' (ISFT 182)
-- Compatible con 'esquema_normalizado (2).sql' y 'finalModel.js'
-- Cubre todas las situaciones académicas para inscripción a finales:
--   1. Apto normal (0 fallas / regular vigente)
--   2. Apto con 1 aplazo previo
--   3. Apto con 1 ausencia previa
--   4. Apto con 2 fallas (aplazos o ausentes combinados)
--   5. Al límite reglamentario (3 fallas acumuladas - último intento)
--   6. Bloqueado por superar 3 fallas (4 o más aplazos/ausencias acumuladas)
--   7. Bloqueado por tiempo máximo de 8 turnos vencido (regularidad caducada)
--   8. Bloqueado por materia ya aprobada (nota >= 4)
--   9. Bloqueado por cursada no regular (libre o no cursada)
--  10. Inscripción autorizada por Excepción
-- =====================================================================

USE clementina;

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. CATÁLOGOS BASE
-- ---------------------------------------------------------------------

-- Tipos de documento
INSERT INTO tipos_documento (id_tipo_documento, descripcion) VALUES
('DNI', 'Documento Nacional de Identidad'),
('PAS', 'Pasaporte'),
('LC', 'Libreta Cívica'),
('LE', 'Libreta de Enrolamiento')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Países
INSERT INTO paises (id_pais, iso3, nombre, nacionalidad, orden) VALUES
('AR', 'ARG', 'Argentina', 'Argentina', 1),
('BR', 'BRA', 'Brasil', 'Brasileña', 2),
('CL', 'CHL', 'Chile', 'Chilena', 3),
('UY', 'URY', 'Uruguay', 'Uruguaya', 4),
('PY', 'PRY', 'Paraguay', 'Paraguaya', 5),
('ZZ', 'ZZZ', 'No especificado', 'No especificada', 9999)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Provincias
INSERT INTO provincias (id_provincia, nombre) VALUES
(1, 'Buenos Aires'),
(2, 'Ciudad Autónoma de Buenos Aires'),
(3, 'Córdoba'),
(4, 'Santa Fe')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Partidos
INSERT INTO partidos (id_partido, id_provincia, nombre) VALUES
(1, 1, 'La Matanza'),
(2, 1, 'Morón'),
(3, 1, 'Merlo')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Localidades
INSERT INTO localidades (id_localidad, id_provincia, id_partido, nombre) VALUES
(1, 1, 1, 'Isidro Casanova'),
(2, 1, 1, 'San Justo'),
(3, 1, 1, 'Ramos Mejía'),
(4, 1, 2, 'Morón'),
(5, 1, 3, 'Merlo')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Códigos postales
INSERT INTO codigos_postales (id_codigo_postal, codigo_postal, id_localidad, id_provincia) VALUES
(1, '1765', 1, 1),
(2, '1754', 2, 1),
(3, '1704', 3, 1),
(4, '1708', 4, 1),
(5, '1722', 5, 1)
ON DUPLICATE KEY UPDATE codigo_postal = VALUES(codigo_postal);

-- Turnos de cursada y turnos de finales
INSERT INTO turnos (id_turno, turno) VALUES
(1, 'Mañana'),
(2, 'Tarde'),
(3, 'Vespertino')
ON DUPLICATE KEY UPDATE turno = VALUES(turno);

-- Sedes
INSERT INTO sedes (id_sede, nombre_sede) VALUES
(1, 'Sede Central - ISFT 182'),
(2, 'Anexo I - Escuela N° 3')
ON DUPLICATE KEY UPDATE nombre_sede = VALUES(nombre_sede);

-- Carreras
INSERT INTO carreras (id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto, titulo) VALUES
(1, 'RES-5834/03', 'Tecnicatura Superior en Análisis de Sistemas', 'Sistemas', 'Técnico Superior en Análisis de Sistemas'),
(2, 'RES-6161/03', 'Tecnicatura Superior en Desarrollo de Software', 'Software', 'Técnico Superior en Desarrollo de Software'),
(3, 'RES-0854/16', 'Tecnicatura Superior en Enfermería', 'Enfermería', 'Enfermero/a Profesional'),
(4, 'RES-0273/13', 'Tecnicatura Superior en Administración', 'Administración', 'Técnico Superior en Administración')
ON DUPLICATE KEY UPDATE nombre_carrera = VALUES(nombre_carrera);

-- Disponibilidad Carrera - Sede - Turno
DELETE FROM carrera_sede_turno;
INSERT INTO carrera_sede_turno (id_carrera, id_sede, id_turno) VALUES
(1, 1, 1),
(1, 1, 2),
(1, 1, 3),
(2, 1, 1),
(2, 1, 2),
(2, 1, 3),
(3, 1, 1),
(3, 1, 2),
(3, 2, 1),
(4, 1, 3);

-- Parámetros de mesas de exámenes finales
DELETE FROM parametros_mesas;
INSERT INTO parametros_mesas (id_registro, anio_mesas, id_turno, fecha_inicio, fecha_fin, tope_mesas) VALUES
(1, 2026, 1, '2026-02-15', '2026-03-10', 3),
(2, 2026, 2, '2026-06-25', '2026-07-20', 3),
(3, 2026, 3, '2026-11-25', '2026-12-22', 3);

-- Parámetros de inscripción
DELETE FROM parametros_inscripcion;
INSERT INTO parametros_inscripcion (id_registro, anio_inscripcion_carrera, fecha_inicio, fecha_fin) VALUES
(1, 2026, '2026-02-01', '2026-03-31'),
(2, 2026, '2026-06-01', '2026-07-31'),
(3, 2026, '2026-11-01', '2026-12-31');

-- ---------------------------------------------------------------------
-- 2. MATERIAS, PLANES DE ESTUDIO Y CORRELATIVIDADES
-- ---------------------------------------------------------------------

-- Materias para todas las carreras
INSERT INTO materias (id_materia, nombre_materia) VALUES
-- Carrera 1: Análisis de Sistemas
(1, 'Algoritmos y Estructuras de Datos I'),
(2, 'Sistemas Operativos'),
(3, 'Bases de Datos'),
(4, 'Análisis y Diseño de Sistemas'),
(5, 'Prácticas Profesionalizantes III'),
(9, 'Matemática y Lógica'),
(10, 'Inglés Técnico I'),
(11, 'Programación II'),
(12, 'Redes y Comunicaciones'),
(13, 'Gestión de Proyectos Informáticos'),
(14, 'Seguridad Informática'),
(15, 'Ética y Deontología Profesional'),

-- Carrera 2: Desarrollo de Software
(6, 'Programación I'),
(7, 'Programación Web Frontend'),
(8, 'Arquitectura de Software'),
(16, 'Introducción a la Informática'),
(17, 'Álgebra y Geometría Analítica'),
(18, 'Taller de Metodologías Ágiles'),
(19, 'Desarrollo Backend y APIs'),
(20, 'Bases de Datos Relacionales y NoSQL'),
(21, 'Testing y Calidad de Software'),
(22, 'Computación en la Nube y DevOps'),
(23, 'Taller de Prácticas de Software'),

-- Carrera 3: Enfermería
(24, 'Anatomía y Fisiología Humana'),
(25, 'Fundamentos de Enfermería'),
(26, 'Salud Pública y Comunitaria'),
(27, 'Enfermería Materno Infantil'),
(28, 'Farmacología Clínica'),
(29, 'Práctica Integrada Hospitalaria'),

-- Carrera 4: Administración
(30, 'Principios de Administración'),
(31, 'Contabilidad Básica e Impositiva'),
(32, 'Administración Financiera'),
(33, 'Costos y Presupuestos'),
(34, 'Dirección Estratégica y RRHH')
ON DUPLICATE KEY UPDATE nombre_materia = VALUES(nombre_materia);

-- Carrera - Materias (Plan de Estudios con año de cursada)
DELETE FROM carrera_materias;
INSERT INTO carrera_materias (id_carrera, id_materia, anio_cursada) VALUES
-- Carrera 1: Análisis de Sistemas
(1, 1, 1),
(1, 2, 1),
(1, 9, 1),
(1, 10, 1),
(1, 3, 2),
(1, 4, 2),
(1, 11, 2),
(1, 12, 2),
(1, 5, 3),
(1, 13, 3),
(1, 14, 3),
(1, 15, 3),

-- Carrera 2: Desarrollo de Software
(2, 6, 1),
(2, 16, 1),
(2, 17, 1),
(2, 18, 1),
(2, 7, 2),
(2, 19, 2),
(2, 20, 2),
(2, 21, 2),
(2, 8, 3),
(2, 22, 3),
(2, 23, 3),

-- Carrera 3: Enfermería
(3, 24, 1),
(3, 25, 1),
(3, 26, 1),
(3, 27, 2),
(3, 28, 2),
(3, 29, 3),

-- Carrera 4: Administración
(4, 30, 1),
(4, 31, 1),
(4, 32, 2),
(4, 33, 2),
(4, 34, 3);

-- Correlatividades
DELETE FROM correlatividades;
INSERT INTO correlatividades (id_carrera, id_materia, id_materia_correlativa) VALUES
-- Análisis de Sistemas
(1, 3, 1),   -- Bases de Datos requiere Algoritmos I
(1, 4, 1),   -- Análisis y Diseño requiere Algoritmos I
(1, 4, 2),   -- Análisis y Diseño requiere Sistemas Operativos
(1, 11, 1),  -- Programación II requiere Algoritmos I
(1, 12, 2),  -- Redes requiere Sistemas Operativos
(1, 5, 3),   -- Prácticas III requiere Bases de Datos
(1, 5, 4),   -- Prácticas III requiere Análisis y Diseño

-- Desarrollo de Software
(2, 7, 6),   -- Frontend requiere Programación I
(2, 19, 6),  -- Backend requiere Programación I
(2, 21, 6),  -- Testing requiere Programación I
(2, 8, 19),  -- Arquitectura requiere Backend y APIs

-- Enfermería
(3, 28, 24), -- Farmacología requiere Anatomía
(3, 29, 25), -- Práctica Integrada requiere Fundamentos
(3, 29, 27); -- Práctica Integrada requiere Materno Infantil

-- ---------------------------------------------------------------------
-- 3. ALUMNOS Y MATRICULACIÓN
-- ---------------------------------------------------------------------

-- Lista variada de 12 alumnos
INSERT INTO alumnos (
  id_alumno, id_tipo_documento, numero_documento, legajo,
  primer_apellido, otros_apellidos, primer_nombre, otros_nombres,
  email, sexo, fecha_nacimiento, id_pais_nacimiento, id_localidad_nacimiento, alta_registro
) VALUES
(1, 'DNI', 40111222, 'LEG-2023-010', 'Pérez', 'García', 'Juan', 'Carlos', 'juan.perez@isft182.edu.ar', 'M', '1998-05-14', 'AR', 1, NOW()),
(2, 'DNI', 41222333, 'LEG-2024-025', 'Gómez', NULL, 'María', 'Elena', 'maria.gomez@isft182.edu.ar', 'F', '1999-08-20', 'AR', 2, NOW()),
(3, 'DNI', 42333444, 'LEG-2022-040', 'López', 'Martínez', 'Carlos', 'Alberto', 'carlos.lopez@isft182.edu.ar', 'M', '2000-01-15', 'AR', 3, NOW()),
(4, 'DNI', 43444555, 'LEG-2023-015', 'Fernández', NULL, 'Laura', 'Beatriz', 'laura.fernandez@isft182.edu.ar', 'F', '2001-09-30', 'AR', 4, NOW()),
(5, 'DNI', 44555666, 'LEG-2024-008', 'Rossi', 'De Luca', 'Lucas', 'Agustín', 'lucas.rossi@isft182.edu.ar', 'M', '2002-03-22', 'AR', 1, NOW()),
(6, 'DNI', 45666777, 'LEG-2023-050', 'Benítez', NULL, 'Sofía', 'Camila', 'sofia.benitez@isft182.edu.ar', 'F', '2003-11-12', 'AR', 2, NOW()),
(7, 'DNI', 39888999, 'LEG-2021-002', 'Morales', 'Suárez', 'Matías', 'Daniel', 'matias.morales@isft182.edu.ar', 'M', '1997-07-04', 'AR', 3, NOW()),
(8, 'DNI', 46111000, 'LEG-2024-019', 'Herrera', NULL, 'Valentina', 'Sol', 'valentina.herrera@isft182.edu.ar', 'F', '2004-02-18', 'AR', 5, NOW()),
(9, 'DNI', 43999111, 'LEG-2023-033', 'Navarro', 'Ríos', 'Franco', 'Ezequiel', 'franco.navarro@isft182.edu.ar', 'M', '2001-12-05', 'AR', 1, NOW()),
(10, 'DNI', 44123456, 'LEG-2023-077', 'Rodríguez', NULL, 'Camila', 'Inés', 'camila.rodriguez@isft182.edu.ar', 'F', '2002-06-25', 'AR', 4, NOW()),
(11, 'DNI', 42987654, 'LEG-2022-064', 'Domínguez', 'Alvarez', 'Nicolás', 'Martín', 'nicolas.dominguez@isft182.edu.ar', 'M', '2000-10-10', 'AR', 2, NOW()),
(12, 'DNI', 45789123, 'LEG-2025-012', 'Méndez', NULL, 'Julieta', 'Romina', 'julieta.mendez@isft182.edu.ar', 'F', '2003-04-08', 'AR', 3, NOW())
ON DUPLICATE KEY UPDATE 
  primer_apellido = VALUES(primer_apellido),
  primer_nombre = VALUES(primer_nombre),
  email = VALUES(email),
  legajo = VALUES(legajo);

-- Domicilios
DELETE FROM domicilios_alumno;
INSERT INTO domicilios_alumno (id_alumno, calle, numero, id_localidad, id_codigo_postal) VALUES
(1, 'Av. de Mayo', 450, 3, 3),
(2, 'Almafuerte', 1230, 2, 2),
(3, 'República', 840, 1, 1),
(4, 'Belgrano', 320, 4, 4),
(5, 'Pres. Perón', 2150, 1, 1),
(6, 'Arieta', 780, 2, 2),
(7, 'Brandsen', 1600, 3, 3),
(8, 'Av. Real', 950, 5, 5),
(9, 'Villegas', 510, 1, 1),
(10, 'Sarmiento', 1140, 4, 4),
(11, 'Dr. Monasterio', 620, 2, 2),
(12, 'Alvear', 430, 3, 3);

-- Matriculación en carreras, turnos y sedes
DELETE FROM matriculacion;
INSERT INTO matriculacion (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta) VALUES
(1, 1, 2023, 3, 1, NOW()),  -- Juan Pérez: Sistemas (Vespertino)
(2, 2, 2024, 3, 1, NOW()),  -- María Gómez: Software (Vespertino)
(3, 1, 2022, 3, 1, NOW()),  -- Carlos López: Sistemas (Vespertino)
(4, 3, 2023, 1, 1, NOW()),  -- Laura Fernández: Enfermería (Mañana)
(5, 2, 2024, 3, 1, NOW()),  -- Lucas Rossi: Software (Vespertino)
(6, 1, 2023, 1, 1, NOW()),  -- Sofía Benítez: Sistemas (Mañana)
(7, 1, 2021, 3, 1, NOW()),  -- Matías Morales: Sistemas (Vespertino)
(8, 4, 2024, 3, 1, NOW()),  -- Valentina Herrera: Administración (Vespertino)
(9, 2, 2023, 2, 1, NOW()),  -- Franco Navarro: Software (Tarde)
(10, 3, 2023, 2, 1, NOW()), -- Camila Rodríguez: Enfermería (Tarde)
(11, 1, 2022, 3, 1, NOW()), -- Nicolás Domínguez: Sistemas (Vespertino)
(12, 2, 2025, 1, 1, NOW()); -- Julieta Méndez: Software (Mañana)

-- Matriculación Detalle (Materias que cursa/cursó cada alumno)
DELETE FROM matriculacion_detalle;
INSERT INTO matriculacion_detalle (id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia) VALUES
(1, 1, 2023, 1, 'REG'),
(1, 1, 2023, 2, 'REG'),
(1, 1, 2024, 3, 'REG'),
(1, 1, 2024, 4, 'REG'),
(2, 2, 2024, 6, 'REG'),
(2, 2, 2024, 7, 'REG'),
(2, 2, 2025, 19, 'REG'),
(3, 1, 2022, 1, 'REG'),
(3, 1, 2022, 2, 'REG'),
(4, 3, 2023, 24, 'REG'),
(4, 3, 2023, 25, 'REG'),
(5, 2, 2024, 6, 'REG'),
(5, 2, 2024, 17, 'REG'),
(6, 1, 2023, 2, 'REG'),
(6, 1, 2023, 3, 'REG'),
(7, 1, 2021, 1, 'REG'),
(7, 1, 2024, 11, 'REG'),
(8, 4, 2024, 30, 'REG'),
(8, 4, 2024, 31, 'REG'),
(9, 2, 2023, 7, 'REG'),
(10, 3, 2023, 24, 'REG'),
(11, 1, 2022, 3, 'REG'),
(12, 2, 2025, 6, 'REG');

-- ---------------------------------------------------------------------
-- 4. HISTORIAL ACADÉMICO (REGULARIDADES Y MATERIAS APROBADAS)
-- ---------------------------------------------------------------------

DELETE FROM historial_academico;
INSERT INTO historial_academico (
  id_alumno, id_carrera, id_materia,
  anio_regular, validado_regular, nota, validado_examen, fecha_aprobacion, fecha_alta
) VALUES
-- ---------------------------------------------------------------------
-- ALUMNO 1: Juan Pérez (Carrera 1: Análisis de Sistemas)
-- ---------------------------------------------------------------------
-- Materia 1: Algoritmos I -> Regular en 2025, 0 fallas (APTO NORMAL)
(1, 1, 1, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 2: Sistemas Operativos -> Regular en 2021 (TIEMPO MÁXIMO VENCIDO: >8 turnos)
(1, 1, 2, 2021, 'T', 0, 'F', NULL, NOW()),
-- Materia 3: Bases de Datos -> Aprobada con final (YA APROBADA - NOTA 8)
(1, 1, 3, 2024, 'T', 8, 'T', '2024-12-18', NOW()),
-- Materia 4: Análisis y Diseño -> Regular en 2024, registra 3 aplazos (AL LÍMITE: 3 FALLAS)
(1, 1, 4, 2024, 'T', 0, 'F', NULL, NOW()),
-- Materia 9: Matemática y Lógica -> Regular en 2025, registra 1 aplazo (APTO CON 1 DESAPROBADO)
(1, 1, 9, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 10: Inglés Técnico I -> Regular en 2025, sin intentos (APTO NORMAL)
(1, 1, 10, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 11: Programación II -> No regularizada (NO REGULAR)
(1, 1, 11, 0, 'F', 0, 'F', NULL, NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 2: María Gómez (Carrera 2: Desarrollo de Software)
-- ---------------------------------------------------------------------
-- Materia 6: Programación I -> Regular en 2024, 3 fallas previas (2 aplazos + 1 ausente) (AL LÍMITE)
(2, 2, 6, 2024, 'T', 0, 'F', NULL, NOW()),
-- Materia 7: Prog Web Frontend -> Regular en 2024, 4 fallas previas (BLOQUEADO POR 4 FALLAS / EXCEPCIÓN)
(2, 2, 7, 2024, 'T', 0, 'F', NULL, NOW()),
-- Materia 16: Introducción a la Informática -> Aprobada con 9 (YA APROBADA)
(2, 2, 16, 2024, 'T', 9, 'T', '2024-12-20', NOW()),
-- Materia 17: Álgebra y Geometría -> Regular en 2025, 0 intentos (APTO NORMAL)
(2, 2, 17, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 19: Backend y APIs -> Regular en 2025, 2 fallas (1 aplazo + 1 ausente) (APTO CON 2 FALLAS)
(2, 2, 19, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 21: Testing y Calidad -> Aprobada con 7 (YA APROBADA)
(2, 2, 21, 2024, 'T', 7, 'T', '2025-07-15', NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 3: Carlos López (Carrera 1: Análisis de Sistemas)
-- ---------------------------------------------------------------------
-- Materia 4: Análisis y Diseño -> Cursada desaprobada / no regular (NO REGULAR)
(3, 1, 4, 0, 'F', 0, 'F', NULL, NOW()),
-- Materia 2: Sistemas Operativos -> Regular en 2020 (TIEMPO MÁXIMO SUPERADO POR VARIOS AÑOS)
(3, 1, 2, 2020, 'T', 0, 'F', NULL, NOW()),
-- Materia 1: Algoritmos I -> Aprobada con 6 (YA APROBADA)
(3, 1, 1, 2024, 'T', 6, 'T', '2025-02-24', NOW()),
-- Materia 10: Inglés Técnico I -> Regular en 2025, 1 intento ausente (APTO CON 1 AUSENCIA)
(3, 1, 10, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 12: Redes y Comunicaciones -> Regular en 2025, sin intentos (APTO NORMAL)
(3, 1, 12, 2025, 'T', 0, 'F', NULL, NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 4: Laura Fernández (Carrera 3: Enfermería)
-- ---------------------------------------------------------------------
-- Materia 24: Anatomía y Fisiología -> Regular en 2022 (TIEMPO MÁXIMO VENCIDO: venció Feb 2025)
(4, 3, 24, 2022, 'T', 0, 'F', NULL, NOW()),
-- Materia 25: Fundamentos de Enfermería -> Aprobada con 10 (YA APROBADA)
(4, 3, 25, 2023, 'T', 10, 'T', '2023-12-15', NOW()),
-- Materia 26: Salud Pública -> Regular en 2025, 0 intentos (APTO NORMAL)
(4, 3, 26, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 28: Farmacología Clínica -> Regular en 2024, 2 aplazos (APTO CON 2 DESAPROBADOS)
(4, 3, 28, 2024, 'T', 0, 'F', NULL, NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 5: Lucas Rossi (Carrera 2: Desarrollo de Software)
-- ---------------------------------------------------------------------
-- Materia 6: Programación I -> Regular en 2024, 4 aplazos numéricos consecutivos (BLOQUEADO: 4 APLAZOS)
(5, 2, 6, 2024, 'T', 0, 'F', NULL, NOW()),
-- Materia 17: Álgebra y Geometría -> Regular en 2019 (TIEMPO MÁXIMO HIPER-VENCIDO)
(5, 2, 17, 2019, 'T', 0, 'F', NULL, NOW()),
-- Materia 16: Introducción a la Informática -> Regular en 2025, 0 intentos (APTO NORMAL)
(5, 2, 16, 2025, 'T', 0, 'F', NULL, NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 6: Sofía Benítez (Carrera 1: Análisis de Sistemas)
-- ---------------------------------------------------------------------
-- Materia 2: Sistemas Operativos -> Regular en 2023 (Turno 8 recién venció en turno Jul 2026)
(6, 1, 2, 2023, 'T', 0, 'F', NULL, NOW()),
-- Materia 3: Bases de Datos -> Regular en 2025, 1 aplazo previo (APTO CON 1 DESAPROBADO)
(6, 1, 3, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 14: Seguridad Informática -> Sin cursada (NO REGULAR)
(6, 1, 14, 0, 'F', 0, 'F', NULL, NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 7: Matías Morales (Carrera 1: Análisis de Sistemas)
-- ---------------------------------------------------------------------
-- Materia 1: Algoritmos I -> Regular en 2024 (APTO: Regularidad renovada tras recursar)
(7, 1, 1, 2024, 'T', 0, 'F', NULL, NOW()),
-- Materia 11: Programación II -> Regular en 2024, 3 ausencias consecutivas a mesa (AL LÍMITE: 3 AUSENCIAS)
(7, 1, 11, 2024, 'T', 0, 'F', NULL, NOW()),
-- Materia 5: Prácticas III -> Regular en 2025, 0 intentos (APTO NORMAL)
(7, 1, 5, 2025, 'T', 0, 'F', NULL, NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 8: Valentina Herrera (Carrera 4: Administración)
-- ---------------------------------------------------------------------
-- Materia 30: Principios de Administración -> Aprobada con 7 (YA APROBADA)
(8, 4, 30, 2024, 'T', 7, 'T', '2024-12-14', NOW()),
-- Materia 31: Contabilidad Básica -> Regular en 2024, 2 aplazos (APTO CON 2 DESAPROBADOS)
(8, 4, 31, 2024, 'T', 0, 'F', NULL, NOW()),
-- Materia 32: Administración Financiera -> Regular en 2022 (TIEMPO MÁXIMO VENCIDO)
(8, 4, 32, 2022, 'T', 0, 'F', NULL, NOW()),
-- Materia 33: Costos y Presupuestos -> Libre / sin cursada (NO REGULAR)
(8, 4, 33, 0, 'F', 0, 'F', NULL, NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 9: Franco Navarro (Carrera 2: Desarrollo de Software)
-- ---------------------------------------------------------------------
-- Materia 7: Prog Web Frontend -> Regular en 2023 (INSCRIPCIÓN POR EXCEPCIÓN DECANAL)
(9, 2, 7, 2023, 'T', 0, 'F', NULL, NOW()),
-- Materia 19: Backend y APIs -> Regular en 2025, 1 aplazo previo (APTO CON 1 DESAPROBADO)
(9, 2, 19, 2025, 'T', 0, 'F', NULL, NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 10: Camila Rodríguez (Carrera 3: Enfermería)
-- ---------------------------------------------------------------------
-- Materia 24: Anatomía y Fisiología -> Regular en 2024, 2 fallas (1 aplazo + 1 ausente) (APTO CON 2 FALLAS)
(10, 3, 24, 2024, 'T', 0, 'F', NULL, NOW()),
-- Materia 27: Enfermería Materno Infantil -> Regular en 2025, 0 intentos (APTO NORMAL)
(10, 3, 27, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 29: Práctica Integrada -> Aprobada con 9 (YA APROBADA)
(10, 3, 29, 2024, 'T', 9, 'T', '2025-12-18', NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 11: Nicolás Domínguez (Carrera 1: Análisis de Sistemas)
-- ---------------------------------------------------------------------
-- Materia 3: Bases de Datos -> Regular en 2024, 4 ausencias acumuladas (BLOQUEADO POR 4 AUSENCIAS)
(11, 1, 3, 2024, 'T', 0, 'F', NULL, NOW()),
-- Materia 1: Algoritmos I -> Aprobada con 6 (YA APROBADA)
(11, 1, 1, 2023, 'T', 6, 'T', '2024-03-05', NOW()),

-- ---------------------------------------------------------------------
-- ALUMNO 12: Julieta Méndez (Carrera 2: Desarrollo de Software)
-- ---------------------------------------------------------------------
-- Materia 6: Programación I -> Regular en 2025, 0 intentos (APTO VIRGEN)
(12, 2, 6, 2025, 'T', 0, 'F', NULL, NOW()),
-- Materia 16: Introducción a la Informática -> Aprobada con 10 (YA APROBADA CON 10)
(12, 2, 16, 2025, 'T', 10, 'T', '2025-12-21', NOW()),
-- Materia 17: Álgebra y Geometría -> Regular en 2024, 1 aplazo (APTO CON 1 DESAPROBADO)
(12, 2, 17, 2024, 'T', 0, 'F', NULL, NOW());

-- ---------------------------------------------------------------------
-- 5. RENDICIONES DE EXÁMENES FINALES (INTENTOS, CALIFICACIONES, AUSENCIAS)
-- ---------------------------------------------------------------------

DELETE FROM rendiciones_finales;
INSERT INTO rendiciones_finales (
  id_alumno, id_carrera, id_materia,
  anio_turno, turno_instancia, id_llamado,
  fecha_examen, nota, estado, es_ausente, es_excepcion, motivo_excepcion, fecha_registro
) VALUES
-- Juan Pérez (Alumno 1):
(1, 1, 9, 2025, 3, 1, '2025-12-16', 2, 'DESAPROBADO', 0, 0, NULL, '2025-12-16 19:30:00'),
(1, 1, 4, 2024, 3, 1, '2024-12-14', 2, 'DESAPROBADO', 0, 0, NULL, '2024-12-14 18:00:00'),
(1, 1, 4, 2025, 1, 1, '2025-02-28', 2, 'DESAPROBADO', 0, 0, NULL, '2025-02-28 18:00:00'),
(1, 1, 4, 2025, 2, 1, '2025-07-08', 3, 'DESAPROBADO', 0, 0, NULL, '2025-07-08 18:30:00'),
(1, 1, 3, 2024, 3, 1, '2024-12-18', 8, 'APROBADO',    0, 0, NULL, '2024-12-18 20:00:00'),

-- María Gómez (Alumno 2):
(2, 2, 6, 2024, 3, 1, '2024-12-10', 2, 'DESAPROBADO', 0, 0, NULL, '2024-12-10 18:00:00'),
(2, 2, 6, 2025, 1, 1, '2025-02-25', NULL, 'AUSENTE',  1, 0, NULL, '2025-02-25 18:00:00'),
(2, 2, 6, 2025, 2, 1, '2025-07-05', 3, 'DESAPROBADO', 0, 0, NULL, '2025-07-05 18:00:00'),
(2, 2, 7, 2024, 3, 1, '2024-12-12', 2, 'DESAPROBADO', 0, 0, NULL, '2024-12-12 19:00:00'),
(2, 2, 7, 2025, 1, 1, '2025-02-28', 2, 'DESAPROBADO', 0, 0, NULL, '2025-02-28 19:00:00'),
(2, 2, 7, 2025, 2, 1, '2025-07-10', NULL, 'AUSENTE',  1, 0, NULL, '2025-07-10 19:00:00'),
(2, 2, 7, 2025, 3, 1, '2025-12-15', 3, 'DESAPROBADO', 0, 0, NULL, '2025-12-15 19:00:00'),
(2, 2, 7, 2026, 2, 1, NULL,         NULL, 'INSCRIPTO', 0, 1, 'Autorización decanal por correlatividad terminal', NOW()),
(2, 2, 19, 2025, 3, 1, '2025-12-18', 2, 'DESAPROBADO', 0, 0, NULL, '2025-12-18 19:00:00'),
(2, 2, 19, 2026, 1, 1, '2026-02-27', NULL, 'AUSENTE', 1, 0, NULL, '2026-02-27 19:00:00'),
(2, 2, 16, 2024, 3, 1, '2024-12-20', 9, 'APROBADO',   0, 0, NULL, '2024-12-20 18:30:00'),
(2, 2, 21, 2025, 2, 1, '2025-07-15', 7, 'APROBADO',   0, 0, NULL, '2025-07-15 19:00:00'),

-- Carlos López (Alumno 3):
(3, 1, 10, 2025, 3, 1, '2025-12-19', NULL, 'AUSENTE', 1, 0, NULL, '2025-12-19 18:00:00'),
(3, 1, 1,  2025, 1, 1, '2025-02-24', 6, 'APROBADO',   0, 0, NULL, '2025-02-24 18:00:00'),

-- Laura Fernández (Alumno 4):
(4, 3, 28, 2024, 3, 1, '2024-12-17', 2, 'DESAPROBADO', 0, 0, NULL, '2024-12-17 10:00:00'),
(4, 3, 28, 2025, 2, 1, '2025-07-14', 3, 'DESAPROBADO', 0, 0, NULL, '2025-07-14 10:00:00'),
(4, 3, 25, 2023, 3, 1, '2023-12-15', 10, 'APROBADO',  0, 0, NULL, '2023-12-15 11:00:00'),

-- Lucas Rossi (Alumno 5):
(5, 2, 6, 2024, 3, 1, '2024-12-10', 2, 'DESAPROBADO', 0, 0, NULL, '2024-12-10 18:00:00'),
(5, 2, 6, 2025, 1, 1, '2025-02-25', 1, 'DESAPROBADO', 0, 0, NULL, '2025-02-25 18:00:00'),
(5, 2, 6, 2025, 2, 1, '2025-07-05', 3, 'DESAPROBADO', 0, 0, NULL, '2025-07-05 18:00:00'),
(5, 2, 6, 2025, 3, 1, '2025-12-16', 2, 'DESAPROBADO', 0, 0, NULL, '2025-12-16 18:00:00'),

-- Sofía Benítez (Alumno 6):
(6, 1, 3, 2025, 3, 1, '2025-12-18', 3, 'DESAPROBADO', 0, 0, NULL, '2025-12-18 09:30:00'),

-- Matías Morales (Alumno 7):
(7, 1, 11, 2024, 3, 1, '2024-12-16', NULL, 'AUSENTE', 1, 0, NULL, '2024-12-16 18:00:00'),
(7, 1, 11, 2025, 1, 1, '2025-03-02', NULL, 'AUSENTE', 1, 0, NULL, '2025-03-02 18:00:00'),
(7, 1, 11, 2025, 2, 1, '2025-07-11', NULL, 'AUSENTE', 1, 0, NULL, '2025-07-11 18:00:00'),

-- Valentina Herrera (Alumno 8):
(8, 4, 31, 2024, 3, 1, '2024-12-18', 2, 'DESAPROBADO', 0, 0, NULL, '2024-12-18 19:00:00'),
(8, 4, 31, 2025, 2, 1, '2025-07-16', 3, 'DESAPROBADO', 0, 0, NULL, '2025-07-16 19:00:00'),
(8, 4, 30, 2024, 3, 1, '2024-12-14', 7, 'APROBADO',    0, 0, NULL, '2024-12-14 18:30:00'),

-- Franco Navarro (Alumno 9):
(9, 2, 7, 2026, 1, 1, NULL,         NULL, 'INSCRIPTO', 0, 1, 'Resolución Decanal 45/26 por representación deportiva', NOW()),
(9, 2, 19, 2025, 3, 1, '2025-12-18', 2, 'DESAPROBADO', 0, 0, NULL, '2025-12-18 15:00:00'),

-- Camila Rodríguez (Alumno 10):
(10, 3, 24, 2024, 3, 1, '2024-12-15', 3, 'DESAPROBADO', 0, 0, NULL, '2024-12-15 15:30:00'),
(10, 3, 24, 2025, 1, 1, '2025-02-26', NULL, 'AUSENTE',  1, 0, NULL, '2025-02-26 15:30:00'),
(10, 3, 29, 2025, 3, 1, '2025-12-18', 9, 'APROBADO',    0, 0, NULL, '2025-12-18 14:00:00'),

-- Nicolás Domínguez (Alumno 11):
(11, 1, 3, 2024, 3, 1, '2024-12-18', NULL, 'AUSENTE', 1, 0, NULL, '2024-12-18 18:30:00'),
(11, 1, 3, 2025, 1, 1, '2025-03-01', NULL, 'AUSENTE', 1, 0, NULL, '2025-03-01 18:30:00'),
(11, 1, 3, 2025, 2, 1, '2025-07-09', NULL, 'AUSENTE', 1, 0, NULL, '2025-07-09 18:30:00'),
(11, 1, 3, 2025, 3, 1, '2025-12-17', NULL, 'AUSENTE', 1, 0, NULL, '2025-12-17 18:30:00'),
(11, 1, 1, 2024, 1, 1, '2024-03-05', 6, 'APROBADO',   0, 0, NULL, '2024-03-05 18:30:00'),

-- Julieta Méndez (Alumno 12):
(12, 2, 17, 2024, 3, 1, '2024-12-19', 2, 'DESAPROBADO', 0, 0, NULL, '2024-12-19 09:30:00'),
(12, 2, 16, 2025, 3, 1, '2025-12-21', 10, 'APROBADO',  0, 0, NULL, '2025-12-21 09:00:00');

-- ---------------------------------------------------------------------
-- 6. TABLA LEGACY DE INSCRIPCIONES
-- ---------------------------------------------------------------------
DELETE FROM inscripciones;
INSERT INTO inscripciones (id_alumno, id_carrera, id_materia, anio, id_turno, id_llamado, estado, verificada, fecha_hora) VALUES
(1, 1, 9, 2025, 3, 1, 'R', 'S', '2025-11-28 10:15:00'),
(1, 1, 4, 2024, 3, 1, 'R', 'S', '2024-11-25 11:20:00'),
(1, 1, 4, 2025, 1, 1, 'R', 'S', '2025-02-10 14:00:00'),
(1, 1, 4, 2025, 2, 1, 'R', 'S', '2025-06-20 16:30:00'),
(1, 1, 3, 2024, 3, 1, 'R', 'S', '2024-11-26 12:00:00'),
(2, 2, 6, 2024, 3, 1, 'R', 'S', '2024-11-24 10:00:00'),
(2, 2, 6, 2025, 1, 1, 'R', 'S', '2025-02-12 11:30:00'),
(2, 2, 6, 2025, 2, 1, 'R', 'S', '2025-06-22 17:15:00'),
(2, 2, 7, 2024, 3, 1, 'R', 'S', '2024-11-25 15:45:00'),
(2, 2, 7, 2025, 1, 1, 'R', 'S', '2025-02-15 16:00:00'),
(2, 2, 7, 2025, 2, 1, 'R', 'S', '2025-06-25 18:20:00'),
(2, 2, 7, 2025, 3, 1, 'R', 'S', '2025-11-27 19:10:00'),
(2, 2, 7, 2026, 2, 1, 'I', 'S', NOW()),
(9, 2, 7, 2026, 1, 1, 'I', 'S', NOW());

SET FOREIGN_KEY_CHECKS = 1;

