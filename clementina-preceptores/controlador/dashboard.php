<?php
/**
 * Controlador: Dashboard administrativo.
 * ISFT 182 "Clementina" — Panel de preceptores
 *
 * Devuelve estadísticas institucionales en tiempo real desde la BD.
 * Solo accesible para personal institucional.
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../modelo/Dashboard.php';

requerirMetodo('GET');
requerirPersonalAdmin();

try {
    $modelo = new Dashboard();
    $stats  = $modelo->obtenerEstadisticas();

    responder([
        'ok'   => true,
        'data' => $stats,
    ]);
} catch (Throwable $e) {
    error_log('[Clementina Dashboard] ' . $e->getMessage());
    responder([
        'ok'      => false,
        'mensaje' => 'Error al obtener las estadísticas institucionales.',
    ]);
}
