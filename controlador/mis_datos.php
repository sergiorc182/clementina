<?php
require_once __DIR__ . '/_base.php';
require_once '../modelo/Usuario.php';

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
    requerirCsrf();

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
        'id_provincia' => !empty($_POST['id_provincia']) ? intval($_POST['id_provincia']) : null,
        'id_localidad_nacimiento' => !empty($_POST['id_localidad_nacimiento']) ? intval($_POST['id_localidad_nacimiento']) : null,
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

    $uActualizado = [
        'id'       => $_SESSION['id_usuario'],
        'tipo'     => $_SESSION['tipo_usuario'],
        'rol'      => $_SESSION['rol'],
        'nombre'   => trim($datos['primer_nombre'] . ' ' . $datos['otros_nombres']),
        'apellido' => trim($datos['primer_apellido'] . ' ' . $datos['otros_apellidos']),
        'dni'      => $_SESSION['dni'] ?? '',
        'legajo'   => $_SESSION['legajo'] ?? null,
        'email'    => $datos['email'],
    ];

    $bloqueo = clementinaAdquirirBloqueoRotacion();
    if ($bloqueo === null) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'mensaje' => 'No se pudo completar la renovación de la sesión.']);
        exit;
    }

    $codigoRespuesta = 200;
    $respuesta = ['ok' => false, 'mensaje' => 'No se pudo completar la renovación de la sesión.'];

    try {
        $tokenActual = clementinaLeerToken((string) ($_COOKIE[CLEMENTINA_AUTH_COOKIE] ?? ''));
        if ($tokenActual === null) {
            $codigoRespuesta = 401;
            $respuesta = ['ok' => false, 'mensaje' => 'La sesión guardada no es válida. Volvé a ingresar.'];
        } else {
            $credencialNueva = null;
            try {
                $credencialNueva = clementinaCrearTokenAutenticacion($uActualizado);
            } catch (Throwable $e) {
                error_log('mis_datos: fallo al generar la credencial renovada.');
                $codigoRespuesta = 500;
                $respuesta = ['ok' => false, 'mensaje' => 'No se pudo completar la renovación de la sesión.'];
            }

            if ($credencialNueva !== null) {
                $resultado = $usuarioModel->actualizarDatosAlumno($_SESSION['id_usuario'], $datos);
                $respuesta = $resultado;

                if ($resultado['ok']) {
                    clementinaRevocarJti($tokenActual['jti'], (int) $tokenActual['exp']);
                    if (!clementinaTokenRevocado($tokenActual['jti'])) {
                        $codigoRespuesta = 500;
                        $respuesta = ['ok' => false, 'mensaje' => 'No se pudo revocar la credencial anterior.'];
                    } elseif (!establecerCookieAutenticacion($uActualizado, $credencialNueva)) {
                        $codigoRespuesta = 500;
                        $respuesta = ['ok' => false, 'mensaje' => 'No se pudo completar la renovación de la sesión.'];
                    } else {
                        $_SESSION['nombre'] = $uActualizado['nombre'];
                        $_SESSION['apellido'] = $uActualizado['apellido'];
                        $_SESSION['email'] = $uActualizado['email'];
                    }
                }
            }
        }
    } catch (Throwable $e) {
        error_log('mis_datos: fallo inesperado durante la renovación.');
        $codigoRespuesta = 500;
        $respuesta = ['ok' => false, 'mensaje' => 'No se pudo completar la renovación de la sesión.'];
    } finally {
        clementinaLiberarBloqueoRotacion($bloqueo);
    }

    http_response_code($codigoRespuesta);
    echo json_encode($respuesta);
    exit;
}

$datos = $usuarioModel->obtenerDatosAlumno($_SESSION['id_usuario']);

if ($datos) {
    echo json_encode($datos);
} else {
    echo json_encode(['error' => 'Datos no encontrados']);
}
exit;