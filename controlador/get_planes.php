<?php
session_start();
header('Content-Type: application/json');
require_once '../modelo/Conexion.php';

$id_carrera = intval($_GET['id_carrera'] ?? 0);
if ($id_carrera <= 0) {
    echo json_encode([]);
    exit;
}

try {
    $conn = Conexion::getInstancia()->getConexion();
    $stmt = $conn->prepare("
        SELECT cm.id_materia, m.nombre_materia, cm.anio_cursada
        FROM carrera_materias cm
        INNER JOIN materias m ON m.id_materia = cm.id_materia
        WHERE cm.id_carrera = ?
        ORDER BY cm.anio_cursada ASC, m.nombre_materia ASC
    ");
    $stmt->execute([$id_carrera]);
    echo json_encode($stmt->fetchAll());
} catch (PDOException $e) {
    echo json_encode([]);
}
exit;