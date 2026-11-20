<?php
require_once __DIR__ . '/_base.php';

requerirPostSeguro();
requerirSesion();

$revocacion = clementinaRevocarTokenCookie();

if (!$revocacion['revocado']) {
    http_response_code(500);
    responder([
        'ok' => false,
        'mensaje' => 'No se pudo revocar el token de autenticación.',
        'token_revocado' => false,
    ]);
}

$_SESSION = [];
eliminarCookieAutenticacion();

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
    'ok' => true,
    'mensaje' => 'Sesión cerrada.',
    'token_revocado' => (bool) $revocacion['revocado'],
    'revocacion_aplicable' => (bool) $revocacion['aplicable'],
]);
