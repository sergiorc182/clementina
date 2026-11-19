<?php
/**
 * Controlador: Inscripción a Carreras
 * ISFT N.º 182 "Clementina"
 *
 * Endpoints para consultar períodos, oferta de carreras, sedes, turnos
 * y registrar la matrícula del alumno en el ciclo lectivo correspondiente.
 */

require_once __DIR__ . '/_sesion.php';
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/modelo/InscripcionCarrera.php';

function responder(array $datos): void
{
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// 1. Verificación de sesión activa de alumno
if (empty($_SESSION['id_usuario'])) {
    responder(['ok' => false, 'mensaje' => 'Sesión no válida o expirada. Por favor, iniciá sesión nuevamente.']);
}

if (($_SESSION['rol'] ?? '') !== 'alumno') {
    responder(['ok' => false, 'mensaje' => 'Solo los alumnos registrados pueden acceder a la inscripción a carreras.']);
}

$idAlumno = (int) $_SESSION['id_usuario'];
$modelo = new InscripcionCarrera();

$metodo = $_SERVER['REQUEST_METHOD'];

// 2. Manejo de consultas GET
if ($metodo === 'GET') {
    $accion = $_GET['accion'] ?? 'estado';

    try {
        if ($accion === 'estado') {
            $parametros = $modelo->obtenerParametrosInscripcion();
            $carreras   = $modelo->obtenerCarrerasParaInscripcion($idAlumno);

            $nombreCompleto = trim(($_SESSION['nombre'] ?? '') . ' ' . ($_SESSION['apellido'] ?? ''));
            $documento = isset($_SESSION['dni']) && $_SESSION['dni'] !== null
                ? (int) $_SESSION['dni']
                : (int) ($_SESSION['usuario'] ?? 0);

            responder([
                'ok'         => true,
                'parametros' => $parametros,
                'alumno'     => [
                    'dni'             => $documento,
                    'nombre_completo' => $nombreCompleto,
                    'email'           => $_SESSION['email'] ?? '',
                ],
                'carreras'   => $carreras,
            ]);
        }

        if ($accion === 'sedes_turnos') {
            $idCarrera = (int) ($_GET['carrera'] ?? 0);
            if ($idCarrera <= 0) {
                responder(['ok' => false, 'mensaje' => 'Identificador de carrera inválido.']);
            }

            $oferta = $modelo->obtenerSedesYTurnos($idCarrera);
            responder([
                'ok'     => true,
                'sedes'  => $oferta['sedes'],
                'turnos' => $oferta['turnos'],
            ]);
        }

        if ($accion === 'comprobante') {
            $idCarrera = (int) ($_GET['carrera'] ?? 0);
            if ($idCarrera <= 0) {
                responder(['ok' => false, 'mensaje' => 'Identificador de carrera inválido.']);
            }

            $detalle = $modelo->obtenerDetalleComprobante($idAlumno, $idCarrera);
            if (!$detalle) {
                responder(['ok' => false, 'mensaje' => 'No se encontró la inscripción para esta carrera.']);
            }

            responder([
                'ok'      => true,
                'detalle' => $detalle,
            ]);
        }

        responder(['ok' => false, 'mensaje' => 'Acción no reconocida.']);
    } catch (Throwable $e) {
        error_log('[InscripcionCarreras GET] ' . $e->getMessage());
        responder(['ok' => false, 'mensaje' => 'No se pudieron cargar los datos. Intentá nuevamente.']);
    }
}

// 3. Manejo de registro POST
if ($metodo === 'POST') {
    $tokenCsrf = (string) ($_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!csrfTokenValido($tokenCsrf)) {
        http_response_code(403);
        responder(['ok' => false, 'mensaje' => 'Token de seguridad inválido. Recargá la página e intentá nuevamente.']);
    }

    $idCarrera = (int) ($_POST['idcarrera'] ?? 0);
    $idSede    = (int) ($_POST['idsede'] ?? 0);
    $idTurno   = (int) ($_POST['idturno'] ?? 0);

    if ($idCarrera <= 0 || $idSede <= 0 || $idTurno <= 0) {
        responder(['ok' => false, 'mensaje' => 'Por favor, completá la carrera, sede y turno para continuar.']);
    }

    try {
        $resultado = $modelo->registrarInscripcion($idAlumno, $idCarrera, $idSede, $idTurno);

        responder([
            'ok'      => true,
            'mensaje' => '¡Inscripción registrada con éxito!',
            'datos'   => $resultado,
        ]);
    } catch (RuntimeException $e) {
        responder(['ok' => false, 'mensaje' => $e->getMessage()]);
    } catch (Throwable $e) {
        error_log('[InscripcionCarreras POST] ' . $e->getMessage());
        responder([
            'ok'      => false,
            'mensaje' => 'No se pudo completar la inscripción. Intentá nuevamente.',
        ]);
    }
}

responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
