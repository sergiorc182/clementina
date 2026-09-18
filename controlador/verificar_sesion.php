<?php
/**
 * Controlador: Verificar sesión
 *
 * Devuelve JSON con los datos del usuario logueado o { ok: false }.
 * Lo usan las vistas para proteger las páginas del menú.
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

if (!empty($_SESSION['usuario']['id'])) {
    echo json_encode([
        'ok'      => true,
        'usuario' => $_SESSION['usuario'],
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'ok'      => false,
        'mensaje' => 'No autenticado.',
    ], JSON_UNESCAPED_UNICODE);
}