<?php
$raiz = dirname(__DIR__, 2);
$php = PHP_BINARY;
$mysql = getenv('CLEMENTINA_MYSQL') ?: 'C:\\xampp\\mysql\\bin\\mysql.exe';
$baseTemporal = getenv('CLEMENTINA_TEST_TMP') ?: sys_get_temp_dir();
$sufijo = date('YmdHis') . '_' . getmypid();
$dir = rtrim($baseTemporal, '\\/') . DIRECTORY_SEPARATOR . 'qa017_qa018_qa021_' . $sufijo;
$db = 'clementina_qa171821_' . $sufijo;
$fallos = 0;
$total = 0;
$pdo = null;
$codigoSalida = 1;

function verificar(bool $condicion, string $nombre, string $detalle = ''): void
{
    global $fallos, $total;
    $total++;
    if ($condicion) {
        echo "[OK]   $nombre\n";
        return;
    }
    $fallos++;
    echo "[FAIL] $nombre" . ($detalle !== '' ? " :: $detalle" : '') . "\n";
}

function ejecutar(string $comando, ?string $archivoEntrada = null, ?string $cwd = null): array
{
    $descriptores = [
        0 => $archivoEntrada === null ? ['pipe', 'r'] : ['file', $archivoEntrada, 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $proceso = proc_open($comando, $descriptores, $pipes, $cwd);
    if (!is_resource($proceso)) {
        return ['codigo' => -1, 'salida' => '', 'error' => 'No se pudo iniciar el proceso.'];
    }
    if ($archivoEntrada === null) {
        fclose($pipes[0]);
    }
    $salida = stream_get_contents($pipes[1]);
    $error = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $codigo = proc_close($proceso);
    return ['codigo' => $codigo, 'salida' => (string) $salida, 'error' => (string) $error];
}

function copiarArbol(string $origen, string $destino): void
{
    if (!is_dir($destino) && !mkdir($destino, 0777, true)) {
        throw new RuntimeException('No se pudo crear el directorio temporal.');
    }
    $omitir = ['.git', 'node_modules', 'backups', 'documentos'];
    $iterador = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($origen, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($iterador as $entrada) {
        $relativo = substr($entrada->getPathname(), strlen($origen) + 1);
        $partes = explode(DIRECTORY_SEPARATOR, str_replace('/', DIRECTORY_SEPARATOR, $relativo));
        if (in_array($partes[0], $omitir, true)) {
            continue;
        }
        $destinoActual = $destino . DIRECTORY_SEPARATOR . $relativo;
        $padre = dirname($destinoActual);
        if ($entrada->isDir()) {
            if (!is_dir($destinoActual) && !mkdir($destinoActual, 0777, true)) {
                throw new RuntimeException('No se pudo crear un subdirectorio temporal.');
            }
            continue;
        }
        if (!is_dir($padre) && !mkdir($padre, 0777, true)) {
            throw new RuntimeException('No se pudo crear el directorio padre temporal.');
        }
        copy($entrada->getPathname(), $destinoActual);
    }
}

function eliminarArbol(string $ruta): void
{
    if (!is_dir($ruta)) {
        return;
    }
    $iterador = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($ruta, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($iterador as $entrada) {
        $rutaEntrada = $entrada->getPathname();
        if ($entrada->isDir()) {
            rmdir($rutaEntrada);
        } else {
            unlink($rutaEntrada);
        }
    }
    rmdir($ruta);
}

function valorDb(PDO $pdo, string $sql, array $params = []): mixed
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchColumn();
}

function esperarExcepcion(callable $accion, string $fragmento): bool
{
    try {
        $accion();
        return false;
    } catch (Throwable $e) {
        return strpos($e->getMessage(), $fragmento) !== false;
    }
}

if (($argv[1] ?? '') === '--lock-tope') {
    $dbBloqueo = (string) ($argv[2] ?? '');
    $valorTope = (string) ($argv[3] ?? '0');
    $segundos = (float) ($argv[4] ?? 2);
    $marcaBloqueo = (string) ($argv[5] ?? '');
    if (strpos($dbBloqueo, 'clementina_qa171821_') !== 0) {
        echo 'BASE_NO_SEGURA';
        exit(2);
    }
    $pdoBloqueo = new PDO('mysql:host=localhost;dbname=' . $dbBloqueo . ';charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    try {
        $pdoBloqueo->beginTransaction();
        $bloqueo = $pdoBloqueo->prepare('SELECT tope_mesas FROM parametros_mesas WHERE id_registro = 1 FOR UPDATE');
        $bloqueo->execute();
        if (!$bloqueo->fetch()) {
            $pdoBloqueo->rollBack();
            echo 'SIN_FILA';
            exit(1);
        }
        if ($marcaBloqueo !== '' && file_put_contents($marcaBloqueo, 'LOCKED') === false) {
            $pdoBloqueo->rollBack();
            echo 'SIN_MARCA';
            exit(1);
        }
        usleep((int) round($segundos * 1000000));
        $nuevoTope = $valorTope === 'NULL' ? null : (int) $valorTope;
        $actualizar = $pdoBloqueo->prepare('UPDATE parametros_mesas SET tope_mesas = :tope WHERE id_registro = 1');
        $actualizar->bindValue(':tope', $nuevoTope, $nuevoTope === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $actualizar->execute();
        $pdoBloqueo->commit();
        echo 'LOCK_OK';
        exit(0);
    } catch (Throwable $e) {
        if ($pdoBloqueo->inTransaction()) {
            $pdoBloqueo->rollBack();
        }
        echo 'LOCK_ERR: ' . $e->getMessage();
        exit(1);
    }
}

function lanzarTrabajadores(string $php, string $dir, string $db, array $trabajos): array
{
    $procesos = [];
    foreach ($trabajos as $indice => $trabajo) {
        $comando = escapeshellarg($php)
            . ' ' . escapeshellarg($dir . DIRECTORY_SEPARATOR . 'tests' . DIRECTORY_SEPARATOR
                . 'qa017_qa018_qa021' . DIRECTORY_SEPARATOR . 'worker.php')
            . ' ' . escapeshellarg($db)
            . ' ' . escapeshellarg((string) $trabajo['alumno'])
            . ' ' . escapeshellarg((string) $trabajo['carrera'])
            . ' ' . escapeshellarg((string) $trabajo['materia'])
            . ' ' . escapeshellarg((string) $trabajo['llamado']);
        $descriptores = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $proceso = proc_open($comando, $descriptores, $pipes, $dir);
        if (!is_resource($proceso)) {
            $procesos[$indice] = ['estado' => -1, 'salida' => '', 'error' => 'No se pudo iniciar.'];
            continue;
        }
        fclose($pipes[0]);
        $procesos[$indice] = [
            'proceso' => $proceso,
            'salidaPipe' => $pipes[1],
            'errorPipe' => $pipes[2],
            'inicio' => microtime(true),
        ];
    }

    $resultados = [];
    while (count($resultados) < count($procesos)) {
        foreach ($procesos as $indice => &$item) {
            if (isset($item['estado'])) {
                continue;
            }
            $estado = proc_get_status($item['proceso']);
            $agotado = (microtime(true) - $item['inicio']) > 20;
            if ($estado['running'] && !$agotado) {
                continue;
            }
            if ($agotado && $estado['running']) {
                proc_terminate($item['proceso']);
            }
            $salida = stream_get_contents($item['salidaPipe']);
            $error = stream_get_contents($item['errorPipe']);
            fclose($item['salidaPipe']);
            fclose($item['errorPipe']);
            proc_close($item['proceso']);
            $estadoFinal = $agotado && $estado['running'] ? -2 : (int) ($estado['exitcode'] ?? -1);
            $item['estado'] = $estadoFinal;
            $resultados[$indice] = [
                'estado' => $estadoFinal,
                'salida' => (string) $salida,
                'error' => (string) $error,
            ];
        }
        unset($item);
        if (count($resultados) < count($procesos)) {
            usleep(50000);
        }
    }
    ksort($resultados);
    return $resultados;
}

function iniciarBloqueoTope(string $php, string $dir, string $db, string $valor, float $segundos, string $marca): array
{
    $comando = escapeshellarg($php)
        . ' ' . escapeshellarg($dir . DIRECTORY_SEPARATOR . 'tests' . DIRECTORY_SEPARATOR
            . 'qa017_qa018_qa021' . DIRECTORY_SEPARATOR . 'run.php')
        . ' --lock-tope ' . escapeshellarg($db)
        . ' ' . escapeshellarg($valor)
        . ' ' . escapeshellarg((string) $segundos)
        . ' ' . escapeshellarg($marca);
    $descriptores = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $proceso = proc_open($comando, $descriptores, $pipes);
    fclose($pipes[0]);
    return ['proceso' => $proceso, 'salida' => $pipes[1], 'error' => $pipes[2]];
}

function cerrarBloqueoTope(array $hijo): string
{
    $salida = stream_get_contents($hijo['salida']);
    $error = stream_get_contents($hijo['error']);
    fclose($hijo['salida']);
    fclose($hijo['error']);
    proc_close($hijo['proceso']);
    return trim($salida . ' ' . $error);
}

function esperarMarca(string $marca, float $segundos = 5): bool
{
    $fin = microtime(true) + $segundos;
    while (microtime(true) < $fin) {
        if (is_file($marca)) {
            return true;
        }
        usleep(20000);
    }
    return false;
}

function liberarInscripciones(PDO $pdo, int $idAlumno): void
{
    $stmt = $pdo->prepare("UPDATE inscripciones SET estado = 'B' WHERE id_alumno = :alumno AND estado = 'A'");
    $stmt->execute([':alumno' => $idAlumno]);
}

function probarCambioTopeBloqueado(
    string $php,
    string $dir,
    string $db,
    PDO $pdo,
    string $nombre,
    string $topeInicial,
    string $topeFinal,
    array $trabajos,
    bool $debenInscribir,
    int $activasEsperadas
): void {
    $marca = $dir . DIRECTORY_SEPARATOR . 'lock_' . str_replace('.', '_', uniqid('', true)) . '.marker';
    if (is_file($marca)) {
        unlink($marca);
    }
    liberarInscripciones($pdo, (int) $trabajos[0]['alumno']);

    $inicial = $topeInicial === 'NULL' ? null : (int) $topeInicial;
    $preparar = $pdo->prepare('UPDATE parametros_mesas SET tope_mesas = :tope WHERE id_registro = 1');
    $preparar->bindValue(':tope', $inicial, $inicial === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $preparar->execute();

    $hijo = iniciarBloqueoTope($php, $dir, $db, $topeFinal, 2, $marca);
    if (!esperarMarca($marca)) {
        verificar(false, $nombre . ': bloqueo FOR UPDATE tomado');
        cerrarBloqueoTope($hijo);
        if (is_file($marca)) {
            unlink($marca);
        }
        return;
    }
    verificar(true, $nombre . ': bloqueo FOR UPDATE tomado');

    $resultados = lanzarTrabajadores($php, $dir, $db, $trabajos);
    $mensajes = [];
    foreach ($resultados as $resultado) {
        $mensajes[] = trim($resultado['salida'] . ' ' . $resultado['error']);
    }
    $salidaBloqueo = cerrarBloqueoTope($hijo);
    verificar(strpos($salidaBloqueo, 'LOCK_OK') !== false, $nombre . ': cambio de tope confirmado', $salidaBloqueo);

    if ($debenInscribir) {
        $correctos = 0;
        foreach ($resultados as $resultado) {
            $correctos += $resultado['estado'] === 0 && trim($resultado['salida']) === 'OK' ? 1 : 0;
        }
        verificar($correctos === count($trabajos), $nombre . ': inscripción espera y usa el nuevo tope', implode(' | ', $mensajes));
    } else {
        $rechazados = 0;
        foreach ($resultados as $resultado) {
            $rechazados += strpos(trim($resultado['salida']), 'tope de mesas') !== false ? 1 : 0;
        }
        verificar($rechazados === count($trabajos), $nombre . ': inscripción espera y rechaza con el nuevo tope', implode(' | ', $mensajes));
    }

    $final = $topeFinal === 'NULL' ? null : (int) $topeFinal;
    $finalDb = valorDb($pdo, 'SELECT tope_mesas FROM parametros_mesas WHERE id_registro = 1');
    verificar($final === null ? $finalDb === null : (string) $finalDb === (string) $final,
        $nombre . ': tope final persistido', (string) $finalDb);

    $activas = (int) valorDb($pdo,
        "SELECT COUNT(*) FROM inscripciones
         WHERE id_alumno = :alumno AND anio = 2026 AND id_turno = 1 AND estado = 'A'",
        [':alumno' => (int) $trabajos[0]['alumno']]
    );
    verificar($activas === $activasEsperadas, $nombre . ': inscripciones activas resultantes', (string) $activas);

    if (is_file($marca)) {
        unlink($marca);
    }
}

try {
    if (!is_file($mysql)) {
        throw new RuntimeException('No se encontró mysql.exe en ' . $mysql);
    }
    if (strpos($db, 'clementina_qa171821_') !== 0) {
        throw new RuntimeException('Nombre de base temporal no seguro: ' . $db);
    }
    if (!is_dir($baseTemporal)) {
        throw new RuntimeException('No existe el directorio temporal base: ' . $baseTemporal);
    }

    copiarArbol($raiz, $dir);
    $config = "<?php\n"
        . "define('DB_HOST', 'localhost');\n"
        . "define('DB_NAME', " . var_export($db, true) . ");\n"
        . "define('DB_USER', 'root');\n"
        . "define('DB_PASS', '');\n"
        . "define('DB_CHARSET', 'utf8mb4');\n"
        . "date_default_timezone_set('America/Argentina/Buenos_Aires');\n";
    file_put_contents($dir . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'config.php', $config);

    $comandoMysql = escapeshellarg($mysql) . ' -u root';
    $crear = ejecutar($comandoMysql . ' -e ' . escapeshellarg(
        'DROP DATABASE IF EXISTS `' . $db . '`; CREATE DATABASE `' . $db
        . '` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;'
    ));
    verificar($crear['codigo'] === 0, 'Base de datos aislada creada', $crear['error']);

    $esquema = (string) file_get_contents($raiz . DIRECTORY_SEPARATOR . 'docs' . DIRECTORY_SEPARATOR . 'esquema_normalizado.sql');
    $esquema = (string) preg_replace('/CREATE\s+DATABASE[^;]*;/i', '', $esquema);
    $esquema = (string) preg_replace('/^\s*USE\s+`[^`]+`\s*;/mi', '', $esquema);
    $archivoEsquema = $dir . DIRECTORY_SEPARATOR . 'esquema.sql';
    file_put_contents($archivoEsquema, 'USE `' . $db . '`;' . PHP_EOL . $esquema);
    $importar = ejecutar($comandoMysql, $archivoEsquema);
    verificar($importar['codigo'] === 0, 'Esquema normalizado importado', $importar['error']);

    $migracion = (string) file_get_contents($raiz . DIRECTORY_SEPARATOR . 'docs' . DIRECTORY_SEPARATOR . 'migracion_qa017_qa018_qa021.sql');
    $archivoMigracion = $dir . DIRECTORY_SEPARATOR . 'migracion.sql';
    file_put_contents($archivoMigracion, 'USE `' . $db . '`;' . PHP_EOL . $migracion);
    $aplicar = ejecutar($comandoMysql, $archivoMigracion);
    verificar($aplicar['codigo'] === 0, 'Migración QA-017/018/021 aplicada', $aplicar['error']);

    $pdo = new PDO('mysql:host=localhost;dbname=' . $db . ';charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $semilla = "USE `$db`;
INSERT IGNORE INTO tipos_documento (id_tipo_documento, descripcion) VALUES ('DNI', 'Documento Nacional de Identidad');
INSERT IGNORE INTO paises (id_pais, iso3, nombre, nacionalidad, orden) VALUES ('AR', 'ARG', 'Argentina', 'Argentina', 1);
INSERT IGNORE INTO tipos_personal (id_tipo_personal, descripcion) VALUES ('D', 'Docente');
INSERT IGNORE INTO turnos (id_turno, turno) VALUES (1, 'Febrero'), (2, 'Agosto'), (3, 'Diciembre');
INSERT IGNORE INTO sedes (id_sede, nombre_sede) VALUES (1, 'Sede Central'), (2, 'Sede Norte');
INSERT IGNORE INTO carreras (id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto, titulo)
VALUES (1, 'RES-1', 'Carrera QA', 'CQA', 'Título QA');
INSERT IGNORE INTO materias (id_materia, nombre_materia) VALUES (1, 'Materia 1'), (2, 'Materia 2'), (3, 'Materia 3'), (4, 'Materia 4');
INSERT IGNORE INTO carrera_materias (id_carrera, id_materia, anio_cursada) VALUES (1, 1, 1), (1, 2, 1), (1, 3, 1), (1, 4, 1);
INSERT IGNORE INTO personal (id_personal, apellidos, nombres, usuario_sistema, password_hash, id_tipo_personal)
VALUES (1, 'Docente', 'Uno', 'docente_qa', 'hash', 'D'), (2, 'Docente', 'Dos', 'sin_asignacion', 'hash', 'D');
INSERT IGNORE INTO docente_asignaciones (id_personal, id_carrera, id_materia)
VALUES (1, 1, 1), (1, 1, 2), (1, 1, 3), (1, 1, 4);
INSERT IGNORE INTO carrera_sede_turno (id_carrera, id_sede, id_turno) VALUES (1, 1, 1), (1, 2, 1);
INSERT IGNORE INTO parametros_mesas (id_registro, anio_mesas, id_turno, fecha_inicio, fecha_fin, tope_mesas)
VALUES (1, 2026, 1, '2026-01-01', '2026-12-31', 2);
INSERT IGNORE INTO parametros_inscripcion (id_registro, anio_inscripcion_carrera, fecha_inicio, fecha_fin)
VALUES (1, 2026, '2026-01-01', '2026-12-31');
INSERT IGNORE INTO alumnos (id_alumno, id_tipo_documento, numero_documento, legajo, primer_apellido, primer_nombre, email, id_pais_nacimiento)
VALUES
 (1, 'DNI', 10000001, 'A1', 'Alumno', 'Uno', 'a1@qa.test', 'AR'),
 (2, 'DNI', 10000002, 'A2', 'Alumno', 'Dos', 'a2@qa.test', 'AR'),
 (3, 'DNI', 10000003, 'A3', 'Alumno', 'Tres', 'a3@qa.test', 'AR'),
 (4, 'DNI', 10000004, 'A4', 'Alumno', 'Cuatro', 'a4@qa.test', 'AR'),
 (5, 'DNI', 10000005, 'A5', 'Alumno', 'Cinco', 'a5@qa.test', 'AR'),
 (6, 'DNI', 10000006, 'A6', 'Alumno', 'Seis', 'a6@qa.test', 'AR');
INSERT IGNORE INTO matriculacion (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta)
VALUES
 (1, 1, 2026, 1, 1, NOW()),
 (2, 1, 2026, 1, 1, NOW()),
 (3, 1, 2026, 1, 1, NOW()),
 (4, 1, 2026, 1, 1, NOW()),
 (5, 1, 2026, 1, 1, NOW());
INSERT IGNORE INTO matriculacion_detalle (id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia)
VALUES
 (1, 1, 2026, 1, '1'),
 (3, 1, 2026, 1, '2'),
 (4, 1, 2026, 1, '1');";
    $archivoSemilla = $dir . DIRECTORY_SEPARATOR . 'semilla.sql';
    file_put_contents($archivoSemilla, $semilla);
    $sembrar = ejecutar($comandoMysql, $archivoSemilla);
    verificar($sembrar['codigo'] === 0, 'Datos ficticios cargados', $sembrar['error']);

    $fixtureQA018 = "USE `$db`;
INSERT IGNORE INTO carrera_sede_turno (id_carrera, id_sede, id_turno) VALUES (1, 1, 2);
INSERT IGNORE INTO alumnos (id_alumno, id_tipo_documento, numero_documento, legajo, primer_apellido, primer_nombre, email, id_pais_nacimiento)
VALUES
  (7, 'DNI', 10000007, 'A7', 'Variante', 'Siete', 'a7@qa.test', 'AR'),
  (8, 'DNI', 10000008, 'A8', 'Variante', 'Ocho', 'a8@qa.test', 'AR'),
  (9, 'DNI', 10000009, 'A9', 'Variante', 'Nueve', 'a9@qa.test', 'AR'),
  (10, 'DNI', 10000010, 'A10', 'Variante', 'Diez', 'a10@qa.test', 'AR'),
  (11, 'DNI', 10000011, 'A11', 'Variante', 'Once', 'a11@qa.test', 'AR'),
  (12, 'DNI', 10000012, 'A12', 'Variante', 'Doce', 'a12@qa.test', 'AR'),
  (13, 'DNI', 10000013, 'A13', 'Variante', 'Trece', 'a13@qa.test', 'AR'),
  (14, 'DNI', 10000014, 'A14', 'Variante', 'Catorce', 'a14@qa.test', 'AR'),
  (15, 'DNI', 10000015, 'A15', 'Variante', 'Quince', 'a15@qa.test', 'AR'),
  (17, 'DNI', 10000017, 'A17', 'Historico', 'Diecisiete', 'a17@qa.test', 'AR');
INSERT IGNORE INTO matriculacion (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta)
VALUES
  (7, 1, 2026, 2, 1, NOW()),
  (8, 1, 2026, 2, 1, NOW()),
  (9, 1, 2026, 2, 1, NOW()),
  (10, 1, 2026, 2, 1, NOW()),
  (11, 1, 2026, 2, 1, NOW()),
  (12, 1, 2026, 2, 1, NOW()),
  (13, 1, 2026, 2, 1, NOW()),
  (14, 1, 2026, 2, 1, NOW()),
  (15, 1, 2026, 2, 1, NOW()),
  (17, 1, 2020, 2, 1, NOW());
INSERT IGNORE INTO matriculacion_detalle (id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia)
VALUES
  (7, 1, 2026, 2, '1'),
  (8, 1, 2026, 2, ' 1 '),
  (9, 1, 2026, 2, NULL),
  (10, 1, 2026, 2, ''),
  (11, 1, 2026, 2, '2'),
  (12, 1, 2026, 2, '3'),
  (13, 1, 2026, 2, ' 4 '),
  (14, 1, 2026, 2, ' X '),
  (15, 1, 2026, 2, '  '),
  (17, 1, 2020, 3, '1');";
    $archivoFixture = $dir . DIRECTORY_SEPARATOR . 'fixture_qa018.sql';
    file_put_contents($archivoFixture, $fixtureQA018);
    $cargarFixture = ejecutar($comandoMysql, $archivoFixture);
    verificar($cargarFixture['codigo'] === 0, 'QA-018: fixtures de normalización cargados', $cargarFixture['error']);
    verificar((int) valorDb($pdo, 'SELECT COUNT(*) FROM alumnos WHERE id_alumno BETWEEN 7 AND 17') === 10,
        'QA-018: alumnos de prueba de variantes disponibles');

    $fk = valorDb($pdo,
        "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = :db AND TABLE_NAME = 'matriculacion'
           AND CONSTRAINT_NAME = 'fk_matr_carrera_sede_turno'",
        [':db' => $db]
    );
    verificar((int) $fk === 1, 'FK de matriculación a carrera_sede_turno creada');

    require_once $dir . DIRECTORY_SEPARATOR . 'modelo' . DIRECTORY_SEPARATOR . 'InscripcionFinal.php';
    require_once $dir . DIRECTORY_SEPARATOR . 'modelo' . DIRECTORY_SEPARATOR . 'InscripcionCarrera.php';
    require_once $dir . DIRECTORY_SEPARATOR . 'clementina-docentes' . DIRECTORY_SEPARATOR . 'modelo'
        . DIRECTORY_SEPARATOR . 'DocenteNotas.php';
    require_once $dir . DIRECTORY_SEPARATOR . 'clementina-preceptores' . DIRECTORY_SEPARATOR . 'modelo' . DIRECTORY_SEPARATOR . 'ConfigAdmin.php';

    (new InscripcionCarrera())->registrarInscripcion(6, 1, 1, 1);
    verificar((int) valorDb($pdo,
        "SELECT COUNT(*) FROM matriculacion_detalle
         WHERE id_alumno = 6 AND id_carrera = 1 AND anio_matriculacion = 2026"
    ) === 4, 'Inscripción a carrera genera detalle de matrícula para QA-018');

    $trabajos = [];
    foreach ([2, 3, 4] as $materia) {
        $trabajos[] = ['alumno' => 1, 'carrera' => 1, 'materia' => $materia, 'llamado' => 1];
    }
    $resultados = lanzarTrabajadores($php, $dir, $db, $trabajos);
    $correctos = 0;
    $mensajes = [];
    foreach ($resultados as $resultado) {
        $correctos += $resultado['estado'] === 0 && trim($resultado['salida']) === 'OK' ? 1 : 0;
        $mensajes[] = trim($resultado['salida'] . ' ' . $resultado['error']);
    }
    verificar($correctos === 2, 'Concurrencia: solo 2 de 3 inscripciones superan el tope', implode(' | ', $mensajes));
    $cantidad = (int) valorDb($pdo,
        "SELECT COUNT(*) FROM inscripciones
         WHERE id_alumno = 1 AND anio = 2026 AND id_turno = 1 AND estado = 'A'"
    );
    verificar($cantidad === 2, 'Concurrencia: quedan exactamente 2 inscripciones activas', (string) $cantidad);

    $materiasActivas = $pdo->prepare(
        "SELECT id_materia FROM inscripciones
         WHERE id_alumno = 1 AND anio = 2026 AND id_turno = 1 AND estado = 'A'
         ORDER BY id_materia"
    );
    $materiasActivas->execute();
    $confirmadas = [];
    foreach ($materiasActivas->fetchAll() as $fila) {
        $confirmadas[] = (int) $fila['id_materia'];
    }
    $inscripcionFinal = new InscripcionFinal(1);
    foreach ($confirmadas as $idMateria) {
        $inscripcionFinal->cancelar(1, $idMateria);
    }
    verificar((int) valorDb($pdo, "SELECT COUNT(*) FROM inscripciones WHERE id_alumno = 1 AND estado = 'A'") === 0,
        'Cancelación transaccional libera el cupo');

    $pdo->exec('UPDATE parametros_mesas SET tope_mesas = NULL WHERE id_registro = 1');
    $resultados = lanzarTrabajadores($php, $dir, $db, [
        ['alumno' => 5, 'carrera' => 1, 'materia' => 1, 'llamado' => 1],
        ['alumno' => 5, 'carrera' => 1, 'materia' => 1, 'llamado' => 1],
    ]);
    $correctos = 0;
    foreach ($resultados as $resultado) {
        $correctos += $resultado['estado'] === 0 && trim($resultado['salida']) === 'OK' ? 1 : 0;
    }
    verificar($correctos === 1, 'Concurrencia: no se duplica la misma materia');
    (new InscripcionFinal(5))->cancelar(1, 1);

    $pdo->exec('UPDATE parametros_mesas SET tope_mesas = 0 WHERE id_registro = 1');
    verificar(esperarExcepcion(
        fn() => (new InscripcionFinal(1))->inscribir(1, 1, 1),
        'tope de mesas'
    ), 'Tope 0 bloquea toda inscripción');

    $pdo->exec('UPDATE parametros_mesas SET tope_mesas = NULL WHERE id_registro = 1');
    (new InscripcionFinal(1))->inscribir(1, 1, 1);
    verificar((int) valorDb($pdo, "SELECT COUNT(*) FROM inscripciones WHERE id_alumno = 1 AND estado = 'A'") === 1,
        'Tope NULL permite inscripción sin límite');
    (new InscripcionFinal(1))->cancelar(1, 1);

    $pdo->exec('UPDATE parametros_mesas SET tope_mesas = 1 WHERE id_registro = 1');
    (new InscripcionFinal(1))->inscribir(1, 2, 1);
    verificar(esperarExcepcion(
        fn() => (new InscripcionFinal(1))->inscribir(1, 3, 1),
        'tope de mesas'
    ), 'Tope 1 bloquea el excedente en proceso simple');
    (new InscripcionFinal(1))->cancelar(1, 2);

    probarCambioTopeBloqueado(
        $php, $dir, $db, $pdo,
        'QA-017: tope 2 a 0 con inscripción en espera',
        '2', '0',
        [['alumno' => 5, 'carrera' => 1, 'materia' => 1, 'llamado' => 1]],
        false, 0
    );

    probarCambioTopeBloqueado(
        $php, $dir, $db, $pdo,
        'QA-017: tope 0 a 2 con inscripción en espera',
        '0', '2',
        [['alumno' => 5, 'carrera' => 1, 'materia' => 1, 'llamado' => 1]],
        true, 1
    );
    (new InscripcionFinal(5))->cancelar(1, 1);

    probarCambioTopeBloqueado(
        $php, $dir, $db, $pdo,
        'QA-017: tope 2 a 0 con dos inscripciones simultáneas en espera',
        '2', '0',
        [
            ['alumno' => 5, 'carrera' => 1, 'materia' => 1, 'llamado' => 1],
            ['alumno' => 5, 'carrera' => 1, 'materia' => 2, 'llamado' => 1],
        ],
        false, 0
    );

    $pdo->exec('UPDATE parametros_mesas SET tope_mesas = 1 WHERE id_registro = 1');
    liberarInscripciones($pdo, 5);
    (new InscripcionFinal(5))->inscribir(1, 1, 1);
    verificar(esperarExcepcion(
        fn() => (new InscripcionFinal(5))->inscribir(1, 1, 1),
        'Ya estás inscripto'
    ), 'QA-017: el duplicado se rechaza con tope numérico');
    verificar((int) valorDb($pdo,
        "SELECT COUNT(*) FROM inscripciones
         WHERE id_alumno = 5 AND anio = 2026 AND id_turno = 1 AND estado = 'A'"
    ) === 1, 'QA-017: el duplicado no consume otro cupo');
    (new InscripcionFinal(5))->cancelar(1, 1);

    $docente = new DocenteNotas();
    $lista = $docente->alumnosPorCarreraMateria(1, 1);
    $idsLista = array_map(fn($f) => (int) $f['id_alumno'], $lista);
    verificar(in_array(1, $idsLista, true) && in_array(3, $idsLista, true),
        'QA-018: el listado incluye alumnos con detalle de matrícula');
    verificar(!in_array(2, $idsLista, true),
        'QA-018: el listado excluye alumno sin detalle de matrícula');

    verificar(esperarExcepcion(
        fn() => $docente->guardarNota(1, 2, 1, 1, ['nota' => 8, 'tipo_alumno' => 'R']),
        'matrícula vigente'
    ), 'QA-018: guardar nota sin detalle de matrícula se rechaza');
    verificar((int) valorDb($pdo,
        "SELECT COUNT(*) FROM historial_academico
         WHERE id_alumno = 2 AND id_carrera = 1 AND id_materia = 1"
    ) === 0, 'QA-018: alumno sin derecho no genera historial');

    $docente->guardarNota(1, 1, 1, 1, ['nota' => 8, 'tipo_alumno' => 'R']);
    verificar((int) valorDb($pdo,
        "SELECT COUNT(*) FROM historial_academico
         WHERE id_alumno = 1 AND id_carrera = 1 AND id_materia = 1 AND nota = 8 AND anio_regular = 2026"
    ) === 1, 'QA-018: nota válida queda asociada al año de matrícula');

    $docente->guardarNota(1, 3, 1, 1, ['nota' => 0, 'tipo_alumno' => 'L']);
    verificar((int) valorDb($pdo,
        "SELECT COUNT(*) FROM historial_academico
         WHERE id_alumno = 3 AND id_carrera = 1 AND id_materia = 1 AND tipo_alumno = 'L'"
    ) === 1, 'QA-018: condición Libre documentada no se bloquea');

    verificar(esperarExcepcion(
        fn() => $docente->guardarNota(2, 4, 1, 1, ['nota' => 7, 'tipo_alumno' => 'R']),
        'asignada'
    ), 'QA-018: docente sin asignación no puede cargar nota');

    $listaVariantes = $docente->alumnosPorCarreraMateria(1, 2);
    $idsVariantes = array_map(fn($f) => (int) $f['id_alumno'], $listaVariantes);
    $variantesAceptadas = [7, 8, 9, 10, 11, 12, 15];
    $variantesRechazadas = [13, 14];
    verificar(count(array_diff($variantesAceptadas, $idsVariantes)) === 0,
        'QA-018: listado acepta 1, " 1 ", NULL, vacío, 2, 3 y solo espacios');
    verificar(count(array_intersect($variantesRechazadas, $idsVariantes)) === 0,
        'QA-018: listado rechaza " 4 " y " X "');

    foreach ($variantesAceptadas as $idAlumnoVariante) {
        $respuesta = $docente->guardarNota(1, $idAlumnoVariante, 1, 2, ['nota' => 8, 'tipo_alumno' => 'R']);
        verificar((int) valorDb($pdo,
            "SELECT COUNT(*) FROM historial_academico
             WHERE id_alumno = :alumno AND id_carrera = 1 AND id_materia = 2
               AND anio_regular = 2026 AND nota = 8 AND tipo_alumno = 'R'",
            [':alumno' => $idAlumnoVariante]
        ) === 1, 'QA-018: guardar nota acepta variante de tipo_asistencia del alumno ' . $idAlumnoVariante);
        verificar((int) $respuesta['anio_regular'] === 2026,
            'QA-018: respuesta devuelve el año persistido para la variante ' . $idAlumnoVariante);
    }

    foreach ($variantesRechazadas as $idAlumnoVariante) {
        verificar(esperarExcepcion(
            fn() => $docente->guardarNota(1, $idAlumnoVariante, 1, 2, ['nota' => 8, 'tipo_alumno' => 'R']),
            'condición de matrícula'
        ), 'QA-018: guardar nota rechaza tipo_asistencia inválido del alumno ' . $idAlumnoVariante);
        verificar((int) valorDb($pdo,
            'SELECT COUNT(*) FROM historial_academico WHERE id_alumno = :alumno AND id_carrera = 1 AND id_materia = 2',
            [':alumno' => $idAlumnoVariante]
        ) === 0, 'QA-018: variante rechazada no genera historial ' . $idAlumnoVariante);
    }

    $docente->guardarNota(1, 8, 1, 2, ['nota' => 0, 'tipo_alumno' => 'L']);
    verificar((int) valorDb($pdo,
        "SELECT COUNT(*) FROM historial_academico
         WHERE id_alumno = 8 AND id_carrera = 1 AND id_materia = 2
           AND nota = 0 AND tipo_alumno = 'L'"
    ) === 1, 'QA-018: condición Libre sigue permitida con nota 0');

    $respuestaHistorica = $docente->guardarNota(1, 17, 1, 3, ['nota' => 8, 'tipo_alumno' => 'R']);
    verificar((int) $respuestaHistorica['anio_regular'] === 2020,
        'QA-018: anio_regular devuelto es el persistido, no el año actual');
    verificar((int) valorDb($pdo,
        'SELECT COUNT(*) FROM historial_academico
         WHERE id_alumno = 17 AND id_carrera = 1 AND id_materia = 3 AND anio_regular = 2020'
    ) === 1, 'QA-018: anio_regular histórico queda persistido en 2020');
    $listaHistorica = $docente->alumnosPorCarreraMateria(1, 3);
    $filaHistorica = null;
    foreach ($listaHistorica as $fila) {
        if ((int) $fila['id_alumno'] === 17) {
            $filaHistorica = $fila;
            break;
        }
    }
    verificar($filaHistorica !== null && (int) $filaHistorica['anio_regular'] === 2020,
        'QA-018: listado devuelve el anio_regular histórico persistido');

    $indexVista = (string) file_get_contents($dir . DIRECTORY_SEPARATOR . 'clementina-preceptores'
        . DIRECTORY_SEPARATOR . 'index.html');
    verificar(strpos($indexVista, "'Sin límite'") !== false
        && strpos($indexVista, "'Sin cupo'") !== false
        && strpos($indexVista, "'sin límite'") === false
        && strpos($indexVista, "'mesas/alumno'") === false,
        'QA-017: index.html unifica Sin límite, Sin cupo y valor numérico');
    $mesasVista = (string) file_get_contents($dir . DIRECTORY_SEPARATOR . 'clementina-preceptores'
        . DIRECTORY_SEPARATOR . 'vista' . DIRECTORY_SEPARATOR . 'mesas.html');
    verificar(strpos($mesasVista, "'Sin límite'") !== false
        && strpos($mesasVista, "'Sin cupo'") !== false
        && strpos($mesasVista, "'mesas por alumno'") === false,
        'QA-017: mesas.html unifica Sin límite, Sin cupo y valor numérico');

    $config = new ConfigAdmin();
    $baja = $config->eliminar('carrera_sede_turno', ['id_carrera' => 1, 'id_sede' => 1, 'id_turno' => 1]);
    verificar(!$baja['ok'] && strpos($baja['mensaje'], 'matriculaciones') !== false,
        'QA-021: baja con matrículas se rechaza', $baja['mensaje']);

    $modificacion = $config->actualizar(
        'carrera_sede_turno',
        ['id_carrera' => 1, 'id_sede' => 1, 'id_turno' => 1],
        ['id_carrera' => 1, 'id_sede' => 2, 'id_turno' => 1]
    );
    verificar(!$modificacion['ok'] && strpos($modificacion['mensaje'], 'matriculaciones') !== false,
        'QA-021: modificación con matrículas se rechaza', $modificacion['mensaje']);

    $bajaLibre = $config->eliminar('carrera_sede_turno', ['id_carrera' => 1, 'id_sede' => 2, 'id_turno' => 1]);
    verificar($bajaLibre['ok'], 'QA-021: baja sin matrículas se permite', $bajaLibre['mensaje']);

    $fkDirecto = false;
    try {
        $pdo->exec('DELETE FROM carrera_sede_turno WHERE id_carrera = 1 AND id_sede = 1 AND id_turno = 1');
    } catch (PDOException $e) {
        $fkDirecto = (int) ($e->errorInfo[1] ?? 0) === 1451;
    }
    verificar($fkDirecto, 'QA-021: FK impide borrar relation con matrículas desde SQL directo');

    verificar((int) valorDb($pdo,
        "SELECT COUNT(*) FROM matriculacion WHERE id_carrera = 1 AND id_sede = 1 AND id_turno = 1"
    ) === 6, 'QA-021: las matrículas siguen intactas después de los bloqueos');

    echo "\n$total verificaciones, $fallos fallos\n";
    $codigoSalida = $fallos === 0 ? 0 : 1;
} catch (Throwable $e) {
    echo '[FAIL] Error fatal: ' . $e->getMessage() . "\n";
} finally {
    if ($pdo !== null) {
        try {
            $pdo = null;
            ejecutar($comandoMysql . ' -e ' . escapeshellarg('DROP DATABASE IF EXISTS `' . $db . '`'));
        } catch (Throwable $e) {
        }
    }
    eliminarArbol($dir);
}

exit($codigoSalida);
