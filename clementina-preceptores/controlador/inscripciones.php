<?php
/**
 * Controlador: Inscripciones a finales — Panel de preceptores.
 *
 * GET                              → listado con filtros y paginación
 * POST accion=cambiar_estado       → cancela ('C') o reactiva ('A')
 * POST accion=eliminar             → elimina una inscripción cargada por error
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../modelo/InscripcionesAdmin.php';

requerirPersonalAdmin();

$modelo = new InscripcionesAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = trim((string) ($_POST['accion'] ?? ''));
    $id     = (int) ($_POST['id_inscripcion'] ?? 0);

    if ($id <= 0) {
        responder(['ok' => false, 'mensaje' => 'Inscripción no válida.']);
    }

    if ($accion === 'cambiar_estado') {
        $estado = trim((string) ($_POST['estado'] ?? ''));
        if (!in_array($estado, ['A', 'C'], true)) {
            responder(['ok' => false, 'mensaje' => 'Estado no válido.']);
        }
        responder($modelo->cambiarEstado($id, $estado));
    }

    if ($accion === 'eliminar') {
        responder($modelo->eliminar($id));
    }

    responder(['ok' => false, 'mensaje' => 'Acción no válida.']);
}

requerirMetodo('GET');

$busqueda  = trim($_GET['q'] ?? '');
$estado    = isset($_GET['estado']) && in_array($_GET['estado'], ['A', 'C'], true) ? $_GET['estado'] : null;
$pagina    = max(1, (int) ($_GET['pagina'] ?? 1));
$porPagina = 25;

try {
    $resultado = $modelo->listar($busqueda, $estado, $pagina, $porPagina);

    responder([
        'ok'            => true,
        'inscripciones' => $resultado['inscripciones'],
        'total'         => $resultado['total'],
        'pagina'        => $pagina,
        'paginas'       => $resultado['paginas'],
    ]);
} catch (Throwable $e) {
    error_log('[Clementina Inscripciones] ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al consultar las inscripciones.']);
}
