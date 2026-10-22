<?php
<<<<<<< HEAD
session_start();
require_once '../modelo/Usuario.php';

header('Content-Type: application/json');

if (!isset($_SESSION['id_usuario'])) {
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

if (($_SESSION['tipo_usuario'] ?? '') !== 'alumno') {
    echo json_encode(['error' => 'Solo los alumnos tienen datos personales en este módulo.']);
    exit;
}

$usuarioModel = new Usuario();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $datos = [
        'primer_nombre' => trim($_POST['primer_nombre'] ?? ''),
        'otros_nombres' => trim($_POST['otros_nombres'] ?? ''),
        'primer_apellido' => trim($_POST['primer_apellido'] ?? ''),
        'otros_apellidos' => trim($_POST['otros_apellidos'] ?? ''),
        'email' => trim($_POST['email'] ?? ''),
        'telefono_principal' => trim($_POST['telefono_principal'] ?? ''),
        'fecha_nacimiento' => trim($_POST['fecha_nacimiento'] ?? ''),
        'sexo' => trim($_POST['sexo'] ?? ''),
        'estado_civil' => trim($_POST['estado_civil'] ?? ''),
        'id_pais_nacimiento' => trim($_POST['id_pais_nacimiento'] ?? ''),
        'id_localidad_nacimiento' => trim($_POST['id_localidad_nacimiento'] ?? ''),
        'lugar_nacimiento_extranjero' => trim($_POST['lugar_nacimiento_extranjero'] ?? ''),
        'cantidad_hijos' => intval($_POST['cantidad_hijos'] ?? 0),
        'cantidad_familiares_a_cargo' => intval($_POST['cantidad_familiares_a_cargo'] ?? 0)
    ];

    if ($datos['primer_nombre'] === '') {
        echo json_encode(['ok' => false, 'mensaje' => 'El primer nombre es obligatorio.']);
        exit;
    }

    if ($datos['primer_apellido'] === '') {
        echo json_encode(['ok' => false, 'mensaje' => 'El primer apellido es obligatorio.']);
        exit;
    }

    if ($datos['email'] === '' || !filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['ok' => false, 'mensaje' => 'El email no es válido.']);
        exit;
    }

    if ($datos['sexo'] !== '' && !in_array($datos['sexo'], ['M', 'F', 'X'], true)) {
        echo json_encode(['ok' => false, 'mensaje' => 'El sexo seleccionado no es válido.']);
        exit;
    }

    if ($datos['estado_civil'] !== '' && !in_array($datos['estado_civil'], ['S', 'C', 'D', 'V', 'U'], true)) {
        echo json_encode(['ok' => false, 'mensaje' => 'El estado civil seleccionado no es válido.']);
        exit;
    }

    if ($datos['fecha_nacimiento'] !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $datos['fecha_nacimiento'])) {
        echo json_encode(['ok' => false, 'mensaje' => 'La fecha de nacimiento no es válida.']);
        exit;
    }

    $resultado = $usuarioModel->actualizarDatosAlumno($_SESSION['id_usuario'], $datos);

    if ($resultado['ok']) {
        $_SESSION['nombre'] = trim($datos['primer_nombre'] . ' ' . $datos['otros_nombres']);
        $_SESSION['apellido'] = trim($datos['primer_apellido'] . ' ' . $datos['otros_apellidos']);
        $_SESSION['email'] = $datos['email'];
    }

    echo json_encode($resultado);
    exit;
}

$datos = $usuarioModel->obtenerDatosAlumno($_SESSION['id_usuario']);

if ($datos) {
    echo json_encode($datos);
} else {
    echo json_encode(['error' => 'Datos no encontrados']);
}
exit;
=======
/**
 * Controlador: Mis datos (alumno autenticado)
 *
 * Devuelve JSON con los datos personales del alumno logueado:
 * nombre, apellido, documento, legajo, email y teléfono.
 */

require_once __DIR__ . '/_base.php';
require_once dirname(__DIR__) . '/modelo/Alumno.php';

$usuario = requerirAlumno();

$datos = (new Alumno())->buscarPorId((int) $usuario['id']);

if ($datos === null) {
    responder(['ok' => false, 'mensaje' => 'No se encontraron datos.']);
}

responder(['ok' => true, 'datos' => $datos]);
>>>>>>> origin/InscripcionFinales
