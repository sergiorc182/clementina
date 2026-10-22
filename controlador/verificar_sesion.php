<?php
session_start();
header('Content-Type: application/json');

if (isset($_SESSION['id_usuario'])) {
    echo json_encode([
        'ok' => true,
        'usuario' => [
            'id_usuario' => $_SESSION['id_usuario'],
            'tipo' => $_SESSION['tipo_usuario'] ?? 'alumno',
            'rol' => $_SESSION['rol'] ?? 'alumno',
            'usuario' => $_SESSION['usuario'] ?? null,
            'nombre' => $_SESSION['nombre'] ?? '',
            'apellido' => $_SESSION['apellido'] ?? '',
            'email' => $_SESSION['email'] ?? null,
            'dni' => $_SESSION['dni'] ?? null,
            'legajo' => $_SESSION['legajo'] ?? null
        ]
    ]);
} else {
    echo json_encode(['ok' => false, 'autenticado' => false]);
}
exit;