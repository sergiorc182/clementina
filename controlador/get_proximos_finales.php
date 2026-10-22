<?php
session_start();
header('Content-Type: application/json');
require_once '../modelo/Conexion.php';

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
        ORDER BY pm.fecha_inicio ASC, pm.fecha_fin ASC
    ");
    echo json_encode($stmt->fetchAll());
} catch (PDOException $e) {
    echo json_encode([]);
}
exit;