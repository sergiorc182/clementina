<?php
require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/VerificacionCorreo.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    responder(['ok' => true]);
}

requerirPostSeguro();

$token = is_scalar($_POST['token'] ?? '') && !is_bool($_POST['token'] ?? '')
    ? trim((string) $_POST['token'])
    : '';

$claveIntento = 'verificacion|' . hash('sha256', $token);
$espera = clementinaEsperaIntentos($claveIntento);
if ($espera > 0) {
    http_response_code(429);
    responder([
        'ok' => false,
        'mensaje' => 'Demasiados intentos. Intentá nuevamente en '
            . max(1, (int) ceil($espera / 60)) . ' minuto(s).',
    ]);
}

$modelo = new VerificacionCorreo(clementinaSecret());
$resultado = $modelo->confirmar($token);

if (!$resultado['ok']) {
    clementinaRegistrarFallo($claveIntento);
} else {
    clementinaLimpiarIntentos($claveIntento);
}

responder($resultado);
