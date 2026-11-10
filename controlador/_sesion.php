<?php
/**
 * Gestión centralizada de sesiones y cookies de autenticación persistente.
 * ISFT 182 "Clementina"
 *
 * Configura cookies de sesión de larga duración (30 días) para que
 * el usuario permanezca autenticado tras cerrar el navegador, y gestiona
 * la cookie de recuperación 'clementina_auth' y la cookie informativa
 * 'clementina_user' para acceso inmediato en el frontend.
 */

if (!defined('CLEMENTINA_AUTH_COOKIE')) {
    define('CLEMENTINA_AUTH_COOKIE', 'clementina_auth');
    define('CLEMENTINA_USER_COOKIE', 'clementina_user');
    define('CLEMENTINA_COOKIE_LIFETIME', 30 * 24 * 3600); // 30 días
    define('CLEMENTINA_SECRET_KEY', 'clementina_isft182_secure_token_key_2026');
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

/**
 * Establece las cookies persistentes de sesión y de usuario en el navegador.
 */
function establecerCookieAutenticacion(array $u): void
{
    $expira = time() + CLEMENTINA_COOKIE_LIFETIME;
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

    // 1. Token criptográfico de autenticación (HttpOnly)
    $payload = json_encode([
        'id'   => $u['id'],
        'tipo' => $u['tipo'],
        'rol'  => $u['rol'],
        't'    => time(),
    ], JSON_UNESCAPED_UNICODE);

    $firma = hash_hmac('sha256', $payload, CLEMENTINA_SECRET_KEY);
    $token = base64_encode($payload . '::' . $firma);

    setcookie(CLEMENTINA_AUTH_COOKIE, $token, [
        'expires'  => $expira,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    // 2. Cookie informativa accesible desde JavaScript para mostrar datos inmediatamente
    $datosVisibles = json_encode([
        'nombre'   => $u['nombre'],
        'apellido' => $u['apellido'],
        'usuario'  => $u['dni'] ?: $u['email'],
        'dni'      => $u['dni'],
        'legajo'   => $u['legajo'],
        'rol'      => $u['rol'],
        'tipo'     => $u['tipo'],
    ], JSON_UNESCAPED_UNICODE);

    setcookie(CLEMENTINA_USER_COOKIE, $datosVisibles, [
        'expires'  => $expira,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
}

/**
 * Elimina las cookies de autenticación persistente al cerrar sesión.
 */
function eliminarCookieAutenticacion(): void
{
    $expira = time() - 3600;
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

    if (isset($_COOKIE[CLEMENTINA_AUTH_COOKIE])) {
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

/**
 * Intenta restaurar la sesión desde la cookie 'clementina_auth' si la sesión PHP expiró.
 */
function intentarRestaurarSesionDesdeCookie(): bool
{
    if (!empty($_SESSION['id_usuario'])) {
        return true;
    }

    if (empty($_COOKIE[CLEMENTINA_AUTH_COOKIE])) {
        return false;
    }

    $raw = base64_decode($_COOKIE[CLEMENTINA_AUTH_COOKIE], true);
    if ($raw === false || strpos($raw, '::') === false) {
        return false;
    }

    [$payload, $firma] = explode('::', $raw, 2);
    $firmaEsperada = hash_hmac('sha256', $payload, CLEMENTINA_SECRET_KEY);
    if (!hash_equals($firmaEsperada, $firma)) {
        return false;
    }

    $data = json_decode($payload, true);
    if (!is_array($data) || empty($data['id']) || empty($data['tipo'])) {
        return false;
    }

    // Validar usuario contra la base de datos
    try {
        require_once dirname(__DIR__) . '/modelo/Conexion.php';
        $db = Conexion::getInstancia()->getConexion();

        if ($data['tipo'] === 'alumno') {
            $stmt = $db->prepare("
                SELECT id_alumno, numero_documento, legajo, primer_apellido, otros_apellidos,
                       primer_nombre, otros_nombres, email
                FROM alumnos
                WHERE id_alumno = ?
                LIMIT 1
            ");
            $stmt->execute([(int) $data['id']]);
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
            return true;
        }

        if ($data['tipo'] === 'personal') {
            $stmt = $db->prepare("
                SELECT id_personal, apellidos, nombres, usuario_sistema, id_tipo_personal
                FROM personal
                WHERE id_personal = ?
                LIMIT 1
            ");
            $stmt->execute([(int) $data['id']]);
            $p = $stmt->fetch();
            if (!$p) {
                return false;
            }

            $roles = ['A' => 'preceptor'];
            $_SESSION['id_usuario']   = $p['id_personal'];
            $_SESSION['tipo_usuario'] = 'personal';
            $_SESSION['rol']          = $roles[$p['id_tipo_personal']] ?? 'personal';
            $_SESSION['usuario']      = $p['usuario_sistema'];
            $_SESSION['nombre']       = $p['nombres'];
            $_SESSION['apellido']     = $p['apellidos'];
            $_SESSION['email']        = null;
            $_SESSION['dni']          = null;
            $_SESSION['legajo']       = null;
            return true;
        }
    } catch (Throwable $e) {
        return false;
    }

    return false;
}

// Auto-restaurar sesión al cargar si está ausente pero la cookie existe
intentarRestaurarSesionDesdeCookie();
