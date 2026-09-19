<?php
/**
 * Configuración general del sistema.
 * ISFT 182 "Clementina" - Sistema de gestión académica
 *
 * Ajustar estos valores según el entorno (Hostinger, XAMPP, etc.).
 */

// --- Base de datos -------------------------------------------------------
define('DB_HOST', 'localhost');
define('DB_NAME', 'clementina');
define('DB_USER', 'root');
define('DB_PASS', '');

// Charset unificado en utf8mb4 (ver esquema_normalizado.sql)
define('DB_CHARSET', 'utf8mb4');

// --- General -------------------------------------------------------------
date_default_timezone_set('America/Argentina/Buenos_Aires');