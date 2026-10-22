<?php
/**
 * Configuración general del sistema - EJEMPLO.
 * ISFT 182 "Clementina" - Sistema de gestión académica
 *
 * Copiá este archivo como config/config.php y completá tus datos.
 * config/config.php está en el .gitignore: nunca se sube al repo.
 */

// --- Base de datos -------------------------------------------------------
define('DB_HOST', 'localhost');
define('DB_NAME', 'clementina');
define('DB_USER', 'root');
define('DB_PASS', '');            // tu clave de MySQL, si tiene

// Charset unificado en utf8mb4 (ver esquema_normalizado.sql)
define('DB_CHARSET', 'utf8mb4');

// --- General -------------------------------------------------------------
date_default_timezone_set('America/Argentina/Buenos_Aires');
