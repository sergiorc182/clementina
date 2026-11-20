<?php
/**
 * Panel docentes: listado de alumnos por carrera/materia usando historial_academico + matriculacion.
 * GET ?id_carrera=..&id_materia=..
 */

require_once __DIR__ . '/_base.php';
require_once __DIR__ . '/../modelo/DocenteNotas.php';

requerirMetodo('GET');
$docente = requerirDocente();

try {
    $modelo = new DocenteNotas();
    $asignadas = $modelo->carrerasConMateriasAsignadas((int) $docente['id']);

    if (isset($_GET['catalogo']) && $_GET['catalogo'] === '1') {
        responder([
            'ok' => true,
            'carreras' => $asignadas,
            'materias_por_carrera' => $modelo->materiasPorCarreraMap($asignadas),
        ]);
    }

    $idCarrera = isset($_GET['id_carrera']) ? (int) $_GET['id_carrera'] : 0;
    $idMateria = isset($_GET['id_materia']) ? (int) $_GET['id_materia'] : 0;

    if ($idCarrera <= 0 || $idMateria <= 0) {
        responder(['ok' => false, 'mensaje' => 'Selecciona una carrera y una materia.']);
    }

    $permitida = false;
    foreach ($asignadas as $a) {
        if ((int) $a['id_carrera'] === $idCarrera && (int) $a['id_materia'] === $idMateria) {
            $permitida = true;
            break;
        }
    }
    if (!$permitida) {
        responder(['ok' => false, 'mensaje' => 'No tenés asignada esa materia.']);
    }

    $alumnos = $modelo->alumnosPorCarreraMateria($idCarrera, $idMateria);
    responder([
        'ok' => true,
        'alumnos' => $alumnos,
        'carreras' => $asignadas,
        'materias_por_carrera' => $modelo->materiasPorCarreraMap($asignadas),
    ]);
} catch (Throwable $e) {
    error_log('[Clementina Docentes] ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'No se pudo cargar la lista de alumnos.']);
}
