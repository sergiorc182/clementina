<?php
require_once __DIR__ . '/_sesion.php';
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__) . '/modelo/Conexion.php';

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