<?php
/**
 * Controlador: Inscripción a finales (alumno autenticado)
 *
 * GET   Devuelve el período de mesas, las materias que el alumno puede
 *       rendir, sus inscripciones del período y sus datos personales.
 * POST  `accion` = inscribir | cancelar, con `id_carrera`, `id_materia`
 *       y, para inscribir, `id_llamado`.
 *
 * Siempre responde JSON. Las reglas viven en modelo/InscripcionFinal.php.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/InscripcionFinal.php';
require_once dirname(__DIR__) . '/modelo/Alumno.php';

$usuario = requerirAlumno();

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'], true)) {
    responder(['ok' => false, 'mensaje' => 'Método no permitido.']);
}

try {
    // El alumno se identifica por su id interno, que viene de la sesión.
    $finales = new InscripcionFinal((int) $usuario['id']);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $accion    = (string) ($_POST['accion'] ?? '');
        $idCarrera = (int) ($_POST['id_carrera'] ?? 0);
        $idMateria = (int) ($_POST['id_materia'] ?? 0);

        if ($accion !== 'inscribir' && $accion !== 'cancelar') {
            responder(['ok' => false, 'mensaje' => 'Acción no válida.']);
        }

        if ($idCarrera <= 0 || $idMateria <= 0) {
            responder(['ok' => false, 'mensaje' => 'Faltan datos de la materia.']);
        }

        if ($accion === 'inscribir') {
            $finales->inscribir($idCarrera, $idMateria, (int) ($_POST['id_llamado'] ?? 0));
            responder(['ok' => true, 'mensaje' => 'Inscripción registrada.']);
        }

        $finales->cancelar($idCarrera, $idMateria);
        responder(['ok' => true, 'mensaje' => 'Inscripción cancelada.']);
    }

    $periodo = (($_GET['vista'] ?? '') === 'mis')
        ? $finales->periodoMisFinales()
        : $finales->periodo();

    responder([
        'ok'            => true,
        'periodo'       => $periodo,
        'llamados'      => InscripcionFinal::LLAMADOS,
        'materias'      => $finales->materias($periodo),
        'inscripciones' => $periodo ? $finales->inscripciones($periodo) : [],
        // Datos personales para la tabla y el comprobante de "Mis finales"
        'alumno'        => (new Alumno())->buscarPorId((int) $usuario['id']),
    ]);
} catch (DomainException $e) {
    responder(['ok' => false, 'mensaje' => $e->getMessage()]);
} catch (PDOException $e) {
    error_log('inscripcion_finales: ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al consultar la base de datos.']);
} catch (Throwable $e) {
    error_log('inscripcion_finales: ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Ocurrió un error inesperado. Intentá de nuevo.']);
}
