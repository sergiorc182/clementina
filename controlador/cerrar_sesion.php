<?php
/**
 * Controlador: Cerrar sesión
 *
 * Destruye la sesión y la cookie, y responde { ok: true }.
 */

<<<<<<< HEAD
session_start();
=======
require_once __DIR__ . '/_base.php';
>>>>>>> origin/InscripcionFinales

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

<<<<<<< HEAD
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok'      => true,
    'mensaje' => 'Sesión cerrada.',
], JSON_UNESCAPED_UNICODE);
=======
responder([
    'ok'      => true,
    'mensaje' => 'Sesión cerrada.',
]);
>>>>>>> origin/InscripcionFinales
