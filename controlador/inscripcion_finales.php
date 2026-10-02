<?php
/**
 * Controlador: Inscripción a finales (alumno autenticado)
 *
 * GET   Devuelve el período de mesas, las materias que el alumno puede
 *       rendir y sus inscripciones del período.
 * POST  `accion` = inscribir | cancelar, con `id_carrera`, `id_materia`
 *       y, para inscribir, `id_llamado`.
 *
 * Siempre responde JSON. Las reglas viven en modelo/InscripcionFinal.php.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Alumno.php';
require_once dirname(__DIR__) . '/modelo/InscripcionFinal.php';

$usuario = requerirAlumno();

try {
    $alumno = (new Alumno())->buscarPorDocumento((int) $usuario['id']);
    if ($alumno === null) {
        responder(['ok' => false, 'mensaje' => 'No se encontraron tus datos de alumno.']);
    }

    $finales = new InscripcionFinal(
        (string) $alumno['tipo_documento'],
        (int) $alumno['numero_documento']
    );

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $accion    = (string) ($_POST['accion'] ?? '');
        $idCarrera = (int) ($_POST['id_carrera'] ?? 0);
        $idMateria = (int) ($_POST['id_materia'] ?? 0);

        if ($accion === 'inscribir') {
            $finales->inscribir($idCarrera, $idMateria, (int) ($_POST['id_llamado'] ?? 0));
            responder(['ok' => true, 'mensaje' => 'Inscripción registrada.']);
        }

        if ($accion === 'cancelar') {
            $finales->cancelar($idCarrera, $idMateria);
            responder(['ok' => true, 'mensaje' => 'Inscripción cancelada.']);
        }

        responder(['ok' => false, 'mensaje' => 'Acción no válida.']);
    }

    $periodo = $finales->periodo();

    responder([
        'ok'            => true,
        'periodo'       => $periodo,
        'llamados'      => InscripcionFinal::LLAMADOS,
        'materias'      => $finales->materias($periodo),
        'inscripciones' => $periodo ? $finales->inscripciones($periodo) : [],
    ]);
} catch (DomainException $e) {
    responder(['ok' => false, 'mensaje' => $e->getMessage()]);
} catch (PDOException $e) {
    error_log('inscripcion_finales: ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'Error al consultar la base de datos.']);
}
