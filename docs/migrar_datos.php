<?php

declare(strict_types=1);

// Uso:
//   OLD_DB_USER=usuario OLD_DB_PASS=clave php docs/migrar_datos.php
// Opcionales: OLD_DB_HOST, OLD_DB_PORT, OLD_DB_NAME, NEW_DB_*,
//             OLD_DB_PASS_EMPTY=1 / NEW_DB_PASS_EMPTY=1 si la clave está vacía,
//             CLEMENTINA_MYSQL, CLEMENTINA_MYSQLDUMP, --dry-run

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Este script solo se ejecuta por CLI.\n");
    exit(1);
}

function envValue(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false) {
        return $default;
    }
    return $value;
}

function envRequired(string $key, ?string $default = null): string
{
    $value = envValue($key, $default);
    if ($value === null) {
        throw new RuntimeException("Falta la variable de entorno {$key}");
    }
    return $value;
}

function passwordValue(string $key): string
{
    $value = getenv($key);
    if ($value !== false) {
        return $value;
    }
    if (getenv($key . '_EMPTY') === '1') {
        return '';
    }
    throw new RuntimeException("Falta la variable de entorno {$key} (o {$key}_EMPTY=1 para clave vacía)");
}

function logLine(string $message): void
{
    echo '[' . date('H:i:s') . '] ' . $message . PHP_EOL;
}

function qi(string $identifier): string
{
    return '`' . str_replace('`', '``', $identifier) . '`';
}

function tblRef(string $schema, string $table): string
{
    return qi($schema) . '.' . qi($table);
}

function colRef(string $schema, string $table, string $column): string
{
    return tblRef($schema, $table) . '.' . qi($column);
}

function pdoConnect(string $host, string $port, string $db, string $user, string $pass, string $charset): PDO
{
    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO'");
    return $pdo;
}

function resolveBinary(string $envKey, string $default): string
{
    $path = envRequired($envKey, $default);
    if (preg_match('/[\\\\\/]/', $path) === 1 && !file_exists($path)) {
        throw new RuntimeException("No se encontró el binario {$path}. Definí {$envKey}.");
    }
    return $path;
}

function runCommand(array $command, array $envVars, ?string $stdinFile, ?string $stdoutFile): void
{
    $commandLine = implode(' ', array_map('escapeshellarg', $command));
    $descriptors = [
        0 => $stdinFile !== null ? ['file', $stdinFile, 'r'] : ['pipe', 'r'],
        1 => $stdoutFile !== null ? ['file', $stdoutFile, 'w'] : ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $pipes = [];
    $environment = array_merge(getenv() ?: [], $envVars);
    $process = proc_open($commandLine, $descriptors, $pipes, null, $environment);

    if (!is_resource($process)) {
        throw new RuntimeException('No se pudo iniciar ' . basename($command[0]));
    }

    if ($stdinFile === null) {
        fclose($pipes[0]);
    }

    $stdout = '';
    if ($stdoutFile === null) {
        $stdout = stream_get_contents($pipes[1]);
    }
    $stderr = stream_get_contents($pipes[2]);

    foreach ($pipes as $pipe) {
        if (is_resource($pipe)) {
            fclose($pipe);
        }
    }

    $exitCode = proc_close($process);
    if ($exitCode !== 0) {
        $detail = trim($stderr . "\n" . $stdout);
        throw new RuntimeException('Fallo ' . basename($command[0]) . " (código {$exitCode}): " . $detail);
    }
}

function tableExists(PDO $pdo, string $schema, string $table): bool
{
    static $cache = [];
    $key = $schema . '.' . strtolower($table);
    if (!array_key_exists($key, $cache)) {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?'
        );
        $stmt->execute([$schema, $table]);
        $cache[$key] = (int) $stmt->fetchColumn() > 0;
    }
    return $cache[$key];
}

function columnNames(PDO $pdo, string $schema, string $table): array
{
    static $cache = [];
    $key = $schema . '.' . strtolower($table);
    if (!array_key_exists($key, $cache)) {
        $stmt = $pdo->prepare(
            'SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION'
        );
        $stmt->execute([$schema, $table]);
        $cache[$key] = array_map('strtolower', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }
    return $cache[$key];
}

function pickColumn(PDO $pdo, string $schema, string $table, array $candidates): ?string
{
    if (!tableExists($pdo, $schema, $table)) {
        return null;
    }
    $columns = columnNames($pdo, $schema, $table);
    foreach ($candidates as $candidate) {
        $index = array_search(strtolower($candidate), $columns, true);
        if ($index !== false) {
            return $columns[$index];
        }
    }
    return null;
}

function srcExpr(PDO $pdo, string $schema, string $table, array $candidates, string $default = 'NULL'): string
{
    $column = pickColumn($pdo, $schema, $table, $candidates);
    return $column !== null ? colRef($schema, $table, $column) : $default;
}

function normDoc($value): ?string
{
    if ($value === null) {
        return null;
    }
    $clean = strtoupper(preg_replace('/[^A-Za-z]/', '', (string) $value) ?: '');
    return $clean !== '' ? substr($clean, 0, 4) : null;
}

function normNumber($value): ?int
{
    if ($value === null) {
        return null;
    }
    $digits = preg_replace('/\D/', '', (string) $value) ?: '';
    return $digits !== '' ? (int) $digits : null;
}

function normDate($value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $text = (string) $value;
    if (strpos($text, '0000-00-00') === 0) {
        return null;
    }
    $timestamp = strtotime($text);
    return $timestamp !== false ? date('Y-m-d', $timestamp) : null;
}

function normDateTime($value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    $text = (string) $value;
    if (strpos($text, '0000-00-00') === 0) {
        return null;
    }
    $timestamp = strtotime($text);
    return $timestamp !== false ? date('Y-m-d H:i:s', $timestamp) : null;
}

function normInt($value, int $default = 0): int
{
    $number = normNumber($value);
    return $number !== null ? $number : $default;
}

function hashPassword($value): ?string
{
    if ($value === null || (string) $value === '') {
        return null;
    }
    $plain = (string) $value;
    if (strpos($plain, '$2y$') === 0 || strpos($plain, '$argon2') === 0) {
        return substr($plain, 0, 255);
    }
    return password_hash($plain, PASSWORD_BCRYPT);
}

function validForeignKey(PDO $pdo, string $table, string $column, $value)
{
    $number = normNumber($value);
    if ($number === null || $number <= 0) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT ' . qi($column) . ' FROM ' . qi($table) . ' WHERE ' . qi($column) . ' = ?');
    $stmt->execute([$number]);
    $found = $stmt->fetchColumn();
    return $found !== false ? (int) $found : null;
}

function uniqueEmail(PDO $pdo, string $email, string $tipo, int $numero): string
{
    $stmt = $pdo->prepare('SELECT id_tipo_documento, numero_documento FROM alumnos WHERE email = ?');
    for ($attempt = 0; $attempt < 12; $attempt++) {
        $candidate = $attempt === 0
            ? $email
            : 'migrado_' . $numero . '_' . substr(md5($tipo . $numero . $attempt), 0, 8) . '@legacy.invalid';
        $stmt->execute([$candidate]);
        $row = $stmt->fetch();
        if ($row === false
            || ($row['id_tipo_documento'] === $tipo && (int) $row['numero_documento'] === $numero)
        ) {
            return $candidate;
        }
    }
    return 'migrado_' . $numero . '_' . substr(md5($tipo . $numero . microtime(true)), 0, 8) . '@legacy.invalid';
}

function execSqlFile(PDO $pdo, string $path): void
{
    $sql = file_get_contents($path);
    if ($sql === false) {
        throw new RuntimeException("No se pudo leer {$path}");
    }
    if (trim($sql) !== '') {
        $pdo->exec($sql);
    }
}

$dryRun = in_array('--dry-run', $argv, true);
$errors = [];
$target = null;
$stageDb = null;
$dumpFile = null;

try {
    $root = dirname(__DIR__);
    $configPath = $root . '/config/config.php';
    if (!file_exists($configPath)) {
        throw new RuntimeException("No se encontró {$configPath}");
    }
    require_once $configPath;

    foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'DB_CHARSET'] as $constant) {
        if (!defined($constant)) {
            throw new RuntimeException("config/config.php no define {$constant}");
        }
    }

    $oldHost = envRequired('OLD_DB_HOST');
    $oldPort = envRequired('OLD_DB_PORT', '3306');
    $oldDb = envRequired('OLD_DB_NAME');
    $oldUser = envRequired('OLD_DB_USER');
    $oldPass = passwordValue('OLD_DB_PASS');
    $oldCharset = envRequired('OLD_DB_CHARSET', 'utf8mb4');

    $newHost = envRequired('NEW_DB_HOST');
    $newPort = envRequired('NEW_DB_PORT', '3306');
    $newDb = envRequired('NEW_DB_NAME');
    $newUser = envRequired('NEW_DB_USER');
    $newPass = passwordValue('NEW_DB_PASS');
    $newCharset = envRequired('NEW_DB_CHARSET', 'utf8mb4');

    $mysql = resolveBinary('CLEMENTINA_MYSQL', 'C:\\xampp\\mysql\\bin\\mysql.exe');
    $mysqldump = resolveBinary('CLEMENTINA_MYSQLDUMP', 'C:\\xampp\\mysql\\bin\\mysqldump.exe');

    logLine('Inicio migración' . ($dryRun ? ' [DRY-RUN]' : '') . ': ' . $oldDb . ' -> ' . $newDb);

    $target = pdoConnect($newHost, $newPort, $newDb, $newUser, $newPass, $newCharset);
    $stageDb = 'clementina_mig_' . date('Ymd_His') . '_' . getmypid();
    $target->exec('CREATE DATABASE ' . qi($stageDb) . ' DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
    $stage = pdoConnect($newHost, $newPort, $stageDb, $newUser, $newPass, $newCharset);

    $dumpFile = tempnam(sys_get_temp_dir(), 'clementina_old_');
    if ($dumpFile === false) {
        throw new RuntimeException('No se pudo crear el archivo temporal del dump');
    }

    logLine('Volcando base vieja a staging...');
    runCommand([
        $mysqldump,
        '--host=' . $oldHost,
        '--port=' . $oldPort,
        '--user=' . $oldUser,
        '--single-transaction',
        '--default-character-set=utf8mb4',
        '--no-tablespaces',
        '--skip-add-locks',
        '--skip-comments',
        '--skip-triggers',
        '--skip-events',
        '--skip-routines',
        $oldDb,
    ], ['MYSQL_PWD' => $oldPass], null, $dumpFile);

    logLine('Importando staging en el servidor destino...');
    runCommand([
        $mysql,
        '--host=' . $newHost,
        '--port=' . $newPort,
        '--user=' . $newUser,
        '--default-character-set=utf8mb4',
        $stageDb,
    ], ['MYSQL_PWD' => $newPass], $dumpFile, null);

    if (!$dryRun) {
        $target->exec('SET FOREIGN_KEY_CHECKS = 0');
        $ubicaciones = $root . '/docs/datos_ubicaciones.sql';
        if (file_exists($ubicaciones)) {
            execSqlFile($target, $ubicaciones);
            logLine('Catálogos de ubicación aplicados');
        }
        $target->exec("INSERT IGNORE INTO tipos_documento (id_tipo_documento, descripcion) VALUES
            ('DNI', 'Documento Nacional de Identidad'),
            ('LC',  'Libreta Cívica'),
            ('LE',  'Libreta de Enrolamiento'),
            ('PAS', 'Pasaporte')");
        $target->exec("INSERT IGNORE INTO tipos_personal (id_tipo_personal, descripcion) VALUES
            ('A', 'Administrativo'), ('D', 'Docente')");
        $target->exec("INSERT IGNORE INTO turnos (id_turno, turno) VALUES
            (1, 'Febrero'), (2, 'Agosto'), (3, 'Diciembre'),
            (4, 'Marzo'), (5, 'Junio'), (6, 'Julio'), (7, 'Noviembre')");
        $target->exec("INSERT IGNORE INTO sedes (id_sede, nombre_sede) VALUES (1, 'Sede Central')");
        $target->exec("INSERT IGNORE INTO parametros_generales (id_registro, nombre_instituto, ciclo_lectivo)
            VALUES (1, 'ISFT 182 \"Clementina\"', YEAR(CURDATE()))");
    }

    $target->exec('CREATE TEMPORARY TABLE mig_alumnos_map (
        id_tipo_documento VARCHAR(4) NOT NULL,
        numero_documento BIGINT NOT NULL,
        id_alumno BIGINT NOT NULL,
        PRIMARY KEY (id_tipo_documento, numero_documento)
    ) ENGINE=MEMORY');

    $has = function (string $table) use ($stage, $stageDb): bool {
        return tableExists($stage, $stageDb, $table);
    };
    $ex = function (string $table, array $candidates, string $default = 'NULL') use ($stage, $stageDb): string {
        return srcExpr($stage, $stageDb, $table, $candidates, $default);
    };
    $from = function (string $table) use ($stageDb): string {
        return tblRef($stageDb, $table);
    };
    $mig = function (string $label, string $sql) use ($target, $dryRun, &$errors): void {
        if ($dryRun) {
            logLine('[DRY] ' . $label);
            return;
        }
        try {
            $count = $target->exec($sql);
            logLine(sprintf('[OK]  %-32s %d filas', $label, max(0, (int) $count)));
        } catch (Throwable $e) {
            $errors[] = $label . ': ' . $e->getMessage();
            logLine('[WARN] ' . $label . ': ' . $e->getMessage());
        }
    };

    $docUnions = [];
    foreach ([
        ['alumnos', ['idtipodocumento', 'id_tipo_documento', 'tipodocumento']],
        ['inscripciones', ['idtipodedocumento', 'idtipodocumento', 'id_tipo_documento', 'tipodocumento']],
        ['aspirantes', ['tipodocumento', 'idtipodocumento', 'id_tipo_documento']],
    ] as $definition) {
        [$table, $candidates] = $definition;
        $column = pickColumn($stage, $stageDb, $table, $candidates);
        if ($column !== null) {
            $docUnions[] = 'SELECT DISTINCT LEFT(' . colRef($stageDb, $table, $column) . ', 4) AS id
                            FROM ' . tblRef($stageDb, $table) . '
                            WHERE ' . colRef($stageDb, $table, $column) . ' IS NOT NULL';
        }
    }
    if ($docUnions !== []) {
        $mig('tipos_documento (desde datos)', "
            INSERT IGNORE INTO tipos_documento (id_tipo_documento, descripcion)
            SELECT u.id, CONCAT('Migrado ', u.id)
            FROM (" . implode(' UNION ', $docUnions) . ") u
            WHERE u.id <> ''
        ");
    }

    if ($has('personal')) {
        $type = pickColumn($stage, $stageDb, 'personal', ['tipopersonal', 'id_tipo_personal', 'tipo']);
        if ($type !== null) {
            $mig('tipos_personal (desde datos)', "
                INSERT IGNORE INTO tipos_personal (id_tipo_personal, descripcion)
                SELECT DISTINCT LEFT(" . colRef($stageDb, 'personal', $type) . ", 1),
                       CONCAT('Migrado ', LEFT(" . colRef($stageDb, 'personal', $type) . ", 1))
                FROM " . tblRef($stageDb, 'personal') . "
                WHERE " . colRef($stageDb, 'personal', $type) . " IS NOT NULL
            ");
        }
    }

    if ($has('carreras')) {
        $id = $ex('carreras', ['idcarrera', 'id_carrera'], 'NULL');
        $name = $ex('carreras', ['nombrecarrera', 'nombre_carrera', 'nombre'], 'NULL');
        $mig('carreras', "
            INSERT IGNORE INTO carreras
                (id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto, titulo)
            SELECT {$id}, 'MIGRADO', {$name}, LEFT({$name}, 45), LEFT({$name}, 100)
            FROM " . $from('carreras') . "
            WHERE {$id} IS NOT NULL AND {$name} IS NOT NULL
        ");
    }

    if ($has('materias')) {
        $id = $ex('materias', ['idmateria', 'id_materia'], 'NULL');
        $name = $ex('materias', ['nombremateria', 'nombre_materia', 'nombre'], 'NULL');
        $mig('materias', "
            INSERT IGNORE INTO materias (id_materia, nombre_materia)
            SELECT {$id}, {$name}
            FROM " . $from('materias') . "
            WHERE {$id} IS NOT NULL AND {$name} IS NOT NULL
        ");
    }

    $cmTable = $has('rel_carrera_materias') ? 'rel_carrera_materias' : ($has('carrera_materias') ? 'carrera_materias' : null);
    if ($cmTable !== null) {
        $carrera = $ex($cmTable, ['idcarrera', 'id_carrera'], 'NULL');
        $materia = $ex($cmTable, ['idmateria', 'id_materia'], 'NULL');
        $anio = $ex($cmTable, ['aniocursada', 'anio_cursada'], '1');
        $mig('carrera_materias', "
            INSERT IGNORE INTO carrera_materias
                (id_carrera, id_materia, anio_cursada, carga_horaria_semanal, tipo_espacio)
            SELECT {$carrera}, {$materia}, COALESCE({$anio}, 1), 4, 'Asignatura'
            FROM " . $from($cmTable) . "
            WHERE {$carrera} IS NOT NULL AND {$materia} IS NOT NULL
        ");
    }

    foreach (['correlatividades', 'Enfermeria_corr', 'tabla_de_correlatividades_upload'] as $corrTable) {
        if (!$has($corrTable)) {
            continue;
        }
        $carrera = $ex($corrTable, ['idcarrera', 'id_carrera', 'carrera'], 'NULL');
        $materia = $ex($corrTable, ['idmateria', 'id_materia', 'materia'], 'NULL');
        $correlativa = $ex($corrTable, [
            'idmateriacorrelativa', 'id_materia_correlativa', 'materiacorrelativa', 'correlativa', 'materia_correlativa',
        ], 'NULL');
        $mig('correlatividades <- ' . $corrTable, "
            INSERT IGNORE INTO correlatividades (id_carrera, id_materia, id_materia_correlativa)
            SELECT {$carrera}, {$materia}, {$correlativa}
            FROM " . $from($corrTable) . "
            WHERE {$carrera} IS NOT NULL AND {$materia} IS NOT NULL AND {$correlativa} IS NOT NULL
              AND {$materia} <> {$correlativa}
        ");
    }

    if ($has('turnos')) {
        $id = $ex('turnos', ['idturno', 'id_turno'], 'NULL');
        $name = $ex('turnos', ['turno', 'nombreturno', 'nombre_turno'], "CONCAT('Turno ', " . $ex('turnos', ['idturno', 'id_turno'], '0') . ')');
        $mig('turnos', "
            INSERT IGNORE INTO turnos (id_turno, turno)
            SELECT {$id}, {$name}
            FROM " . $from('turnos') . "
            WHERE {$id} IS NOT NULL
        ");
    }

    $sedeTable = $has('sedes') ? 'sedes' : ($has('rel_carreras_sedes_turnos') ? 'rel_carreras_sedes_turnos' : null);
    if ($sedeTable !== null) {
        $id = $ex($sedeTable, ['idsede', 'id_sede'], 'NULL');
        $name = $ex($sedeTable, ['nombresede', 'nombre_sede', 'sede'], "CONCAT('Sede ', " . $ex($sedeTable, ['idsede', 'id_sede'], '0') . ')');
        $mig('sedes', "
            INSERT IGNORE INTO sedes (id_sede, nombre_sede)
            SELECT DISTINCT {$id}, {$name}
            FROM " . $from($sedeTable) . "
            WHERE {$id} IS NOT NULL
        ");
    }

    if ($has('rel_carreras_sedes_turnos')) {
        $carrera = $ex('rel_carreras_sedes_turnos', ['idcarrera', 'id_carrera'], 'NULL');
        $sede = $ex('rel_carreras_sedes_turnos', ['idsede', 'id_sede'], 'NULL');
        $turno = $ex('rel_carreras_sedes_turnos', ['idturno', 'id_turno'], 'NULL');
        $mig('carrera_sede_turno', "
            INSERT IGNORE INTO carrera_sede_turno (id_carrera, id_sede, id_turno)
            SELECT {$carrera}, {$sede}, {$turno}
            FROM " . $from('rel_carreras_sedes_turnos') . "
            WHERE {$carrera} IS NOT NULL AND {$sede} IS NOT NULL AND {$turno} IS NOT NULL
        ");
    }

    $alumnoCandidates = [
        'tipo' => ['idtipodocumento', 'id_tipo_documento', 'tipodocumento'],
        'numero' => ['numerodocumento', 'numero_documento', 'iddocumento', 'dni'],
        'nombre' => ['primernombre', 'primer_nombre', 'nombre'],
        'nombre2' => ['otrosnombres', 'otros_nombres', 'segundo_nombre'],
        'apellido' => ['primerapellido', 'primer_apellido', 'apellido'],
        'apellido2' => ['otrosapellidos', 'otros_apellidos', 'segundo_apellido'],
        'email' => ['idemail', 'email', 'correo', 'mail'],
        'password' => ['password', 'password_hash', 'clave'],
        'legajo' => ['legajo', 'nro_legajo', 'numero_legajo'],
        'nacimiento' => ['fechanacimiento', 'fecha_nacimiento', 'fechanac'],
        'sexo' => ['sexo'],
        'pais' => ['idpaisnacimiento', 'id_pais_nacimiento', 'pais'],
        'provincia' => ['idprovincianacimiento', 'id_provincia_nacimiento', 'idprovincia'],
        'localidad' => ['idlocalidadnacimiento', 'id_localidad_nacimiento', 'idlocalidad'],
        'lugarExtranjero' => ['lugarnacimientoextranjero', 'lugar_nacimiento_extranjero'],
        'estadoCivil' => ['estadocivil', 'estado_civil'],
        'hijos' => ['cantidadhijos', 'cantidad_hijos'],
        'familiares' => ['cantidadfamiliaresacargo', 'cantidad_familiares_a_cargo'],
        'alta' => ['fechaalta', 'fecha_alta', 'fecharegistro', 'alta_registro'],
        'confirmacion' => ['fechaconfirmacion', 'confirmacion_registro'],
        'actualizacion' => ['fechaactualizacion', 'fecha_ultima_actualizacion', 'fechamod'],
    ];
    $aCols = [];
    foreach ($alumnoCandidates as $key => $candidates) {
        $aCols[$key] = pickColumn($stage, $stageDb, 'alumnos', $candidates);
    }

    if ($aCols['tipo'] === null || $aCols['numero'] === null) {
        logLine('[WARN] alumnos: no se encontraron columnas de documento; se omite la migración de alumnos');
    } elseif (!$dryRun) {
        $insertAlumno = $target->prepare("
            INSERT IGNORE INTO alumnos (
                id_tipo_documento, numero_documento, legajo,
                primer_apellido, otros_apellidos, primer_nombre, otros_nombres,
                email, fecha_nacimiento, sexo, id_pais_nacimiento,
                id_provincia_nacimiento, id_localidad_nacimiento, lugar_nacimiento_extranjero,
                estado_civil, cantidad_hijos, cantidad_familiares_a_cargo, password_hash,
                alta_registro, confirmacion_registro, fecha_ultima_actualizacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $selectAlumno = $target->prepare(
            'SELECT id_alumno FROM alumnos WHERE id_tipo_documento = ? AND numero_documento = ?'
        );
        $insertMap = $target->prepare(
            'INSERT IGNORE INTO mig_alumnos_map (id_tipo_documento, numero_documento, id_alumno) VALUES (?, ?, ?)'
        );
        $rows = $stage->query('SELECT * FROM ' . tblRef($stageDb, 'alumnos'));
        $migrated = 0;

        foreach ($rows as $row) {
            $tipo = normDoc($aCols['tipo'] !== null ? ($row[$aCols['tipo']] ?? null) : null);
            $numero = normNumber($aCols['numero'] !== null ? ($row[$aCols['numero']] ?? null) : null);
            if ($tipo === null || $numero === null) {
                continue;
            }

            $email = trim((string) ($aCols['email'] !== null ? ($row[$aCols['email']] ?? '') : ''));
            if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                $email = 'migrado_' . $numero . '@legacy.invalid';
            }
            $email = uniqueEmail($target, $email, $tipo, $numero);

            $pais = strtoupper(substr((string) ($aCols['pais'] !== null ? ($row[$aCols['pais']] ?? '') : ''), 0, 2));
            if ($pais === '') {
                $pais = 'ZZ';
            }
            $stmtPais = $target->prepare('SELECT id_pais FROM paises WHERE id_pais = ?');
            $stmtPais->execute([$pais]);
            if ($stmtPais->fetchColumn() === false) {
                $pais = 'ZZ';
            }

            $provincia = validForeignKey(
                $target,
                'provincias',
                'id_provincia',
                $aCols['provincia'] !== null ? ($row[$aCols['provincia']] ?? null) : null
            );
            $localidad = validForeignKey(
                $target,
                'localidades',
                'id_localidad',
                $aCols['localidad'] !== null ? ($row[$aCols['localidad']] ?? null) : null
            );

            $insertAlumno->execute([
                $tipo,
                $numero,
                substr((string) ($aCols['legajo'] !== null ? ($row[$aCols['legajo']] ?? '') : ''), 0, 45) ?: null,
                substr((string) ($aCols['apellido'] !== null ? ($row[$aCols['apellido']] ?? '') : ''), 0, 40) ?: 'MIGRADO',
                substr((string) ($aCols['apellido2'] !== null ? ($row[$aCols['apellido2']] ?? '') : ''), 0, 40) ?: null,
                substr((string) ($aCols['nombre'] !== null ? ($row[$aCols['nombre']] ?? '') : ''), 0, 40) ?: 'MIGRADO',
                substr((string) ($aCols['nombre2'] !== null ? ($row[$aCols['nombre2']] ?? '') : ''), 0, 40) ?: null,
                $email,
                normDate($aCols['nacimiento'] !== null ? ($row[$aCols['nacimiento']] ?? null) : null),
                strtoupper(substr((string) ($aCols['sexo'] !== null ? ($row[$aCols['sexo']] ?? '') : ''), 0, 1)) ?: null,
                $pais,
                $provincia,
                $localidad,
                substr((string) ($aCols['lugarExtranjero'] !== null ? ($row[$aCols['lugarExtranjero']] ?? '') : ''), 0, 100) ?: null,
                strtoupper(substr((string) ($aCols['estadoCivil'] !== null ? ($row[$aCols['estadoCivil']] ?? '') : ''), 0, 1)) ?: null,
                normInt($aCols['hijos'] !== null ? ($row[$aCols['hijos']] ?? null) : null),
                normInt($aCols['familiares'] !== null ? ($row[$aCols['familiares']] ?? null) : null),
                hashPassword($aCols['password'] !== null ? ($row[$aCols['password']] ?? null) : null),
                normDateTime($aCols['alta'] !== null ? ($row[$aCols['alta']] ?? null) : null),
                normDateTime($aCols['confirmacion'] !== null ? ($row[$aCols['confirmacion']] ?? null) : null),
                normDateTime($aCols['actualizacion'] !== null ? ($row[$aCols['actualizacion']] ?? null) : null),
            ]);

            $selectAlumno->execute([$tipo, $numero]);
            $idAlumno = (int) $selectAlumno->fetchColumn();
            if ($idAlumno > 0) {
                $insertMap->execute([$tipo, $numero, $idAlumno]);
                $migrated++;
            }
        }
        logLine(sprintf('[OK]  %-32s %d filas', 'alumnos', $migrated));
    } else {
        logLine('[DRY] alumnos');
    }

    if ($has('alumnos')) {
        $calle = $ex('alumnos', ['calle', 'domicilio_calle', 'direccion'], 'NULL');
        $numeroCalle = $ex('alumnos', ['numero', 'numerocalle', 'domicilio_numero'], 'NULL');
        $piso = $ex('alumnos', ['piso'], 'NULL');
        $depto = $ex('alumnos', ['depto', 'departamento'], 'NULL');
        $localidad = $ex('alumnos', ['idlocalidaddomicilio', 'id_localidad', 'idlocalidad'], 'NULL');
        $codigoPostal = $ex('alumnos', ['codigopostaldomicilio', 'codigo_postal', 'codigopostal'], 'NULL');
        $telefono1 = $ex('alumnos', ['telefonopricipal', 'telefono_principal', 'telefono1', 'telefono'], 'NULL');
        $telefono2 = $ex('alumnos', ['telefonosegundo', 'telefono_alternativo', 'telefono2'], 'NULL');
        $telefono3 = $ex('alumnos', ['telefonoreferencia', 'telefono_alternativo_referencia', 'telefono3'], 'NULL');
        $mig('domicilios_alumno', "
            INSERT IGNORE INTO domicilios_alumno (
                id_alumno, calle, numero, piso, depto, id_localidad,
                id_codigo_postal, telefono_principal, telefono_alternativo, telefono_alternativo_referencia
            )
            SELECT m.id_alumno,
                   LEFT({$calle}, 45),
                   {$numeroCalle},
                   LEFT({$piso}, 3),
                   LEFT({$depto}, 3),
                   (SELECT l.id_localidad FROM localidades l WHERE l.id_localidad = {$localidad}),
                   (SELECT cp.id_codigo_postal FROM codigos_postales cp
                     WHERE CAST(cp.codigo_postal AS CHAR) = CAST({$codigoPostal} AS CHAR)
                       AND ({$localidad} IS NULL OR cp.id_localidad = {$localidad})
                     LIMIT 1),
                   LEFT({$telefono1}, 45),
                   LEFT({$telefono2}, 45),
                   LEFT({$telefono3}, 45)
            FROM " . $from('alumnos') . "
            JOIN mig_alumnos_map m
              ON m.id_tipo_documento = LEFT(" . $ex('alumnos', ['idtipodocumento', 'id_tipo_documento', 'tipodocumento'], 'NULL') . ", 4)
             AND m.numero_documento = " . $ex('alumnos', ['numerodocumento', 'numero_documento', 'iddocumento', 'dni'], 'NULL') . "
            WHERE m.id_alumno IS NOT NULL
        ");
    }

    if ($has('personal')) {
        $tipo = $ex('personal', ['tipopersonal', 'id_tipo_personal', 'tipo'], "'A'");
        $idPersonal = $ex('personal', ['idpersonal', 'id_personal'], 'NULL');
        $usuario = $ex('personal', ['usuario_sistema', 'usuario', 'login'], "CONCAT('personal_', COALESCE({$idPersonal}, 0))");
        $apellidos = $ex('personal', ['apellidos', 'apellido'], "'MIGRADO'");
        $nombres = $ex('personal', ['nombres', 'nombre'], "'MIGRADO'");
        $mig('personal (datos no sensibles)', "
            INSERT IGNORE INTO personal (apellidos, nombres, usuario_sistema, id_tipo_personal)
            SELECT LEFT(COALESCE({$apellidos}, 'MIGRADO'), 100),
                   LEFT(COALESCE({$nombres}, 'MIGRADO'), 100),
                   LEFT({$usuario}, 50),
                   LEFT(COALESCE({$tipo}, 'A'), 1)
            FROM " . $from('personal') . "
            WHERE {$usuario} IS NOT NULL AND {$usuario} <> ''
        ");
        $usuarioCandidate = pickColumn($stage, $stageDb, 'personal', ['usuario_sistema', 'usuario', 'login']);
        $passwordCandidate = pickColumn($stage, $stageDb, 'personal', ['password', 'password_hash', 'clave']);
        if (!$dryRun && $usuarioCandidate !== null && $passwordCandidate !== null) {
            $rows = $stage->query('SELECT * FROM ' . tblRef($stageDb, 'personal'));
            $update = $target->prepare(
                'UPDATE personal SET password_hash = ? WHERE usuario_sistema = LEFT(?, 50)'
            );
            $count = 0;
            foreach ($rows as $row) {
                $user = (string) ($row[$usuarioCandidate] ?? '');
                if ($user === '') {
                    continue;
                }
                $hash = hashPassword($row[$passwordCandidate] ?? null);
                if ($hash === null) {
                    continue;
                }
                $update->execute([$hash, $user]);
                $count += $update->rowCount();
            }
            logLine(sprintf('[OK]  %-32s %d filas', 'personal (password_hash)', $count));
        } elseif (!$dryRun && $passwordCandidate === null) {
            logLine('[INFO] personal: la BD vieja no guarda passwords; password_hash queda NULL');
        } elseif (!$dryRun) {
            logLine('[WARN] personal: no se pudo actualizar password_hash');
        }
    }

    if ($has('aspirantes')) {
        $dni = $ex('aspirantes', ['dni', 'numerodocumento', 'documento'], 'NULL');
        $anio = $ex('aspirantes', ['anio', 'ano'], 'YEAR(CURDATE())');
        $apellido = $ex('aspirantes', ['apellido'], "'MIGRADO'");
        $nombre = $ex('aspirantes', ['nombre'], "'MIGRADO'");
        $email = $ex('aspirantes', ['email', 'correo', 'mail'], "CONCAT('aspirante_', {$dni}, '@legacy.invalid')");
        $telFijo = $ex('aspirantes', ['tel_fijo', 'telefonofijo', 'telefono_fijo'], 'NULL');
        $telCel = $ex('aspirantes', ['tel_cel', 'telefonocelular', 'celular'], 'NULL');
        $material = $ex('aspirantes', ['material'], 'NULL');
        $lista = $ex('aspirantes', ['lista'], 'NULL');
        $fecha = $ex('aspirantes', ['fecha_hora', 'fechahora'], 'NULL');
        $mig('aspirantes', "
            INSERT IGNORE INTO aspirantes (
                dni, anio, apellido, nombre, email, tel_fijo, tel_cel, material, lista, fecha_hora, id_alumno
            )
            SELECT {$dni}, COALESCE({$anio}, YEAR(CURDATE())),
                   LEFT(COALESCE({$apellido}, 'MIGRADO'), 100),
                   LEFT(COALESCE({$nombre}, 'MIGRADO'), 100),
                   LEFT(COALESCE({$email}, CONCAT('aspirante_', {$dni}, '@legacy.invalid')), 255),
                   LEFT({$telFijo}, 19), LEFT({$telCel}, 19),
                   LEFT({$material}, 1), LEFT({$lista}, 2), {$fecha},
                   (SELECT m.id_alumno FROM mig_alumnos_map m WHERE m.numero_documento = {$dni} AND m.id_tipo_documento = 'DNI' LIMIT 1)
            FROM " . $from('aspirantes') . "
            WHERE {$dni} IS NOT NULL
        ");
        $mig('aspirantes_parametros', "
            INSERT IGNORE INTO aspirantes_parametros (id_registro, anio)
            SELECT 1, MAX(COALESCE({$anio}, YEAR(CURDATE()))) FROM " . $from('aspirantes') . "
        ");
    }

    if ($has('inscripciones')) {
        $tipo = $ex('inscripciones', ['idtipodedocumento', 'idtipodocumento', 'id_tipo_documento', 'tipodocumento'], 'NULL');
        $numero = $ex('inscripciones', ['iddocumento', 'numerodocumento', 'numero_documento', 'dni'], 'NULL');
        $carrera = $ex('inscripciones', ['idcarrera', 'id_carrera'], 'NULL');
        $materia = $ex('inscripciones', ['idmateria', 'id_materia'], 'NULL');
        $anio = $ex('inscripciones', ['anio', 'ano'], 'YEAR(CURDATE())');
        $turno = $ex('inscripciones', ['idturno', 'id_turno'], '3');
        $llamado = $ex('inscripciones', ['idllamado', 'id_llamado', 'llamado'], '1');
        $estado = $ex('inscripciones', ['estado'], "'A'");
        $verificada = $ex('inscripciones', ['verificada'], "'N'");
        $fecha = $ex('inscripciones', ['fechahora', 'fecha_hora'], 'NOW()');
        $join = "JOIN mig_alumnos_map m
                   ON m.id_tipo_documento = LEFT({$tipo}, 4)
                  AND m.numero_documento = {$numero}";
        $filtro = "
            WHERE {$carrera} IS NOT NULL AND {$materia} IS NOT NULL
              AND EXISTS (SELECT 1 FROM carrera_materias cm
                          WHERE cm.id_carrera = {$carrera} AND cm.id_materia = {$materia})
              AND EXISTS (SELECT 1 FROM turnos t WHERE t.id_turno = {$turno})
        ";

        $mig('inscripciones', "
            INSERT IGNORE INTO inscripciones (
                id_alumno, id_carrera, id_materia, anio,
                id_turno, id_llamado, estado, verificada, fecha_hora
            )
            SELECT m.id_alumno, {$carrera}, {$materia},
                   COALESCE({$anio}, YEAR(CURDATE())),
                   COALESCE({$turno}, 3), COALESCE({$llamado}, 1),
                   COALESCE(LEFT({$estado}, 1), 'A'),
                   COALESCE(LEFT({$verificada}, 1), 'N'),
                   COALESCE({$fecha}, NOW())
            FROM " . $from('inscripciones') . "
            {$join}
            {$filtro}
        ");

        $estadoRendicion = "CASE
            WHEN UPPER(LEFT(COALESCE({$estado}, 'A'), 1)) = 'A' THEN 'INSCRIPTO'
            WHEN UPPER(LEFT(COALESCE({$estado}, 'A'), 1)) = 'B' THEN 'BAJA'
            ELSE 'INSCRIPTO'
        END";
        $mig('rendiciones_finales', "
            INSERT INTO rendiciones_finales (
                id_alumno, id_carrera, id_materia, anio_turno, turno_instancia,
                id_llamado, fecha_examen, estado, modalidad, fecha_registro
            )
            SELECT m.id_alumno, {$carrera}, {$materia},
                   COALESCE({$anio}, YEAR(CURDATE())),
                   COALESCE({$turno}, 3), COALESCE({$llamado}, 1),
                   NULL, {$estadoRendicion}, 'REGULAR',
                   COALESCE({$fecha}, NOW())
            FROM " . $from('inscripciones') . "
            {$join}
            {$filtro}
              AND NOT EXISTS (
                  SELECT 1 FROM rendiciones_finales rf
                  WHERE rf.id_alumno = m.id_alumno
                    AND rf.id_carrera = {$carrera}
                    AND rf.id_materia = {$materia}
                    AND rf.anio_turno = COALESCE({$anio}, YEAR(CURDATE()))
                    AND rf.turno_instancia = COALESCE({$turno}, 3)
                    AND rf.id_llamado = COALESCE({$llamado}, 1)
              )
        ");
    }

    $matriculacionTable = $has('matriculacion') ? 'matriculacion' : null;
    if ($matriculacionTable !== null) {
        $tipo = $ex($matriculacionTable, ['idtipodocumento', 'id_tipo_documento', 'tipodocumento'], 'NULL');
        $numero = $ex($matriculacionTable, ['numerodocumento', 'numero_documento', 'iddocumento', 'dni'], 'NULL');
        $carrera = $ex($matriculacionTable, ['idcarrera', 'id_carrera'], 'NULL');
        $anio = $ex($matriculacionTable, ['anioinscripcion', 'anio_inscripcion', 'anio', 'ano'], 'YEAR(CURDATE())');
        $turno = $ex($matriculacionTable, ['idturno', 'id_turno'], '3');
        $sede = $ex($matriculacionTable, ['idsede', 'id_sede'], '1');
        $tomo = $ex($matriculacionTable, ['tomomatriz', 'tomo_matriz'], 'NULL');
        $folio = $ex($matriculacionTable, ['foliomatriz', 'folio_matriz'], 'NULL');
        $alta = $ex($matriculacionTable, ['fechaalta', 'fecha_alta'], 'NULL');
        $mod = $ex($matriculacionTable, ['fechamod', 'fecha_mod'], 'NULL');
        $mig('matriculacion', "
            INSERT IGNORE INTO matriculacion (
                id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede,
                tomo_matriz, folio_matriz, fecha_alta, fecha_mod
            )
            SELECT m.id_alumno, {$carrera}, COALESCE({$anio}, YEAR(CURDATE())),
                   COALESCE({$turno}, 3), COALESCE({$sede}, 1),
                   {$tomo}, {$folio}, {$alta}, {$mod}
            FROM " . $from($matriculacionTable) . "
            JOIN mig_alumnos_map m
              ON m.id_tipo_documento = LEFT({$tipo}, 4)
             AND m.numero_documento = {$numero}
            WHERE {$carrera} IS NOT NULL
              AND EXISTS (SELECT 1 FROM carreras c WHERE c.id_carrera = {$carrera})
              AND EXISTS (SELECT 1 FROM turnos t WHERE t.id_turno = COALESCE({$turno}, 3))
              AND EXISTS (SELECT 1 FROM sedes sd WHERE sd.id_sede = COALESCE({$sede}, 1))
        ");

        $detalleTable = $has('matriculaciondetalle')
            ? 'matriculaciondetalle'
            : ($has('matriculacion_detalle') ? 'matriculacion_detalle' : null);
        if ($detalleTable !== null) {
            $tipoD = $ex($detalleTable, ['idtipodocumento', 'id_tipo_documento', 'tipodocumento'], 'NULL');
            $numeroD = $ex($detalleTable, ['numerodocumento', 'numero_documento', 'iddocumento', 'dni'], 'NULL');
            $carreraD = $ex($detalleTable, ['idcarrera', 'id_carrera'], 'NULL');
            $materiaD = $ex($detalleTable, ['idmateria', 'id_materia'], 'NULL');
            $anioD = $ex($detalleTable, ['aniomatriculacion', 'anio_matriculacion', 'anio', 'ano'], 'YEAR(CURDATE())');
            $asistencia = $ex($detalleTable, ['tipoasistencia', 'tipo_asistencia', 'asistencia'], "'1'");
            $mig('matriculacion_detalle', "
                INSERT IGNORE INTO matriculacion_detalle (
                    id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia
                )
                SELECT m.id_alumno, {$carreraD}, COALESCE({$anioD}, YEAR(CURDATE())),
                       {$materiaD}, LEFT(COALESCE({$asistencia}, '1'), 3)
                FROM " . $from($detalleTable) . "
                JOIN mig_alumnos_map m
                  ON m.id_tipo_documento = LEFT({$tipoD}, 4)
                 AND m.numero_documento = {$numeroD}
                WHERE {$carreraD} IS NOT NULL AND {$materiaD} IS NOT NULL
                  AND EXISTS (SELECT 1 FROM matriculacion mat
                              WHERE mat.id_alumno = m.id_alumno AND mat.id_carrera = {$carreraD})
                  AND EXISTS (SELECT 1 FROM carrera_materias cm
                              WHERE cm.id_carrera = {$carreraD} AND cm.id_materia = {$materiaD})
            ");
        }

        $mig('matriculacion_detalle (backfill)', "
            INSERT IGNORE INTO matriculacion_detalle (
                id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia
            )
            SELECT mat.id_alumno, mat.id_carrera, mat.anio_inscripcion, cm.id_materia, '1'
            FROM matriculacion mat
            JOIN carrera_materias cm ON cm.id_carrera = mat.id_carrera
            WHERE NOT EXISTS (
                SELECT 1 FROM matriculacion_detalle md
                WHERE md.id_alumno = mat.id_alumno
                  AND md.id_carrera = mat.id_carrera
                  AND md.anio_matriculacion = mat.anio_inscripcion
                  AND md.id_materia = cm.id_materia
            )
        ");
    }

    $historialTable = $has('historialacademico') ? 'historialacademico' : ($has('historial_academico') ? 'historial_academico' : null);
    if ($historialTable !== null) {
        $tipo = $ex($historialTable, ['idtipodocumento', 'id_tipo_documento', 'tipodocumento'], 'NULL');
        $numero = $ex($historialTable, ['numerodocumento', 'numero_documento', 'iddocumento', 'dni'], 'NULL');
        $carrera = $ex($historialTable, ['idcarrera', 'id_carrera'], 'NULL');
        $materia = $ex($historialTable, ['idmateria', 'id_materia'], 'NULL');
        $anio = $ex($historialTable, ['anioregular', 'anio_regular', 'anio'], '0');
        $nota = $ex($historialTable, ['nota'], '0');
        $fechaAprobacion = $ex($historialTable, ['fechaaprobacion', 'fecha_aprobacion'], 'NULL');
        $tomo = $ex($historialTable, ['tomoacta', 'tomo_acta'], '0');
        $folio = $ex($historialTable, ['folioacta', 'folio_acta'], '0');
        $tipoAlumno = $ex($historialTable, ['tipoalumno', 'tipo_alumno'], "'X'");
        $validadoRegular = $ex($historialTable, ['validadoregular', 'validado_regular'], "'F'");
        $validadoExamen = $ex($historialTable, ['validadoexamen', 'validado_examen'], "'F'");
        $resolucion = $ex($historialTable, ['resolucion'], 'NULL');
        $observaciones = $ex($historialTable, ['observaciones'], 'NULL');
        $alta = $ex($historialTable, ['fechaalta', 'fecha_alta'], 'NULL');
        $mod = $ex($historialTable, ['fechamod', 'fecha_mod'], 'NULL');
        $mig('historial_academico', "
            INSERT IGNORE INTO historial_academico (
                id_alumno, id_carrera, id_materia, anio_regular, fecha_aprobacion,
                tomo_acta, folio_acta, nota, tipo_alumno, validado_regular,
                validado_examen, resolucion, observaciones, fecha_alta, fecha_mod
            )
            SELECT m.id_alumno, {$carrera}, {$materia}, COALESCE({$anio}, 0), {$fechaAprobacion},
                   COALESCE({$tomo}, 0), COALESCE({$folio}, 0), COALESCE({$nota}, 0),
                   COALESCE(LEFT({$tipoAlumno}, 1), 'X'),
                   COALESCE(LEFT({$validadoRegular}, 1), 'F'),
                   COALESCE(LEFT({$validadoExamen}, 1), 'F'),
                   LEFT({$resolucion}, 45), LEFT({$observaciones}, 255), {$alta}, {$mod}
            FROM " . $from($historialTable) . "
            JOIN mig_alumnos_map m
              ON m.id_tipo_documento = LEFT({$tipo}, 4)
             AND m.numero_documento = {$numero}
            WHERE {$carrera} IS NOT NULL AND {$materia} IS NOT NULL
              AND EXISTS (SELECT 1 FROM carrera_materias cm
                          WHERE cm.id_carrera = {$carrera} AND cm.id_materia = {$materia})
        ");
    }

    if ($has('parametros')) {
        $anioMesas = $ex('parametros', ['aniomesas', 'anio_mesas', 'ciclo_lectivo'], 'YEAR(CURDATE())');
        $turnoMesas = $ex('parametros', ['idturnomesas', 'id_turno_mesas', 'idturno'], '3');
        $inicioMesas = $ex('parametros', ['fechainiciomesas', 'fecha_inicio_mesas'], 'NULL');
        $finMesas = $ex('parametros', ['fechafinmesas', 'fecha_fin_mesas'], 'NULL');
        $topeMesas = $ex('parametros', ['topemesas', 'tope_mesas'], 'NULL');
        $anioInscripcion = $ex('parametros', ['anioinscripcion', 'anio_inscripcion'], 'NULL');
        $inicioInscripcion = $ex('parametros', ['fechainicioinscripcion', 'fecha_inicio_inscripcion'], 'NULL');
        $finInscripcion = $ex('parametros', ['fechafininscripcion', 'fecha_fin_inscripcion'], 'NULL');
        $anioMatriculacion = $ex('parametros', ['aniomatriculacion', 'anio_matriculacion'], 'NULL');
        $inicioMatriculacion = $ex('parametros', ['fechainiciomatriculacion', 'fecha_inicio_matriculacion'], 'NULL');
        $finMatriculacion = $ex('parametros', ['fechafinmatriculacion', 'fecha_fin_matriculacion'], 'NULL');

        $mig('parametros_generales', "
            INSERT IGNORE INTO parametros_generales (id_registro, nombre_instituto, ciclo_lectivo)
            SELECT 1, 'ISFT 182 \"Clementina\"', COALESCE({$anioMesas}, YEAR(CURDATE()))
            FROM " . $from('parametros') . "
        ");
        $mig('parametros_mesas', "
            INSERT IGNORE INTO parametros_mesas
                (id_registro, anio_mesas, id_turno, fecha_inicio, fecha_fin, tope_mesas)
            SELECT 1, COALESCE({$anioMesas}, YEAR(CURDATE())), COALESCE({$turnoMesas}, 3),
                   {$inicioMesas}, {$finMesas}, {$topeMesas}
            FROM " . $from('parametros') . "
        ");
        $mig('parametros_inscripcion', "
            INSERT IGNORE INTO parametros_inscripcion
                (id_registro, anio_inscripcion_carrera, fecha_inicio, fecha_fin)
            SELECT 1, {$anioInscripcion}, {$inicioInscripcion}, {$finInscripcion}
            FROM " . $from('parametros') . "
        ");
        $mig('parametros_matriculacion', "
            INSERT IGNORE INTO parametros_matriculacion
                (id_registro, anio_matriculacion, fecha_inicio, fecha_fin,
                 carpeta_vista_alumno, carpeta_vista_preceptoria)
            SELECT 1, {$anioMatriculacion}, {$inicioMatriculacion}, {$finMatriculacion},
                   'MisDatos', 'Preceptoria'
            FROM " . $from('parametros') . "
        ");
    }

    if (!$dryRun) {
        $target->exec('SET FOREIGN_KEY_CHECKS = 1');
    }

    if ($errors !== []) {
        logLine('Finalizado con ' . count($errors) . ' advertencia(s). Revisá los mensajes [WARN].');
        $exitCode = 1;
    } else {
        logLine('Migración finalizada correctamente.');
        $exitCode = 0;
    }
} catch (Throwable $e) {
    fwrite(STDERR, '[ERROR] ' . $e->getMessage() . PHP_EOL);
    $exitCode = 1;
} finally {
    if ($target !== null) {
        try {
            $target->exec('SET FOREIGN_KEY_CHECKS = 1');
            if ($stageDb !== null) {
                $target->exec('DROP DATABASE IF EXISTS ' . qi($stageDb));
                logLine('Base staging eliminada');
            }
        } catch (Throwable $e) {
            fwrite(STDERR, '[WARN] No se pudo limpiar staging: ' . $e->getMessage() . PHP_EOL);
        }
    }
    if ($dumpFile !== null && file_exists($dumpFile)) {
        @unlink($dumpFile);
    }
}

exit($exitCode ?? 0);
