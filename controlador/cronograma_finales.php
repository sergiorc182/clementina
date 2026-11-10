<?php
/**
 * Controlador: Cronogramas de finales — Panel del alumno.
 *
 * GET                       → JSON con los PDFs publicados por las
 *                             carreras en las que está matriculado.
 * GET ?id_carrera=N&archivo=X [&descargar=1]
 *                           → sirve el PDF (inline para ver en el
 *                             navegador, o como descarga directa).
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/CronogramaFinales.php';

$usuario = requerirAlumno();
$modelo  = new CronogramaFinales();

$idCarrera = (int) ($_GET['id_carrera'] ?? 0);
$archivo    = trim((string) ($_GET['archivo'] ?? ''));

if ($idCarrera > 0 && $archivo !== '') {
    if (!$modelo->matriculadoEn($usuario['id'], $idCarrera)) {
        responder(['ok' => false, 'mensaje' => 'No estás matriculado en esa carrera.']);
    }

    $ruta = $modelo->resolverRuta($idCarrera, $archivo);
    if ($ruta === null) {
        responder(['ok' => false, 'mensaje' => 'El archivo no existe.']);
    }

    $disposicion = isset($_GET['descargar']) ? 'attachment' : 'inline';
    header('Content-Type: application/pdf');
    header('Content-Length: ' . (string) filesize($ruta));
    header('Content-Disposition: ' . $disposicion . '; filename="' . $modelo->nombreVisible($archivo) . '"');
    header('X-Content-Type-Options: nosniff');
    readfile($ruta);
    exit;
}

responder([
    'ok'      => true,
    'carreras' => $modelo->listarParaAlumno($usuario['id']),
]);
