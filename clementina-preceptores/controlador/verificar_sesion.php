<?php
/**
 * Controlador: Verificar sesión — Panel de preceptores.
 * Devuelve JSON con el usuario autenticado si es personal institucional.
 * Las vistas del panel llaman a este endpoint para proteger el acceso.
 */

require_once __DIR__ . '/../../controlador/_base.php';

if (empty($_SESSION['id_usuario'])) {
    responder(['ok' => false, 'autenticado' => false]);
}

if (($_SESSION['tipo_usuario'] ?? '') !== 'personal') {
    responder(['ok' => false, 'autenticado' => false, 'mensaje' => 'Acceso denegado.']);
}

responder([
    'ok'      => true,
    'usuario' => [
        'id_usuario' => $_SESSION['id_usuario'],
        'tipo'       => $_SESSION['tipo_usuario'] ?? 'personal',
        'rol'        => $_SESSION['rol'] ?? 'personal',
        'usuario'    => $_SESSION['usuario'] ?? null,
        'nombre'     => $_SESSION['nombre'] ?? '',
        'apellido'   => $_SESSION['apellido'] ?? '',
        'email'      => $_SESSION['email'] ?? null,
    ],
]);
