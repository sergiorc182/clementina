<?php
/**
 * Panel docentes: guarda la calificación de un alumno en una materia asignada.
 * POST con CSRF. Escribe en historial_academico (esquema existente).
 */

require_once __DIR__ . '/_base.php';
require_once __DIR__ . '/../modelo/DocenteNotas.php';

requerirPostSeguro();
$docente = requerirDocente();

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
        $_POST
    );
    responder([
        'ok' => true,
        'mensaje' => 'Nota guardada correctamente.',
        'alumno' => $alumno,
    ]);
} catch (InvalidArgumentException | RuntimeException $e) {
    responder(['ok' => false, 'mensaje' => $e->getMessage()]);
} catch (Throwable $e) {
    responderErrorServidor('Clementina Docentes', $e);
}
