<?php
/**
 * Controlador: Login
 *
 * Recibe POST con `usuario` (email de alumno o usuario de personal)
 * y `password`. Devuelve JSON. Si las credenciales son válidas,
 * abre la sesión PHP y responde { ok: true, usuario: {...} }.
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
$apellido        = trim($persona['apellido']);
$nombreCompleto  = trim($nombre . ' ' . $apellido);

$_SESSION['usuario'] = [
    'rol'            => $persona['rol'],
    'id'             => $persona['id'],
    'usuario'        => $persona['usuario'],
    'nombre'         => $nombre,
    'apellido'       => $apellido,
    'nombre_completo' => $nombreCompleto,
];

responder([
    'ok'      => true,
    'mensaje' => '¡Hola, ' . $nombreCompleto . '! Redirigiendo...',
    'usuario' => $_SESSION['usuario'],
]);