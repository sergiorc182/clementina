<?php
/**
 * Controlador: Historial Académico
 * ISFT N.º 182 "Clementina"
 *
 * El alumno solo puede consultar su propio historial. El personal con
 * perfil administrativo puede consultar por DNI. Docentes y usuarios sin
 * sesión no pueden consultar historiales arbitrarios.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Historial.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
}

$usuario = requerirSesion();
$rol = $usuario['rol'];
$modelo = new Historial();
$alumno = null;

if ($rol === 'alumno' && $usuario['tipo'] === 'alumno') {
    $idAlumno = $usuario['id'];
} elseif ($usuario['tipo'] === 'personal' && esPersonalAdmin($usuario)) {
    $dniParam = isset($_GET['dni']) ? (int) $_GET['dni'] : 0;
    if ($dniParam <= 0) {
        responder(['ok' => false, 'mensaje' => 'Debe indicar el DNI del alumno a consultar.']);
    }
    $alumno   = $modelo->obtenerAlumnoPorDocumento($dniParam);
    $idAlumno = $alumno ? $alumno['id_alumno'] : 0;
} else {
    http_response_code(403);
    responder(['ok' => false, 'mensaje' => 'Sin permisos para consultar este historial.']);
}

if (empty($idAlumno)) {
    responder(['ok' => false, 'mensaje' => 'No se encontró el alumno solicitado.']);
}

$idCarrera = null;
if (isset($_GET['carrera']) && $_GET['carrera'] !== '' && $_GET['carrera'] !== 'todas') {
    $idCarrera = (int) $_GET['carrera'];
}

try {
    $carreras = $modelo->obtenerCarrerasDelAlumno($idAlumno);

    if ($idCarrera === null && count($carreras) === 1) {
        $idCarrera = (int) $carreras[0]['idcarrera'];
    }

    $materias = $modelo->obtenerMateriasHistorial($idAlumno, $idCarrera);

    if ($alumno !== null) {
        $nombreCompleto = $alumno['nombre_completo'];
        $documento      = $alumno['numero_documento'];
    } else {
        $nombreCompleto = $usuario['nombre_completo'];
        $documento      = $usuario['documento'] ?: (int) ($_SESSION['usuario'] ?? 0);
    }

    responder([
        'ok'         => true,
        'alumno'     => [
            'dni'             => $documento,
            'nombre_completo' => $nombreCompleto,
        ],
        'carreras'   => $carreras,
        'carrera_id' => $idCarrera,
        'materias'   => $materias,
        'total'      => count($materias),
    ]);
} catch (Throwable $e) {
    responderErrorServidor('Clementina Historial', $e);
}
