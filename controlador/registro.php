<?php
/**
 * Controlador: Registro de alumnos.
 *
 * Recibe POST (FormData) con:
 *   obligatorios: primer_nombre, primer_apellido, dni, email, password
 *   opcionales:   otros_nombres, otros_apellidos, telefono, password2
 * Crea el alumno en `alumnos` (tipo de documento DNI) y, si viene teléfono,
 * lo guarda en `domicilios_alumno.telefono_principal`. Devuelve JSON.
 * Las consultas están en modelo/Alumno.php.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Alumno.php';

// Un warning/notice de PHP en pantalla rompería el JSON que espera el fetch.
ini_set('display_errors', '0');

requerirMetodo('POST');

$primerNombre    = trim((string) ($_POST['primer_nombre'] ?? ''));
$otrosNombres    = trim((string) ($_POST['otros_nombres'] ?? ''));
$primerApellido  = trim((string) ($_POST['primer_apellido'] ?? ''));
$otrosApellidos  = trim((string) ($_POST['otros_apellidos'] ?? ''));
$dni             = trim((string) ($_POST['dni'] ?? ''));
$email           = strtolower(trim((string) ($_POST['email'] ?? '')));
$telefono        = trim((string) ($_POST['telefono'] ?? ''));
$password        = (string) ($_POST['password'] ?? '');
$password2       = $_POST['password2'] ?? null; // opcional: solo se compara si llega

if ($primerNombre === '' || $primerApellido === '' || $dni === '' || $email === '' || $password === '') {
    responder(['ok' => false, 'mensaje' => 'Completá los campos obligatorios.']);
}

// Largos máximos de las columnas VARCHAR(40) / VARCHAR(255) / VARCHAR(45).
$largos = [
    'El primer nombre'    => [$primerNombre, 40],
    'Los otros nombres'   => [$otrosNombres, 40],
    'El primer apellido'  => [$primerApellido, 40],
    'Los otros apellidos' => [$otrosApellidos, 40],
    'El email'            => [$email, 255],
    'El teléfono'         => [$telefono, 45],
];
foreach ($largos as $campo => [$valor, $max]) {
    if (mb_strlen($valor) > $max) {
        responder(['ok' => false, 'mensaje' => "$campo no puede superar los $max caracteres."]);
    }
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

if ($password2 !== null && (string) $password2 !== $password) {
    responder(['ok' => false, 'mensaje' => 'Las contraseñas no coinciden.']);
}

try {
    $alumno = new Alumno();

    if ($alumno->existeEmail($email)) {
        responder(['ok' => false, 'mensaje' => 'Ya existe una cuenta con ese email.']);
    }
    if ($alumno->existeDni($dni)) {
        responder(['ok' => false, 'mensaje' => 'Ya existe una cuenta con ese DNI.']);
    }

    $alumno->registrar([
        'primer_nombre'   => $primerNombre,
        'otros_nombres'   => $otrosNombres,
        'primer_apellido' => $primerApellido,
        'otros_apellidos' => $otrosApellidos,
        'dni'             => $dni,
        'email'           => $email,
        'telefono'        => $telefono,
        'hash'            => password_hash($password, PASSWORD_DEFAULT),
    ]);

    responder([
        'ok'      => true,
        'mensaje' => '¡Registro exitoso! Ya podés ingresar con tu DNI o email y tu contraseña.',
    ]);
} catch (PDOException $e) {
    error_log('[registro] ' . $e->getMessage());

    // 1062 = clave única duplicada (carrera entre dos registros simultáneos).
    if (($e->errorInfo[1] ?? null) === 1062) {
        $msg = stripos($e->getMessage(), 'email') !== false
            ? 'Ya existe una cuenta con ese email.'
            : 'Ya existe una cuenta con ese DNI.';
        responder(['ok' => false, 'mensaje' => $msg]);
    }
    // 1452 = falla una clave foránea: falta 'DNI' en tipos_documento o 'ZZ' en paises.
    if (($e->errorInfo[1] ?? null) === 1452) {
        responder(['ok' => false, 'mensaje' => 'La base no tiene cargados los catálogos básicos (tipos_documento "DNI" / paises "ZZ"). Revisá el log de PHP.']);
    }
    responder(['ok' => false, 'mensaje' => 'Error al registrar. Intentá de nuevo.']);
}
