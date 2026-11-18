<?php
/**
 * Controlador: Configuración académica — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * Entidades: materias | carrera_materias | carrera_sede_turno | turnos
 *
 * GET  ?entidad=X                → listado + opciones de catálogos
 * POST entidad=X&accion=crear    → alta
 * POST entidad=X&accion=actualizar + pk_json → edición
 * POST entidad=X&accion=eliminar   + pk_json → baja
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../modelo/ConfigAdmin.php';

requerirPersonalAdmin();

$modelo  = new ConfigAdmin();
$entidad = trim((string) ($_GET['entidad'] ?? $_POST['entidad'] ?? ''));

if (!ConfigAdmin::entidadValida($entidad)) {
    responder(['ok' => false, 'mensaje' => 'Entidad de configuración no válida.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = trim((string) ($_POST['accion'] ?? ''));

    $pk = [];
    if (!empty($_POST['pk_json'])) {
        $decoded = json_decode((string) $_POST['pk_json'], true);
        if (is_array($decoded)) {
            $pk = $decoded;
        }
    }

    if ($accion === 'crear' || $accion === 'actualizar') {
        if ($accion === 'actualizar' && !$pk) {
            responder(['ok' => false, 'mensaje' => 'Registro no válido.']);
        }

        $datos = validarDatos($entidad);
        if (isset($datos['ok']) && $datos['ok'] === false) {
            responder($datos);
        }

        if ($accion === 'crear') {
            responder($modelo->crear($entidad, $datos));
        }
        responder($modelo->actualizar($entidad, $pk, $datos));
    }

    if ($accion === 'eliminar') {
        if (!$pk) {
            responder(['ok' => false, 'mensaje' => 'Registro no válido.']);
        }
        responder($modelo->eliminar($entidad, $pk));
    }

    responder(['ok' => false, 'mensaje' => 'Acción no válida.']);
}

requerirMetodo('GET');

try {
    responder([
        'ok'       => true,
        'filas'    => $modelo->listar($entidad),
        'opciones' => $modelo->opciones(),
    ]);
} catch (Throwable $e) {
    error_log('[Clementina Configuración] ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al consultar los registros.']);
}

/* ====================================================================== */
/* Validación de datos por entidad                                        */
/* ====================================================================== */

function validarDatos(string $entidad): array
{
    switch ($entidad) {
        case 'materias':
            $id     = (int) ($_POST['id_materia'] ?? 0);
            $nombre = trim((string) ($_POST['nombre_materia'] ?? ''));

            if ($id <= 0) {
                return ['ok' => false, 'mensaje' => 'Ingresá un ID de materia válido.'];
            }
            if ($nombre === '') {
                return ['ok' => false, 'mensaje' => 'Ingresá el nombre de la materia.'];
            }
            if (mb_strlen($nombre) > 100) {
                return ['ok' => false, 'mensaje' => 'El nombre de la materia supera los 100 caracteres.'];
            }
            return ['id_materia' => $id, 'nombre_materia' => $nombre];

        case 'turnos':
            $id    = (int) ($_POST['id_turno'] ?? 0);
            $turno = trim((string) ($_POST['turno'] ?? ''));

            if ($id <= 0) {
                return ['ok' => false, 'mensaje' => 'Ingresá un ID de turno válido.'];
            }
            if ($turno === '') {
                return ['ok' => false, 'mensaje' => 'Ingresá el nombre del turno.'];
            }
            if (mb_strlen($turno) > 20) {
                return ['ok' => false, 'mensaje' => 'El nombre del turno supera los 20 caracteres.'];
            }
            return ['id_turno' => $id, 'turno' => $turno];

        case 'carrera_materias':
            $idCarrera = (int) ($_POST['id_carrera'] ?? 0);
            $idMateria = (int) ($_POST['id_materia'] ?? 0);
            $anio      = (int) ($_POST['anio_cursada'] ?? 0);

            if ($idCarrera <= 0) {
                return ['ok' => false, 'mensaje' => 'Seleccioná una carrera.'];
            }
            if ($idMateria <= 0) {
                return ['ok' => false, 'mensaje' => 'Seleccioná una materia.'];
            }
            if ($anio < 1 || $anio > 10) {
                return ['ok' => false, 'mensaje' => 'El año de cursada debe estar entre 1 y 10.'];
            }
            return [
                'id_carrera'   => $idCarrera,
                'id_materia'   => $idMateria,
                'anio_cursada' => $anio,
            ];

        case 'carrera_sede_turno':
            $idCarrera = (int) ($_POST['id_carrera'] ?? 0);
            $idSede    = (int) ($_POST['id_sede'] ?? 0);
            $idTurno   = (int) ($_POST['id_turno'] ?? 0);

            if ($idCarrera <= 0) {
                return ['ok' => false, 'mensaje' => 'Seleccioná una carrera.'];
            }
            if ($idSede <= 0) {
                return ['ok' => false, 'mensaje' => 'Seleccioná una sede.'];
            }
            if ($idTurno <= 0) {
                return ['ok' => false, 'mensaje' => 'Seleccioná un turno.'];
            }
            return [
                'id_carrera' => $idCarrera,
                'id_sede'    => $idSede,
                'id_turno'   => $idTurno,
            ];
    }

    return ['ok' => false, 'mensaje' => 'Entidad no válida.'];
}
