<?php
/**
 * Controlador: Cerrar sesión
 *
 * Destruye la sesión y la cookie, y responde { ok: true }.
 */

session_start();

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

session_destroy();

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok'      => true,
    'mensaje' => 'Sesión cerrada.',
], JSON_UNESCAPED_UNICODE);