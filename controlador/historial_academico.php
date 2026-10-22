<?php
/**
 * Controlador: Historial Académico
 * ISFT N.º 182 "Clementina"
 *
<<<<<<< HEAD
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
=======
 * GET  Devuelve JSON con las carreras del alumno y su historial de
 *      materias aprobadas/regularizadas. Acepta `carrera` (id o "todas")
 *      y, solo para personal, `dni` del alumno a consultar.
 *
 * La identidad del alumno se toma siempre de la sesión activa. Las
 * consultas viven en modelo/Historial.php.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Historial.php';
require_once dirname(__DIR__) . '/modelo/Alumno.php';

requerirMetodo('GET');
$usuario = requerirSesion();

// 1. Determinación del alumno según el rol
if (($usuario['rol'] ?? '') === 'alumno') {
    // Alumno: siempre el de la sesión, nunca uno recibido por GET
    $idAlumno = (int) $usuario['id'];
    $dni      = (int) ($usuario['documento'] ?? 0);
} else {
    // Personal: consulta al alumno cuyo DNI recibe por GET
    $dni      = isset($_GET['dni']) ? (int) $_GET['dni'] : 0;
    $idAlumno = $dni > 0 ? ((new Alumno())->idPorDocumento($dni) ?? 0) : 0;
}

if ($idAlumno <= 0) {
    responder(['ok' => false, 'mensaje' => 'No se pudo identificar al alumno.']);
}

// 2. Parámetro opcional de filtro por carrera
>>>>>>> origin/InscripcionFinales
$idCarrera = null;
if (isset($_GET['carrera']) && $_GET['carrera'] !== '' && $_GET['carrera'] !== 'todas') {
    $idCarrera = (int) $_GET['carrera'];
}

try {
<<<<<<< HEAD
    // Obtener carreras en las que el alumno está matriculado o tiene historial
    $carreras = $modelo->obtenerCarrerasDelAlumno($idAlumno);

    // Si tiene exactamente una sola carrera y no se pasó parámetro, seleccionarla por defecto
=======
    $modelo = new Historial();

    // Carreras en las que el alumno está matriculado o tiene historial
    $carreras = $modelo->obtenerCarrerasDelAlumno($idAlumno);

    // Si tiene una sola carrera y no se pidió ninguna, se selecciona esa
>>>>>>> origin/InscripcionFinales
    if ($idCarrera === null && count($carreras) === 1) {
        $idCarrera = (int) $carreras[0]['idcarrera'];
    }

<<<<<<< HEAD
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
=======
    $materias = $modelo->obtenerMateriasHistorial($idAlumno, $idCarrera);

    responder([
        'ok'         => true,
        'alumno'     => [
            'dni'             => $dni,
            'nombre_completo' => $usuario['nombre_completo'] ?? '',
>>>>>>> origin/InscripcionFinales
        ],
        'carreras'   => $carreras,
        'carrera_id' => $idCarrera,
        'materias'   => $materias,
        'total'      => count($materias),
    ]);
} catch (Throwable $e) {
<<<<<<< HEAD
    responder([
        'ok'      => false,
        'mensaje' => 'Error al consultar el historial académico: ' . $e->getMessage(),
=======
    // El detalle técnico queda en el log del servidor, no se muestra al alumno.
    error_log('historial_academico: ' . $e->getMessage());
    responder([
        'ok'      => false,
        'mensaje' => 'Error al consultar el historial académico. Intentá de nuevo más tarde.',
>>>>>>> origin/InscripcionFinales
    ]);
}
