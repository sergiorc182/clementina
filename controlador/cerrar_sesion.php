<?php
/**
 * Controlador: Cerrar sesión
 *
 * Destruye la sesión y la cookie, y responde { ok: true }.
 */

require_once __DIR__ . '/_base.php';

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

responder([
    'ok'      => true,
    'mensaje' => 'Sesión cerrada.',
]);
