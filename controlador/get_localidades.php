<?php
session_start();
header('Content-Type: application/json');
require_once '../modelo/Conexion.php';

$idProvincia = isset($_GET['id_provincia']) ? intval($_GET['id_provincia']) : 0;

try {
    $conn = Conexion::getInstancia()->getConexion();
    if ($idProvincia > 0) {
        $stmt = $conn->prepare("SELECT id_localidad, nombre FROM localidades WHERE id_provincia = ? ORDER BY nombre ASC");
        $stmt->execute([$idProvincia]);
    } else {
        $stmt = $conn->query("SELECT id_localidad, nombre FROM localidades ORDER BY nombre ASC LIMIT 500");
    }
    echo json_encode($stmt->fetchAll());
} catch (PDOException $e) {
    echo json_encode([]);
}
exit;