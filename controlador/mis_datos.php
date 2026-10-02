<?php
/**
 * Controlador: Mis datos (alumno autenticado)
 *
 * Devuelve JSON con los datos personales del alumno logueado:
 * nombre, apellido, DNI, email y teléfono.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Alumno.php';

$usuario = requerirAlumno();

$datos = (new Alumno())->buscarPorDocumento((int) $usuario['id']);

if ($datos === null) {
    responder(['ok' => false, 'mensaje' => 'No se encontraron datos.']);
}

responder(['ok' => true, 'datos' => $datos]);
