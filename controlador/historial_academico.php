<?php
/**
 * Controlador: Historial Académico
 * ISFT N.º 182 "Clementina"
 *
 * Devuelve JSON con las carreras del alumno y su historial de materias
 * aprobadas/regularizadas.
 * La identidad se obtiene de forma estricta desde la sesión activa.
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/modelo/Historial.php';

function responder(array $datos): void
{
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
}

// 1. Verificación de sesión activa
if (empty($_SESSION['id_usuario'])) {
    responder(['ok' => false, 'mensaje' => 'Sesión no válida o expirada. Por favor, iniciá sesión nuevamente.']);
}

$rol = $_SESSION['rol'] ?? 'alumno';
$modelo = new Historial();

// 2. Determinación del alumno según el rol
if ($rol === 'alumno') {
    // Alumno: identidad siempre estrictamente de la sesión
    $idAlumno = (int) $_SESSION['id_usuario'];
} else {
    // Personal: puede consultar por DNI recibido por GET o su propia sesión
    $dniParam = isset($_GET['dni']) ? (int) $_GET['dni'] : 0;
    if ($dniParam > 0) {
        $idAlumno = $modelo->obtenerIdAlumnoPorDocumento($dniParam);
    } else {
        $idAlumno = (int) $_SESSION['id_usuario'];
    }
}

if (empty($idAlumno)) {
    responder(['ok' => false, 'mensaje' => 'No se pudo identificar al alumno.']);
}

// 3. Parámetro opcional de filtro por carrera
$idCarrera = null;
if (isset($_GET['carrera']) && $_GET['carrera'] !== '' && $_GET['carrera'] !== 'todas') {
    $idCarrera = (int) $_GET['carrera'];
}

try {
    // Obtener carreras en las que el alumno está matriculado o tiene historial
    $carreras = $modelo->obtenerCarrerasDelAlumno($idAlumno);

    // Si tiene exactamente una sola carrera y no se pasó parámetro, seleccionarla por defecto
    if ($idCarrera === null && count($carreras) === 1) {
        $idCarrera = (int) $carreras[0]['idcarrera'];
    }

    // Obtener las materias del historial académico
    $materias = $modelo->obtenerMateriasHistorial($idAlumno, $idCarrera);

    $nombreCompleto = trim(($_SESSION['nombre'] ?? '') . ' ' . ($_SESSION['apellido'] ?? ''));
    $documento = isset($_SESSION['dni']) && $_SESSION['dni'] !== null
        ? (int) $_SESSION['dni']
        : (int) ($_SESSION['usuario'] ?? 0);

    responder([
        'ok'         => true,
        'alumno'     => [
            'dni'             => $documento,
            'nombre_completo' => $nombreCompleto,
        ],
        'carreras'   => $carreras,
        'carrera_id' => $idCarrera,
        'materias'   => $materias,
        'total'      => count($materias),
    ]);
} catch (Throwable $e) {
    responder([
        'ok'      => false,
        'mensaje' => 'Error al consultar el historial académico: ' . $e->getMessage(),
    ]);
}
