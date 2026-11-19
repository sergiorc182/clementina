<?php
require_once __DIR__ . '/_base.php';

$usuario = requerirDocenteOPreceptor();

responder([
    'ok'      => true,
    'usuario' => $usuario,
]);
