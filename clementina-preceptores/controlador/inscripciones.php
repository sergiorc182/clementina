<?php
/**
 * Controlador: Inscripciones a finales — Panel de preceptores.
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../modelo/InscripcionesAdmin.php';

requerirMetodo('GET');
requerirPersonalAdmin();

$busqueda  = trim($_GET['q'] ?? '');
$estado    = isset($_GET['estado']) && in_array($_GET['estado'], ['A', 'C'], true) ? $_GET['estado'] : null;
$pagina    = max(1, (int)($_GET['pagina'] ?? 1));
$porPagina = 25;

try {
    $modelo    = new InscripcionesAdmin();
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
