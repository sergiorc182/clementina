<?php
require_once __DIR__ . '/_base.php';

$usuario = requerirDocente();

responder([
    'ok'      => true,
    'usuario' => $usuario,
]);
