<?php
require_once __DIR__ . '/_sesion.php';
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__) . '/modelo/Conexion.php';

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