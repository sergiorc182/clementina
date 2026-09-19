<?php
/**
 * Controlador: Registro de alumnos
 *
 * Recibe POST con `nombre`, `apellido`, `dni`, `email`, `telefono` y
 * `password`. Crea el alumno en la tabla `alumnos` y guarda su teléfono
 * en `domicilios_alumno` (base local `clementina`, esquema normalizado).
 * Devuelve JSON.
 */

session_start();
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
           (id_tipo_documento, numero_documento, primer_apellido,
            primer_nombre, email, password_hash, alta_registro)
         VALUES ('DNI', :dni, :apellido, :nombre, :email, :hash, NOW())"
    );
    $stmt->bindValue(':dni', $dni, PDO::PARAM_INT);
    $stmt->bindValue(':apellido', $apellido);
    $stmt->bindValue(':nombre', $nombre);
    $stmt->bindValue(':email', $email);
    $stmt->bindValue(':hash', $hash);
    $stmt->execute();

    $idAlumno = (int) $db->lastInsertId();

    $stmt = $db->prepare(
        "INSERT INTO domicilios_alumno (id_alumno, telefono_principal)
         VALUES (:id_alumno, :telefono)"
    );
    $stmt->bindValue(':id_alumno', $idAlumno, PDO::PARAM_INT);
    $stmt->bindValue(':telefono', $telefono);
    $stmt->execute();

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