<?php
/**
 * Controlador: Parámetros del sistema — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * GET  → parámetros agrupados + turnos disponibles
 * POST accion=guardar → guarda los cinco bloques de parámetros
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../modelo/ParametrosAdmin.php';

requerirPersonalAdmin();

$modelo = new ParametrosAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = trim((string) ($_POST['accion'] ?? ''));
    if ($accion !== 'guardar') {
        responder(['ok' => false, 'mensaje' => 'Acción no válida.']);
    }

    $nombreInstituto = trim((string) ($_POST['nombre_instituto'] ?? ''));
    if ($nombreInstituto === '') {
        responder(['ok' => false, 'mensaje' => 'Ingresá el nombre del instituto.']);
    }
    if (mb_strlen($nombreInstituto) > 45) {
        responder(['ok' => false, 'mensaje' => 'El nombre del instituto supera los 45 caracteres.']);
    }

    $ciclo = filtroEntero($_POST['ciclo_lectivo'] ?? null, 2000, 2100);
    if ($ciclo === false) {
        responder(['ok' => false, 'mensaje' => 'El ciclo lectivo debe ser un año válido.']);
    }

    $anioMesas = filtroEntero($_POST['anio_mesas'] ?? null, 2000, 2100);
    if ($anioMesas === false) {
        responder(['ok' => false, 'mensaje' => 'El año de mesas debe ser un año válido.']);
    }

    $idTurno = filtroEntero($_POST['id_turno'] ?? null, 1, 9999);
    if ($idTurno === false || !$modelo->existeTurno($idTurno)) {
        responder(['ok' => false, 'mensaje' => 'Seleccioná un turno válido para las mesas.']);
    }

    $tope = filtroEntero($_POST['tope_mesas'] ?? null, 0, 999, true);

    $anioInscripcion = filtroEntero($_POST['anio_inscripcion_carrera'] ?? null, 2000, 2100, true);
    $anioMatricula   = filtroEntero($_POST['anio_matriculacion'] ?? null, 2000, 2100, true);
    $anioAspirantes  = filtroEntero($_POST['anio_aspirantes'] ?? null, 2000, 2100, true);

    $carpetaAlumno = trim((string) ($_POST['carpeta_vista_alumno'] ?? ''));
    $carpetaPrecep = trim((string) ($_POST['carpeta_vista_preceptoria'] ?? ''));
    if (mb_strlen($carpetaAlumno) > 45 || mb_strlen($carpetaPrecep) > 45) {
        responder(['ok' => false, 'mensaje' => 'Las carpetas admiten hasta 45 caracteres.']);
    }

    $fechas = [
        'mesas_fecha_inicio'         => filtroFecha($_POST['mesas_fecha_inicio'] ?? null),
        'mesas_fecha_fin'            => filtroFecha($_POST['mesas_fecha_fin'] ?? null),
        'inscripcion_fecha_inicio'   => filtroFecha($_POST['inscripcion_fecha_inicio'] ?? null),
        'inscripcion_fecha_fin'      => filtroFecha($_POST['inscripcion_fecha_fin'] ?? null),
        'matriculacion_fecha_inicio' => filtroFecha($_POST['matriculacion_fecha_inicio'] ?? null),
        'matriculacion_fecha_fin'    => filtroFecha($_POST['matriculacion_fecha_fin'] ?? null),
    ];
    foreach ($fechas as $etiqueta => $valor) {
        if ($valor === false) {
            responder(['ok' => false, 'mensaje' => 'Una de las fechas ingresadas no es válida.']);
        }
    }

    responder($modelo->guardar([
        'nombre_instituto'           => $nombreInstituto,
        'ciclo_lectivo'              => $ciclo,
        'anio_mesas'                 => $anioMesas,
        'id_turno'                   => $idTurno,
        'mesas_fecha_inicio'         => $fechas['mesas_fecha_inicio'],
        'mesas_fecha_fin'            => $fechas['mesas_fecha_fin'],
        'tope_mesas'                 => $tope,
        'anio_inscripcion_carrera'   => $anioInscripcion,
        'inscripcion_fecha_inicio'   => $fechas['inscripcion_fecha_inicio'],
        'inscripcion_fecha_fin'      => $fechas['inscripcion_fecha_fin'],
        'anio_matriculacion'         => $anioMatricula,
        'matriculacion_fecha_inicio' => $fechas['matriculacion_fecha_inicio'],
        'matriculacion_fecha_fin'    => $fechas['matriculacion_fecha_fin'],
        'carpeta_vista_alumno'       => $carpetaAlumno === '' ? null : $carpetaAlumno,
        'carpeta_vista_preceptoria'  => $carpetaPrecep === '' ? null : $carpetaPrecep,
        'anio_aspirantes'            => $anioAspirantes,
    ]));
}

requerirMetodo('GET');

try {
    responder([
        'ok'     => true,
        'datos'  => $modelo->obtenerTodo(),
        'turnos' => $modelo->turnos(),
    ]);
} catch (Throwable $e) {
    error_log('[Clementina Parámetros] ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al consultar los parámetros.']);
}

/* ====================================================================== */
/* Helpers de validación                                                   */
/* ====================================================================== */

/** Devuelve int, null si está vacío y $opcional, o false si es inválido. */
function filtroEntero($valor, int $min, int $max, bool $opcional = false)
{
    $texto = trim((string) ($valor ?? ''));
    if ($texto === '') {
        return $opcional ? null : false;
    }
    if (!preg_match('/^-?\d+$/', $texto)) {
        return false;
    }
    $numero = (int) $texto;
    if ($numero < $min || $numero > $max) {
        return false;
    }
    return $numero;
}

/** Devuelve fecha Y-m-d, null si está vacía, o false si es inválida. */
function filtroFecha($valor)
{
    $texto = trim((string) ($valor ?? ''));
    if ($texto === '') {
        return null;
    }

    $fecha = DateTime::createFromFormat('Y-m-d', $texto);
    if (!$fecha || $fecha->format('Y-m-d') !== $texto) {
        return false;
    }

    return $texto;
}
