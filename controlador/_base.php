<?php
/**
 * Base común de los controladores.
 *
 * Abre la sesión, fija la respuesta en JSON y deja disponibles los
 * helpers que antes se repetían en cada controlador. Los controladores
 * solo reciben el pedido, llaman al modelo y responden: no llevan SQL.
 */

require_once __DIR__ . '/_sesion.php';
header('Content-Type: application/json; charset=utf-8');

/** Envía la respuesta JSON y corta la ejecución. */
function responder(array $datos): void
{
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Corta el pedido si no llegó con el método HTTP esperado. */
function requerirMetodo(string $metodo): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $metodo) {
        responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
    }
}

/**
 * Devuelve el usuario en sesión o corta el pedido si no hay ninguno.
 * Lee la sesión que arma controlador/login.php (claves planas:
 * id_usuario, tipo_usuario, rol, dni, ...) y la devuelve en un array.
 */
function requerirSesion(): array
{
    if (empty($_SESSION['id_usuario'])) {
        responder(['ok' => false, 'mensaje' => 'No autenticado.']);
    }

    $nombre   = trim((string) ($_SESSION['nombre'] ?? ''));
    $apellido = trim((string) ($_SESSION['apellido'] ?? ''));

    return [
        'id'              => (int) $_SESSION['id_usuario'],
        'tipo'            => $_SESSION['tipo_usuario'] ?? 'alumno',
        'rol'             => $_SESSION['rol'] ?? 'alumno',
        'documento'       => $_SESSION['dni'] ?? null,
        'legajo'          => $_SESSION['legajo'] ?? null,
        'nombre'          => $nombre,
        'apellido'        => $apellido,
        'nombre_completo' => trim($nombre . ' ' . $apellido),
    ];
}

/** Igual que requerirSesion(), pero además exige rol alumno. */
function requerirAlumno(): array
{
    $usuario = requerirSesion();
    if (($usuario['rol'] ?? '') !== 'alumno') {
        responder(['ok' => false, 'mensaje' => 'Esta sección es solo para alumnos.']);
    }
    return $usuario;
}

/**
 * Exige que el usuario sea personal institucional (tipo = 'personal').
 * Cubre preceptores, directivos y cualquier otro rol de personal.
 */
function requerirPersonal(): array
{
    $usuario = requerirSesion();
    if (($usuario['tipo'] ?? '') !== 'personal') {
        responder(['ok' => false, 'mensaje' => 'Acceso restringido al personal institucional.']);
    }
    return $usuario;
}

/**
 * Exige que el usuario sea preceptor (tipo = 'personal', rol = 'preceptor').
 */
function requerirPreceptor(): array
{
    $usuario = requerirPersonal();
    if (($usuario['rol'] ?? '') !== 'preceptor') {
        responder(['ok' => false, 'mensaje' => 'Acceso restringido a preceptores.']);
    }
    return $usuario;
}

/**
 * Exige que el usuario sea directivo (tipo = 'personal', rol = 'directivo').
 */
function requerirDirectivo(): array
{
    $usuario = requerirPersonal();
    if (($usuario['rol'] ?? '') !== 'directivo') {
        responder(['ok' => false, 'mensaje' => 'Acceso restringido a la dirección.']);
    }
    return $usuario;
}

/**
 * Exige preceptor O directivo (cualquier rol de personal con acceso completo al panel).
 */
function requerirPersonalAdmin(): array
{
    $usuario = requerirPersonal();
    $rolesAdmin = ['preceptor', 'directivo', 'secretaria', 'personal'];
    if (!in_array($usuario['rol'] ?? '', $rolesAdmin, true)) {
        responder(['ok' => false, 'mensaje' => 'Sin permisos para acceder al panel administrativo.']);
    }
    return $usuario;
}
