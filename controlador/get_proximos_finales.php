<?php
/**
 * Controlador público: próximos períodos de mesas.
 *
 * Lo usa el inicio para mostrar el calendario de finales. Devuelve un
 * arreglo con los turnos cuya fecha de cierre todavía no pasó.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Conexion.php';

requerirMetodo('GET');

try {
    $conn = Conexion::getInstancia()->getConexion();
    $stmt = $conn->query("
        SELECT pm.id_registro,
               pm.anio_mesas,
               pm.fecha_inicio,
               pm.fecha_fin,
               pm.tope_mesas,
               t.turno
        FROM parametros_mesas pm
        LEFT JOIN turnos t ON t.id_turno = pm.id_turno
        WHERE pm.fecha_fin IS NULL OR pm.fecha_fin >= CURDATE()
        ORDER BY (pm.fecha_inicio IS NULL) ASC,
                 pm.fecha_inicio ASC,
                 pm.fecha_fin ASC
    ");
    responder($stmt->fetchAll());
} catch (PDOException $e) {
    error_log('get_proximos_finales: ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'No se pudieron cargar las mesas.']);
}
