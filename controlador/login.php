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
header('Content-Type: application/json');
require_once '../modelo/Usuario.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'mensaje' => 'Método no permitido']);
    exit;
}

$usuario  = trim($_POST['usuario'] ?? '');
$password = $_POST['password'] ?? '';

if ($usuario === '' || $password === '') {
    echo json_encode(['ok' => false, 'mensaje' => 'Ingresá usuario y contraseña.']);
    exit;
}

$modelo    = new Usuario();
$resultado = $modelo->login($usuario, $password);

if (!$resultado['ok']) {
    echo json_encode($resultado);
    exit;
}

$u = $resultado['usuario'];

// Regenerar el ID de sesión al autenticar para prevenir session fixation
session_regenerate_id(true);

$_SESSION['id_usuario']  = $u['id'];
$_SESSION['tipo_usuario'] = $u['tipo'];
$_SESSION['rol']         = $u['rol'];
$_SESSION['usuario']     = $u['dni'] ?: $u['email'];
$_SESSION['nombre']      = $u['nombre'];
$_SESSION['apellido']    = $u['apellido'];
$_SESSION['email']       = $u['email'];
$_SESSION['dni']         = $u['dni'];
$_SESSION['legajo']      = $u['legajo'];

// Guardar cookies persistentes en el navegador (sesión de 30 días y datos del usuario)
establecerCookieAutenticacion($u);

// Determinar destino según el tipo de usuario
// El frontend usa esta URL para redirigir, lo que evita problemas con rutas relativas en distintos hostings
if ($u['tipo'] === 'personal') {
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
        'usuario'  => $u['dni'] ?: $u['email'],
        'dni'      => $u['dni'],
        'legajo'   => $u['legajo'],
        'rol'      => $u['rol'],
        'tipo'     => $u['tipo'],
    ],
]);
exit;
