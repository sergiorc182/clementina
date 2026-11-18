<?php
require_once __DIR__ . '/_base.php';
require_once __DIR__ . '/../modelo/DocenteAsignacionesAdmin.php';

requerirPersonalAdmin();

$modelo = new DocenteAsignacionesAdmin();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    try {
        responder([
            'ok' => true,
            'docentes' => $modelo->listarDocentes(),
            'carreras_materias' => $modelo->carrerasMateriasFlat(),
            'asignaciones' => $modelo->listarAsignaciones(),
        ]);
    } catch (Throwable $e) {
        error_log('[Clementina DocentesAsignaciones] ' . $e->getMessage());
        responder(['ok' => false, 'mensaje' => 'No se pudieron cargar los datos.']);
    }
}

if ($metodo === 'POST') {
    $accion = trim((string) ($_POST['accion'] ?? ''));
    if ($accion === 'crear') {
        $idPersonal = (int) ($_POST['id_personal'] ?? 0);
        $idCarrera = (int) ($_POST['id_carrera'] ?? 0);
        $idMateria = (int) ($_POST['id_materia'] ?? 0);
        if ($idPersonal <= 0 || $idCarrera <= 0 || $idMateria <= 0) {
            responder(['ok' => false, 'mensaje' => 'Datos incompletos.']);
        }
        responder($modelo->crear($idPersonal, $idCarrera, $idMateria));
    }
    if ($accion === 'eliminar') {
        $idAsignacion = (int) ($_POST['id_asignacion'] ?? 0);
        if ($idAsignacion <= 0) {
            responder(['ok' => false, 'mensaje' => 'Asignaci��n inv��lida.']);
        }
        responder($modelo->eliminar($idAsignacion));
    }
    responder(['ok' => false, 'mensaje' => 'Acci��n no v��lida.']);
}

responder(['ok' => false, 'mensaje' => 'M��todo no permitido.']);
