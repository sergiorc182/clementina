<?php
/**
 * Controlador: Login exclusivo del panel de preceptores.
 *
 * Usa el mismo modelo de usuarios y la misma base de datos que el sitio de
 * alumnos, pero rechaza cualquier cuenta que no sea personal con rol A.
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/modelo/Usuario.php';

function responder(array $datos): void
{
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$usuario  = trim((string) ($_POST['usuario'] ?? ''));
$password = (string) ($_POST['password'] ?? '');

if ($usuario === '' || $password === '') {
    responder(['ok' => false, 'mensaje' => 'Ingresá usuario y contraseña.']);
}

$modelo = new Usuario();
$resultado = $modelo->login($usuario, $password);

if (!$resultado['ok']) {
    responder(['ok' => false, 'mensaje' => 'Usuario o contraseña incorrectos.']);
}

$u = $resultado['usuario'];

if (($u['tipo'] ?? '') !== 'personal' || ($u['rol'] ?? '') !== 'preceptor') {
    responder(['ok' => false, 'mensaje' => 'Acceso exclusivo para preceptores.']);
}

session_regenerate_id(true);

$_SESSION['id_usuario']    = $u['id'];
$_SESSION['tipo_usuario']  = $u['tipo'];
$_SESSION['rol']           = $u['rol'];
$_SESSION['usuario']       = $u['dni'] ?: ($u['email'] ?: trim($u['nombre'] . ' ' . $u['apellido']));
$_SESSION['nombre']        = $u['nombre'];
$_SESSION['apellido']      = $u['apellido'];
$_SESSION['email']         = $u['email'];
$_SESSION['dni']           = $u['dni'];
$_SESSION['legajo']        = $u['legajo'];

responder([
    'ok'      => true,
    'mensaje' => 'Inicio de sesión exitoso.',
    'usuario' => [
        'nombre'   => $u['nombre'],
        'apellido' => $u['apellido'],
        'rol'      => $u['rol'],
    ],
]);
