<?php
/**
 * Configuración general del sistema.
 * ISFT 182 "Clementina" - Sistema de gestión académica
 *
 * Ajustar estos valores según el entorno (Hostinger, XAMPP, etc.).
 */

// --- Base de datos -------------------------------------------------------
define('DB_HOST', 'srv568.hstgr.io');
define('DB_NAME', 'u714838186_desarrollo');
define('DB_USER', 'u714838186_desarrollo');
define('DB_PASS', 'Isft0182@');

// Charset unificado en utf8mb4 (ver esquema_normalizado.sql)
define('DB_CHARSET', 'utf8mb4');

// --- General -------------------------------------------------------------
date_default_timezone_set('America/Argentina/Buenos_Aires');