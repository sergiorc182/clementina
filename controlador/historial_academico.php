<?php
/**
 * Controlador: Historial Académico
 * ISFT N.º 182 "Clementina"
 *
 * Devuelve JSON con las carreras del alumno y su historial de materias
 * aprobadas/regularizadas.
 * La identidad (DNI) se obtiene de forma estricta desde la sesión activa.
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
if (empty($_SESSION['usuario']['id'])) {
    responder(['ok' => false, 'mensaje' => 'Sesión no válida o expirada. Por favor, iniciá sesión nuevamente.']);
}

$rol = $_SESSION['usuario']['rol'] ?? '';

// 2. Determinación del DNI según el rol
if ($rol === 'alumno') {
    // Alumno: DNI siempre estrictamente de la sesión
    $dni = (int) $_SESSION['usuario']['id'];
} else {
    // Personal administrativo: puede consultar su propio ID o un DNI recibido por GET
    $dniParam = isset($_GET['dni']) ? (int) $_GET['dni'] : 0;
    $dni = $dniParam > 0 ? $dniParam : (int) $_SESSION['usuario']['id'];
}

if ($dni <= 0) {
    responder(['ok' => false, 'mensaje' => 'No se pudo identificar el documento del alumno.']);
}

// 3. Parámetro opcional de filtro por carrera
$idCarrera = null;
if (isset($_GET['carrera']) && $_GET['carrera'] !== '' && $_GET['carrera'] !== 'todas') {
    $idCarrera = (int) $_GET['carrera'];
}

try {
    $modelo = new Historial();

    // Obtener carreras en las que el alumno está matriculado o tiene historial
    $carreras = $modelo->obtenerCarrerasDelAlumno($dni);

    // Si tiene exactamente una sola carrera y no se pasó parámetro, seleccionarla por defecto
    if ($idCarrera === null && count($carreras) === 1) {
        $idCarrera = (int) $carreras[0]['idcarrera'];
    }

    // Obtener las materias del historial académico
    $materias = $modelo->obtenerMateriasHistorial($dni, $idCarrera);

    responder([
        'ok'         => true,
        'alumno'     => [
            'dni'             => $dni,
            'nombre_completo' => $_SESSION['usuario']['nombre_completo'] ?? '',
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
