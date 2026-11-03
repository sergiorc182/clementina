<?php
/**
 * Controlador: Validación de cursadas (panel de preceptores).
 *
 * GET  accion=alumnos   -> búsqueda / cola de alumnos con cursadas pendientes
 * GET  accion=materias  -> alumno + materias cargadas
 * POST accion=validar   -> marca una cursada como aprobada o no aprobada
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/modelo/Cursada.php';

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

$modelo = new Cursada();
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($metodo === 'GET') {
        $accion = (string) ($_GET['accion'] ?? 'alumnos');

        if ($accion === 'alumnos') {
            $buscar = trim((string) ($_GET['buscar'] ?? ''));
            $alumnos = $modelo->buscarAlumnos($buscar, $buscar === '');

            responder([
                'ok' => true,
                'alumnos' => $alumnos,
                'total' => count($alumnos),
            ]);
        }

        if ($accion === 'materias') {
            $idAlumno = (int) ($_GET['id_alumno'] ?? 0);
            if ($idAlumno <= 0) {
                responder(['ok' => false, 'mensaje' => 'Alumno inválido.']);
            }

            $alumno = $modelo->obtenerAlumno($idAlumno);
            if (!$alumno) {
                responder(['ok' => false, 'mensaje' => 'No se encontró el alumno.']);
            }

            $materias = $modelo->obtenerMaterias($idAlumno);
            $resumen = [
                'pendientes' => 0,
                'aprobadas' => 0,
                'no_aprobadas' => 0,
                'final_aprobadas' => 0,
                'total' => count($materias),
            ];

            foreach ($materias as $materia) {
                if ($materia['estado'] === 'aprobada') {
                    $resumen['aprobadas']++;
                } elseif ($materia['estado'] === 'no_aprobada') {
                    $resumen['no_aprobadas']++;
                } elseif ($materia['estado'] === 'final_aprobada') {
                    $resumen['final_aprobadas']++;
                } else {
                    $resumen['pendientes']++;
                }
            }

            responder([
                'ok' => true,
                'alumno' => $alumno,
                'materias' => $materias,
                'resumen' => $resumen,
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

        if ($accion === 'validar') {
            $resultado = $modelo->validar(
                (int) ($cuerpo['id_alumno'] ?? 0),
                (int) ($cuerpo['id_carrera'] ?? 0),
                (int) ($cuerpo['id_materia'] ?? 0),
                (string) ($cuerpo['estado'] ?? '')
            );

            responder($resultado);
        }

        responder(['ok' => false, 'mensaje' => 'Acción no reconocida.']);
    }

    responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
} catch (Throwable $e) {
    error_log('preceptor_cursadas: ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al procesar la solicitud.']);
}
