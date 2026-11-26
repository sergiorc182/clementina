-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: clementina
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alumnos`
--

DROP TABLE IF EXISTS `alumnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alumnos` (
  `id_alumno` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_tipo_documento` varchar(4) NOT NULL,
  `numero_documento` bigint(20) NOT NULL,
  `legajo` varchar(45) DEFAULT NULL,
  `primer_apellido` varchar(40) NOT NULL,
  `otros_apellidos` varchar(40) DEFAULT NULL,
  `primer_nombre` varchar(40) NOT NULL,
  `otros_nombres` varchar(40) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` char(1) DEFAULT NULL,
  `id_pais_nacimiento` char(2) DEFAULT 'ZZ',
  `id_localidad_nacimiento` int(11) DEFAULT NULL,
  `lugar_nacimiento_extranjero` varchar(100) DEFAULT NULL,
  `estado_civil` char(1) DEFAULT NULL,
  `cantidad_hijos` smallint(6) DEFAULT 0,
  `cantidad_familiares_a_cargo` smallint(6) DEFAULT 0,
  `password_hash` varchar(255) DEFAULT NULL COMMENT 'Hash (bcrypt/argon2), nunca texto plano',
  `alta_registro` datetime DEFAULT NULL,
  `confirmacion_registro` datetime DEFAULT NULL,
  `fecha_ultima_actualizacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_alumno`),
  UNIQUE KEY `uq_alumno_documento` (`id_tipo_documento`,`numero_documento`),
  UNIQUE KEY `uq_alumno_email` (`email`),
  KEY `fk_alumno_pais` (`id_pais_nacimiento`),
  KEY `fk_alumno_localidad_nac` (`id_localidad_nacimiento`),
  CONSTRAINT `fk_alumno_localidad_nac` FOREIGN KEY (`id_localidad_nacimiento`) REFERENCES `localidades` (`id_localidad`),
  CONSTRAINT `fk_alumno_pais` FOREIGN KEY (`id_pais_nacimiento`) REFERENCES `paises` (`id_pais`),
  CONSTRAINT `fk_alumno_tipo_doc` FOREIGN KEY (`id_tipo_documento`) REFERENCES `tipos_documento` (`id_tipo_documento`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alumnos`
--

LOCK TABLES `alumnos` WRITE;
/*!40000 ALTER TABLE `alumnos` DISABLE KEYS */;
INSERT INTO `alumnos` VALUES (1,'DNI',40111222,'LEG-2023-010','Pérez','García','Juan','Carlos','juan.perez@isft182.edu.ar','1998-05-14','M','AR',1,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(2,'DNI',41222333,'LEG-2024-025','Gómez',NULL,'María','Elena','maria.gomez@isft182.edu.ar','1999-08-20','F','AR',2,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(3,'DNI',42333444,'LEG-2022-040','López','Martínez','Carlos','Alberto','carlos.lopez@isft182.edu.ar','2000-01-15','M','AR',3,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(4,'DNI',43444555,'LEG-2023-015','Fernández',NULL,'Laura','Beatriz','laura.fernandez@isft182.edu.ar','2001-09-30','F','AR',4,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(5,'DNI',44555666,'LEG-2024-008','Rossi','De Luca','Lucas','Agustín','lucas.rossi@isft182.edu.ar','2002-03-22','M','AR',1,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(6,'DNI',45666777,'LEG-2023-050','Benítez',NULL,'Sofía','Camila','sofia.benitez@isft182.edu.ar','2003-11-12','F','AR',2,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(7,'DNI',39888999,'LEG-2021-002','Morales','Suárez','Matías','Daniel','matias.morales@isft182.edu.ar','1997-07-04','M','AR',3,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(8,'DNI',46111000,'LEG-2024-019','Herrera',NULL,'Valentina','Sol','valentina.herrera@isft182.edu.ar','2004-02-18','F','AR',5,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(9,'DNI',43999111,'LEG-2023-033','Navarro','Ríos','Franco','Ezequiel','franco.navarro@isft182.edu.ar','2001-12-05','M','AR',1,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(10,'DNI',44123456,'LEG-2023-077','Rodríguez',NULL,'Camila','Inés','camila.rodriguez@isft182.edu.ar','2002-06-25','F','AR',4,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(11,'DNI',42987654,'LEG-2022-064','Domínguez','Alvarez','Nicolás','Martín','nicolas.dominguez@isft182.edu.ar','2000-10-10','M','AR',2,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(12,'DNI',45789123,'LEG-2025-012','Méndez',NULL,'Julieta','Romina','julieta.mendez@isft182.edu.ar','2003-04-08','F','AR',3,NULL,NULL,0,0,NULL,'2026-11-19 21:10:21',NULL,NULL),(13,'DNI',38999999,'LEG-2026-846','ESCALANTE',NULL,'Braian',NULL,'braian10@gmail.com',NULL,NULL,'AR',NULL,NULL,NULL,0,0,NULL,'2026-11-24 00:48:14',NULL,NULL);
/*!40000 ALTER TABLE `alumnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aspirantes`
--

DROP TABLE IF EXISTS `aspirantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `aspirantes` (
  `id_aspirante` bigint(20) NOT NULL AUTO_INCREMENT,
  `dni` bigint(20) NOT NULL,
  `anio` int(11) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `tel_fijo` varchar(19) DEFAULT NULL,
  `tel_cel` varchar(19) DEFAULT NULL,
  `material` char(1) DEFAULT NULL,
  `lista` char(2) DEFAULT NULL,
  `fecha_hora` datetime DEFAULT NULL,
  `id_alumno` bigint(20) DEFAULT NULL COMMENT 'Se completa si el aspirante se inscribe como alumno',
  PRIMARY KEY (`id_aspirante`),
  UNIQUE KEY `uq_aspirante_dni_anio` (`dni`,`anio`),
  KEY `fk_aspirante_alumno` (`id_alumno`),
  CONSTRAINT `fk_aspirante_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aspirantes`
--

LOCK TABLES `aspirantes` WRITE;
/*!40000 ALTER TABLE `aspirantes` DISABLE KEYS */;
/*!40000 ALTER TABLE `aspirantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aspirantes_parametros`
--

DROP TABLE IF EXISTS `aspirantes_parametros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `aspirantes_parametros` (
  `id_registro` int(11) NOT NULL,
  `anio` int(11) NOT NULL,
  PRIMARY KEY (`id_registro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aspirantes_parametros`
--

LOCK TABLES `aspirantes_parametros` WRITE;
/*!40000 ALTER TABLE `aspirantes_parametros` DISABLE KEYS */;
/*!40000 ALTER TABLE `aspirantes_parametros` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `user_email` varchar(255) DEFAULT NULL,
  `user_name` varchar(200) DEFAULT NULL,
  `action_type` varchar(50) NOT NULL COMMENT 'LOGIN, USERS_EDIT, GRADES_CHANGE, SEED, etc.',
  `entity` varchar(50) NOT NULL COMMENT 'users, grades, exams, sheets, etc.',
  `entity_id` varchar(50) DEFAULT NULL,
  `previous_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Estado anterior serializado en JSON' CHECK (json_valid(`previous_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Estado nuevo serializado en JSON' CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_audit_user` (`user_id`),
  KEY `idx_audit_created_at` (`created_at`),
  KEY `idx_audit_entity` (`entity`,`entity_id`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Bitácora inmutable de auditoría para operaciones críticas';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','127.0.0.1','2026-11-21 13:00:56'),(2,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::ffff:127.0.0.1','2026-11-21 13:02:24'),(3,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-21 13:44:48'),(4,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-21 13:46:13'),(5,3,'docente.perez@institucion.edu','Carlos Pérez (Docente)','AUTH_LOGIN','auth','3',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"DOCENTE\"}','::1','2026-11-21 13:46:14'),(6,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-21 13:46:15'),(7,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-21 13:46:17'),(8,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-21 13:46:19'),(9,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-21 13:48:21'),(10,3,'docente.perez@institucion.edu','Carlos Pérez (Docente)','AUTH_LOGIN','auth','3',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"DOCENTE\"}','::1','2026-11-21 13:48:27'),(11,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-21 13:49:07'),(12,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-21 13:49:22'),(13,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-21 14:01:46'),(14,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-21 14:02:15'),(15,3,'docente.perez@institucion.edu','Carlos Pérez (Docente)','AUTH_LOGIN','auth','3',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"DOCENTE\"}','::1','2026-11-21 14:02:19'),(16,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-21 14:29:48'),(17,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-21 14:29:54'),(18,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-21 14:29:57'),(19,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-21 14:30:01'),(25,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-21 14:49:15'),(26,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-21 14:49:16'),(27,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-21 14:50:32'),(28,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-21 14:50:38'),(29,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-21 14:50:57'),(30,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGOUT','auth','4',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-21 14:51:32'),(31,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-21 14:52:44'),(32,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-23 05:10:34'),(33,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGOUT','auth','4',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-23 05:17:38'),(34,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-23 05:17:59'),(35,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGOUT','auth','5',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-23 05:19:29'),(36,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-23 05:19:32'),(37,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGOUT','auth','4',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-23 05:19:58'),(38,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-23 05:20:00'),(39,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGOUT','auth','4',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-23 05:20:01'),(40,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-23 05:20:03'),(41,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGOUT','auth','2',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-23 05:20:27'),(42,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 05:20:30'),(43,1,'admin@institucion.edu','Super Administrador','AUTH_LOGOUT','auth','1',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-23 05:20:46'),(44,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-23 05:20:48'),(45,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGOUT','auth','2',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-23 05:20:53'),(46,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-23 05:20:54'),(47,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGOUT','auth','4',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-23 05:21:06'),(48,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 05:21:08'),(49,1,'admin@institucion.edu','Super Administrador','AUTH_LOGOUT','auth','1',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-23 05:22:09'),(50,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 05:27:28'),(51,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-23 05:29:04'),(52,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','GRADE_VALIDATED','historial_academico','8-4-33','{\"alumno\":\"Herrera, Valentina\",\"materia\":\"Costos y Presupuestos\",\"semaforo\":\"RED\",\"validado_regular\":\"F\",\"validado_examen\":\"F\",\"tipo_examen\":\"Sin definir (Corregir)\",\"nota\":0}','{\"alumno\":\"Herrera, Valentina\",\"materia\":\"Costos y Presupuestos\",\"semaforo\":\"GREEN\",\"validado_regular\":\"T\",\"validado_examen\":\"T\",\"tipo_examen\":\"Regular\",\"nota\":9,\"tomo_acta\":3,\"folio_acta\":25}','::1','2026-11-23 05:32:07'),(53,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-23 05:37:12'),(54,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 05:40:49'),(55,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-23 05:45:29'),(56,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-23 05:45:33'),(57,3,'docente.perez@institucion.edu','Carlos Pérez (Docente)','AUTH_LOGIN','auth','3',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"DOCENTE\"}','::1','2026-11-23 05:45:36'),(58,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-23 05:45:37'),(59,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 05:45:39'),(60,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-23 05:45:41'),(61,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-23 05:45:42'),(63,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-23 05:48:27'),(64,3,'docente.perez@institucion.edu','Carlos Pérez (Docente)','AUTH_LOGIN','auth','3',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"DOCENTE\"}','::1','2026-11-23 05:48:30'),(65,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-23 05:52:09'),(66,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 05:52:21'),(67,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-23 05:52:33'),(68,3,'docente.perez@institucion.edu','Carlos Pérez (Docente)','AUTH_LOGIN','auth','3',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"DOCENTE\"}','::1','2026-11-23 05:57:31'),(69,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 05:57:38'),(70,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-23 05:57:42'),(71,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 05:58:59'),(72,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-23 06:00:41'),(73,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-23 06:08:10'),(74,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-23 06:08:12'),(75,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-23 06:08:34'),(76,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 06:10:25'),(77,1,'admin@institucion.edu','Super Administrador','ROLE_PERMISSIONS_UPDATED','roles','4','{\"role\":\"PRECEPTOR\",\"permissions\":[\"USERS_VIEW\",\"AUDIT_VIEW\",\"GRADES_VIEW\",\"GRADES_RECALCULATE\"]}','{\"role\":\"PRECEPTOR\",\"permissionIds\":[10,9,8,2,6]}','::1','2026-11-23 06:10:58'),(78,1,'admin@institucion.edu','Super Administrador','USER_DEACTIVATED','users','6','{\"is_active\":1}','{\"is_active\":0}','::1','2026-11-23 06:16:33'),(79,1,'admin@institucion.edu','Super Administrador','USER_ACTIVATED','users','6','{\"is_active\":0}','{\"is_active\":1}','::1','2026-11-23 06:16:40'),(80,1,'admin@institucion.edu','Super Administrador','USER_DEACTIVATED','users','6','{\"is_active\":1}','{\"is_active\":0}','::1','2026-11-23 06:16:44'),(81,1,'admin@institucion.edu','Super Administrador','USER_ACTIVATED','users','6','{\"is_active\":0}','{\"is_active\":1}','::1','2026-11-23 06:16:46'),(82,1,'admin@institucion.edu','Super Administrador','USER_DEACTIVATED','users','6','{\"is_active\":1}','{\"is_active\":0}','::1','2026-11-23 06:16:47'),(83,1,'admin@institucion.edu','Super Administrador','USER_ACTIVATED','users','6','{\"is_active\":0}','{\"is_active\":1}','::1','2026-11-23 06:16:49'),(84,1,'admin@institucion.edu','Super Administrador','USER_DEACTIVATED','users','6','{\"is_active\":1}','{\"is_active\":0}','::1','2026-11-23 06:16:53'),(85,1,'admin@institucion.edu','Super Administrador','USER_ACTIVATED','users','6','{\"is_active\":0}','{\"is_active\":1}','::1','2026-11-23 06:17:03'),(86,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-23 19:24:02'),(87,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-23 19:36:21'),(96,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGOUT','auth','5',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-24 00:28:09'),(101,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-24 00:37:33'),(102,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGOUT','auth','5',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-24 00:42:34'),(103,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-24 00:43:07'),(104,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-24 19:56:06'),(105,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-24 19:56:06'),(106,2,'secretaria@institucion.edu','Mariana López (Secretaría)','AUTH_LOGIN','auth','2',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRATIVO\"}','::1','2026-11-24 19:56:07'),(107,3,'docente.perez@institucion.edu','Carlos Pérez (Docente)','AUTH_LOGIN','auth','3',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"DOCENTE\"}','::1','2026-11-24 19:56:07'),(108,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-24 19:56:07'),(109,6,'consulta@institucion.edu','Ana García (Auditor)','AUTH_LOGIN','auth','6',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"CONSULTA\"}','::1','2026-11-24 19:56:07'),(110,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-24 19:56:56'),(111,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGIN','auth','5',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ALUMNO\"}','::1','2026-11-24 19:58:16'),(112,5,'alumno@institucion.edu','Juan Carlos Pérez (Estudiante)','AUTH_LOGOUT','auth','5',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-24 20:09:59'),(113,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGIN','auth','4',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"PRECEPTOR\"}','::1','2026-11-24 20:10:19'),(114,4,'preceptor@institucion.edu','Martín Giménez (Preceptor)','AUTH_LOGOUT','auth','4',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-24 20:39:09'),(115,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-24 20:39:51'),(116,1,'admin@institucion.edu','Super Administrador','AUTH_LOGOUT','auth','1',NULL,'{\"message\":\"Cierre de sesión registrado\"}','::1','2026-11-24 20:42:15'),(117,1,'admin@institucion.edu','Super Administrador','AUTH_LOGIN','auth','1',NULL,'{\"message\":\"Inicio de sesión exitoso\",\"role\":\"ADMINISTRADOR\"}','::1','2026-11-24 20:42:27');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auditoria_inscripciones_finales`
--

DROP TABLE IF EXISTS `auditoria_inscripciones_finales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auditoria_inscripciones_finales` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_rendicion` bigint(20) NOT NULL,
  `accion` varchar(40) NOT NULL,
  `detalle_anterior` varchar(255) DEFAULT NULL,
  `detalle_nuevo` varchar(255) DEFAULT NULL,
  `fecha_cambio` datetime NOT NULL DEFAULT current_timestamp(),
  `modificado_por` varchar(100) DEFAULT 'Preceptoría',
  PRIMARY KEY (`id`),
  KEY `fk_aud_rendicion` (`id_rendicion`),
  CONSTRAINT `fk_aud_rendicion` FOREIGN KEY (`id_rendicion`) REFERENCES `rendiciones_finales` (`id_rendicion`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria_inscripciones_finales`
--

LOCK TABLES `auditoria_inscripciones_finales` WRITE;
/*!40000 ALTER TABLE `auditoria_inscripciones_finales` DISABLE KEYS */;
INSERT INTO `auditoria_inscripciones_finales` VALUES (10,49,'ALTA',NULL,'Año 2026 - Diciembre - 1° Llamado - Modalidad: REGULAR','2026-11-24 20:00:07','Sistema'),(11,50,'ALTA',NULL,'Año 2026 - Diciembre - 1° Llamado - Modalidad: REGULAR (Excepción)','2026-11-24 20:21:17','Preceptoría (Excepción)');
/*!40000 ALTER TABLE `auditoria_inscripciones_finales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carrera_materias`
--

DROP TABLE IF EXISTS `carrera_materias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `carrera_materias` (
  `id_carrera` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `anio_cursada` tinyint(4) NOT NULL,
  `carga_horaria_semanal` tinyint(4) NOT NULL DEFAULT 4 COMMENT 'Carga horaria semanal (tope institucional 32 hs)',
  `exceptuada_libre` tinyint(1) NOT NULL DEFAULT 0,
  `tipo_espacio` varchar(45) NOT NULL DEFAULT 'Asignatura',
  PRIMARY KEY (`id_carrera`,`id_materia`),
  KEY `fk_cm_materia` (`id_materia`),
  CONSTRAINT `fk_cm_carrera` FOREIGN KEY (`id_carrera`) REFERENCES `carreras` (`id_carrera`),
  CONSTRAINT `fk_cm_materia` FOREIGN KEY (`id_materia`) REFERENCES `materias` (`id_materia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carrera_materias`
--

LOCK TABLES `carrera_materias` WRITE;
/*!40000 ALTER TABLE `carrera_materias` DISABLE KEYS */;
INSERT INTO `carrera_materias` VALUES (1,1,1,4,0,'Asignatura'),(1,2,1,4,0,'Asignatura'),(1,3,2,4,0,'Asignatura'),(1,4,2,4,0,'Asignatura'),(1,5,3,4,1,'Práctica Profesionalizante'),(1,9,1,4,0,'Asignatura'),(1,10,1,4,0,'Asignatura'),(1,11,2,4,0,'Asignatura'),(1,12,2,4,0,'Asignatura'),(1,13,3,4,0,'Asignatura'),(1,14,3,4,0,'Asignatura'),(1,15,3,4,0,'Asignatura'),(2,6,1,4,0,'Asignatura'),(2,7,2,4,0,'Asignatura'),(2,8,3,4,0,'Asignatura'),(2,16,1,4,0,'Asignatura'),(2,17,1,4,0,'Asignatura'),(2,18,1,4,1,'Taller'),(2,19,2,4,0,'Asignatura'),(2,20,2,4,0,'Asignatura'),(2,21,2,4,0,'Asignatura'),(2,22,3,4,0,'Asignatura'),(2,23,3,4,1,'Práctica Profesionalizante'),(3,24,1,4,0,'Asignatura'),(3,25,1,4,0,'Asignatura'),(3,26,1,4,0,'Asignatura'),(3,27,2,4,0,'Asignatura'),(3,28,2,4,0,'Asignatura'),(3,29,3,4,1,'Práctica Profesionalizante'),(4,30,1,4,0,'Asignatura'),(4,31,1,4,0,'Asignatura'),(4,32,2,4,0,'Asignatura'),(4,33,2,4,0,'Asignatura'),(4,34,3,4,0,'Asignatura');
/*!40000 ALTER TABLE `carrera_materias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carrera_sede_turno`
--

DROP TABLE IF EXISTS `carrera_sede_turno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `carrera_sede_turno` (
  `id_carrera` int(11) NOT NULL,
  `id_sede` int(11) NOT NULL,
  `id_turno` int(11) NOT NULL,
  PRIMARY KEY (`id_carrera`,`id_sede`,`id_turno`),
  KEY `fk_cst_sede` (`id_sede`),
  KEY `fk_cst_turno` (`id_turno`),
  CONSTRAINT `fk_cst_carrera` FOREIGN KEY (`id_carrera`) REFERENCES `carreras` (`id_carrera`),
  CONSTRAINT `fk_cst_sede` FOREIGN KEY (`id_sede`) REFERENCES `sedes` (`id_sede`),
  CONSTRAINT `fk_cst_turno` FOREIGN KEY (`id_turno`) REFERENCES `turnos` (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carrera_sede_turno`
--

LOCK TABLES `carrera_sede_turno` WRITE;
/*!40000 ALTER TABLE `carrera_sede_turno` DISABLE KEYS */;
INSERT INTO `carrera_sede_turno` VALUES (1,1,1),(1,1,2),(1,1,3),(2,1,1),(2,1,2),(2,1,3),(3,1,1),(3,1,2),(3,2,1),(4,1,3);
/*!40000 ALTER TABLE `carrera_sede_turno` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carreras`
--

DROP TABLE IF EXISTS `carreras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `carreras` (
  `id_carrera` int(11) NOT NULL,
  `nro_resolucion` varchar(45) NOT NULL,
  `nombre_carrera` varchar(100) NOT NULL,
  `nombre_carrera_corto` varchar(45) NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `color_r` int(11) DEFAULT 255,
  `color_g` int(11) DEFAULT 0,
  `color_b` int(11) DEFAULT 0,
  `usuario_alta` varchar(100) DEFAULT NULL,
  `usuario_mod` varchar(100) DEFAULT NULL,
  `fecha_alta` datetime DEFAULT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  PRIMARY KEY (`id_carrera`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carreras`
--

LOCK TABLES `carreras` WRITE;
/*!40000 ALTER TABLE `carreras` DISABLE KEYS */;
INSERT INTO `carreras` VALUES (1,'RES-5834/03','Tecnicatura Superior en Análisis de Sistemas','Sistemas','Técnico Superior en Análisis de Sistemas',255,0,0,NULL,NULL,NULL,NULL),(2,'RES-6161/03','Tecnicatura Superior en Desarrollo de Software','Software','Técnico Superior en Desarrollo de Software',255,0,0,NULL,NULL,NULL,NULL),(3,'RES-0854/16','Tecnicatura Superior en Enfermería','Enfermería','Enfermero/a Profesional',255,0,0,NULL,NULL,NULL,NULL),(4,'RES-0273/13','Tecnicatura Superior en Administración','Administración','Técnico Superior en Administración',255,0,0,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `carreras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `codigos_area_telefonicos`
--

DROP TABLE IF EXISTS `codigos_area_telefonicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `codigos_area_telefonicos` (
  `id_area` bigint(20) NOT NULL AUTO_INCREMENT,
  `area` int(11) NOT NULL,
  `descripcion` varchar(100) DEFAULT NULL,
  `id_provincia` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_area`),
  KEY `fk_area_provincia` (`id_provincia`),
  CONSTRAINT `fk_area_provincia` FOREIGN KEY (`id_provincia`) REFERENCES `provincias` (`id_provincia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `codigos_area_telefonicos`
--

LOCK TABLES `codigos_area_telefonicos` WRITE;
/*!40000 ALTER TABLE `codigos_area_telefonicos` DISABLE KEYS */;
/*!40000 ALTER TABLE `codigos_area_telefonicos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `codigos_postales`
--

DROP TABLE IF EXISTS `codigos_postales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `codigos_postales` (
  `id_codigo_postal` bigint(20) NOT NULL AUTO_INCREMENT,
  `codigo_postal` varchar(8) NOT NULL,
  `id_localidad` int(11) NOT NULL,
  `id_provincia` int(11) NOT NULL,
  PRIMARY KEY (`id_codigo_postal`),
  UNIQUE KEY `uq_cp_localidad` (`codigo_postal`,`id_localidad`),
  KEY `fk_cp_provincia` (`id_provincia`),
  KEY `fk_cp_localidad` (`id_localidad`),
  CONSTRAINT `fk_cp_localidad` FOREIGN KEY (`id_localidad`) REFERENCES `localidades` (`id_localidad`),
  CONSTRAINT `fk_cp_provincia` FOREIGN KEY (`id_provincia`) REFERENCES `provincias` (`id_provincia`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `codigos_postales`
--

LOCK TABLES `codigos_postales` WRITE;
/*!40000 ALTER TABLE `codigos_postales` DISABLE KEYS */;
INSERT INTO `codigos_postales` VALUES (1,'1765',1,1),(2,'1754',2,1),(3,'1704',3,1),(4,'1708',4,1),(5,'1722',5,1);
/*!40000 ALTER TABLE `codigos_postales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `correlatividades`
--

DROP TABLE IF EXISTS `correlatividades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `correlatividades` (
  `id_carrera` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `id_materia_correlativa` int(11) NOT NULL,
  PRIMARY KEY (`id_carrera`,`id_materia`,`id_materia_correlativa`),
  KEY `fk_corr_materia_correlativa` (`id_carrera`,`id_materia_correlativa`),
  CONSTRAINT `fk_corr_materia` FOREIGN KEY (`id_carrera`, `id_materia`) REFERENCES `carrera_materias` (`id_carrera`, `id_materia`),
  CONSTRAINT `fk_corr_materia_correlativa` FOREIGN KEY (`id_carrera`, `id_materia_correlativa`) REFERENCES `carrera_materias` (`id_carrera`, `id_materia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `correlatividades`
--

LOCK TABLES `correlatividades` WRITE;
/*!40000 ALTER TABLE `correlatividades` DISABLE KEYS */;
INSERT INTO `correlatividades` VALUES (1,3,1),(1,4,1),(1,4,2),(1,5,3),(1,5,4),(1,11,1),(1,12,2),(2,7,6),(2,8,19),(2,19,6),(2,21,6),(3,28,24),(3,29,25),(3,29,27);
/*!40000 ALTER TABLE `correlatividades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `domicilios_alumno`
--

DROP TABLE IF EXISTS `domicilios_alumno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `domicilios_alumno` (
  `id_domicilio` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_alumno` bigint(20) NOT NULL,
  `calle` varchar(45) DEFAULT NULL,
  `numero` int(11) DEFAULT NULL,
  `piso` varchar(3) DEFAULT NULL,
  `depto` varchar(3) DEFAULT NULL,
  `id_localidad` int(11) DEFAULT NULL,
  `id_codigo_postal` bigint(20) DEFAULT NULL,
  `telefono_principal` varchar(45) DEFAULT NULL,
  `telefono_alternativo` varchar(45) DEFAULT NULL,
  `telefono_alternativo_referencia` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id_domicilio`),
  KEY `fk_domicilio_alumno` (`id_alumno`),
  KEY `fk_domicilio_localidad` (`id_localidad`),
  KEY `fk_domicilio_cp` (`id_codigo_postal`),
  CONSTRAINT `fk_domicilio_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE,
  CONSTRAINT `fk_domicilio_cp` FOREIGN KEY (`id_codigo_postal`) REFERENCES `codigos_postales` (`id_codigo_postal`),
  CONSTRAINT `fk_domicilio_localidad` FOREIGN KEY (`id_localidad`) REFERENCES `localidades` (`id_localidad`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domicilios_alumno`
--

LOCK TABLES `domicilios_alumno` WRITE;
/*!40000 ALTER TABLE `domicilios_alumno` DISABLE KEYS */;
INSERT INTO `domicilios_alumno` VALUES (13,1,'Av. de Mayo',450,NULL,NULL,3,3,NULL,NULL,NULL),(14,2,'Almafuerte',1230,NULL,NULL,2,2,NULL,NULL,NULL),(15,3,'República',840,NULL,NULL,1,1,NULL,NULL,NULL),(16,4,'Belgrano',320,NULL,NULL,4,4,NULL,NULL,NULL),(17,5,'Pres. Perón',2150,NULL,NULL,1,1,NULL,NULL,NULL),(18,6,'Arieta',780,NULL,NULL,2,2,NULL,NULL,NULL),(19,7,'Brandsen',1600,NULL,NULL,3,3,NULL,NULL,NULL),(20,8,'Av. Real',950,NULL,NULL,5,5,NULL,NULL,NULL),(21,9,'Villegas',510,NULL,NULL,1,1,NULL,NULL,NULL),(22,10,'Sarmiento',1140,NULL,NULL,4,4,NULL,NULL,NULL),(23,11,'Dr. Monasterio',620,NULL,NULL,2,2,NULL,NULL,NULL),(24,12,'Alvear',430,NULL,NULL,3,3,NULL,NULL,NULL);
/*!40000 ALTER TABLE `domicilios_alumno` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_results`
--

DROP TABLE IF EXISTS `exam_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exam_results` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `student_subject_id` bigint(20) NOT NULL,
  `evaluation_type` varchar(30) NOT NULL COMMENT 'PARCIAL_1, PARCIAL_2, RECUPERATORIO_1, RECUPERATORIO_2, FINAL',
  `grade` decimal(4,2) DEFAULT NULL,
  `is_absent` tinyint(1) NOT NULL DEFAULT 0,
  `exam_date` date NOT NULL,
  `observations` text DEFAULT NULL,
  `registered_by` int(11) NOT NULL COMMENT 'FK a users',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_exam_ssr` (`student_subject_id`),
  KEY `fk_exam_user` (`registered_by`),
  CONSTRAINT `fk_exam_ssr` FOREIGN KEY (`student_subject_id`) REFERENCES `student_subject_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_user` FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Detalle de calificaciones por instancia evaluativa';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_results`
--

LOCK TABLES `exam_results` WRITE;
/*!40000 ALTER TABLE `exam_results` DISABLE KEYS */;
INSERT INTO `exam_results` VALUES (1,3,'FINAL',8.00,0,'2024-12-18','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(2,4,'FINAL',3.00,0,'2025-07-08','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(3,5,'FINAL',2.00,0,'2025-12-16','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(4,8,'FINAL',2.00,0,'2025-12-16','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(5,12,'FINAL',2.00,0,'2025-12-18','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(6,13,'FINAL',3.00,0,'2025-07-05','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(7,14,'FINAL',3.00,0,'2025-12-15','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(8,15,'FINAL',9.00,0,'2024-12-20','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(9,17,'FINAL',NULL,1,'2026-02-27','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(10,18,'FINAL',7.00,0,'2025-07-15','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(11,20,'FINAL',3.00,0,'2025-12-18','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(12,22,'FINAL',6.00,0,'2024-03-05','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(13,23,'FINAL',NULL,1,'2025-12-17','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(14,24,'FINAL',6.00,0,'2025-02-24','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(15,27,'FINAL',NULL,1,'2025-12-19','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(16,31,'FINAL',NULL,1,'2025-07-11','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(17,33,'FINAL',10.00,0,'2025-12-21','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(18,34,'FINAL',2.00,0,'2024-12-19','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(19,36,'FINAL',10.00,0,'2023-12-15','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(20,38,'FINAL',3.00,0,'2025-07-14','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(21,39,'FINAL',NULL,1,'2025-02-26','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(22,41,'FINAL',9.00,0,'2025-12-18','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(23,42,'FINAL',7.00,0,'2024-12-14','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56'),(24,43,'FINAL',3.00,0,'2025-07-16','Sincronizado desde historial académico / rendiciones finales (clementina)',1,'2026-11-21 13:00:56');
/*!40000 ALTER TABLE `exam_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `historial_academico`
--

DROP TABLE IF EXISTS `historial_academico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `historial_academico` (
  `id_alumno` bigint(20) NOT NULL,
  `id_carrera` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `anio_regular` int(11) DEFAULT 0,
  `fecha_aprobacion` date DEFAULT NULL,
  `tomo_acta` int(11) DEFAULT 0,
  `folio_acta` int(11) DEFAULT 0,
  `nota` tinyint(4) DEFAULT 0,
  `tipo_alumno` char(1) DEFAULT 'X',
  `validado_regular` char(1) DEFAULT 'F',
  `validado_examen` char(1) DEFAULT 'F',
  `resolucion` varchar(45) DEFAULT NULL,
  `fecha_alta` datetime DEFAULT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_alumno`,`id_carrera`,`id_materia`),
  KEY `fk_hist_carrera_materia` (`id_carrera`,`id_materia`),
  CONSTRAINT `fk_hist_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`),
  CONSTRAINT `fk_hist_carrera_materia` FOREIGN KEY (`id_carrera`, `id_materia`) REFERENCES `carrera_materias` (`id_carrera`, `id_materia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `historial_academico`
--

LOCK TABLES `historial_academico` WRITE;
/*!40000 ALTER TABLE `historial_academico` DISABLE KEYS */;
INSERT INTO `historial_academico` VALUES (1,1,1,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(1,1,2,2021,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(1,1,3,2024,'2024-12-18',0,0,8,'X','T','T',NULL,'2026-11-19 21:12:13',NULL,NULL),(1,1,4,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(1,1,9,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(1,1,10,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(1,1,11,0,NULL,0,0,0,'X','F','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(2,2,6,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(2,2,7,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(2,2,16,2024,'2024-12-20',0,0,9,'X','T','T',NULL,'2026-11-19 21:12:13',NULL,NULL),(2,2,17,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(2,2,19,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(2,2,21,2024,'2025-07-15',0,0,7,'X','T','T',NULL,'2026-11-19 21:12:13',NULL,NULL),(3,1,1,2024,'2025-02-24',0,0,6,'X','T','T',NULL,'2026-11-19 21:12:13',NULL,NULL),(3,1,2,2020,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(3,1,4,0,NULL,0,0,0,'X','F','F',NULL,'2026-11-19 21:12:13','2026-11-24 20:51:55',NULL),(3,1,10,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(3,1,12,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(4,3,24,2022,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(4,3,25,2023,'2023-12-15',0,0,10,'X','T','T',NULL,'2026-11-19 21:12:13',NULL,NULL),(4,3,26,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(4,3,28,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(5,2,6,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(5,2,16,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(5,2,17,2019,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(6,1,2,2023,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(6,1,3,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(6,1,14,0,NULL,0,0,0,'X','F','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(7,1,1,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(7,1,5,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(7,1,11,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(8,4,30,2024,'2024-12-14',0,0,7,'X','T','T',NULL,'2026-11-19 21:12:13',NULL,NULL),(8,4,31,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(8,4,32,2022,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(8,4,33,2026,'2026-11-23',3,25,9,'R','T','T',NULL,'2026-11-19 21:12:13','2026-11-23 05:32:07',''),(9,2,7,2023,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(9,2,19,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(10,3,24,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(10,3,27,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(10,3,29,2024,'2025-12-18',0,0,9,'X','T','T',NULL,'2026-11-19 21:12:13',NULL,NULL),(11,1,1,2023,'2024-03-05',0,0,6,'X','T','T',NULL,'2026-11-19 21:12:13',NULL,NULL),(11,1,3,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(12,2,6,2025,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL),(12,2,16,2025,'2025-12-21',0,0,10,'X','T','T',NULL,'2026-11-19 21:12:13',NULL,NULL),(12,2,17,2024,NULL,0,0,0,'X','T','F',NULL,'2026-11-19 21:12:13',NULL,NULL);
/*!40000 ALTER TABLE `historial_academico` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inscripciones`
--

DROP TABLE IF EXISTS `inscripciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inscripciones` (
  `id_inscripcion` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_alumno` bigint(20) NOT NULL,
  `id_carrera` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `anio` int(11) NOT NULL,
  `id_turno` int(11) NOT NULL COMMENT '1=Febrero 2=Agosto 3=Diciembre',
  `id_llamado` tinyint(4) NOT NULL COMMENT '1=Primero 2=Segundo',
  `estado` char(1) NOT NULL,
  `verificada` char(1) NOT NULL,
  `fecha_hora` datetime NOT NULL COMMENT 'Fecha y hora de la inscripción',
  PRIMARY KEY (`id_inscripcion`),
  KEY `fk_insc_alumno` (`id_alumno`),
  KEY `fk_insc_carrera_materia` (`id_carrera`,`id_materia`),
  KEY `fk_insc_turno` (`id_turno`),
  CONSTRAINT `fk_insc_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`),
  CONSTRAINT `fk_insc_carrera_materia` FOREIGN KEY (`id_carrera`, `id_materia`) REFERENCES `carrera_materias` (`id_carrera`, `id_materia`),
  CONSTRAINT `fk_insc_turno` FOREIGN KEY (`id_turno`) REFERENCES `turnos` (`id_turno`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inscripciones`
--

LOCK TABLES `inscripciones` WRITE;
/*!40000 ALTER TABLE `inscripciones` DISABLE KEYS */;
INSERT INTO `inscripciones` VALUES (1,1,1,9,2025,3,1,'R','S','2025-11-28 10:15:00'),(2,1,1,4,2024,3,1,'R','S','2024-11-25 11:20:00'),(3,1,1,4,2025,1,1,'R','S','2025-02-10 14:00:00'),(4,1,1,4,2025,2,1,'R','S','2025-06-20 16:30:00'),(5,1,1,3,2024,3,1,'R','S','2024-11-26 12:00:00'),(6,2,2,6,2024,3,1,'R','S','2024-11-24 10:00:00'),(7,2,2,6,2025,1,1,'R','S','2025-02-12 11:30:00'),(8,2,2,6,2025,2,1,'R','S','2025-06-22 17:15:00'),(9,2,2,7,2024,3,1,'R','S','2024-11-25 15:45:00'),(10,2,2,7,2025,1,1,'R','S','2025-02-15 16:00:00'),(11,2,2,7,2025,2,1,'R','S','2025-06-25 18:20:00'),(12,2,2,7,2025,3,1,'R','S','2025-11-27 19:10:00'),(13,2,2,7,2026,2,1,'I','S','2026-11-19 21:12:13'),(14,9,2,7,2026,1,1,'I','S','2026-11-19 21:12:13');
/*!40000 ALTER TABLE `inscripciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localidades`
--

DROP TABLE IF EXISTS `localidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localidades` (
  `id_localidad` int(11) NOT NULL,
  `id_provincia` int(11) DEFAULT NULL,
  `id_partido` int(11) DEFAULT NULL,
  `nombre` varchar(83) DEFAULT NULL,
  PRIMARY KEY (`id_localidad`),
  KEY `fk_localidad_provincia` (`id_provincia`),
  KEY `fk_localidad_partido` (`id_partido`),
  CONSTRAINT `fk_localidad_partido` FOREIGN KEY (`id_partido`) REFERENCES `partidos` (`id_partido`),
  CONSTRAINT `fk_localidad_provincia` FOREIGN KEY (`id_provincia`) REFERENCES `provincias` (`id_provincia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localidades`
--

LOCK TABLES `localidades` WRITE;
/*!40000 ALTER TABLE `localidades` DISABLE KEYS */;
INSERT INTO `localidades` VALUES (1,1,1,'Isidro Casanova'),(2,1,1,'San Justo'),(3,1,1,'Ramos Mejía'),(4,1,2,'Morón'),(5,1,3,'Merlo');
/*!40000 ALTER TABLE `localidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materia_horarios`
--

DROP TABLE IF EXISTS `materia_horarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `materia_horarios` (
  `id_horario` int(11) NOT NULL AUTO_INCREMENT,
  `id_carrera` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `dia_semana` enum('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado') NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `id_sede` int(11) DEFAULT 1,
  `id_turno` int(11) DEFAULT 3,
  `aula` varchar(45) DEFAULT NULL,
  `comision` varchar(20) DEFAULT 'Única',
  PRIMARY KEY (`id_horario`),
  KEY `fk_horario_carrera_materia` (`id_carrera`,`id_materia`),
  KEY `fk_horario_sede` (`id_sede`),
  KEY `fk_horario_turno` (`id_turno`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materia_horarios`
--

LOCK TABLES `materia_horarios` WRITE;
/*!40000 ALTER TABLE `materia_horarios` DISABLE KEYS */;
INSERT INTO `materia_horarios` VALUES (1,3,24,'Lunes','18:00:00','22:00:00',1,3,'Aula 1','Comisión Única'),(5,3,29,'Lunes','18:00:00','22:00:00',1,3,'Aula 5','Comisión Única'),(6,3,27,'Lunes','18:00:00','22:00:00',1,3,'Aula 3','Comisión Única');
/*!40000 ALTER TABLE `materia_horarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materias`
--

DROP TABLE IF EXISTS `materias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `materias` (
  `id_materia` int(11) NOT NULL,
  `nombre_materia` varchar(100) NOT NULL,
  PRIMARY KEY (`id_materia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materias`
--

LOCK TABLES `materias` WRITE;
/*!40000 ALTER TABLE `materias` DISABLE KEYS */;
INSERT INTO `materias` VALUES (1,'Algoritmos y Estructuras de Datos I'),(2,'Sistemas Operativos'),(3,'Bases de Datos'),(4,'Análisis y Diseño de Sistemas'),(5,'Prácticas Profesionalizantes III'),(6,'Programación I'),(7,'Programación Web Frontend'),(8,'Arquitectura de Software'),(9,'Matemática y Lógica'),(10,'Inglés Técnico I'),(11,'Programación II'),(12,'Redes y Comunicaciones'),(13,'Gestión de Proyectos Informáticos'),(14,'Seguridad Informática'),(15,'Ética y Deontología Profesional'),(16,'Introducción a la Informática'),(17,'Álgebra y Geometría Analítica'),(18,'Taller de Metodologías Ágiles'),(19,'Desarrollo Backend y APIs'),(20,'Bases de Datos Relacionales y NoSQL'),(21,'Testing y Calidad de Software'),(22,'Computación en la Nube y DevOps'),(23,'Taller de Prácticas de Software'),(24,'Anatomía y Fisiología Humana'),(25,'Fundamentos de Enfermería'),(26,'Salud Pública y Comunitaria'),(27,'Enfermería Materno Infantil'),(28,'Farmacología Clínica'),(29,'Práctica Integrada Hospitalaria'),(30,'Principios de Administración'),(31,'Contabilidad Básica e Impositiva'),(32,'Administración Financiera'),(33,'Costos y Presupuestos'),(34,'Dirección Estratégica y RRHH');
/*!40000 ALTER TABLE `materias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matriculacion`
--

DROP TABLE IF EXISTS `matriculacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `matriculacion` (
  `id_alumno` bigint(20) NOT NULL,
  `id_carrera` int(11) NOT NULL,
  `anio_inscripcion` int(11) NOT NULL,
  `id_turno` int(11) NOT NULL,
  `id_sede` int(11) NOT NULL,
  `tomo_matriz` int(11) DEFAULT NULL,
  `folio_matriz` int(11) DEFAULT NULL,
  `fecha_alta` datetime DEFAULT NULL,
  `fecha_mod` datetime DEFAULT NULL,
  PRIMARY KEY (`id_alumno`,`id_carrera`),
  KEY `fk_matr_carrera` (`id_carrera`),
  KEY `fk_matr_turno` (`id_turno`),
  KEY `fk_matr_sede` (`id_sede`),
  CONSTRAINT `fk_matr_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`),
  CONSTRAINT `fk_matr_carrera` FOREIGN KEY (`id_carrera`) REFERENCES `carreras` (`id_carrera`),
  CONSTRAINT `fk_matr_sede` FOREIGN KEY (`id_sede`) REFERENCES `sedes` (`id_sede`),
  CONSTRAINT `fk_matr_turno` FOREIGN KEY (`id_turno`) REFERENCES `turnos` (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matriculacion`
--

LOCK TABLES `matriculacion` WRITE;
/*!40000 ALTER TABLE `matriculacion` DISABLE KEYS */;
INSERT INTO `matriculacion` VALUES (1,1,2023,3,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(2,2,2024,3,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(3,1,2022,3,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(4,3,2023,1,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(5,2,2024,3,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(6,1,2023,1,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(7,1,2021,3,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(8,4,2024,3,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(9,2,2023,2,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(10,3,2023,2,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(11,1,2022,3,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(12,2,2025,1,1,NULL,NULL,'2026-11-19 21:12:13',NULL),(13,1,2026,3,1,NULL,NULL,'2026-11-24 00:48:14',NULL);
/*!40000 ALTER TABLE `matriculacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matriculacion_detalle`
--

DROP TABLE IF EXISTS `matriculacion_detalle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `matriculacion_detalle` (
  `id_alumno` bigint(20) NOT NULL,
  `id_carrera` int(11) NOT NULL,
  `anio_matriculacion` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `tipo_asistencia` varchar(3) DEFAULT NULL COMMENT '1=Presencial 2=Libre 3=Vocacional',
  PRIMARY KEY (`id_alumno`,`id_carrera`,`anio_matriculacion`,`id_materia`),
  KEY `fk_matrdet_carrera_materia` (`id_carrera`,`id_materia`),
  CONSTRAINT `fk_matrdet_carrera_materia` FOREIGN KEY (`id_carrera`, `id_materia`) REFERENCES `carrera_materias` (`id_carrera`, `id_materia`),
  CONSTRAINT `fk_matrdet_matriculacion` FOREIGN KEY (`id_alumno`, `id_carrera`) REFERENCES `matriculacion` (`id_alumno`, `id_carrera`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matriculacion_detalle`
--

LOCK TABLES `matriculacion_detalle` WRITE;
/*!40000 ALTER TABLE `matriculacion_detalle` DISABLE KEYS */;
INSERT INTO `matriculacion_detalle` VALUES (1,1,2023,1,'REG'),(1,1,2023,2,'REG'),(1,1,2024,3,'REG'),(1,1,2024,4,'REG'),(2,2,2024,6,'REG'),(2,2,2024,7,'REG'),(2,2,2025,19,'REG'),(3,1,2022,1,'REG'),(3,1,2022,2,'REG'),(4,3,2023,24,'REG'),(4,3,2023,25,'REG'),(5,2,2024,6,'REG'),(5,2,2024,17,'REG'),(6,1,2023,2,'REG'),(6,1,2023,3,'REG'),(7,1,2021,1,'REG'),(7,1,2024,11,'REG'),(8,4,2024,30,'REG'),(8,4,2024,31,'REG'),(9,2,2023,7,'REG'),(10,3,2023,24,'REG'),(11,1,2022,3,'REG'),(12,2,2025,6,'REG');
/*!40000 ALTER TABLE `matriculacion_detalle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `official_sheets`
--

DROP TABLE IF EXISTS `official_sheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `official_sheets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `sheet_type` enum('MESA_EXAMEN','ACTA_VOLANTE') NOT NULL,
  `user_id_creador` int(11) NOT NULL,
  `id_carrera` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `carrera` varchar(100) NOT NULL,
  `materia` varchar(100) NOT NULL,
  `libro_numero` varchar(20) DEFAULT '',
  `folio_numero` varchar(20) DEFAULT '',
  `fecha` varchar(20) DEFAULT '',
  `docente_titular` varchar(100) DEFAULT '',
  `docente_suplente` varchar(100) DEFAULT '',
  `primer_vocal` varchar(100) DEFAULT '',
  `segundo_vocal` varchar(100) DEFAULT '',
  `rows_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`rows_data`)),
  `estado` varchar(20) NOT NULL DEFAULT 'Borrador' COMMENT 'Borrador, GRIS, AMARILLO, VERDE, ROJO',
  `observaciones_admin` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_sheet_creator` (`user_id_creador`),
  KEY `fk_sheet_carrera_materia` (`id_carrera`,`id_materia`),
  KEY `idx_sheet_type` (`sheet_type`),
  KEY `idx_sheet_estado` (`estado`),
  CONSTRAINT `fk_sheet_carrera_materia` FOREIGN KEY (`id_carrera`, `id_materia`) REFERENCES `carrera_materias` (`id_carrera`, `id_materia`),
  CONSTRAINT `fk_sheet_creator` FOREIGN KEY (`user_id_creador`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Planillas y actas volantes oficiales digitalizadas con RLS';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `official_sheets`
--

LOCK TABLES `official_sheets` WRITE;
/*!40000 ALTER TABLE `official_sheets` DISABLE KEYS */;
/*!40000 ALTER TABLE `official_sheets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paises`
--

DROP TABLE IF EXISTS `paises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `paises` (
  `id_pais` char(2) NOT NULL,
  `iso3` char(3) DEFAULT NULL,
  `nombre` varchar(45) DEFAULT NULL,
  `nacionalidad` varchar(45) DEFAULT NULL,
  `orden` int(11) DEFAULT 1000,
  PRIMARY KEY (`id_pais`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paises`
--

LOCK TABLES `paises` WRITE;
/*!40000 ALTER TABLE `paises` DISABLE KEYS */;
INSERT INTO `paises` VALUES ('AR','ARG','Argentina','Argentina',1),('BR','BRA','Brasil','Brasileña',2),('CL','CHL','Chile','Chilena',3),('PY','PRY','Paraguay','Paraguaya',5),('UY','URY','Uruguay','Uruguaya',4),('ZZ','ZZZ','No especificado','No especificada',9999);
/*!40000 ALTER TABLE `paises` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parametros_generales`
--

DROP TABLE IF EXISTS `parametros_generales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parametros_generales` (
  `id_registro` int(11) NOT NULL,
  `nombre_instituto` varchar(45) NOT NULL,
  `ciclo_lectivo` int(11) NOT NULL,
  PRIMARY KEY (`id_registro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parametros_generales`
--

LOCK TABLES `parametros_generales` WRITE;
/*!40000 ALTER TABLE `parametros_generales` DISABLE KEYS */;
/*!40000 ALTER TABLE `parametros_generales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parametros_inscripcion`
--

DROP TABLE IF EXISTS `parametros_inscripcion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parametros_inscripcion` (
  `id_registro` int(11) NOT NULL,
  `anio_inscripcion_carrera` int(11) DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  PRIMARY KEY (`id_registro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parametros_inscripcion`
--

LOCK TABLES `parametros_inscripcion` WRITE;
/*!40000 ALTER TABLE `parametros_inscripcion` DISABLE KEYS */;
INSERT INTO `parametros_inscripcion` VALUES (1,2026,'2026-02-01','2026-03-31'),(2,2026,'2026-06-01','2026-07-31'),(3,2026,'2026-11-01','2026-12-31');
/*!40000 ALTER TABLE `parametros_inscripcion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parametros_matriculacion`
--

DROP TABLE IF EXISTS `parametros_matriculacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parametros_matriculacion` (
  `id_registro` int(11) NOT NULL,
  `anio_matriculacion` int(11) DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `carpeta_vista_alumno` varchar(45) DEFAULT NULL,
  `carpeta_vista_preceptoria` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id_registro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parametros_matriculacion`
--

LOCK TABLES `parametros_matriculacion` WRITE;
/*!40000 ALTER TABLE `parametros_matriculacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `parametros_matriculacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parametros_mesas`
--

DROP TABLE IF EXISTS `parametros_mesas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parametros_mesas` (
  `id_registro` int(11) NOT NULL,
  `anio_mesas` int(11) NOT NULL,
  `id_turno` int(11) NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `tope_mesas` smallint(6) DEFAULT NULL,
  PRIMARY KEY (`id_registro`),
  KEY `fk_parammesas_turno` (`id_turno`),
  CONSTRAINT `fk_parammesas_turno` FOREIGN KEY (`id_turno`) REFERENCES `turnos` (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parametros_mesas`
--

LOCK TABLES `parametros_mesas` WRITE;
/*!40000 ALTER TABLE `parametros_mesas` DISABLE KEYS */;
INSERT INTO `parametros_mesas` VALUES (1,2026,1,'2026-02-15','2026-03-10',3),(2,2026,2,'2026-06-25','2026-07-20',3),(3,2026,3,'2026-11-25','2026-12-22',3);
/*!40000 ALTER TABLE `parametros_mesas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidos`
--

DROP TABLE IF EXISTS `partidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `partidos` (
  `id_partido` int(11) NOT NULL,
  `id_provincia` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  PRIMARY KEY (`id_partido`),
  KEY `fk_partido_provincia` (`id_provincia`),
  CONSTRAINT `fk_partido_provincia` FOREIGN KEY (`id_provincia`) REFERENCES `provincias` (`id_provincia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidos`
--

LOCK TABLES `partidos` WRITE;
/*!40000 ALTER TABLE `partidos` DISABLE KEYS */;
INSERT INTO `partidos` VALUES (1,1,'La Matanza'),(2,1,'Morón'),(3,1,'Merlo');
/*!40000 ALTER TABLE `partidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `module` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=512 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Catálogo de permisos asignables a cada rol';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'AUTH_LOGIN','Iniciar Sesión','Acceso a la plataforma','AUTH'),(2,'USERS_VIEW','Ver Usuarios','Listar y consultar usuarios','USERS'),(3,'USERS_CREATE','Crear Usuario','Alta de nuevos usuarios','USERS'),(4,'USERS_EDIT','Editar Usuario','Modificar datos de usuario','USERS'),(5,'USERS_DEACTIVATE','Desactivar Usuario','Cambiar estado activo/inactivo','USERS'),(6,'ROLES_VIEW','Ver Roles','Consultar roles y permisos','ROLES'),(7,'ROLES_MANAGE','Gestionar Permisos','Asignar permisos a roles','ROLES'),(8,'AUDIT_VIEW','Ver Auditoría','Consultar logs inmutables de auditoría','AUDIT'),(9,'GRADES_VIEW','Ver Notas y Semáforo','Visualizar registros de notas y semáforo','ACADEMIC'),(10,'GRADES_RECALCULATE','Recalcular Semáforo','Disparar recálculo de semáforo','ACADEMIC'),(11,'EXAMS_CREATE','Cargar Examen','Registrar notas de parciales y finales','ACADEMIC'),(12,'EXAMS_EDIT','Editar Examen','Modificar calificaciones de examen','ACADEMIC');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal`
--

DROP TABLE IF EXISTS `personal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal` (
  `id_personal` int(11) NOT NULL AUTO_INCREMENT,
  `apellidos` varchar(100) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `usuario_sistema` varchar(50) NOT NULL,
  `id_tipo_personal` char(1) NOT NULL,
  PRIMARY KEY (`id_personal`),
  UNIQUE KEY `uq_personal_usuario` (`usuario_sistema`),
  KEY `fk_personal_tipo` (`id_tipo_personal`),
  CONSTRAINT `fk_personal_tipo` FOREIGN KEY (`id_tipo_personal`) REFERENCES `tipos_personal` (`id_tipo_personal`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal`
--

LOCK TABLES `personal` WRITE;
/*!40000 ALTER TABLE `personal` DISABLE KEYS */;
INSERT INTO `personal` VALUES (1,'González','Marta','mgonzalez','P'),(2,'Silva','Roberto','rsilva','P');
/*!40000 ALTER TABLE `personal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `provincias`
--

DROP TABLE IF EXISTS `provincias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `provincias` (
  `id_provincia` int(11) NOT NULL,
  `nombre` varchar(31) DEFAULT NULL,
  PRIMARY KEY (`id_provincia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `provincias`
--

LOCK TABLES `provincias` WRITE;
/*!40000 ALTER TABLE `provincias` DISABLE KEYS */;
INSERT INTO `provincias` VALUES (1,'Buenos Aires'),(2,'Ciudad Autónoma de Buenos Aires'),(3,'Córdoba'),(4,'Santa Fe');
/*!40000 ALTER TABLE `provincias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rendiciones_finales`
--

DROP TABLE IF EXISTS `rendiciones_finales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rendiciones_finales` (
  `id_rendicion` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_alumno` bigint(20) NOT NULL,
  `id_carrera` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `anio_turno` int(11) NOT NULL COMMENT 'Año del turno (ej: 2026)',
  `turno_instancia` tinyint(4) NOT NULL COMMENT '1=Febrero/Marzo, 2=Junio/Julio, 3=Diciembre',
  `id_llamado` tinyint(4) NOT NULL DEFAULT 1 COMMENT '1=Primero, 2=Segundo',
  `fecha_examen` date DEFAULT NULL,
  `nota` tinyint(4) DEFAULT NULL COMMENT 'Calificación 1-10 o NULL si ausente/inscripto',
  `estado` enum('INSCRIPTO','APROBADO','DESAPROBADO','AUSENTE','BAJA') NOT NULL DEFAULT 'INSCRIPTO',
  `modalidad` enum('REGULAR','LIBRE') NOT NULL DEFAULT 'REGULAR' COMMENT 'Condición de inscripción al final',
  `es_ausente` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 si estuvo ausente (no computa como falla)',
  `es_excepcion` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 si se inscribió por excepción',
  `motivo_excepcion` varchar(255) DEFAULT NULL COMMENT 'Motivo si fue por excepción',
  `reasignada` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_baja` datetime DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_rendicion`),
  KEY `fk_rend_alumno` (`id_alumno`),
  KEY `fk_rend_carrera_materia` (`id_carrera`,`id_materia`),
  CONSTRAINT `fk_rend_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`),
  CONSTRAINT `fk_rend_carrera_materia` FOREIGN KEY (`id_carrera`, `id_materia`) REFERENCES `carrera_materias` (`id_carrera`, `id_materia`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rendiciones_finales`
--

LOCK TABLES `rendiciones_finales` WRITE;
/*!40000 ALTER TABLE `rendiciones_finales` DISABLE KEYS */;
INSERT INTO `rendiciones_finales` VALUES (1,1,1,9,2025,3,1,'2025-12-16',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-12-16 19:30:00'),(2,1,1,4,2024,3,1,'2024-12-14',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-14 18:00:00'),(3,1,1,4,2025,1,1,'2025-02-28',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-02-28 18:00:00'),(4,1,1,4,2025,2,1,'2025-07-08',3,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-07-08 18:30:00'),(5,1,1,3,2024,3,1,'2024-12-18',8,'APROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-18 20:00:00'),(6,2,2,6,2024,3,1,'2024-12-10',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-10 18:00:00'),(7,2,2,6,2025,1,1,'2025-02-25',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2025-02-25 18:00:00'),(8,2,2,6,2025,2,1,'2025-07-05',3,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-07-05 18:00:00'),(9,2,2,7,2024,3,1,'2024-12-12',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-12 19:00:00'),(10,2,2,7,2025,1,1,'2025-02-28',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-02-28 19:00:00'),(11,2,2,7,2025,2,1,'2025-07-10',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2025-07-10 19:00:00'),(12,2,2,7,2025,3,1,'2025-12-15',3,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-12-15 19:00:00'),(13,2,2,7,2026,2,1,NULL,NULL,'INSCRIPTO','REGULAR',0,1,'Autorización decanal por correlatividad terminal',0,NULL,'2026-11-19 21:12:13'),(14,2,2,19,2025,3,1,'2025-12-18',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-12-18 19:00:00'),(15,2,2,19,2026,1,1,'2026-02-27',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2026-02-27 19:00:00'),(16,2,2,16,2024,3,1,'2024-12-20',9,'APROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-20 18:30:00'),(17,2,2,21,2025,2,1,'2025-07-15',7,'APROBADO','REGULAR',0,0,NULL,0,NULL,'2025-07-15 19:00:00'),(18,3,1,10,2025,3,1,'2025-12-19',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2025-12-19 18:00:00'),(19,3,1,1,2025,1,1,'2025-02-24',6,'APROBADO','REGULAR',0,0,NULL,0,NULL,'2025-02-24 18:00:00'),(20,4,3,28,2024,3,1,'2024-12-17',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-17 10:00:00'),(21,4,3,28,2025,2,1,'2025-07-14',3,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-07-14 10:00:00'),(22,4,3,25,2023,3,1,'2023-12-15',10,'APROBADO','REGULAR',0,0,NULL,0,NULL,'2023-12-15 11:00:00'),(23,5,2,6,2024,3,1,'2024-12-10',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-10 18:00:00'),(24,5,2,6,2025,1,1,'2025-02-25',1,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-02-25 18:00:00'),(25,5,2,6,2025,2,1,'2025-07-05',3,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-07-05 18:00:00'),(26,5,2,6,2025,3,1,'2025-12-16',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-12-16 18:00:00'),(27,6,1,3,2025,3,1,'2025-12-18',3,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-12-18 09:30:00'),(28,7,1,11,2024,3,1,'2024-12-16',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2024-12-16 18:00:00'),(29,7,1,11,2025,1,1,'2025-03-02',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2025-03-02 18:00:00'),(30,7,1,11,2025,2,1,'2025-07-11',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2025-07-11 18:00:00'),(31,8,4,31,2024,3,1,'2024-12-18',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-18 19:00:00'),(32,8,4,31,2025,2,1,'2025-07-16',3,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-07-16 19:00:00'),(33,8,4,30,2024,3,1,'2024-12-14',7,'APROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-14 18:30:00'),(34,9,2,7,2026,1,1,NULL,NULL,'INSCRIPTO','REGULAR',0,1,'Resolución Decanal 45/26 por representación deportiva',0,NULL,'2026-11-19 21:12:13'),(35,9,2,19,2025,3,1,'2025-12-18',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2025-12-18 15:00:00'),(36,10,3,24,2024,3,1,'2024-12-15',3,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-15 15:30:00'),(37,10,3,24,2025,1,1,'2025-02-26',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2025-02-26 15:30:00'),(38,10,3,29,2025,3,1,'2025-12-18',9,'APROBADO','REGULAR',0,0,NULL,0,NULL,'2025-12-18 14:00:00'),(39,11,1,3,2024,3,1,'2024-12-18',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2024-12-18 18:30:00'),(40,11,1,3,2025,1,1,'2025-03-01',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2025-03-01 18:30:00'),(41,11,1,3,2025,2,1,'2025-07-09',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2025-07-09 18:30:00'),(42,11,1,3,2025,3,1,'2025-12-17',NULL,'AUSENTE','REGULAR',1,0,NULL,0,NULL,'2025-12-17 18:30:00'),(43,11,1,1,2024,1,1,'2024-03-05',6,'APROBADO','REGULAR',0,0,NULL,0,NULL,'2024-03-05 18:30:00'),(44,12,2,17,2024,3,1,'2024-12-19',2,'DESAPROBADO','REGULAR',0,0,NULL,0,NULL,'2024-12-19 09:30:00'),(45,12,2,16,2025,3,1,'2025-12-21',10,'APROBADO','REGULAR',0,0,NULL,0,NULL,'2025-12-21 09:00:00'),(49,1,1,1,2026,3,1,NULL,NULL,'INSCRIPTO','REGULAR',0,0,NULL,0,NULL,'2026-11-24 20:00:07'),(50,13,1,9,2026,3,1,NULL,NULL,'INSCRIPTO','REGULAR',0,1,'Hijo de Ruiz',0,NULL,'2026-11-24 20:21:17');
/*!40000 ALTER TABLE `rendiciones_finales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_rp_permission` (`permission_id`),
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Asignación de permisos por rol';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(2,2),(2,3),(2,4),(2,5),(2,6),(2,8),(2,9),(2,11),(2,12),(3,9),(3,10),(3,11),(3,12),(4,2),(4,6),(4,8),(4,9),(4,10),(5,9),(6,9);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=275 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Roles RBAC del sistema para control de acceso y permisos';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMINISTRADOR','Acceso total y configuración del sistema',1,'2026-11-19 21:15:49'),(2,'ADMINISTRATIVO','Gestión de usuarios, estudiantes y consulta de auditoría',1,'2026-11-19 21:15:49'),(3,'DOCENTE','Carga de notas y consulta de materias a cargo',1,'2026-11-19 21:15:49'),(4,'PRECEPTOR','Visualización y control de actas volantes, mesas de examen y regularidad',1,'2026-11-19 21:15:49'),(5,'ALUMNO','Estudiante institucional - Consulta de notas, cursadas y situación académica',1,'2026-11-19 21:15:49'),(6,'CONSULTA','Solo lectura de registros y estado de notas',1,'2026-11-19 21:15:49');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sedes`
--

DROP TABLE IF EXISTS `sedes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sedes` (
  `id_sede` int(11) NOT NULL,
  `nombre_sede` varchar(45) NOT NULL,
  PRIMARY KEY (`id_sede`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sedes`
--

LOCK TABLES `sedes` WRITE;
/*!40000 ALTER TABLE `sedes` DISABLE KEYS */;
INSERT INTO `sedes` VALUES (1,'Sede Central - ISFT 182'),(2,'Anexo I - Escuela N° 3');
/*!40000 ALTER TABLE `sedes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_subject_records`
--

DROP TABLE IF EXISTS `student_subject_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `student_subject_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `student_id` bigint(20) NOT NULL COMMENT 'FK a tabla alumnos',
  `id_carrera` int(11) NOT NULL COMMENT 'FK a carrera_materias',
  `id_materia` int(11) NOT NULL COMMENT 'FK a carrera_materias',
  `academic_year` int(11) NOT NULL,
  `cursada_status` varchar(30) NOT NULL DEFAULT 'EN_CURSO' COMMENT 'EN_CURSO, REGULAR, APROBADA_PROMOCION, APROBADA_FINAL, etc.',
  `cursada_grade` decimal(4,2) DEFAULT NULL,
  `final_exam_grade` decimal(4,2) DEFAULT NULL,
  `traffic_light_color` enum('GREEN','YELLOW','ORANGE','RED','GRAY') NOT NULL DEFAULT 'GRAY',
  `traffic_light_label` varchar(100) NOT NULL DEFAULT 'Pendiente de Validación',
  `traffic_light_reason` text NOT NULL,
  `sheet_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Metadatos de la planilla en formato JSON' CHECK (json_valid(`sheet_data`)),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_subject_year` (`student_id`,`id_carrera`,`id_materia`,`academic_year`),
  KEY `fk_ssr_alumno` (`student_id`),
  KEY `fk_ssr_carrera_materia` (`id_carrera`,`id_materia`),
  CONSTRAINT `fk_ssr_alumno` FOREIGN KEY (`student_id`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE,
  CONSTRAINT `fk_ssr_carrera_materia` FOREIGN KEY (`id_carrera`, `id_materia`) REFERENCES `carrera_materias` (`id_carrera`, `id_materia`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Cálculo del semáforo y estado de cursada por estudiante y materia';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_subject_records`
--

LOCK TABLES `student_subject_records` WRITE;
/*!40000 ALTER TABLE `student_subject_records` DISABLE KEYS */;
INSERT INTO `student_subject_records` VALUES (1,1,1,1,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2025) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(2,1,1,2,2021,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2021) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(3,1,1,3,2024,'APROBADA_FINAL',NULL,8.00,'GREEN','Aprobada por Examen Final','Materia acreditada formalmente con calificación 8 en el historial académico oficial.','{}','2026-11-21 13:00:56'),(4,1,1,4,2024,'DESAPROBADA_FINAL',NULL,3.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 3 (< 4).','{}','2026-11-21 13:00:56'),(5,1,1,9,2025,'DESAPROBADA_FINAL',NULL,2.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 2 (< 4).','{}','2026-11-21 13:00:56'),(6,1,1,10,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2025) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(7,1,1,11,2026,'EN_CURSO',NULL,NULL,'GRAY','Pendiente de Validación','Cursada registrada sin regularidad validada en el historial académico.','{}','2026-11-21 13:00:56'),(8,5,2,6,2024,'DESAPROBADA_FINAL',NULL,2.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 2 (< 4).','{}','2026-11-21 13:00:56'),(9,5,2,16,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2025) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(10,5,2,17,2019,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2019) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(11,9,2,7,2023,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2023) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(12,9,2,19,2025,'DESAPROBADA_FINAL',NULL,2.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 2 (< 4).','{}','2026-11-21 13:00:56'),(13,2,2,6,2024,'DESAPROBADA_FINAL',NULL,3.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 3 (< 4).','{}','2026-11-21 13:00:56'),(14,2,2,7,2024,'DESAPROBADA_FINAL',NULL,3.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 3 (< 4).','{}','2026-11-21 13:00:56'),(15,2,2,16,2024,'APROBADA_FINAL',NULL,9.00,'GREEN','Aprobada por Examen Final','Materia acreditada formalmente con calificación 9 en el historial académico oficial.','{}','2026-11-21 13:00:56'),(16,2,2,17,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2025) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(17,2,2,19,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Final Ausente)','Cursada regularizada en historial académico. Registró ausencia en última mesa de examen final.','{}','2026-11-21 13:00:56'),(18,2,2,21,2024,'APROBADA_FINAL',NULL,7.00,'GREEN','Aprobada por Examen Final','Materia acreditada formalmente con calificación 7 en el historial académico oficial.','{}','2026-11-21 13:00:56'),(19,6,1,2,2023,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2023) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(20,6,1,3,2025,'DESAPROBADA_FINAL',NULL,3.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 3 (< 4).','{}','2026-11-21 13:00:56'),(21,6,1,14,2026,'EN_CURSO',NULL,NULL,'GRAY','Pendiente de Validación','Cursada registrada sin regularidad validada en el historial académico.','{}','2026-11-21 13:00:56'),(22,11,1,1,2023,'APROBADA_FINAL',NULL,6.00,'GREEN','Aprobada por Examen Final','Materia acreditada formalmente con calificación 6 en el historial académico oficial.','{}','2026-11-21 13:00:56'),(23,11,1,3,2024,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Final Ausente)','Cursada regularizada en historial académico. Registró ausencia en última mesa de examen final.','{}','2026-11-21 13:00:56'),(24,3,1,1,2024,'APROBADA_FINAL',NULL,6.00,'GREEN','Aprobada por Examen Final','Materia acreditada formalmente con calificación 6 en el historial académico oficial.','{}','2026-11-21 13:00:56'),(25,3,1,2,2020,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2020) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(26,3,1,4,2026,'APROBADA_PROMOCION',NULL,9.00,'GREEN','Verificado (Promoción Aprobada)','Acreditada por Promoción verificada (Nota: 9).','{}','2026-11-24 20:51:55'),(27,3,1,10,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Final Ausente)','Cursada regularizada en historial académico. Registró ausencia en última mesa de examen final.','{}','2026-11-21 13:00:56'),(28,3,1,12,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2025) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(29,7,1,1,2024,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2024) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(30,7,1,5,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2025) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(31,7,1,11,2024,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Final Ausente)','Cursada regularizada en historial académico. Registró ausencia en última mesa de examen final.','{}','2026-11-21 13:00:56'),(32,12,2,6,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2025) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(33,12,2,16,2025,'APROBADA_FINAL',NULL,10.00,'GREEN','Aprobada por Examen Final','Materia acreditada formalmente con calificación 10 en el historial académico oficial.','{}','2026-11-21 13:00:56'),(34,12,2,17,2024,'DESAPROBADA_FINAL',NULL,2.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 2 (< 4).','{}','2026-11-21 13:00:56'),(35,4,3,24,2022,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2022) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(36,4,3,25,2023,'APROBADA_FINAL',NULL,10.00,'GREEN','Aprobada por Examen Final','Materia acreditada formalmente con calificación 10 en el historial académico oficial.','{}','2026-11-21 13:00:56'),(37,4,3,26,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2025) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(38,4,3,28,2024,'DESAPROBADA_FINAL',NULL,3.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 3 (< 4).','{}','2026-11-21 13:00:56'),(39,10,3,24,2024,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Final Ausente)','Cursada regularizada en historial académico. Registró ausencia en última mesa de examen final.','{}','2026-11-21 13:00:56'),(40,10,3,27,2025,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2025) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56'),(41,10,3,29,2024,'APROBADA_FINAL',NULL,9.00,'GREEN','Aprobada por Examen Final','Materia acreditada formalmente con calificación 9 en el historial académico oficial.','{}','2026-11-21 13:00:56'),(42,8,4,30,2024,'APROBADA_FINAL',NULL,7.00,'GREEN','Aprobada por Examen Final','Materia acreditada formalmente con calificación 7 en el historial académico oficial.','{}','2026-11-21 13:00:56'),(43,8,4,31,2024,'DESAPROBADA_FINAL',NULL,3.00,'RED','Examen Final Desaprobado','Última mesa de examen final desaprobada con calificación 3 (< 4).','{}','2026-11-21 13:00:56'),(44,8,4,32,2022,'REGULAR',NULL,NULL,'ORANGE','Cursada Regularizada (Pendiente Final)','Cursada regularizada (año 2022) según historial académico. Habilitado para rendir Examen Final.','{}','2026-11-21 13:00:56');
/*!40000 ALTER TABLE `student_subject_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipos_documento`
--

DROP TABLE IF EXISTS `tipos_documento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tipos_documento` (
  `id_tipo_documento` varchar(4) NOT NULL,
  `descripcion` varchar(30) NOT NULL,
  PRIMARY KEY (`id_tipo_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_documento`
--

LOCK TABLES `tipos_documento` WRITE;
/*!40000 ALTER TABLE `tipos_documento` DISABLE KEYS */;
INSERT INTO `tipos_documento` VALUES ('DNI','Documento Nacional de Identida'),('LC','Libreta Cívica'),('LE','Libreta de Enrolamiento'),('PAS','Pasaporte');
/*!40000 ALTER TABLE `tipos_documento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipos_personal`
--

DROP TABLE IF EXISTS `tipos_personal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tipos_personal` (
  `id_tipo_personal` char(1) NOT NULL,
  `descripcion` varchar(30) NOT NULL,
  PRIMARY KEY (`id_tipo_personal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_personal`
--

LOCK TABLES `tipos_personal` WRITE;
/*!40000 ALTER TABLE `tipos_personal` DISABLE KEYS */;
INSERT INTO `tipos_personal` VALUES ('D','Directivo/a'),('P','Preceptor/a');
/*!40000 ALTER TABLE `tipos_personal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turnos`
--

DROP TABLE IF EXISTS `turnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `turnos` (
  `id_turno` int(11) NOT NULL,
  `turno` varchar(20) NOT NULL,
  PRIMARY KEY (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turnos`
--

LOCK TABLES `turnos` WRITE;
/*!40000 ALTER TABLE `turnos` DISABLE KEYS */;
INSERT INTO `turnos` VALUES (1,'Mañana'),(2,'Tarde'),(3,'Vespertino');
/*!40000 ALTER TABLE `turnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `role_id` int(11) NOT NULL,
  `id_personal` int(11) DEFAULT NULL COMMENT 'Vínculo opcional con tabla personal',
  `id_alumno` bigint(20) DEFAULT NULL COMMENT 'Vínculo opcional con tabla alumnos',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `fk_users_role` (`role_id`),
  KEY `fk_users_personal` (`id_personal`),
  KEY `fk_users_alumno` (`id_alumno`),
  CONSTRAINT `fk_users_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_personal` FOREIGN KEY (`id_personal`) REFERENCES `personal` (`id_personal`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Usuarios autenticables de la plataforma con roles RBAC';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@institucion.edu','$2a$10$WfS0K8lWbTdYdQIxLOY3LOEYRZQjRQSCwGMzvvnRsN9CYzbgVderS','Super','Administrador',1,NULL,NULL,1,'2026-11-19 21:15:50','2026-11-19 21:15:50'),(2,'secretaria@institucion.edu','$2a$10$WfS0K8lWbTdYdQIxLOY3LOEYRZQjRQSCwGMzvvnRsN9CYzbgVderS','Mariana','López (Secretaría)',2,NULL,NULL,1,'2026-11-19 21:15:50','2026-11-19 21:15:50'),(3,'docente.perez@institucion.edu','$2a$10$WfS0K8lWbTdYdQIxLOY3LO3Ej9U6oTCS/c2bfAJijk.77XY1oxqpy','Carlos','Pérez (Docente)',3,NULL,NULL,1,'2026-11-19 21:15:50','2026-11-19 21:15:50'),(4,'preceptor@institucion.edu','$2a$10$WfS0K8lWbTdYdQIxLOY3LOhGPF7uR8RO1DcPLb/NT6jn5SSB7z7vi','Martín','Giménez (Preceptor)',4,NULL,NULL,1,'2026-11-19 21:15:50','2026-11-19 21:15:50'),(5,'alumno@institucion.edu','$2a$10$WfS0K8lWbTdYdQIxLOY3LOJlm1L/t2C59Zjslrh5w/SVUtYCtPaq6','Juan Carlos','Pérez (Estudiante)',5,NULL,1,1,'2026-11-19 21:15:50','2026-11-19 21:15:50'),(6,'consulta@institucion.edu','$2a$10$WfS0K8lWbTdYdQIxLOY3LOSCWtfP6AxIue3s9Gq9mzDKuwDrv0qTm','Ana','García (Auditor)',6,NULL,NULL,1,'2026-11-19 21:15:50','2026-11-23 06:17:03');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'clementina'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-24 20:59:33
