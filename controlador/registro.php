<?php
/**
 * Controlador: Registro de alumnos
 *
 * Recibe POST con `nombre`, `apellido`, `dni`, `email`, `telefono` y
 * `password`, valida el formato y delega el alta en el modelo Alumno.
 * Devuelve JSON.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Alumno.php';

requerirMetodo('POST');

$nombre   = trim((string) ($_POST['nombre'] ?? ''));
$apellido = trim((string) ($_POST['apellido'] ?? ''));
$dni      = trim((string) ($_POST['dni'] ?? ''));
$email    = strtolower(trim((string) ($_POST['email'] ?? '')));
$telefono = trim((string) ($_POST['telefono'] ?? ''));
$password = (string) ($_POST['password'] ?? '');

if ($nombre === '' || $apellido === '' || $email === '' || $telefono === '' || $password === '') {
    responder(['ok' => false, 'mensaje' => 'Completá todos los campos.']);
}

if (!preg_match('/^\d{6,8}$/', $dni)) {
    responder(['ok' => false, 'mensaje' => 'Ingresá un DNI válido (solo números, sin puntos).']);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    responder(['ok' => false, 'mensaje' => 'Ingresá un email válido.']);
}

if (strlen($password) < 6) {
    responder(['ok' => false, 'mensaje' => 'La contraseña debe tener al menos 6 caracteres.']);
}

try {
    $alumnos = new Alumno();

    if ($alumnos->existeEmail($email)) {
        responder(['ok' => false, 'mensaje' => 'Ya existe una cuenta con ese email.']);
    }

    if ($alumnos->existeDni($dni)) {
        responder(['ok' => false, 'mensaje' => 'Ya existe una cuenta con ese DNI.']);
    }

    $alumnos->registrar([
        'nombre'   => $nombre,
        'apellido' => $apellido,
        'dni'      => $dni,
        'email'    => $email,
        'telefono' => $telefono,
        'hash'     => password_hash($password, PASSWORD_DEFAULT),
    ]);
} catch (PDOException $e) {
    responder(['ok' => false, 'mensaje' => 'Error al registrar. Intentá de nuevo.']);
}

responder([
    'ok'      => true,
    'mensaje' => '¡Registro exitoso! Ya podés ingresar con tu email y contraseña.',
]);
