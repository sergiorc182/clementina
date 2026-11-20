<?php
$db = $argv[1] ?? '';
$idAlumno = (int) ($argv[2] ?? 0);
$idCarrera = (int) ($argv[3] ?? 0);
$idMateria = (int) ($argv[4] ?? 0);
$idLlamado = (int) ($argv[5] ?? 0);

require_once __DIR__ . '/../../modelo/InscripcionFinal.php';

if (strpos($db, 'clementina_qa171821_') !== 0) {
    echo 'BASE_NO_SEGURA';
    exit(2);
}

$pdo = Conexion::getInstancia()->getConexion();
$pdo->exec('SET SESSION innodb_lock_wait_timeout = 3');

try {
    $modelo = new InscripcionFinal($idAlumno);
    $modelo->inscribir($idCarrera, $idMateria, $idLlamado);
    echo 'OK';
    exit(0);
} catch (Throwable $e) {
    echo get_class($e) . ': ' . $e->getMessage();
    exit(1);
}
