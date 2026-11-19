<?php
require_once __DIR__ . '/_base.php';

requerirMetodo('GET');
$usuario = requerirDocenteOPreceptor();

responder([
    'ok'   => true,
    'data' => [
        'docente' => $usuario['nombre_completo'] ?: (($usuario['nombre'] ?? '') . ' ' . ($usuario['apellido'] ?? '')),
    ],
]);
