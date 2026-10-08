-- =====================================================================
-- Base LOCAL DE PRUEBA para Clementina (XAMPP / MariaDB)
--
-- NO es la base real de Hostinger. Está reconstruida a partir de las
-- consultas del código (modelo/Usuario.php, Alumno.php e
-- InscripcionFinal.php): tiene solo las tablas y columnas que el código
-- usa. Sirve para probar login, Mis datos e inscripción a finales.
--
-- Usuario de prueba:  prueba@clementina.test  /  prueba123  (DNI 30111222)
-- En config/config.php:  define('DB_NAME', 'clementina_local');
-- =====================================================================

DROP DATABASE IF EXISTS `clementina_local`;
CREATE DATABASE `clementina_local`
  DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_general_ci;
USE `clementina_local`;
SET NAMES utf8mb4;

CREATE TABLE alumnos (
  idtipodocumento  VARCHAR(4)   NOT NULL,
  numerodocumento  BIGINT       NOT NULL,
  primernombre     VARCHAR(45)  NOT NULL,
  otrosnombres     VARCHAR(45)  DEFAULT NULL,
  primerapellido   VARCHAR(45)  NOT NULL,
  otrosapellidos   VARCHAR(45)  DEFAULT NULL,
  idemail          VARCHAR(100) DEFAULT NULL,
  password         VARCHAR(255) DEFAULT NULL,
  telefonopricipal VARCHAR(30)  DEFAULT NULL,
  PRIMARY KEY (idtipodocumento, numerodocumento)
) ENGINE=InnoDB;

CREATE TABLE carreras (
  idcarrera     INT NOT NULL,
  nombrecarrera VARCHAR(100) NOT NULL,
  PRIMARY KEY (idcarrera)
) ENGINE=InnoDB;

CREATE TABLE materias (
  idmateria     INT NOT NULL,
  nombremateria VARCHAR(100) NOT NULL,
  PRIMARY KEY (idmateria)
) ENGINE=InnoDB;

CREATE TABLE rel_carrera_materias (
  idcarrera   INT NOT NULL,
  idmateria   INT NOT NULL,
  aniocursada INT NOT NULL,
  PRIMARY KEY (idcarrera, idmateria)
) ENGINE=InnoDB;

CREATE TABLE correlatividades (
  idcarrera            INT NOT NULL,
  idmateria            INT NOT NULL,
  idmateriacorrelativa INT NOT NULL,
  PRIMARY KEY (idcarrera, idmateria, idmateriacorrelativa)
) ENGINE=InnoDB;

CREATE TABLE matriculacion (
  idtipodocumento VARCHAR(4) NOT NULL,
  numerodocumento BIGINT     NOT NULL,
  idcarrera       INT        NOT NULL,
  PRIMARY KEY (idtipodocumento, numerodocumento, idcarrera)
) ENGINE=InnoDB;

CREATE TABLE historialacademico (
  idtipodocumento VARCHAR(4) NOT NULL,
  numerodocumento BIGINT     NOT NULL,
  idcarrera       INT        NOT NULL,
  idmateria       INT        NOT NULL,
  anioregular     INT        DEFAULT 0,
  nota            INT        DEFAULT NULL,
  PRIMARY KEY (idtipodocumento, numerodocumento, idcarrera, idmateria)
) ENGINE=InnoDB;

CREATE TABLE parametros (
  aniomesas        INT  NOT NULL,
  idturnomesas     INT  NOT NULL,
  fechainiciomesas DATE NOT NULL,
  fechafinmesas    DATE NOT NULL,
  topemesas        INT  NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE inscripciones (
  idinscripcion     INT NOT NULL AUTO_INCREMENT,
  idtipodedocumento VARCHAR(4)   NOT NULL,
  iddocumento       BIGINT       NOT NULL,
  primernombre      VARCHAR(45)  DEFAULT NULL,
  otrosnombres      VARCHAR(45)  DEFAULT NULL,
  primerapellido    VARCHAR(45)  DEFAULT NULL,
  otrosapellidos    VARCHAR(45)  DEFAULT NULL,
  idemail           VARCHAR(100) DEFAULT NULL,
  idcarrera         INT NOT NULL,
  idmateria         INT NOT NULL,
  anio              INT NOT NULL,
  idturno           INT NOT NULL,
  idllamado         INT NOT NULL,
  estado            CHAR(1) DEFAULT 'A',
  verificada        CHAR(1) DEFAULT 'N',
  fechahora         DATETIME DEFAULT NULL,
  PRIMARY KEY (idinscripcion)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Datos de prueba
-- ---------------------------------------------------------------------

INSERT INTO alumnos VALUES
 ('DNI', 30111222, 'Alumno', NULL, 'De Prueba', NULL,
  'prueba@clementina.test', 'prueba123', '1100000000');

INSERT INTO carreras VALUES (1, 'Tecnicatura Superior en Análisis de Sistemas');

INSERT INTO materias VALUES
 (1, 'Algoritmos y Estructuras de Datos I'),
 (2, 'Sistemas y Organizaciones'),
 (3, 'Matemática I'),
 (4, 'Algoritmos y Estructuras de Datos II'),
 (5, 'Matemática II'),
 (6, 'Base de Datos');

INSERT INTO rel_carrera_materias VALUES
 (1,1,1),(1,2,1),(1,3,1),(1,4,2),(1,5,2),(1,6,2);

-- AED II pide AED I (aprobada) / Matemática II pide Matemática I (sin aprobar)
INSERT INTO correlatividades VALUES (1,4,1),(1,5,3);

INSERT INTO matriculacion VALUES ('DNI', 30111222, 1);

-- AED I aprobada con 7 (no debe aparecer) / Sistemas regular sin rendir
INSERT INTO historialacademico VALUES
 ('DNI', 30111222, 1, 1, 2025, 7),
 ('DNI', 30111222, 1, 2, 2025, NULL);

-- Turno 3 = Diciembre, abierto hasta fin de año, máximo 3 mesas
INSERT INTO parametros VALUES (2026, 3, '2026-10-01', '2026-12-31', 3);
