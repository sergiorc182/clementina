<?php
/**
 * Controlador: Búsqueda y listado de alumnos — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * GET sin parámetros  → lista paginada de alumnos
 * GET ?q=texto        → búsqueda por nombre, apellido o documento
 * GET ?id=N           → detalle de un alumno
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../modelo/AlumnoAdmin.php';

requerirMetodo('GET');
requerirPersonalAdmin();

$modelo = new AlumnoAdmin();

// Detalle de un alumno puntual
if (isset($_GET['id']) && (int)$_GET['id'] > 0) {
    $alumno = $modelo->obtenerPorId((int)$_GET['id']);
    if (!$alumno) {
        responder(['ok' => false, 'mensaje' => 'Alumno no encontrado.']);
    }
    responder(['ok' => true, 'alumno' => $alumno]);
}

// Búsqueda por DNI (acceso directo para historial)
if (isset($_GET['dni']) && (int)$_GET['dni'] > 0) {
    $alumno = $modelo->obtenerPorDocumento((int)$_GET['dni']);
    if (!$alumno) {
        responder(['ok' => false, 'mensaje' => 'No se encontró un alumno con ese DNI.']);
    }
    responder(['ok' => true, 'alumno' => $alumno]);
}

// Listado con búsqueda y paginación
$busqueda = trim($_GET['q'] ?? '');
$pagina   = max(1, (int)($_GET['pagina'] ?? 1));
$porPagina = 20;

try {
    $resultado = $modelo->listar($busqueda, $pagina, $porPagina);
    responder([
        'ok'      => true,
        'alumnos' => $resultado['alumnos'],
        'total'   => $resultado['total'],
        'pagina'  => $pagina,
        'paginas' => $resultado['paginas'],
    ]);
} catch (Throwable $e) {
    error_log('[Clementina Alumnos] ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al consultar el listado de alumnos.']);
}
