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

/** Verifica el origen de la solicitud cuando el navegador lo informa. */
function requerirOrigenSeguro(): void
{
    $origen = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origen === '') {
        return;
    }
    $hostOrigen = parse_url($origen, PHP_URL_HOST);
    $hostLocal  = parse_url((string) ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    if (!is_string($hostOrigen) || !is_string($hostLocal)
        || strtolower($hostOrigen) !== strtolower($hostLocal)) {
        http_response_code(403);
        responder(['ok' => false, 'mensaje' => 'Origen de la solicitud no permitido.']);
    }
}

/** Valida el token CSRF enviado en POST o en la cabecera X-CSRF-Token. */
function requerirCsrf(): void
{
    $token = (string) ($_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!csrfTokenValido($token)) {
        http_response_code(403);
        responder(['ok' => false, 'mensaje' => 'Token de seguridad inválido. Recargá la página e intentá nuevamente.']);
    }
    requerirOrigenSeguro();
}

/** Atajo para endpoints que solo aceptan POST con protección CSRF. */
function requerirPostSeguro(): void
{
    requerirMetodo('POST');
    requerirCsrf();
}

/** Respuesta genérica ante errores internos; el detalle queda en el log. */
function responderErrorServidor(string $contexto, Throwable $e): void
{
    error_log('[' . $contexto . '] ' . $e->getMessage());
    http_response_code(500);
    responder(['ok' => false, 'mensaje' => 'No se pudo completar la operación. Intentá nuevamente.']);
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

/** Indica si el usuario tiene acceso al panel administrativo (no docentes). */
function esPersonalAdmin(array $usuario): bool
{
    return ($usuario['tipo'] ?? '') === 'personal'
        && in_array($usuario['rol'] ?? '', ['preceptor', 'directivo', 'secretaria', 'personal'], true);
}

/**
 * Exige que el usuario sea docente (tipo = 'personal', rol = 'docente').
 */
function requerirDocente(): array
{
    $usuario = requerirPersonal();
    if (($usuario['rol'] ?? '') !== 'docente') {
        responder(['ok' => false, 'mensaje' => 'Acceso restringido a docentes.']);
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
    if (!esPersonalAdmin($usuario)) {
        responder(['ok' => false, 'mensaje' => 'Sin permisos para acceder al panel administrativo.']);
    }
    return $usuario;
}
