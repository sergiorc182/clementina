<?php
/**
 * Controlador: Registro de alumnos
 *
 * Recibe POST con `primer_nombre`, `otros_nombres`, `primer_apellido`,
 * `otros_apellidos`, `dni`, `email`, `telefono` (opcional) y `password`.
 * Crea el alumno en la tabla `alumnos` y guarda su teléfono en
 * `domicilios_alumno` (base local `clementina`, esquema normalizado).
 * Devuelve JSON.
 */

require_once __DIR__ . '/_sesion.php';
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/modelo/Conexion.php';

function responder(array $datos): void
{
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$primerNombre   = trim((string) ($_POST['primer_nombre'] ?? ''));
$otrosNombres   = trim((string) ($_POST['otros_nombres'] ?? ''));
$primerApellido = trim((string) ($_POST['primer_apellido'] ?? ''));
$otrosApellidos = trim((string) ($_POST['otros_apellidos'] ?? ''));
$dni      = trim((string) ($_POST['dni'] ?? ''));
$email    = strtolower(trim((string) ($_POST['email'] ?? '')));
$telefono = trim((string) ($_POST['telefono'] ?? ''));
$password = (string) ($_POST['password'] ?? '');
$password2 = (string) ($_POST['password2'] ?? '');

if ($primerNombre === '' || $primerApellido === '' || $email === '' || $password === '') {
    responder(['ok' => false, 'mensaje' => 'Completá los campos obligatorios.']);
}

if ($password2 !== '' && $password !== $password2) {
    responder(['ok' => false, 'mensaje' => 'Las contraseñas no coinciden.']);
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

$db = Conexion::getInstancia()->getConexion();

// No permitir repetir email ni DNI.
$stmt = $db->prepare("SELECT id_alumno FROM alumnos WHERE email = :email LIMIT 1");
$stmt->bindValue(':email', $email);
$stmt->execute();
if ($stmt->fetch()) {
    responder(['ok' => false, 'mensaje' => 'Ya existe una cuenta con ese email.']);
}

$stmt = $db->prepare(
    "SELECT id_alumno FROM alumnos
     WHERE id_tipo_documento = 'DNI' AND numero_documento = :dni LIMIT 1"
);
$stmt->bindValue(':dni', $dni, PDO::PARAM_INT);
$stmt->execute();
if ($stmt->fetch()) {
    responder(['ok' => false, 'mensaje' => 'Ya existe una cuenta con ese DNI.']);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $db->beginTransaction();

    $stmt = $db->prepare(
        "INSERT INTO alumnos
           (id_tipo_documento, numero_documento, primer_apellido, otros_apellidos,
            primer_nombre, otros_nombres, email, password_hash, alta_registro)
         VALUES ('DNI', :dni, :apellido, :otros_apellidos, :nombre, :otros_nombres, :email, :hash, NOW())"
    );
    $stmt->bindValue(':dni', $dni, PDO::PARAM_INT);
    $stmt->bindValue(':apellido', $primerApellido);
    $stmt->bindValue(':otros_apellidos', $otrosApellidos !== '' ? $otrosApellidos : null);
    $stmt->bindValue(':nombre', $primerNombre);
    $stmt->bindValue(':otros_nombres', $otrosNombres !== '' ? $otrosNombres : null);
    $stmt->bindValue(':email', $email);
    $stmt->bindValue(':hash', $hash);
    $stmt->execute();

    $idAlumno = (int) $db->lastInsertId();

    if ($telefono !== '') {
        $stmt = $db->prepare(
            "INSERT INTO domicilios_alumno (id_alumno, telefono_principal)
             VALUES (:id_alumno, :telefono)"
        );
        $stmt->bindValue(':id_alumno', $idAlumno, PDO::PARAM_INT);
        $stmt->bindValue(':telefono', $telefono);
        $stmt->execute();
    }

    $db->commit();

    responder([
        'ok'      => true,
        'mensaje' => '¡Registro exitoso! Ya podés ingresar con tu email y contraseña.',
    ]);
} catch (PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    responder(['ok' => false, 'mensaje' => 'Error al registrar. Intentá de nuevo.']);
}