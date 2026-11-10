<?php
/**
 * Controlador: próximos finales del alumno autenticado.
 *
 * Lo usa el inicio para el calendario de finales. Devuelve los
 * períodos de mesas en los que el alumno tiene inscripciones
 * activas y cuya fecha de cierre todavía no pasó, cada uno con
 * sus materias inscriptas.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/InscripcionFinal.php';

requerirMetodo('GET');

$usuario = requerirAlumno();

try {
    $finales = new InscripcionFinal((int) $usuario['id']);
    responder($finales->periodosInscriptos());
} catch (PDOException $e) {
    error_log('get_proximos_finales: ' . $e->getMessage());
    responder(['ok' => false, 'mensaje' => 'No se pudieron cargar las mesas.']);
}
