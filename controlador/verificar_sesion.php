<?php
/**
 * Controlador: Verificar sesión
 *
 * Devuelve JSON con los datos del usuario logueado o { ok: false }.
 * Lo usan las vistas para proteger las páginas del menú.
 */

require_once __DIR__ . '/_base.php';

responder([
    'ok'      => true,
    'usuario' => requerirSesion(),
]);
