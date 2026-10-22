<?php
<<<<<<< HEAD
session_start();
header('Content-Type: application/json');
require_once '../modelo/Usuario.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'mensaje' => 'Método no permitido']);
    exit;
}

$usuario = trim($_POST['usuario'] ?? '');
$password = $_POST['password'] ?? '';

if ($usuario === '' || $password === '') {
    echo json_encode(['ok' => false, 'mensaje' => 'Ingresá usuario y contraseña.']);
    exit;
}

$modelo = new Usuario();
$resultado = $modelo->login($usuario, $password);

if (!$resultado['ok']) {
    echo json_encode($resultado);
    exit;
}

$u = $resultado['usuario'];

$_SESSION['id_usuario'] = $u['id'];
$_SESSION['tipo_usuario'] = $u['tipo'];
$_SESSION['rol'] = $u['rol'];
$_SESSION['usuario'] = $u['dni'] ?: $u['email'];
$_SESSION['nombre'] = $u['nombre'];
$_SESSION['apellido'] = $u['apellido'];
$_SESSION['email'] = $u['email'];
$_SESSION['dni'] = $u['dni'];
$_SESSION['legajo'] = $u['legajo'];

echo json_encode(['ok' => true, 'mensaje' => 'Inicio de sesión exitoso.']);
exit;
=======
/**
 * Controlador: Login
 *
 * Recibe POST con `usuario` (email o DNI del alumno) y `password`.
 * Devuelve JSON. Si las credenciales son válidas, abre la sesión PHP
 * y responde { ok: true, usuario: {...} }.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Usuario.php';

requerirMetodo('POST');

$usuario  = trim((string) ($_POST['usuario'] ?? ''));
$password = (string) ($_POST['password'] ?? '');

if ($usuario === '' || $password === '') {
    responder(['ok' => false, 'mensaje' => 'Ingresá usuario y contraseña.']);
}

$modelo  = new Usuario();
$persona = $modelo->buscarPorUsuario($usuario);

if ($persona === null || !$modelo->verificarContraseña($persona['password'], $password)) {
    responder(['ok' => false, 'mensaje' => 'Usuario o contraseña incorrectos.']);
}

// Renovamos el ID de sesión para evitar session fixation.
session_regenerate_id(true);

$nombre = trim(implode(' ', array_filter([
    $persona['nombre'],
    $persona['segundo_nombre'] ?? '',
])));
$apellido       = trim($persona['apellido']);
$nombreCompleto = trim($nombre . ' ' . $apellido);

// `id` es la clave interna (alumnos.id_alumno). El documento se guarda
// aparte para mostrarlo sin tener que volver a consultarlo.
$_SESSION['usuario'] = [
    'rol'             => $persona['rol'],
    'id'              => $persona['id'],
    'tipo_documento'  => $persona['tipo_documento'],
    'documento'       => $persona['documento'],
    'usuario'         => $persona['usuario'],
    'nombre'          => $nombre,
    'apellido'        => $apellido,
    'nombre_completo' => $nombreCompleto,
];

responder([
    'ok'      => true,
    'mensaje' => '¡Hola, ' . $nombreCompleto . '! Redirigiendo...',
    'usuario' => $_SESSION['usuario'],
]);
>>>>>>> origin/InscripcionFinales
