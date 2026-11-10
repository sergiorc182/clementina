<?php
require_once __DIR__ . '/_sesion.php';
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__) . '/modelo/Conexion.php';

try {
    $conn = Conexion::getInstancia()->getConexion();
    $stmt = $conn->query("SELECT id_carrera, nombre_carrera, nombre_carrera_corto FROM carreras ORDER BY nombre_carrera ASC");
    echo json_encode($stmt->fetchAll());
} catch (PDOException $e) {
    echo json_encode([]);
}
exit;