<?php
/**
 * Controlador: Cerrar sesión
 */
require_once __DIR__ . '/_sesion.php';

eliminarCookieAutenticacion();
$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok'      => true,
    'mensaje' => 'Sesión cerrada.',
], JSON_UNESCAPED_UNICODE);