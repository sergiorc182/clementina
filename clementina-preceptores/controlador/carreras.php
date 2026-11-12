<?php
/**
 * Controlador: Gestión de carreras — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * GET                → listado de carreras con matriculados
 * POST accion=crear  → alta de carrera
 * POST accion=actualizar (id_carrera) → edición
 * POST accion=eliminar (id_carrera)   → baja (solo si no tiene datos asociados)
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../modelo/CarreraAdmin.php';

requerirPersonalAdmin();

$modelo  = new CarreraAdmin();
$usuario = trim((string) ($_SESSION['usuario'] ?? ''));
if ($usuario === '') {
    $usuario = trim((string) ($_SESSION['nombre'] ?? '') . ' ' . (string) ($_SESSION['apellido'] ?? ''));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = trim((string) ($_POST['accion'] ?? ''));
    $id     = (int) ($_POST['id_carrera'] ?? 0);

    if ($accion === 'crear' || $accion === 'actualizar') {
        if ($accion === 'actualizar' && $id <= 0) {
            responder(['ok' => false, 'mensaje' => 'Carrera no válida.']);
        }

        $datos = [
            'nro_resolucion'       => trim((string) ($_POST['nro_resolucion'] ?? '')),
            'nombre_carrera'       => trim((string) ($_POST['nombre_carrera'] ?? '')),
            'nombre_carrera_corto' => trim((string) ($_POST['nombre_carrera_corto'] ?? '')),
            'titulo'               => trim((string) ($_POST['titulo'] ?? '')),
        ];

        if ($datos['nombre_carrera'] === '') {
            responder(['ok' => false, 'mensaje' => 'Ingresá el nombre de la carrera.']);
        }
        if ($datos['nombre_carrera_corto'] === '') {
            responder(['ok' => false, 'mensaje' => 'Ingresá el nombre corto de la carrera.']);
        }
        if ($datos['nro_resolucion'] === '') {
            responder(['ok' => false, 'mensaje' => 'Ingresá el número de resolución.']);
        }
        if ($datos['titulo'] === '') {
            responder(['ok' => false, 'mensaje' => 'Ingresá el título que otorga la carrera.']);
        }

        if (mb_strlen($datos['nombre_carrera']) > 100) {
            responder(['ok' => false, 'mensaje' => 'El nombre de la carrera supera los 100 caracteres.']);
        }
        if (mb_strlen($datos['nombre_carrera_corto']) > 45) {
            responder(['ok' => false, 'mensaje' => 'El nombre corto supera los 45 caracteres.']);
        }
        if (mb_strlen($datos['nro_resolucion']) > 45) {
            responder(['ok' => false, 'mensaje' => 'La resolución supera los 45 caracteres.']);
        }
        if (mb_strlen($datos['titulo']) > 100) {
            responder(['ok' => false, 'mensaje' => 'El título supera los 100 caracteres.']);
        }

        if ($accion === 'crear') {
            responder($modelo->crear($datos, $usuario));
        }
        responder($modelo->actualizar($id, $datos, $usuario));
    }

    if ($accion === 'eliminar') {
        if ($id <= 0) {
            responder(['ok' => false, 'mensaje' => 'Carrera no válida.']);
        }
        responder($modelo->eliminar($id));
    }

    responder(['ok' => false, 'mensaje' => 'Acción no válida.']);
}

requerirMetodo('GET');

try {
    responder(['ok' => true, 'carreras' => $modelo->listar()]);
} catch (Throwable $e) {
    error_log('[Clementina Carreras] ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al consultar las carreras.']);
}
