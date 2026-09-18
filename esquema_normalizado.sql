-- =====================================================================
-- Esquema normalizado propuesto para u714838186_desarrollo (ISFT 182)
-- Basado en el análisis de bd_clementina.sql
-- Charset unificado en utf8mb4 para evitar problemas de acentos.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `CLEMENTINA`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- =====================================================================
-- 1. CATÁLOGOS
-- =====================================================================

CREATE TABLE tipos_documento (
  id_tipo_documento VARCHAR(4) NOT NULL,
  descripcion       VARCHAR(30) NOT NULL,
  PRIMARY KEY (id_tipo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tipos_personal (
  id_tipo_personal CHAR(1) NOT NULL,
  descripcion      VARCHAR(30) NOT NULL,
  PRIMARY KEY (id_tipo_personal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE paises (
  id_pais      CHAR(2) NOT NULL,
  iso3         CHAR(3) DEFAULT NULL,
  nombre       VARCHAR(45) DEFAULT NULL,
  nacionalidad VARCHAR(45) DEFAULT NULL,
  orden        INT DEFAULT 1000,
  PRIMARY KEY (id_pais)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE provincias (
  id_provincia INT NOT NULL,
  nombre       VARCHAR(31) DEFAULT NULL,
  PRIMARY KEY (id_provincia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nueva: antes se usaba idpartidodomicilio en alumnos sin tabla de origen.
CREATE TABLE partidos (
  id_partido   INT NOT NULL,
  id_provincia INT NOT NULL,
  nombre       VARCHAR(60) NOT NULL,
  PRIMARY KEY (id_partido),
  KEY fk_partido_provincia (id_provincia),
  CONSTRAINT fk_partido_provincia FOREIGN KEY (id_provincia)
    REFERENCES provincias (id_provincia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE localidades (
  id_localidad INT NOT NULL,
  id_provincia INT DEFAULT NULL,
  id_partido   INT DEFAULT NULL,
  nombre       VARCHAR(83) DEFAULT NULL,
  PRIMARY KEY (id_localidad),
  KEY fk_localidad_provincia (id_provincia),
  KEY fk_localidad_partido (id_partido),
  CONSTRAINT fk_localidad_provincia FOREIGN KEY (id_provincia)
    REFERENCES provincias (id_provincia),
  CONSTRAINT fk_localidad_partido FOREIGN KEY (id_partido)
    REFERENCES partidos (id_partido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reemplaza a provinciapostallocalidad (que no tenía PK).
CREATE TABLE codigos_postales (
  id_codigo_postal BIGINT NOT NULL AUTO_INCREMENT,
  codigo_postal    VARCHAR(8) NOT NULL,
  id_localidad     INT NOT NULL,
  id_provincia     INT NOT NULL,
  PRIMARY KEY (id_codigo_postal),
  UNIQUE KEY uq_cp_localidad (codigo_postal, id_localidad),
  KEY fk_cp_provincia (id_provincia),
  CONSTRAINT fk_cp_localidad FOREIGN KEY (id_localidad)
    REFERENCES localidades (id_localidad),
  CONSTRAINT fk_cp_provincia FOREIGN KEY (id_provincia)
    REFERENCES provincias (id_provincia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reemplaza a interurbanos (sin PK ni FK).
CREATE TABLE codigos_area_telefonicos (
  id_area      BIGINT NOT NULL AUTO_INCREMENT,
  area         INT NOT NULL,
  descripcion  VARCHAR(100) DEFAULT NULL,
  id_provincia INT DEFAULT NULL,
  PRIMARY KEY (id_area),
  KEY fk_area_provincia (id_provincia),
  CONSTRAINT fk_area_provincia FOREIGN KEY (id_provincia)
    REFERENCES provincias (id_provincia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE turnos (
  id_turno INT NOT NULL,
  turno    VARCHAR(20) NOT NULL,
  PRIMARY KEY (id_turno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ahora con PK (antes sedes no tenía ninguna).
CREATE TABLE sedes (
  id_sede     INT NOT NULL,
  nombre_sede VARCHAR(45) NOT NULL,
  PRIMARY KEY (id_sede)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- 2. PERSONAS
-- =====================================================================

CREATE TABLE alumnos (
  id_alumno                  BIGINT NOT NULL AUTO_INCREMENT,
  id_tipo_documento          VARCHAR(4) NOT NULL,
  numero_documento           BIGINT NOT NULL,
  legajo                     VARCHAR(45) DEFAULT NULL,
  primer_apellido            VARCHAR(40) NOT NULL,
  otros_apellidos            VARCHAR(40) DEFAULT NULL,
  primer_nombre              VARCHAR(40) NOT NULL,
  otros_nombres              VARCHAR(40) DEFAULT NULL,
  email                      VARCHAR(255) NOT NULL,
  fecha_nacimiento           DATE DEFAULT NULL,
  sexo                       CHAR(1) DEFAULT NULL,
  id_pais_nacimiento         CHAR(2) DEFAULT 'ZZ',
  id_localidad_nacimiento    INT DEFAULT NULL,
  lugar_nacimiento_extranjero VARCHAR(100) DEFAULT NULL,
  estado_civil               CHAR(1) DEFAULT NULL,
  cantidad_hijos              SMALLINT DEFAULT 0,
  cantidad_familiares_a_cargo SMALLINT DEFAULT 0,
  password_hash               VARCHAR(255) DEFAULT NULL COMMENT 'Hash (bcrypt/argon2), nunca texto plano',
  alta_registro                DATETIME DEFAULT NULL,
  confirmacion_registro        DATETIME DEFAULT NULL,
  fecha_ultima_actualizacion   DATETIME DEFAULT NULL,
  PRIMARY KEY (id_alumno),
  UNIQUE KEY uq_alumno_documento (id_tipo_documento, numero_documento),
  UNIQUE KEY uq_alumno_email (email),
  KEY fk_alumno_pais (id_pais_nacimiento),
  KEY fk_alumno_localidad_nac (id_localidad_nacimiento),
  CONSTRAINT fk_alumno_tipo_doc FOREIGN KEY (id_tipo_documento)
    REFERENCES tipos_documento (id_tipo_documento),
  CONSTRAINT fk_alumno_pais FOREIGN KEY (id_pais_nacimiento)
    REFERENCES paises (id_pais),
  CONSTRAINT fk_alumno_localidad_nac FOREIGN KEY (id_localidad_nacimiento)
    REFERENCES localidades (id_localidad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Domicilio separado del alumno (antes mezclado en la misma tabla,
-- con codigo postal y provincia redundantes respecto de la localidad).
CREATE TABLE domicilios_alumno (
  id_domicilio                     BIGINT NOT NULL AUTO_INCREMENT,
  id_alumno                        BIGINT NOT NULL,
  calle                            VARCHAR(45) DEFAULT NULL,
  numero                           INT DEFAULT NULL,
  piso                             VARCHAR(3) DEFAULT NULL,
  depto                            VARCHAR(3) DEFAULT NULL,
  id_localidad                     INT DEFAULT NULL,
  id_codigo_postal                 BIGINT DEFAULT NULL,
  telefono_principal                VARCHAR(45) DEFAULT NULL,
  telefono_alternativo               VARCHAR(45) DEFAULT NULL,
  telefono_alternativo_referencia    VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (id_domicilio),
  KEY fk_domicilio_alumno (id_alumno),
  KEY fk_domicilio_localidad (id_localidad),
  KEY fk_domicilio_cp (id_codigo_postal),
  CONSTRAINT fk_domicilio_alumno FOREIGN KEY (id_alumno)
    REFERENCES alumnos (id_alumno) ON DELETE CASCADE,
  CONSTRAINT fk_domicilio_localidad FOREIGN KEY (id_localidad)
    REFERENCES localidades (id_localidad),
  CONSTRAINT fk_domicilio_cp FOREIGN KEY (id_codigo_postal)
    REFERENCES codigos_postales (id_codigo_postal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE personal (
  id_personal      INT NOT NULL AUTO_INCREMENT,
  apellidos        VARCHAR(100) NOT NULL,
  nombres          VARCHAR(100) NOT NULL,
  usuario_sistema  VARCHAR(50) NOT NULL,
  password_hash    VARCHAR(255) DEFAULT NULL COMMENT 'Hash (bcrypt/argon2), nunca texto plano',
  id_tipo_personal CHAR(1) NOT NULL,
  PRIMARY KEY (id_personal),
  UNIQUE KEY uq_personal_usuario (usuario_sistema),
  KEY fk_personal_tipo (id_tipo_personal),
  CONSTRAINT fk_personal_tipo FOREIGN KEY (id_tipo_personal)
    REFERENCES tipos_personal (id_tipo_personal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE aspirantes (
  id_aspirante BIGINT NOT NULL AUTO_INCREMENT,
  dni          BIGINT NOT NULL,
  anio         INT NOT NULL,
  apellido     VARCHAR(100) NOT NULL,
  nombre       VARCHAR(100) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  tel_fijo     VARCHAR(19) DEFAULT NULL,
  tel_cel      VARCHAR(19) DEFAULT NULL,
  material     CHAR(1) DEFAULT NULL,
  lista        CHAR(2) DEFAULT NULL,
  fecha_hora   DATETIME DEFAULT NULL,
  id_alumno    BIGINT DEFAULT NULL COMMENT 'Se completa si el aspirante se inscribe como alumno',
  PRIMARY KEY (id_aspirante),
  UNIQUE KEY uq_aspirante_dni_anio (dni, anio),
  KEY fk_aspirante_alumno (id_alumno),
  CONSTRAINT fk_aspirante_alumno FOREIGN KEY (id_alumno)
    REFERENCES alumnos (id_alumno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- 3. ACADÉMICO
-- =====================================================================

CREATE TABLE carreras (
  id_carrera           INT NOT NULL,
  nro_resolucion       VARCHAR(45) NOT NULL,
  nombre_carrera       VARCHAR(100) NOT NULL,
  nombre_carrera_corto VARCHAR(45) NOT NULL,
  titulo               VARCHAR(100) NOT NULL,
  color_r              INT DEFAULT 255,
  color_g              INT DEFAULT 0,
  color_b              INT DEFAULT 0,
  usuario_alta         VARCHAR(100) DEFAULT NULL,
  usuario_mod          VARCHAR(100) DEFAULT NULL,
  fecha_alta           DATETIME DEFAULT NULL,
  fecha_mod            DATETIME DEFAULT NULL,
  PRIMARY KEY (id_carrera)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE materias (
  id_materia     INT NOT NULL,
  nombre_materia VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_materia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Antes rel_carrera_materias.
CREATE TABLE carrera_materias (
  id_carrera   INT NOT NULL,
  id_materia   INT NOT NULL,
  anio_cursada TINYINT NOT NULL,
  PRIMARY KEY (id_carrera, id_materia),
  KEY fk_cm_materia (id_materia),
  CONSTRAINT fk_cm_carrera FOREIGN KEY (id_carrera)
    REFERENCES carreras (id_carrera),
  CONSTRAINT fk_cm_materia FOREIGN KEY (id_materia)
    REFERENCES materias (id_materia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Consolida correlatividades + Enfermeria_corr + tabla_de_correlatividades_upload.
-- Estas dos últimas se eliminan una vez migrados sus datos aquí.
CREATE TABLE correlatividades (
  id_carrera            INT NOT NULL,
  id_materia            INT NOT NULL,
  id_materia_correlativa INT NOT NULL,
  PRIMARY KEY (id_carrera, id_materia, id_materia_correlativa),
  KEY fk_corr_materia_correlativa (id_carrera, id_materia_correlativa),
  CONSTRAINT fk_corr_materia FOREIGN KEY (id_carrera, id_materia)
    REFERENCES carrera_materias (id_carrera, id_materia),
  CONSTRAINT fk_corr_materia_correlativa FOREIGN KEY (id_carrera, id_materia_correlativa)
    REFERENCES carrera_materias (id_carrera, id_materia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Antes rel_carreras_sedes_turnos.
CREATE TABLE carrera_sede_turno (
  id_carrera INT NOT NULL,
  id_sede    INT NOT NULL,
  id_turno   INT NOT NULL,
  PRIMARY KEY (id_carrera, id_sede, id_turno),
  KEY fk_cst_sede (id_sede),
  KEY fk_cst_turno (id_turno),
  CONSTRAINT fk_cst_carrera FOREIGN KEY (id_carrera)
    REFERENCES carreras (id_carrera),
  CONSTRAINT fk_cst_sede FOREIGN KEY (id_sede)
    REFERENCES sedes (id_sede),
  CONSTRAINT fk_cst_turno FOREIGN KEY (id_turno)
    REFERENCES turnos (id_turno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- 4. TRANSACCIONAL
-- =====================================================================

-- Ya no duplica nombre/apellido/email del alumno: se obtienen con JOIN.
CREATE TABLE inscripciones (
  id_inscripcion BIGINT NOT NULL AUTO_INCREMENT,
  id_alumno      BIGINT NOT NULL,
  id_carrera     INT NOT NULL,
  id_materia     INT NOT NULL,
  anio           INT NOT NULL,
  id_turno       INT NOT NULL COMMENT '1=Febrero 2=Agosto 3=Diciembre',
  id_llamado     TINYINT NOT NULL COMMENT '1=Primero 2=Segundo',
  estado         CHAR(1) NOT NULL,
  verificada     CHAR(1) NOT NULL,
  fecha_hora     DATETIME NOT NULL COMMENT 'Fecha y hora de la inscripción',
  PRIMARY KEY (id_inscripcion),
  KEY fk_insc_alumno (id_alumno),
  KEY fk_insc_carrera_materia (id_carrera, id_materia),
  KEY fk_insc_turno (id_turno),
  CONSTRAINT fk_insc_alumno FOREIGN KEY (id_alumno)
    REFERENCES alumnos (id_alumno),
  CONSTRAINT fk_insc_carrera_materia FOREIGN KEY (id_carrera, id_materia)
    REFERENCES carrera_materias (id_carrera, id_materia),
  CONSTRAINT fk_insc_turno FOREIGN KEY (id_turno)
    REFERENCES turnos (id_turno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE matriculacion (
  id_alumno        BIGINT NOT NULL,
  id_carrera       INT NOT NULL,
  anio_inscripcion INT NOT NULL,
  id_turno         INT NOT NULL,
  id_sede          INT NOT NULL,
  tomo_matriz      INT DEFAULT NULL,
  folio_matriz     INT DEFAULT NULL,
  fecha_alta       DATETIME DEFAULT NULL,
  fecha_mod        DATETIME DEFAULT NULL,
  PRIMARY KEY (id_alumno, id_carrera),
  KEY fk_matr_carrera (id_carrera),
  KEY fk_matr_turno (id_turno),
  KEY fk_matr_sede (id_sede),
  CONSTRAINT fk_matr_alumno FOREIGN KEY (id_alumno)
    REFERENCES alumnos (id_alumno),
  CONSTRAINT fk_matr_carrera FOREIGN KEY (id_carrera)
    REFERENCES carreras (id_carrera),
  CONSTRAINT fk_matr_turno FOREIGN KEY (id_turno)
    REFERENCES turnos (id_turno),
  CONSTRAINT fk_matr_sede FOREIGN KEY (id_sede)
    REFERENCES sedes (id_sede)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE matriculacion_detalle (
  id_alumno          BIGINT NOT NULL,
  id_carrera         INT NOT NULL,
  anio_matriculacion INT NOT NULL,
  id_materia         INT NOT NULL,
  tipo_asistencia    VARCHAR(3) DEFAULT NULL COMMENT '1=Presencial 2=Libre 3=Vocacional',
  PRIMARY KEY (id_alumno, id_carrera, anio_matriculacion, id_materia),
  KEY fk_matrdet_carrera_materia (id_carrera, id_materia),
  CONSTRAINT fk_matrdet_matriculacion FOREIGN KEY (id_alumno, id_carrera)
    REFERENCES matriculacion (id_alumno, id_carrera),
  CONSTRAINT fk_matrdet_carrera_materia FOREIGN KEY (id_carrera, id_materia)
    REFERENCES carrera_materias (id_carrera, id_materia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE historial_academico (
  id_alumno        BIGINT NOT NULL,
  id_carrera       INT NOT NULL,
  id_materia       INT NOT NULL,
  anio_regular     INT DEFAULT 0,
  fecha_aprobacion DATE DEFAULT NULL,
  tomo_acta        INT DEFAULT 0,
  folio_acta       INT DEFAULT 0,
  nota             TINYINT DEFAULT 0,
  tipo_alumno      CHAR(1) DEFAULT 'X',
  validado_regular CHAR(1) DEFAULT 'F',
  validado_examen  CHAR(1) DEFAULT 'F',
  resolucion       VARCHAR(45) DEFAULT NULL,
  fecha_alta       DATETIME DEFAULT NULL,
  fecha_mod        DATETIME DEFAULT NULL,
  PRIMARY KEY (id_alumno, id_carrera, id_materia),
  KEY fk_hist_carrera_materia (id_carrera, id_materia),
  CONSTRAINT fk_hist_alumno FOREIGN KEY (id_alumno)
    REFERENCES alumnos (id_alumno),
  CONSTRAINT fk_hist_carrera_materia FOREIGN KEY (id_carrera, id_materia)
    REFERENCES carrera_materias (id_carrera, id_materia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- 5. PARÁMETROS DEL SISTEMA (separados por proceso)
-- =====================================================================

CREATE TABLE parametros_generales (
  id_registro      INT NOT NULL,
  nombre_instituto VARCHAR(45) NOT NULL,
  ciclo_lectivo    INT NOT NULL,
  PRIMARY KEY (id_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE parametros_mesas (
  id_registro INT NOT NULL,
  anio_mesas  INT NOT NULL,
  id_turno    INT NOT NULL,
  fecha_inicio DATE DEFAULT NULL,
  fecha_fin    DATE DEFAULT NULL,
  tope_mesas   SMALLINT DEFAULT NULL,
  PRIMARY KEY (id_registro),
  KEY fk_parammesas_turno (id_turno),
  CONSTRAINT fk_parammesas_turno FOREIGN KEY (id_turno)
    REFERENCES turnos (id_turno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE parametros_inscripcion (
  id_registro               INT NOT NULL,
  anio_inscripcion_carrera  INT DEFAULT NULL,
  fecha_inicio              DATE DEFAULT NULL,
  fecha_fin                 DATE DEFAULT NULL,
  PRIMARY KEY (id_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE parametros_matriculacion (
  id_registro                 INT NOT NULL,
  anio_matriculacion          INT DEFAULT NULL,
  fecha_inicio                DATE DEFAULT NULL,
  fecha_fin                   DATE DEFAULT NULL,
  carpeta_vista_alumno        VARCHAR(45) DEFAULT NULL,
  carpeta_vista_preceptoria   VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (id_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE aspirantes_parametros (
  id_registro INT NOT NULL,
  anio        INT NOT NULL,
  PRIMARY KEY (id_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- Tablas del esquema original que se ELIMINAN por ser staging/duplicadas
-- una vez migrados sus datos:
--   - Enfermeria_corr                 -> correlatividades
--   - tabla_de_correlatividades_upload -> correlatividades
--   - provinciapostallocalidad         -> codigos_postales
--   - interurbanos                     -> codigos_area_telefonicos
--   - rel_carrera_materias             -> carrera_materias
--   - rel_carreras_sedes_turnos        -> carrera_sede_turno
--   - parametros                       -> parametros_generales/mesas/
--                                          inscripcion/matriculacion
-- =====================================================================

-- =====================================================================
-- DATOS DE PRUEBA (opcionales)
-- Contraseña en claro de ambos usuarios: 123456
-- Hash bcrypt ($2y$10$...) generado con password_hash(); sirve para
-- probar el login antes de migrar los datos reales (ver análisis H).
-- Order: primero los catálogos que referencian los INSERT de abajo.
-- =====================================================================

INSERT INTO tipos_documento (id_tipo_documento, descripcion) VALUES
  ('DNI', 'Documento Nacional de Identidad'),
  ('LC',  'Libreta Cívica'),
  ('LE',  'Libreta de Enrolamiento'),
  ('PAS', 'Pasaporte');

INSERT INTO tipos_personal (id_tipo_personal, descripcion) VALUES
  ('A', 'Administrativo'),
  ('D', 'Directivo'),
  ('P', 'Docente'),
  ('S', 'Preceptor');

-- País placeholder: alumnos.id_pais_nacimiento tiene DEFAULT 'ZZ' con FK a paises.
INSERT INTO paises (id_pais, iso3, nombre, nacionalidad, orden) VALUES
  ('ZZ', 'ZZZ', 'No especificado', 'No especificada', 1000);

-- Usuario alumno de prueba -> login con email: alumno@clementina.edu.ar
INSERT INTO alumnos
  (id_tipo_documento, numero_documento, legajo, primer_apellido,
   primer_nombre, email, password_hash)
VALUES
  ('DNI', 12345678, '2024-DNI-12345678', 'González',
   'María', 'alumno@clementina.edu.ar',
   '$2y$10$W98glXeHxB2q7IhQmH.A7u/6HUiygSrURupLRtRIvFEUZKieX3Cxq');

-- Usuario personal de prueba -> login con usuario de sistema: admin
INSERT INTO personal
  (apellidos, nombres, usuario_sistema, password_hash, id_tipo_personal)
VALUES
  ('Pérez', 'Juan Carlos', 'admin',
   '$2y$10$W98glXeHxB2q7IhQmH.A7u/6HUiygSrURupLRtRIvFEUZKieX3Cxq', 'A');
