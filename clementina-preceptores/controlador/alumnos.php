<?php
/**
 * Controlador: Búsqueda y listado de alumnos — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * GET sin parámetros  → lista paginada de alumnos
 * GET ?q=texto        → búsqueda por nombre, apellido o documento
 * GET ?id=N           → detalle de un alumno
 * POST accion=actualizar_datos → actualiza legajo, contacto y domicilio
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../modelo/AlumnoAdmin.php';

requerirPersonalAdmin();

$modelo = new AlumnoAdmin();

// Actualización de datos administrativos y de contacto
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = trim((string) ($_POST['accion'] ?? ''));
    if ($accion !== 'actualizar_datos') {
        responder(['ok' => false, 'mensaje' => 'Acción no válida.']);
    }

    $idAlumno = (int) ($_POST['id_alumno'] ?? 0);
    if ($idAlumno <= 0) {
        responder(['ok' => false, 'mensaje' => 'Alumno no válido.']);
    }

    $legajo    = trim((string) ($_POST['legajo'] ?? ''));
    $email     = trim((string) ($_POST['email'] ?? ''));
    $telefono  = trim((string) ($_POST['telefono_principal'] ?? ''));
    $calle     = trim((string) ($_POST['calle'] ?? ''));
    $numeroTxt = trim((string) ($_POST['numero'] ?? ''));
    $piso      = trim((string) ($_POST['piso'] ?? ''));
    $depto     = trim((string) ($_POST['depto'] ?? ''));

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        responder(['ok' => false, 'mensaje' => 'Ingresá un email válido.']);
    }
    if (mb_strlen($email) > 255) {
        responder(['ok' => false, 'mensaje' => 'El email supera el largo máximo permitido.']);
    }
    if (mb_strlen($legajo) > 45) {
        responder(['ok' => false, 'mensaje' => 'El legajo supera el largo máximo permitido.']);
    }
    if (mb_strlen($calle) > 45) {
        responder(['ok' => false, 'mensaje' => 'La calle supera el largo máximo permitido.']);
    }
    if (mb_strlen($piso) > 3 || mb_strlen($depto) > 3) {
        responder(['ok' => false, 'mensaje' => 'Piso y depto admiten hasta 3 caracteres.']);
    }
    if ($telefono !== '' && (mb_strlen($telefono) > 45 || !preg_match('/^[0-9+()\s.\-]+$/', $telefono))) {
        responder(['ok' => false, 'mensaje' => 'El teléfono contiene caracteres no válidos.']);
    }

    $numero = null;
    if ($numeroTxt !== '') {
        if (!ctype_digit($numeroTxt) || (int) $numeroTxt > 999999) {
            responder(['ok' => false, 'mensaje' => 'El número de domicilio debe ser numérico.']);
        }
        $numero = (int) $numeroTxt;
    }

    responder($modelo->actualizarDatos($idAlumno, [
        'legajo'             => $legajo === '' ? null : $legajo,
        'email'              => $email,
        'telefono_principal' => $telefono === '' ? null : $telefono,
        'calle'              => $calle === '' ? null : $calle,
        'numero'             => $numero,
        'piso'               => $piso === '' ? null : $piso,
        'depto'              => $depto === '' ? null : $depto,
    ]));
}

requerirMetodo('GET');

// Detalle de un alumno puntual
if (isset($_GET['id']) && (int)$_GET['id'] > 0) {
    $alumno = $modelo->obtenerPorId((int)$_GET['id']);
    if (!$alumno) {
        responder(['ok' => false, 'mensaje' => 'Alumno no encontrado.']);
    }
    responder(['ok' => true, 'alumno' => $alumno]);
}

// Búsqueda por DNI (acceso directo para historial)
if (isset($_GET['dni']) && (int)$_GET['dni'] > 0) {
    $alumno = $modelo->obtenerPorDocumento((int)$_GET['dni']);
    if (!$alumno) {
        responder(['ok' => false, 'mensaje' => 'No se encontró un alumno con ese DNI.']);
    }
    responder(['ok' => true, 'alumno' => $alumno]);
}

// Listado con búsqueda y paginación
$busqueda = trim($_GET['q'] ?? '');
$pagina   = max(1, (int)($_GET['pagina'] ?? 1));
$porPagina = 20;

try {
    $resultado = $modelo->listar($busqueda, $pagina, $porPagina);
    responder([
        'ok'      => true,
        'alumnos' => $resultado['alumnos'],
        'total'   => $resultado['total'],
        'pagina'  => $pagina,
        'paginas' => $resultado['paginas'],
    ]);
} catch (Throwable $e) {
    error_log('[Clementina Alumnos] ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al consultar el listado de alumnos.']);
}
