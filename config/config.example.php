<?php
/**
 * Configuración general del sistema (plantilla).
 * Copiar como config/config.php y ajustar al entorno (XAMPP, Hostinger, etc.).
 * config/config.php está en .gitignore porque lleva claves.
 */

// --- Base de datos -------------------------------------------------------
define('DB_HOST', 'localhost');
define('DB_NAME', 'clementina');
define('DB_USER', 'root');   // XAMPP por defecto
define('DB_PASS', '');       // XAMPP por defecto: sin contraseña

// Charset unificado en utf8mb4 (ver docs/esquema_normalizado.sql)
define('DB_CHARSET', 'utf8mb4');

// --- General -------------------------------------------------------------
date_default_timezone_set('America/Argentina/Buenos_Aires');
