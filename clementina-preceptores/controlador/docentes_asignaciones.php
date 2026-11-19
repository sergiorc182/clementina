<?php
require_once __DIR__ . '/_base.php';
require_once __DIR__ . '/../modelo/DocenteAsignacionesAdmin.php';

requerirPersonalAdmin();

$modelo = new DocenteAsignacionesAdmin();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $accion = trim((string) ($_GET['accion'] ?? ''));
    $q = trim((string) ($_GET['q'] ?? ''));
    try {
        if ($accion === 'buscar_docentes') {
            responder(['ok' => true, 'docentes' => $modelo->buscarDocentes($q)]);
        }
        if ($accion === 'buscar_materias') {
            responder(['ok' => true, 'carreras_materias' => $modelo->buscarMaterias($q)]);
        }
        if ($accion === 'asignaciones') {
            $idPersonal = (int) ($_GET['id_personal'] ?? 0);
            if ($idPersonal <= 0) {
                responder(['ok' => false, 'mensaje' => 'Docente no válido.']);
            }
            responder([
                'ok' => true,
                'asignaciones' => $modelo->listarAsignacionesPorDocente($idPersonal),
            ]);
        }
        responder(['ok' => false, 'mensaje' => 'Acción no válida.']);
    } catch (Throwable $e) {
        responderErrorServidor('Clementina DocentesAsignaciones', $e);
    }
}

if ($metodo === 'POST') {
    requerirCsrf();
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
            responder(['ok' => false, 'mensaje' => 'Asignación inválida.']);
        }
        responder($modelo->eliminar($idAsignacion));
    }
    responder(['ok' => false, 'mensaje' => 'Acción no válida.']);
}

responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
