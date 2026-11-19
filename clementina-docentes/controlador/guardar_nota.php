<?php
/**
 * Panel docentes: guarda la calificación de un alumno en una materia asignada.
 * POST con CSRF. Escribe en historial_academico (esquema existente).
 */

require_once __DIR__ . '/_base.php';
require_once __DIR__ . '/../modelo/DocenteNotas.php';

requerirPostSeguro();
$docente = requerirDocenteOPreceptor();
$esPreceptor = ($docente['rol'] ?? '') === 'preceptor';

$idAlumno = isset($_POST['id_alumno']) ? (int) $_POST['id_alumno'] : 0;
$idCarrera = isset($_POST['id_carrera']) ? (int) $_POST['id_carrera'] : 0;
$idMateria = isset($_POST['id_materia']) ? (int) $_POST['id_materia'] : 0;

if ($idAlumno <= 0 || $idCarrera <= 0 || $idMateria <= 0) {
    responder(['ok' => false, 'mensaje' => 'Datos de cursada incompletos.']);
}

try {
    $modelo = new DocenteNotas();
    $alumno = $modelo->guardarNota(
        (int) $docente['id'],
        $idAlumno,
        $idCarrera,
        $idMateria,
        $_POST,
        $esPreceptor
    );
    responder([
        'ok' => true,
        'mensaje' => 'Nota guardada correctamente.',
        'alumno' => $alumno,
    ]);
} catch (InvalidArgumentException | RuntimeException $e) {
    responder(['ok' => false, 'mensaje' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log(
        '[Clementina Docentes] ' . get_class($e) . ' en ' . $e->getFile() . ':' . $e->getLine()
        . ' - ' . $e->getMessage()
        . ' | post=' . json_encode([
            'id_alumno' => $idAlumno,
            'id_carrera' => $idCarrera,
            'id_materia' => $idMateria,
            'nota' => $_POST['nota'] ?? null,
            'tipo_alumno' => $_POST['tipo_alumno'] ?? null,
        ])
    );
    responder([
        'ok' => false,
        'mensaje' => 'No se pudo completar la operación. Intentá nuevamente. ('
            . get_class($e) . ': ' . $e->getMessage() . ')',
    ]);
}
