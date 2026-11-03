<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/modelo/InscripcionFinal.php';

function responder(array $datos): void
{
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['id_usuario'])
    || ($_SESSION['rol'] ?? '') !== 'preceptor'
    || ($_SESSION['tipo_usuario'] ?? '') !== 'personal') {
    responder(['ok' => false, 'mensaje' => 'Sesión no válida o sin permisos de preceptor.']);
}

$modelo = new InscripcionFinal();
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($metodo === 'GET') {
        $accion = (string) ($_GET['accion'] ?? 'alumnos');

        if ($accion === 'alumnos') {
            $buscar = trim((string) ($_GET['buscar'] ?? ''));
            $alumnos = $modelo->buscarAlumnos($buscar);

            responder([
                'ok' => true,
                'alumnos' => $alumnos,
                'total' => count($alumnos),
            ]);
        }

        if ($accion === 'alumno') {
            $idAlumno = (int) ($_GET['id_alumno'] ?? 0);
            if ($idAlumno <= 0) {
                responder(['ok' => false, 'mensaje' => 'Alumno inválido.']);
            }

            $alumno = $modelo->obtenerAlumno($idAlumno);
            if (!$alumno) {
                responder(['ok' => false, 'mensaje' => 'No se encontró el alumno.']);
            }

            responder([
                'ok' => true,
                'alumno' => $alumno,
                'inscripciones' => $modelo->obtenerInscripciones($idAlumno),
                'opciones' => $modelo->obtenerOpciones($idAlumno),
            ]);
        }

        responder(['ok' => false, 'mensaje' => 'Acción no reconocida.']);
    }

    if ($metodo === 'POST') {
        $cuerpo = json_decode(file_get_contents('php://input'), true);
        if (!is_array($cuerpo)) {
            $cuerpo = $_POST;
        }

        $accion = (string) ($cuerpo['accion'] ?? '');

        if ($accion === 'guardar') {
            $idInscripcion = (int) ($cuerpo['id_inscripcion'] ?? 0);
            responder($modelo->guardar($cuerpo, $idInscripcion > 0 ? $idInscripcion : null));
        }

        if ($accion === 'estado') {
            responder($modelo->cambiarEstado(
                (int) ($cuerpo['id_inscripcion'] ?? 0),
                (string) ($cuerpo['estado'] ?? '')
            ));
        }

        responder(['ok' => false, 'mensaje' => 'Acción no reconocida.']);
    }

    responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
} catch (Throwable $e) {
    error_log('preceptor_finales: ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al procesar la solicitud.']);
}
