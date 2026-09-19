<?php
/**
 * Controlador: Mis datos (alumno autenticado)
 *
 * Devuelve JSON con los datos personales del alumno logueado:
 * nombre, apellido, DNI, email y teléfono.
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/modelo/Conexion.php';

function responder(array $datos): void
{
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['usuario']['id']) || $_SESSION['usuario']['rol'] !== 'alumno') {
    responder(['ok' => false, 'mensaje' => 'No autenticado.']);
}

$db = Conexion::getInstancia()->getConexion();

$stmt = $db->prepare(
    "SELECT a.primer_nombre, a.otros_nombres, a.primer_apellido, a.otros_apellidos,
            a.numero_documento, a.email, d.telefono_principal
     FROM alumnos a
     LEFT JOIN domicilios_alumno d ON d.id_alumno = a.id_alumno
     WHERE a.id_alumno = :id_alumno
     LIMIT 1"
);
$stmt->bindValue(':id_alumno', $_SESSION['usuario']['id'], PDO::PARAM_INT);
$stmt->execute();

$fila = $stmt->fetch();
if (!$fila) {
    responder(['ok' => false, 'mensaje' => 'No se encontraron datos.']);
}

responder(['ok' => true, 'datos' => $fila]);