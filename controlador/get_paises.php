<?php
session_start();
header('Content-Type: application/json');
require_once '../modelo/Conexion.php';

try {
    $conn = Conexion::getInstancia()->getConexion();
    $stmt = $conn->query("SELECT id_pais, nombre FROM paises ORDER BY orden ASC, nombre ASC");
    echo json_encode($stmt->fetchAll());
} catch (PDOException $e) {
    echo json_encode([]);
}
exit;