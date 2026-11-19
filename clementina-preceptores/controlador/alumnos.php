<?php
/**
 * Controlador: Búsqueda y listado de alumnos — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * GET sin parámetros  → lista paginada de alumnos
 * GET ?q=texto        → búsqueda por nombre, apellido o documento
 * GET ?id=N           → detalle de un alumno
 * GET ?tipos=1        → tipos de documento para el alta
 * POST accion=crear_alumno     → alta de alumno
 * POST accion=actualizar_datos → actualiza legajo, contacto y domicilio
 * POST accion=eliminar_alumno  → baja de alumno sin datos asociados
 */

require_once __DIR__ . '/../../controlador/_base.php';
require_once __DIR__ . '/../modelo/AlumnoAdmin.php';

requerirPersonalAdmin();

$modelo = new AlumnoAdmin();

// Actualización de datos administrativos y de contacto
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requerirCsrf();
    $accion = trim((string) ($_POST['accion'] ?? ''));

    if ($accion === 'crear_alumno') {
        $idTipo        = trim((string) ($_POST['id_tipo_documento'] ?? ''));
        $numeroTxt     = trim((string) ($_POST['numero_documento'] ?? ''));
        $legajo        = trim((string) ($_POST['legajo'] ?? ''));
        $primerApellido = trim((string) ($_POST['primer_apellido'] ?? ''));
        $otrosApellidos = trim((string) ($_POST['otros_apellidos'] ?? ''));
        $primerNombre  = trim((string) ($_POST['primer_nombre'] ?? ''));
        $otrosNombres  = trim((string) ($_POST['otros_nombres'] ?? ''));
        $email         = trim((string) ($_POST['email'] ?? ''));
        $fechaNac      = trim((string) ($_POST['fecha_nacimiento'] ?? ''));
        $sexo          = strtoupper(trim((string) ($_POST['sexo'] ?? '')));
        $telefono      = trim((string) ($_POST['telefono_principal'] ?? ''));
        $calle         = trim((string) ($_POST['calle'] ?? ''));
        $numeroTxtDom  = trim((string) ($_POST['numero'] ?? ''));
        $piso          = trim((string) ($_POST['piso'] ?? ''));
        $depto         = trim((string) ($_POST['depto'] ?? ''));

        $tiposValidos = array_column($modelo->tiposDocumento(), 'id_tipo_documento');
        if (!in_array($idTipo, $tiposValidos, true)) {
            responder(['ok' => false, 'mensaje' => 'Seleccioná un tipo de documento válido.']);
        }
        if ($numeroTxt === '' || !ctype_digit($numeroTxt) || (int) $numeroTxt <= 0 || (int) $numeroTxt > 99999999) {
            responder(['ok' => false, 'mensaje' => 'Ingresá un número de documento válido.']);
        }
        if ($primerApellido === '' || mb_strlen($primerApellido) > 40) {
            responder(['ok' => false, 'mensaje' => 'El primer apellido es obligatorio (máx. 40 caracteres).']);
        }
        if ($primerNombre === '' || mb_strlen($primerNombre) > 40) {
            responder(['ok' => false, 'mensaje' => 'El primer nombre es obligatorio (máx. 40 caracteres).']);
        }
        if (mb_strlen($otrosApellidos) > 40 || mb_strlen($otrosNombres) > 40) {
            responder(['ok' => false, 'mensaje' => 'Otros apellidos/nombres admiten hasta 40 caracteres.']);
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) {
            responder(['ok' => false, 'mensaje' => 'Ingresá un email válido.']);
        }
        if (mb_strlen($legajo) > 45) {
            responder(['ok' => false, 'mensaje' => 'El legajo supera el largo máximo permitido.']);
        }
        if ($fechaNac !== '') {
            $fecha = DateTime::createFromFormat('Y-m-d', $fechaNac);
            if (!$fecha || $fecha->format('Y-m-d') !== $fechaNac || $fecha > new DateTime('today')) {
                responder(['ok' => false, 'mensaje' => 'La fecha de nacimiento no es válida.']);
            }
        }
        if ($sexo !== '' && !in_array($sexo, ['F', 'M', 'X'], true)) {
            responder(['ok' => false, 'mensaje' => 'El sexo seleccionado no es válido.']);
        }
        if ($telefono !== '' && (mb_strlen($telefono) > 45 || !preg_match('/^[0-9+()\s.\-]+$/', $telefono))) {
            responder(['ok' => false, 'mensaje' => 'El teléfono contiene caracteres no válidos.']);
        }
        if (mb_strlen($calle) > 45 || mb_strlen($piso) > 3 || mb_strlen($depto) > 3) {
            responder(['ok' => false, 'mensaje' => 'Revisá el largo de calle, piso y depto.']);
        }

        $numeroDomicilio = null;
        if ($numeroTxtDom !== '') {
            if (!ctype_digit($numeroTxtDom) || (int) $numeroTxtDom > 999999) {
                responder(['ok' => false, 'mensaje' => 'El número de domicilio debe ser numérico.']);
            }
            $numeroDomicilio = (int) $numeroTxtDom;
        }

        responder($modelo->crear([
            'id_tipo_documento' => $idTipo,
            'numero_documento'  => (int) $numeroTxt,
            'legajo'            => $legajo === '' ? null : $legajo,
            'primer_apellido'   => $primerApellido,
            'otros_apellidos'   => $otrosApellidos === '' ? null : $otrosApellidos,
            'primer_nombre'     => $primerNombre,
            'otros_nombres'     => $otrosNombres === '' ? null : $otrosNombres,
            'email'             => $email,
            'fecha_nacimiento'  => $fechaNac === '' ? null : $fechaNac,
            'sexo'              => $sexo === '' ? null : $sexo,
            'telefono_principal' => $telefono === '' ? null : $telefono,
            'calle'             => $calle === '' ? null : $calle,
            'numero'            => $numeroDomicilio,
            'piso'              => $piso === '' ? null : $piso,
            'depto'             => $depto === '' ? null : $depto,
        ]));
    }

    if ($accion === 'eliminar_alumno') {
        $idAlumno = (int) ($_POST['id_alumno'] ?? 0);
        if ($idAlumno <= 0) {
            responder(['ok' => false, 'mensaje' => 'Alumno no válido.']);
        }
        responder($modelo->eliminar($idAlumno));
    }

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

// Tipos de documento para el alta
if (isset($_GET['tipos']) && (string) $_GET['tipos'] === '1') {
    responder(['ok' => true, 'tipos' => $modelo->tiposDocumento()]);
}

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
