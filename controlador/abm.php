<?php
/**
 * Controlador: ABM genérico.
 *
 * Solo puede usarlo personal con rol habilitado (por ahora, preceptores).
 * El cliente nunca envía nombres de tabla ni de columna: solo la clave de
 * entidad y los valores de los campos. El modelo (Abm) valida contra su
 * registro y arma las consultas.
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once '../modelo/Conexion.php';
require_once '../modelo/Abm.php';

/* Roles de personal habilitados para administrar (S = Preceptor). */
const ROLES_ABM = ['S'];

function salida($datos)
{
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ------------------------------ Autorización ------------------------------ */

if (!isset($_SESSION['id_usuario'])) {
    http_response_code(401);
    salida(['ok' => false, 'mensaje' => 'Sesión no iniciada.']);
}

if (($_SESSION['tipo_usuario'] ?? '') !== 'personal') {
    http_response_code(403);
    salida(['ok' => false, 'mensaje' => 'Solo el personal puede acceder al panel de administración.']);
}

try {
    $conn = Conexion::getInstancia()->getConexion();
    $stmt = $conn->prepare('SELECT id_tipo_personal FROM personal WHERE id_personal = ? LIMIT 1');
    $stmt->execute([$_SESSION['id_usuario']]);
    $tipo = $stmt->fetchColumn();
} catch (PDOException $e) {
    http_response_code(500);
    salida(['ok' => false, 'mensaje' => 'Error de conexión.']);
}

if (!in_array($tipo, ROLES_ABM, true)) {
    http_response_code(403);
    salida(['ok' => false, 'mensaje' => 'No tenés permisos para administrar los datos.']);
}

/* ------------------------------- Despacho -------------------------------- */

$abm = new Abm();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'POST') {
    $crudo = file_get_contents('php://input');
    $cuerpo = json_decode($crudo, true);
    if (!is_array($cuerpo)) {
        salida(['ok' => false, 'mensaje' => 'Datos inválidos.']);
    }

    $accion = $cuerpo['accion'] ?? '';
    $entidad = $cuerpo['entidad'] ?? '';

    if (!Abm::existe($entidad)) {
        salida(['ok' => false, 'mensaje' => 'Entidad desconocida.']);
    }

    if ($accion === 'guardar') {
        $datos = isset($cuerpo['datos']) && is_array($cuerpo['datos']) ? $cuerpo['datos'] : [];
        $pkOriginal = isset($cuerpo['pk']) && is_array($cuerpo['pk']) ? $cuerpo['pk'] : null;
        salida($abm->guardar($entidad, $datos, $_SESSION['usuario'] ?? 'panel', $pkOriginal));
    }

    if ($accion === 'eliminar') {
        $pk = isset($cuerpo['pk']) && is_array($cuerpo['pk']) ? $cuerpo['pk'] : [];
        salida($abm->eliminar($entidad, $pk));
    }

    salida(['ok' => false, 'mensaje' => 'Acción desconocida.']);
}

/* GET */
$accion = $_GET['accion'] ?? 'esquema';

if ($accion === 'esquema') {
    salida(['ok' => true, 'entidades' => $abm->esquema()]);
}

$entidad = $_GET['entidad'] ?? '';
if (!Abm::existe($entidad)) {
    salida(['ok' => false, 'mensaje' => 'Entidad desconocida.']);
}

if ($accion === 'listar') {
    $buscar = $_GET['buscar'] ?? '';
    $filas = $abm->listar($entidad, $buscar);
    salida(['ok' => true, 'filas' => $filas === null ? [] : $filas]);
}

if ($accion === 'obtener') {
    $pk = [];
    if (!empty($_GET['pk'])) {
        $decodificado = json_decode($_GET['pk'], true);
        if (is_array($decodificado)) { $pk = $decodificado; }
    }
    $fila = $abm->obtener($entidad, $pk);
    salida(['ok' => $fila !== null, 'fila' => $fila]);
}

salida(['ok' => false, 'mensaje' => 'Acción desconocida.']);
