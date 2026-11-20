<?php
/**
 * Controlador: Login unificado.
 * ISFT 182 "Clementina"
 *
 * Autentica alumnos (por DNI o email) y personal (por usuario_sistema).
 * Devuelve JSON con { ok, mensaje, redirigir } según el rol detectado.
 * La redirección la ejecuta el frontend para evitar problemas de rutas relativas.
 */

require_once __DIR__ . '/_sesion.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../modelo/Usuario.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'mensaje' => 'Método no permitido']);
    exit;
}

$usuario  = trim((string) ($_POST['usuario'] ?? ''));
$password = (string) ($_POST['password'] ?? '');

if ($usuario === '' || $password === '') {
    echo json_encode(['ok' => false, 'mensaje' => 'Ingresá usuario y contraseña.']);
    exit;
}

$espera = clementinaEsperaIntentos($usuario);
if ($espera > 0) {
    http_response_code(429);
    echo json_encode([
        'ok' => false,
        'mensaje' => 'Demasiados intentos fallidos. Intentá nuevamente en '
            . max(1, (int) ceil($espera / 60)) . ' minuto(s).',
    ]);
    exit;
}

$modelo    = new Usuario();
$resultado = $modelo->login($usuario, $password);

if (!$resultado['ok']) {
    clementinaRegistrarFallo($usuario);
    echo json_encode([
        'ok' => false,
        'mensaje' => 'No se pudo iniciar sesión. Verificá tus credenciales e intentá nuevamente.',
    ]);
    exit;
}

$u = $resultado['usuario'];

if (clementinaVerificacionCorreoHabilitada()
    && ($u['tipo'] ?? '') === 'alumno'
    && empty($resultado['correo_confirmado'])) {
    echo json_encode([
        'ok' => false,
        'mensaje' => 'Verificá tu correo antes de ingresar.',
        'verificacion_pendiente' => true,
        'requiere_verificacion' => true,
    ]);
    exit;
}

clementinaLimpiarIntentos($usuario);

// Regenerar el ID de sesión al autenticar para prevenir session fixation
session_regenerate_id(true);

$_SESSION['id_usuario']  = $u['id'];
$_SESSION['tipo_usuario'] = $u['tipo'];
$_SESSION['rol']         = $u['rol'];
$_SESSION['usuario']     = ($u['usuario'] ?? null) ?: ($u['dni'] ?: $u['email']);
$_SESSION['nombre']      = $u['nombre'];
$_SESSION['apellido']    = $u['apellido'];
$_SESSION['email']       = $u['email'];
$_SESSION['dni']         = $u['dni'];
$_SESSION['legajo']      = $u['legajo'];

// Guardar cookies persistentes en el navegador (sesión de 30 días y datos del usuario)
establecerCookieAutenticacion($u);

// Determinar destino según el rol del usuario
// El frontend usa esta señal para redirigir, lo que evita problemas con rutas relativas en distintos hostings
if ($u['tipo'] === 'personal' && $u['rol'] === 'docente') {
    $redirigir = 'docente'; // señal para que el JS vaya al panel de docentes
} elseif ($u['tipo'] === 'personal') {
    $redirigir = 'admin';   // señal para que el JS construya la URL del panel admin
} else {
    $redirigir = 'alumno';  // señal para que el JS vaya al index del alumno
}

echo json_encode([
    'ok'        => true,
    'mensaje'   => 'Inicio de sesión exitoso.',
    'redirigir' => $redirigir,
    'rol'       => $u['rol'],
    'usuario'   => [
        'id'       => $u['id'],
        'nombre'   => $u['nombre'],
        'apellido' => $u['apellido'],
        'usuario'  => ($u['usuario'] ?? null) ?: ($u['dni'] ?: $u['email']),
        'dni'      => $u['dni'],
        'legajo'   => $u['legajo'],
        'rol'      => $u['rol'],
        'tipo'     => $u['tipo'],
    ],
]);
exit;
