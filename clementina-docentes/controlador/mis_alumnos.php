<?php
/**
 * Panel docentes: listado de alumnos por carrera/materia usando historial_academico + matriculacion.
 * GET ?id_carrera=..&id_materia=..
 */

require_once __DIR__ . '/_base.php';
require_once __DIR__ . '/../modelo/DocenteNotas.php';

requerirMetodo('GET');
$docente = requerirDocenteOPreceptor();
$esPreceptor = ($docente['rol'] ?? '') === 'preceptor';

try {
    $modelo = new DocenteNotas();
    $asignadas = $esPreceptor
        ? $modelo->catalogoCompleto()
        : $modelo->carrerasConMateriasAsignadas((int) $docente['id']);

    $aniosPorCarrera = [];
    foreach ($asignadas as $a) {
        $idCarrera = (int) $a['id_carrera'];
        if (!isset($aniosPorCarrera[$idCarrera])) {
            $aniosPorCarrera[$idCarrera] = $modelo->aniosDisponibles($idCarrera);
        }
    }

    if (isset($_GET['catalogo']) && $_GET['catalogo'] === '1') {
        responder([
            'ok' => true,
            'carreras' => $asignadas,
            'materias_por_carrera' => $modelo->materiasPorCarreraMap($asignadas),
            'anios_por_carrera' => $aniosPorCarrera,
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
    if (!$esPreceptor && !$permitida) {
        responder(['ok' => false, 'mensaje' => 'No tenés asignada esa materia.']);
    }

    $anio = isset($_GET['anio']) ? max(0, (int) $_GET['anio']) : 0;
    $busqueda = trim((string) ($_GET['q'] ?? ''));

    $alumnos = $modelo->alumnosPorCarreraMateria($idCarrera, $idMateria, $anio, $busqueda);
    responder([
        'ok' => true,
        'alumnos' => $alumnos,
        'anio' => $anio,
        'busqueda' => $busqueda,
        'anios' => $aniosPorCarrera[$idCarrera] ?? [],
        'carreras' => $asignadas,
        'materias_por_carrera' => $modelo->materiasPorCarreraMap($asignadas),
    ]);
} catch (Throwable $e) {
    error_log('[Clementina Docentes] ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'No se pudo cargar la lista de alumnos.']);
}
