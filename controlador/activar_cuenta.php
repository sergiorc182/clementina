<?php
require_once __DIR__ . '/_base.php';
require_once __DIR__ . '/../modelo/ActivacionCuenta.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    responder(['ok' => true]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
}

requerirCsrf();

$token = trim((string) ($_POST['token'] ?? ''));
$password = (string) ($_POST['password'] ?? '');
$password2 = (string) ($_POST['password2'] ?? '');

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    responder(['ok' => false, 'mensaje' => 'El enlace de activación no es válido, venció o ya fue usado.']);
}
if ($password !== $password2) {
    responder(['ok' => false, 'mensaje' => 'Las contraseñas no coinciden.']);
}
if (mb_strlen($password) < 8 || mb_strlen($password) > 255) {
    responder(['ok' => false, 'mensaje' => 'La contraseña debe tener entre 8 y 255 caracteres.']);
}

$claveIntento = 'activacion|' . $token;
$espera = clementinaEsperaIntentos($claveIntento);
if ($espera > 0) {
    http_response_code(429);
    responder([
        'ok' => false,
        'mensaje' => 'Demasiados intentos. Intentá nuevamente en '
            . max(1, (int) ceil($espera / 60)) . ' minuto(s).',
    ]);
}

$modelo = new ActivacionCuenta();
$resultado = $modelo->activar($token, $password);

if (!$resultado['ok']) {
    clementinaRegistrarFallo($claveIntento);
    responder($resultado);
}

clementinaLimpiarIntentos($claveIntento);
responder($resultado);
