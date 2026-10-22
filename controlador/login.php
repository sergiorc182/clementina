<?php
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