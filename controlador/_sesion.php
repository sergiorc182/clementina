<?php
/**
 * Gestión centralizada de sesiones, cookies de autenticación y CSRF.
 * ISFT 182 "Clementina"
 *
 * Los tres paneles comparten esta sesión (cookies con path '/'). El token
 * persistente tiene vencimiento, identificador único y revocación en
 * servidor. El secreto HMAC vive fuera del código.
 */

if (!defined('CLEMENTINA_AUTH_COOKIE')) {
    define('CLEMENTINA_AUTH_COOKIE', 'clementina_auth');
    define('CLEMENTINA_USER_COOKIE', 'clementina_user');
    define('CLEMENTINA_CSRF_COOKIE', 'csrf_token');
    define('CLEMENTINA_TOKEN_LIFETIME', 12 * 3600);
    define('CLEMENTINA_COOKIE_LIFETIME', CLEMENTINA_TOKEN_LIFETIME);
    define('CLEMENTINA_LOGIN_MAX', max(1, (int) ((getenv('LOGIN_RATE_MAX') !== false ? getenv('LOGIN_RATE_MAX') : '5'))));
    define('CLEMENTINA_LOGIN_WINDOW', max(1, (int) ((getenv('LOGIN_RATE_WINDOW') !== false ? getenv('LOGIN_RATE_WINDOW') : '900'))));
}

function clementinaArchivoIntentos(): string
{
    return dirname(__DIR__) . '/config/.login_attempts.json';
}

function clementinaConIntentos(callable $callback)
{
    $archivo = clementinaArchivoIntentos();
    $directorio = dirname($archivo);
    if (!is_dir($directorio)) {
        @mkdir($directorio, 0755, true);
    }

    $handle = @fopen($archivo, 'c+');
    if ($handle === false) {
        error_log('[Clementina Rate Limit] No se pudo abrir el archivo de intentos.');
        $datos = [];
        $ahora = time();
        return $callback($datos, $ahora);
    }

    flock($handle, LOCK_EX);
    rewind($handle);
    $datos = json_decode((string) stream_get_contents($handle), true);
    if (!is_array($datos)) {
        $datos = [];
    }

    $ahora = time();
    foreach ($datos as $clave => $registro) {
        if (!is_array($registro) || (int) ($registro['reset'] ?? 0) <= $ahora) {
            unset($datos[$clave]);
        }
    }

    $resultado = $callback($datos, $ahora);

    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode($datos));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    @chmod($archivo, 0600);

    return $resultado;
}

function clementinaClaveIntento(string $usuario): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'desconocida');
    $identificador = mb_strtolower(trim($usuario));
    return hash('sha256', $ip . '|' . $identificador);
}

function clementinaEsperaIntentos(string $usuario): int
{
    $clave = clementinaClaveIntento($usuario);
    return (int) clementinaConIntentos(function (array &$datos, int $ahora) use ($clave): int {
        $registro = $datos[$clave] ?? null;
        if ($registro === null) {
            return 0;
        }
        if ((int) $registro['count'] < CLEMENTINA_LOGIN_MAX) {
            return 0;
        }
        $datos[$clave] = $registro;
        return max(0, (int) $registro['reset'] - $ahora);
    });
}

function clementinaRegistrarFallo(string $usuario): void
{
    $clave = clementinaClaveIntento($usuario);
    clementinaConIntentos(function (array &$datos, int $ahora) use ($clave): void {
        $registro = $datos[$clave] ?? ['count' => 0, 'reset' => $ahora + CLEMENTINA_LOGIN_WINDOW];
        $registro['count'] = (int) $registro['count'] + 1;
        $registro['reset'] = $ahora + CLEMENTINA_LOGIN_WINDOW;
        $datos[$clave] = $registro;
    });
}

function clementinaLimpiarIntentos(string $usuario): void
{
    $clave = clementinaClaveIntento($usuario);
    clementinaConIntentos(function (array &$datos) use ($clave): void {
        unset($datos[$clave]);
    });
}

/**
 * Secreto HMAC: variable de entorno o archivo externo al código.
 * Si no existe se genera uno nuevo (rotación del secreto expuesto).
 */
function clementinaSecret(): string
{
    $entorno = getenv('CLEMENTINA_HMAC_SECRET');
    if (is_string($entorno) && $entorno !== '') {
        return $entorno;
    }

    $archivo = dirname(__DIR__) . '/config/.hmac_secret';
    if (is_readable($archivo)) {
        $valor = trim((string) file_get_contents($archivo));
        if ($valor !== '') {
            return $valor;
        }
    }

    $valor = bin2hex(random_bytes(32));
    if (!is_dir(dirname($archivo))) {
        mkdir(dirname($archivo), 0755, true);
    }
    file_put_contents($archivo, $valor, LOCK_EX);
    @chmod($archivo, 0600);

    return $valor;
}

function clementinaArchivoRevocaciones(): string
{
    return dirname(__DIR__) . '/config/.token_revocations.json';
}

function clementinaLeerRevocaciones(): array
{
    $archivo = clementinaArchivoRevocaciones();
    if (!is_readable($archivo)) {
        return [];
    }
    $datos = json_decode((string) @file_get_contents($archivo), true);
    if (!is_array($datos)) {
        return [];
    }
    $vigentes = [];
    foreach ($datos as $jti => $exp) {
        if ((int) $exp > time()) {
            $vigentes[(string) $jti] = (int) $exp;
        }
    }
    return $vigentes;
}

function clementinaTokenRevocado(string $jti): bool
{
    return isset(clementinaLeerRevocaciones()[$jti]);
}

function clementinaRevocarJti(string $jti, int $exp): void
{
    if ($jti === '') {
        return;
    }
    $archivo = clementinaArchivoRevocaciones();
    $revocaciones = clementinaLeerRevocaciones();
    $revocaciones[$jti] = $exp;
    if (!is_dir(dirname($archivo))) {
        @mkdir(dirname($archivo), 0755, true);
    }
    $handle = @fopen($archivo, 'c+');
    if ($handle === false) {
        return;
    }
    flock($handle, LOCK_EX);
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode($revocaciones));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    @chmod($archivo, 0600);
}

/** Decodifica y verifica el token persistente; devuelve null si no es válido. */
function clementinaLeerToken(string $token): ?array
{
    $raw = base64_decode($token, true);
    if ($raw === false || strpos($raw, '::') === false) {
        return null;
    }

    [$payload, $firma] = explode('::', $raw, 2);
    $esperada = hash_hmac('sha256', $payload, clementinaSecret());
    if (!hash_equals($esperada, $firma)) {
        return null;
    }

    $data = json_decode($payload, true);
    if (!is_array($data)) {
        return null;
    }

    $iat = (int) ($data['iat'] ?? 0);
    $exp = (int) ($data['exp'] ?? 0);
    $ahora = time();
    if ($iat <= 0 || $exp <= $ahora || $iat > $ahora + 60) {
        return null;
    }
    if ($exp - $iat > CLEMENTINA_TOKEN_LIFETIME) {
        return null;
    }

    $jti = (string) ($data['jti'] ?? '');
    if ($jti === '' || clementinaTokenRevocado($jti)) {
        return null;
    }

    $data['jti'] = $jti;
    $data['exp'] = $exp;
    return $data;
}

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => CLEMENTINA_COOKIE_LIFETIME,
        'path'     => '/',
        'domain'   => '',
        'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

if (empty($_COOKIE[CLEMENTINA_CSRF_COOKIE]) || $_COOKIE[CLEMENTINA_CSRF_COOKIE] !== $_SESSION['csrf_token']) {
    setcookie(CLEMENTINA_CSRF_COOKIE, $_SESSION['csrf_token'], [
        'expires'  => time() + CLEMENTINA_TOKEN_LIFETIME,
        'path'     => '/',
        'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
}

/** Token CSRF de la sesión (para formularios o cabecera X-CSRF-Token). */
function csrfToken(): string
{
    return (string) ($_SESSION['csrf_token'] ?? '');
}

function csrfCampo(): string
{
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(csrfToken(), ENT_QUOTES, 'UTF-8') . '">';
}

function csrfTokenValido(string $token): bool
{
    $esperado = csrfToken();
    return $esperado !== '' && $token !== '' && hash_equals($esperado, $token);
}

function clementinaArchivoBloqueoRotacion(): string
{
    return dirname(__DIR__) . '/config/.token_rotation.lock';
}

function clementinaAdquirirBloqueoRotacion()
{
    $archivo = clementinaArchivoBloqueoRotacion();
    if (!is_dir(dirname($archivo))
        && !@mkdir(dirname($archivo), 0755, true)
        && !is_dir(dirname($archivo))) {
        return null;
    }

    $handle = @fopen($archivo, 'c');
    if ($handle === false) {
        return null;
    }
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        return null;
    }

    return $handle;
}

function clementinaLiberarBloqueoRotacion($handle): void
{
    if (!is_resource($handle)) {
        return;
    }
    flock($handle, LOCK_UN);
    fclose($handle);
}

function clementinaCrearTokenAutenticacion(array $u): array
{
    $expira = time() + CLEMENTINA_TOKEN_LIFETIME;
    $jti = bin2hex(random_bytes(16));
    $payload = json_encode([
        'id'   => (int) $u['id'],
        'tipo' => $u['tipo'],
        'rol'  => $u['rol'],
        'iat'  => time(),
        'exp'  => $expira,
        'jti'  => $jti,
    ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

    $firma = hash_hmac('sha256', $payload, clementinaSecret());

    return [
        'token'  => base64_encode($payload . '::' . $firma),
        'expira' => $expira,
        'jti'    => $jti,
    ];
}

function establecerCookieAutenticacion(array $u, ?array $credencial = null): bool
{
    $credencial = $credencial ?? clementinaCrearTokenAutenticacion($u);
    $token = (string) $credencial['token'];
    $expira = (int) $credencial['expira'];
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

    $cookieAuth = setcookie(CLEMENTINA_AUTH_COOKIE, $token, [
        'expires'  => $expira,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    $datosVisibles = json_encode([
        'nombre'   => $u['nombre'],
        'apellido' => $u['apellido'],
        'usuario'  => ($u['usuario'] ?? null) ?: ($u['dni'] ?: $u['email']),
        'dni'      => $u['dni'],
        'legajo'   => $u['legajo'],
        'rol'      => $u['rol'],
        'tipo'     => $u['tipo'],
    ], JSON_UNESCAPED_UNICODE);

    $cookieUsuario = setcookie(CLEMENTINA_USER_COOKIE, $datosVisibles, [
        'expires'  => $expira,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => false,
        'samesite' => 'Lax',
    ]);

    return $cookieAuth && $cookieUsuario;
}

function clementinaRevocarTokenCookie(): array
{
    if (empty($_COOKIE[CLEMENTINA_AUTH_COOKIE])) {
        return ['aplicable' => false, 'revocado' => true];
    }

    $token = clementinaLeerToken((string) $_COOKIE[CLEMENTINA_AUTH_COOKIE]);
    if ($token === null) {
        return ['aplicable' => false, 'revocado' => true];
    }

    clementinaRevocarJti($token['jti'], (int) $token['exp']);

    return [
        'aplicable' => true,
        'revocado' => clementinaTokenRevocado($token['jti']),
    ];
}

/** Elimina las cookies y revoca el token server-side. */
function eliminarCookieAutenticacion(): void
{
    $expira = time() - 3600;
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

    if (!empty($_COOKIE[CLEMENTINA_AUTH_COOKIE])) {
        $token = clementinaLeerToken($_COOKIE[CLEMENTINA_AUTH_COOKIE]);
        if ($token !== null) {
            clementinaRevocarJti($token['jti'], $token['exp']);
        }
        setcookie(CLEMENTINA_AUTH_COOKIE, '', [
            'expires'  => $expira,
            'path'     => '/',
            'secure'   => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        unset($_COOKIE[CLEMENTINA_AUTH_COOKIE]);
    }

    if (isset($_COOKIE[CLEMENTINA_USER_COOKIE])) {
        setcookie(CLEMENTINA_USER_COOKIE, '', [
            'expires'  => $expira,
            'path'     => '/',
            'secure'   => $secure,
            'httponly' => false,
            'samesite' => 'Lax',
        ]);
        unset($_COOKIE[CLEMENTINA_USER_COOKIE]);
    }
}

/** Restaura la sesión desde el token persistente válido. */
function intentarRestaurarSesionDesdeCookie(): bool
{
    if (!empty($_SESSION['id_usuario'])) {
        return true;
    }
    if (empty($_COOKIE[CLEMENTINA_AUTH_COOKIE])) {
        return false;
    }

    $token = clementinaLeerToken($_COOKIE[CLEMENTINA_AUTH_COOKIE]);
    if ($token === null || empty($token['id']) || empty($token['tipo'])) {
        return false;
    }

    try {
        require_once dirname(__DIR__) . '/modelo/Conexion.php';
        $db = Conexion::getInstancia()->getConexion();

        if ($token['tipo'] === 'alumno') {
            $stmt = $db->prepare("
                SELECT id_alumno, numero_documento, legajo, primer_apellido, otros_apellidos,
                       primer_nombre, otros_nombres, email
                FROM alumnos
                WHERE id_alumno = ?
                LIMIT 1
            ");
            $stmt->execute([(int) $token['id']]);
            $a = $stmt->fetch();
            if (!$a) {
                return false;
            }

            $_SESSION['id_usuario']   = $a['id_alumno'];
            $_SESSION['tipo_usuario'] = 'alumno';
            $_SESSION['rol']          = 'alumno';
            $_SESSION['usuario']      = $a['numero_documento'] ?: $a['email'];
            $_SESSION['nombre']       = trim($a['primer_nombre'] . ' ' . $a['otros_nombres']);
            $_SESSION['apellido']     = trim($a['primer_apellido'] . ' ' . $a['otros_apellidos']);
            $_SESSION['email']        = $a['email'];
            $_SESSION['dni']          = $a['numero_documento'];
            $_SESSION['legajo']       = $a['legajo'];
        } elseif ($token['tipo'] === 'personal') {
            $stmt = $db->prepare("
                SELECT id_personal, apellidos, nombres, usuario_sistema, id_tipo_personal
                FROM personal
                WHERE id_personal = ?
                LIMIT 1
            ");
            $stmt->execute([(int) $token['id']]);
            $p = $stmt->fetch();
            if (!$p) {
                return false;
            }

            $roles = ['A' => 'preceptor', 'D' => 'docente'];
            $_SESSION['id_usuario']   = $p['id_personal'];
            $_SESSION['tipo_usuario'] = 'personal';
            $_SESSION['rol']          = $roles[$p['id_tipo_personal']] ?? 'personal';
            $_SESSION['usuario']      = $p['usuario_sistema'];
            $_SESSION['nombre']       = $p['nombres'];
            $_SESSION['apellido']     = $p['apellidos'];
            $_SESSION['email']        = null;
            $_SESSION['dni']          = null;
            $_SESSION['legajo']       = null;
        } else {
            return false;
        }

        session_regenerate_id(true);
        return true;
    } catch (Throwable $e) {
        error_log('[Clementina Sesión] No se pudo restaurar la sesión: ' . $e->getMessage());
        return false;
    }
}

// Auto-restaurar sesión al cargar si está ausente pero el token es válido.
intentarRestaurarSesionDesdeCookie();
