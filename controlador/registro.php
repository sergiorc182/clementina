<?php
require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Conexion.php';
require_once dirname(__DIR__) . '/modelo/VerificacionCorreo.php';
require_once dirname(__DIR__) . '/modelo/CorreoVerificacion.php';

requerirPostSeguro();

function registroTexto($valor): string
{
    return is_scalar($valor) && !is_bool($valor) ? trim((string) $valor) : '';
}

function registroClave($valor): string
{
    return is_scalar($valor) && !is_bool($valor) ? (string) $valor : '';
}

function registroClaves(string $email, string $dni): array
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'desconocida');
    return [
        'registro-ip|' . $ip,
        'registro-identidad|' . hash('sha256', mb_strtolower($email) . '|' . $dni),
    ];
}

function registroExcedido(array $claves): ?array
{
    foreach ($claves as $clave) {
        $espera = clementinaEsperaIntentos($clave);
        if ($espera > 0) {
            return [
                'ok' => false,
                'mensaje' => 'Demasiados intentos de registro. Intentá nuevamente en '
                    . max(1, (int) ceil($espera / 60)) . ' minuto(s).',
            ];
        }
    }
    return null;
}

function registroRechazar(array $claves, string $mensaje): void
{
    foreach ($claves as $clave) {
        clementinaRegistrarFallo($clave);
    }
    responder(['ok' => false, 'mensaje' => $mensaje]);
}

$primerNombre = registroTexto($_POST['primer_nombre'] ?? '');
$otrosNombres = registroTexto($_POST['otros_nombres'] ?? '');
$primerApellido = registroTexto($_POST['primer_apellido'] ?? '');
$otrosApellidos = registroTexto($_POST['otros_apellidos'] ?? '');
$dni = registroTexto($_POST['dni'] ?? '');
$email = mb_strtolower(registroTexto($_POST['email'] ?? ''));
$telefono = registroTexto($_POST['telefono'] ?? '');
$password = registroClave($_POST['password'] ?? '');
$password2 = registroClave($_POST['password2'] ?? '');

$clavesIntento = registroClaves($email, $dni);
$excedido = registroExcedido($clavesIntento);
if ($excedido !== null) {
    http_response_code(429);
    responder($excedido);
}

if ($primerNombre === '' || $primerApellido === '' || $email === '' || $password === '') {
    registroRechazar($clavesIntento, 'Completá los campos obligatorios.');
}
if ($password2 === '' || $password !== $password2) {
    registroRechazar($clavesIntento, 'Las contraseñas no coinciden.');
}
if (!preg_match('/^\d{6,8}$/', $dni)) {
    registroRechazar($clavesIntento, 'Ingresá un DNI válido (solo números, sin puntos).');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) {
    registroRechazar($clavesIntento, 'Ingresá un email válido.');
}
if (strlen($password) < 6 || strlen($password) > 255) {
    registroRechazar($clavesIntento, 'La contraseña debe tener entre 6 y 255 caracteres.');
}
if (mb_strlen($primerNombre) > 40 || mb_strlen($primerApellido) > 40
    || mb_strlen($otrosNombres) > 40 || mb_strlen($otrosApellidos) > 40
    || mb_strlen($telefono) > 45) {
    registroRechazar($clavesIntento, 'Los datos ingresados superan la longitud permitida.');
}

$db = Conexion::getInstancia()->getConexion();
$mensajeGenerico = 'No se pudo completar el registro. Revisá los datos o intentá nuevamente.';

$stmt = $db->prepare("SELECT id_alumno FROM alumnos WHERE email = :email LIMIT 1");
$stmt->execute([':email' => $email]);
if ($stmt->fetch()) {
    registroRechazar($clavesIntento, $mensajeGenerico);
}

$stmt = $db->prepare(
    "SELECT id_alumno FROM alumnos
     WHERE id_tipo_documento = 'DNI' AND numero_documento = :dni LIMIT 1"
);
$stmt->execute([':dni' => $dni]);
if ($stmt->fetch()) {
    registroRechazar($clavesIntento, $mensajeGenerico);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
if ($hash === false) {
    registroRechazar($clavesIntento, $mensajeGenerico);
}

$remitente = trim((string) getenv('CLEMENTINA_MAIL_FROM'));
$verificacionActiva = $remitente !== '' && filter_var($remitente, FILTER_VALIDATE_EMAIL) !== false;
$idAlumno = 0;
$tokenVerificacion = '';
$nombreCompleto = trim($primerNombre . ' ' . $otrosNombres);

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

    if ($verificacionActiva) {
        $verificacion = new VerificacionCorreo(clementinaSecret());
        $emitida = $verificacion->emitir($idAlumno, $email, $dni);
        if ($emitida['ok']) {
            $tokenVerificacion = (string) $emitida['token'];
        }
    }

    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    if ($verificacionActiva && $idAlumno > 0) {
        (new VerificacionCorreo(clementinaSecret()))->descartar($idAlumno);
    }
    responder(['ok' => false, 'mensaje' => $mensajeGenerico]);
}

$verificacionPendiente = false;
$mensaje = '¡Registro exitoso! Ya podés ingresar con tu DNI y contraseña.';

if ($tokenVerificacion !== '') {
    $correo = new CorreoVerificacion();
    $enviado = $correo->enviar($email, $nombreCompleto, $tokenVerificacion);
    if ($enviado['enviado']) {
        $verificacionPendiente = true;
        $mensaje = '¡Registro exitoso! Revisá tu correo para verificar la cuenta antes de ingresar.';
    } else {
        (new VerificacionCorreo(clementinaSecret()))->descartar($idAlumno);
    }
}

clementinaLimpiarIntentos($clavesIntento[1]);

responder([
    'ok' => true,
    'mensaje' => $mensaje,
    'verificacion_pendiente' => $verificacionPendiente,
]);
