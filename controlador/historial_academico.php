<?php
/**
 * Controlador: Historial Académico
 * ISFT N.º 182 "Clementina"
 *
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
$idCarrera = null;
if (isset($_GET['carrera']) && $_GET['carrera'] !== '' && $_GET['carrera'] !== 'todas') {
    $idCarrera = (int) $_GET['carrera'];
}

try {
    $modelo = new Historial();

    // Carreras en las que el alumno está matriculado o tiene historial
    $carreras = $modelo->obtenerCarrerasDelAlumno($idAlumno);

    // Si tiene una sola carrera y no se pidió ninguna, se selecciona esa
    if ($idCarrera === null && count($carreras) === 1) {
        $idCarrera = (int) $carreras[0]['idcarrera'];
    }

    $materias = $modelo->obtenerMateriasHistorial($idAlumno, $idCarrera);

    responder([
        'ok'         => true,
        'alumno'     => [
            'dni'             => $dni,
            'nombre_completo' => $usuario['nombre_completo'] ?? '',
        ],
        'carreras'   => $carreras,
        'carrera_id' => $idCarrera,
        'materias'   => $materias,
        'total'      => count($materias),
    ]);
} catch (Throwable $e) {
    // El detalle técnico queda en el log del servidor, no se muestra al alumno.
    error_log('historial_academico: ' . $e->getMessage());
    responder([
        'ok'      => false,
        'mensaje' => 'Error al consultar el historial académico. Intentá de nuevo más tarde.',
    ]);
}
