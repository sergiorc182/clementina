<?php
/**
 * Controlador: reenvío seguro del correo de verificación.
 * ISFT 182 "Clementina"
 *
 * Las respuestas son deliberadamente genéricas para no permitir enumeración
 * de cuentas. El estado de verificación se lee siempre desde MySQL.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/VerificacionCorreo.php';
require_once dirname(__DIR__) . '/modelo/CorreoVerificacion.php';

$mensajeGenerico = 'Si la cuenta existe y está pendiente, enviamos un nuevo correo de verificación.';

if (!clementinaVerificacionCorreoHabilitada()) {
    responder(['ok' => true, 'mensaje' => $mensajeGenerico]);
}

requerirPostSeguro();

$email = mb_strtolower(trim((string) ($_POST['email'] ?? '')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) {
    responder(['ok' => false, 'mensaje' => 'Ingresá un email válido.']);
}

$claveIp = 'reenviar-verificacion-ip-global';
$esperaIp = clementinaEsperaIntentos($claveIp);
if ($esperaIp > 0) {
    http_response_code(429);
    responder([
        'ok' => false,
        'mensaje' => 'Demasiados reenvíos. Intentá nuevamente en '
            . max(1, (int) ceil($esperaIp / 60)) . ' minuto(s).',
    ]);
}

$modelo = new VerificacionCorreo();
$pendiente = $modelo->buscarPendientePorEmail($email);

if ($pendiente === null) {
    clementinaRegistrarFallo($claveIp);
    responder(['ok' => true, 'mensaje' => $mensajeGenerico]);
}

$claveCuenta = 'reenviar-verificacion-cuenta|' . hash('sha256', (string) $pendiente['id_alumno']);
$esperaCuenta = clementinaEsperaIntentos($claveCuenta);
if ($esperaCuenta > 0) {
    http_response_code(429);
    responder([
        'ok' => false,
        'mensaje' => 'Demasiados reenvíos para esta cuenta. Intentá nuevamente en '
            . max(1, (int) ceil($esperaCuenta / 60)) . ' minuto(s).',
    ]);
}

$emitida = $modelo->emitir(
    (int) $pendiente['id_alumno'],
    (string) $pendiente['email'],
    (string) $pendiente['numero_documento']
);

$enviado = false;
if ($emitida['ok']) {
    $nombre = trim((string) $pendiente['primer_nombre'] . ' ' . (string) $pendiente['otros_nombres']);
    $resultado = (new CorreoVerificacion())->enviar((string) $pendiente['email'], $nombre, (string) $emitida['token']);
    $enviado = (bool) $resultado['enviado'];
    if (!$enviado) {
        error_log('[Clementina Reenvío] Falló el envío para la cuenta '
            . hash('sha256', mb_strtolower((string) $pendiente['email'])) . '.');
    }
} else {
    error_log('[Clementina Reenvío] No se pudo generar el token de verificación.');
}

clementinaRegistrarFallo($claveIp);
clementinaRegistrarFallo($claveCuenta);

responder(['ok' => true, 'mensaje' => $mensajeGenerico]);
