<?php
session_start();
header('Content-Type: application/json');
require_once '../modelo/Conexion.php';

try {
    $conn = Conexion::getInstancia()->getConexion();
    $stmt = $conn->query("SELECT id_carrera, nombre_carrera, nombre_carrera_corto FROM carreras ORDER BY nombre_carrera ASC");
    echo json_encode($stmt->fetchAll());
} catch (PDOException $e) {
    echo json_encode([]);
}
exit;