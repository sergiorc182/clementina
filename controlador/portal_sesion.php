<?php
declare(strict_types=1);

require_once __DIR__ . '/_sesion.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$origen = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$origenesPermitidos = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
];
if (in_array($origen, $origenesPermitidos, true)) {
    header('Access-Control-Allow-Origin: ' . $origen);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

$metodo = (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($metodo === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($metodo !== 'GET') {
    http_response_code(405);
    header('Allow: GET, OPTIONS');
    echo json_encode([
        'ok' => false,
        'success' => false,
        'error' => ['code' => 'METHOD_NOT_ALLOWED', 'message' => 'Método no permitido.'],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function portalPermisosPorRol(string $rol): array
{
    $todos = [
        'AUTH_LOGIN', 'USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DEACTIVATE',
        'ROLES_VIEW', 'ROLES_MANAGE', 'AUDIT_VIEW', 'GRADES_VIEW', 'GRADES_RECALCULATE',
        'EXAMS_CREATE', 'EXAMS_EDIT',
    ];
    $mapa = [
        'ADMINISTRADOR' => $todos,
        'ADMINISTRATIVO' => [
            'AUTH_LOGIN', 'USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DEACTIVATE',
            'ROLES_VIEW', 'AUDIT_VIEW', 'GRADES_VIEW', 'EXAMS_CREATE', 'EXAMS_EDIT',
        ],
        'DOCENTE' => [
            'AUTH_LOGIN', 'GRADES_VIEW', 'GRADES_RECALCULATE', 'EXAMS_CREATE', 'EXAMS_EDIT',
        ],
        'PRECEPTOR' => [
            'AUTH_LOGIN', 'GRADES_VIEW', 'GRADES_RECALCULATE', 'AUDIT_VIEW', 'USERS_VIEW',
        ],
        'ALUMNO' => ['AUTH_LOGIN', 'GRADES_VIEW'],
        'CONSULTA' => ['AUTH_LOGIN', 'GRADES_VIEW'],
    ];

    return $mapa[$rol] ?? ['AUTH_LOGIN', 'GRADES_VIEW'];
}

function portalRolDesdeSesion(string $tipo, string $rol): string
{
    $tipo = strtolower(trim($tipo));
    $rol = strtolower(trim($rol));

    if ($tipo === 'alumno') {
        return 'ALUMNO';
    }
    if ($rol === 'preceptor') {
        return 'PRECEPTOR';
    }
    if ($rol === 'docente') {
        return 'DOCENTE';
    }
    if (in_array($rol, ['administrador', 'administrativo', 'secretaria', 'admin'], true)) {
        return 'ADMINISTRATIVO';
    }

    return 'CONSULTA';
}

if (empty($_SESSION['id_usuario'])) {
    http_response_code(401);
    echo json_encode([
        'ok' => false,
        'success' => false,
        'error' => [
            'code' => 'NO_SESSION',
            'message' => 'No hay una sesión activa de Clementina.',
        ],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$tipo = (string) ($_SESSION['tipo_usuario'] ?? 'alumno');
$rolLegacy = (string) ($_SESSION['rol'] ?? $tipo);
$rolPortal = portalRolDesdeSesion($tipo, $rolLegacy);
$idUsuario = (int) $_SESSION['id_usuario'];

$usuario = [
    'id' => $idUsuario,
    'email' => $_SESSION['email'] ?? null,
    'firstName' => (string) ($_SESSION['nombre'] ?? ''),
    'lastName' => (string) ($_SESSION['apellido'] ?? ''),
    'role' => $rolPortal,
    'permissions' => portalPermisosPorRol($rolPortal),
    'idAlumno' => $tipo === 'alumno' ? $idUsuario : null,
    'legajo' => $_SESSION['legajo'] ?? null,
    'dni' => $_SESSION['dni'] ?? null,
    'username' => $_SESSION['usuario'] ?? null,
    'authMode' => 'PHP_COOKIE',
];

echo json_encode([
    'ok' => true,
    'success' => true,
    'data' => ['user' => $usuario],
], JSON_UNESCAPED_UNICODE);
exit;
