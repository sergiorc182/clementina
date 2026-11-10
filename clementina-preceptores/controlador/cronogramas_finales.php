<?php
/**
 * Controlador: Cronogramas de finales — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * GET  ?accion=descargar&id_carrera=N&archivo=X → sirve el PDF.
 * GET  (sin acción)                             → JSON: carreras y sus PDFs.
 * POST accion=subir    (multipart: id_carrera + archivo) → publica un PDF.
 * POST accion=borrar   (id_carrera + archivo)            → elimina un PDF.
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../../modelo/CronogramaFinales.php';

requerirPersonalAdmin();

$modelo = new CronogramaFinales();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = trim((string) ($_POST['accion'] ?? ''));

    if ($accion === 'subir') {
        $idCarrera = (int) ($_POST['id_carrera'] ?? 0);
        responder($modelo->guardar($idCarrera, $_FILES['archivo'] ?? []));
    }

    if ($accion === 'borrar') {
        $idCarrera = (int) ($_POST['id_carrera'] ?? 0);
        $archivo   = trim((string) ($_POST['archivo'] ?? ''));
        responder($modelo->borrar($idCarrera, $archivo));
    }

    responder(['ok' => false, 'mensaje' => 'Acción desconocida.']);
}

// GET: descarga directa de un PDF publicado
$accion = trim((string) ($_GET['accion'] ?? ''));
if ($accion === 'descargar') {
    $idCarrera = (int) ($_GET['id_carrera'] ?? 0);
    $archivo   = trim((string) ($_GET['archivo'] ?? ''));
    $ruta = $modelo->resolverRuta($idCarrera, $archivo);
    if ($ruta === null) {
        responder(['ok' => false, 'mensaje' => 'El archivo no existe.']);
    }
    header('Content-Type: application/pdf');
    header('Content-Length: ' . (string) filesize($ruta));
    header('Content-Disposition: inline; filename="' . $modelo->nombreVisible($archivo) . '"');
    header('X-Content-Type-Options: nosniff');
    readfile($ruta);
    exit;
}

responder([
    'ok'       => true,
    'carreras' => $modelo->listarTodo(),
]);
