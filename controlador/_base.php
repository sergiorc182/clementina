<?php
/**
 * Base común de los controladores.
 *
 * Abre la sesión, fija la respuesta en JSON y deja disponibles los
 * helpers que antes se repetían en cada controlador. Los controladores
 * solo reciben el pedido, llaman al modelo y responden: no llevan SQL.
 */

session_start();
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
