<?php
$raiz = dirname(__DIR__, 2);
$php = PHP_BINARY;
$mysql = getenv('CLEMENTINA_MYSQL') ?: 'C:\\xampp\\mysql\\bin\\mysql.exe';
$baseTemporal = getenv('CLEMENTINA_TEST_TMP') ?: sys_get_temp_dir();
$sufijo = date('YmdHis') . '_' . getmypid();
$dir = rtrim($baseTemporal, '\\/') . DIRECTORY_SEPARATOR . 'qa016_qa019_qa020_qa022_' . $sufijo;
$db = 'clementina_qa16192022_' . $sufijo;
$fallos = 0;
$total = 0;
$pdo = null;
$servidor = null;
$codigoSalida = 1;
$mensajeLoginGenerico = 'No se pudo iniciar sesión. Verificá tus credenciales e intentá nuevamente.';
$mensajeNotaInterna = 'No se pudo guardar la nota. Intentá nuevamente o contactá al administrador.';
$mensajeEmailDuplicado = 'No se pudo actualizar el correo electrónico. Verificá que la dirección ingresada esté disponible e intentá nuevamente.';

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
    return ['codigo' => proc_close($proceso), 'salida' => (string) $salida, 'error' => (string) $error];
}

function copiarArbol(string $origen, string $destino): void
{
    if (!is_dir($destino) && !mkdir($destino, 0777, true)) {
        throw new RuntimeException('No se pudo crear el directorio temporal.');
    }
    $omitir = ['.git', 'node_modules', 'backups', 'documentos', 'tests'];
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
            @chmod($rutaEntrada, 0644);
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

function puertoLibre(): int
{
    $socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
    if ($socket === false) {
        throw new RuntimeException('No se pudo reservar un puerto local: ' . $error);
    }
    $nombre = (string) stream_socket_get_name($socket, false);
    fclose($socket);
    return (int) substr($nombre, strrpos($nombre, ':') + 1);
}

function iniciarServidor(string $php, string $docroot, int $puerto, array $variables): array
{
    $comando = escapeshellarg($php)
        . ' -d SMTP=127.0.0.1 -d smtp_port=1 -d sendmail_from=no-reply@qa.test'
        . ' -S 127.0.0.1:' . $puerto . ' -t ' . escapeshellarg($docroot);
    $entorno = [];
    foreach (['PATH', 'Path', 'SystemRoot', 'TEMP', 'TMP', 'COMSPEC'] as $clave) {
        $valor = getenv($clave);
        if ($valor !== false) {
            $entorno[$clave] = $valor;
        }
    }
    $entorno = array_merge($entorno, $variables);
    $descriptores = [
        0 => ['pipe', 'r'],
        1 => ['file', $docroot . DIRECTORY_SEPARATOR . 'servidor.out', 'w'],
        2 => ['file', $docroot . DIRECTORY_SEPARATOR . 'servidor.err', 'w'],
    ];
    $proceso = proc_open($comando, $descriptores, $pipes, $docroot, $entorno);
    if (!is_resource($proceso)) {
        throw new RuntimeException('No se pudo iniciar el servidor PHP de pruebas.');
    }
    fclose($pipes[0]);
    $url = 'http://127.0.0.1:' . $puerto . '/controlador/verificar_sesion.php';
    for ($i = 0; $i < 40; $i++) {
        $respuesta = solicitar($url);
        if ($respuesta['status'] > 0) {
            return ['proceso' => $proceso, 'base' => 'http://127.0.0.1:' . $puerto];
        }
        usleep(100000);
    }
    proc_terminate($proceso);
    proc_close($proceso);
    throw new RuntimeException('El servidor PHP de pruebas no respondió en el puerto ' . $puerto . '.');
}

function solicitar(string $url, ?array $post = null, ?string $cookieJar = null, array $headers = [], ?string $csrf = null): array
{
    $ch = curl_init($url);
    $opciones = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => false,
    ];
    if ($post !== null) {
        $opciones[CURLOPT_POST] = true;
        $opciones[CURLOPT_POSTFIELDS] = http_build_query($post);
    }
    if ($cookieJar !== null) {
        $opciones[CURLOPT_COOKIEJAR] = $cookieJar;
        $opciones[CURLOPT_COOKIEFILE] = $cookieJar;
    }
    if ($csrf !== null) {
        $headers[] = 'X-CSRF-Token: ' . $csrf;
    }
    if ($headers !== []) {
        $opciones[CURLOPT_HTTPHEADER] = $headers;
    }
    curl_setopt_array($ch, $opciones);
    $respuesta = curl_exec($ch);
    $info = curl_getinfo($ch);
    $error = curl_error($ch);
    curl_close($ch);
    if ($respuesta === false) {
        return ['status' => 0, 'body' => '', 'headers' => '', 'error' => $error];
    }
    $separador = strpos($respuesta, "\r\n\r\n");
    $cabeceras = $separador === false ? '' : substr($respuesta, 0, $separador);
    $cuerpo = $separador === false ? $respuesta : substr($respuesta, $separador + 4);
    return [
        'status' => (int) $info['http_code'],
        'body' => (string) $cuerpo,
        'headers' => (string) $cabeceras,
        'error' => '',
    ];
}

function csrfDesdeJar(string $archivo): string
{
    if (!is_file($archivo)) {
        return '';
    }
    foreach (file($archivo, FILE_IGNORE_NEW_LINES) ?: [] as $linea) {
        if ($linea === '' || $linea[0] === '#') {
            continue;
        }
        $campos = preg_split('/\s+/', $linea);
        if (is_array($campos) && count($campos) >= 7 && $campos[5] === 'csrf_token') {
            return (string) $campos[6];
        }
    }
    return '';
}

function crearJar(string $base, string $dir, string $nombre): array
{
    $jar = $dir . DIRECTORY_SEPARATOR . 'cookies_' . $nombre . '.txt';
    solicitar($base . '/controlador/verificar_correo.php', null, $jar);
    return [$jar, csrfDesdeJar($jar)];
}

function postJs(array $respuesta): array
{
    $datos = json_decode(trim($respuesta['body']), true);
    return is_array($datos) ? $datos : [];
}

function contiene(string $texto, array $fragmentos): bool
{
    foreach ($fragmentos as $fragmento) {
        if (strpos($texto, $fragmento) !== false) {
            return true;
        }
    }
    return false;
}

function detenerServidor(array $servidor): void
{
    if (!is_resource($servidor['proceso'])) {
        return;
    }
    $estado = proc_get_status($servidor['proceso']);
    $pid = (int) ($estado['pid'] ?? 0);
    if ($pid > 0) {
        ejecutar('taskkill /PID ' . $pid . ' /T /F');
    }
    proc_terminate($servidor['proceso']);
    proc_close($servidor['proceso']);
    usleep(300000);
}

try {
    if (!is_file($mysql)) {
        throw new RuntimeException('No se encontró mysql.exe en ' . $mysql);
    }
    if (strpos($db, 'clementina_qa16192022_') !== 0) {
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

    foreach ([
        'migracion_qa014_qa015.sql' => 'Migración QA-014/QA-015 aplicada',
        'migracion_qa017_qa018_qa021.sql' => 'Migración QA-017/QA-018/QA-021 aplicada',
    ] as $archivo => $etiqueta) {
        $sql = (string) file_get_contents($raiz . DIRECTORY_SEPARATOR . 'docs' . DIRECTORY_SEPARATOR . $archivo);
        $destino = $dir . DIRECTORY_SEPARATOR . $archivo;
        file_put_contents($destino, 'USE `' . $db . '`;' . PHP_EOL . $sql);
        $aplicar = ejecutar($comandoMysql, $destino);
        verificar($aplicar['codigo'] === 0, $etiqueta, $aplicar['error']);
    }

    $pdo = new PDO('mysql:host=localhost;dbname=' . $db . ';charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $hash = (string) password_hash('Clave123!', PASSWORD_DEFAULT);
    $semilla = "USE `$db`;
INSERT IGNORE INTO tipos_documento (id_tipo_documento, descripcion) VALUES ('DNI', 'Documento Nacional de Identidad');
INSERT IGNORE INTO paises (id_pais, iso3, nombre, nacionalidad) VALUES ('AR', 'ARG', 'Argentina', 'Argentina');
INSERT IGNORE INTO tipos_personal (id_tipo_personal, descripcion) VALUES ('A', 'Preceptor'), ('D', 'Docente');
INSERT IGNORE INTO turnos (id_turno, turno) VALUES (1, 'Febrero'), (2, 'Agosto');
INSERT IGNORE INTO sedes (id_sede, nombre_sede) VALUES (1, 'Sede Central'), (2, 'Sede Norte');
INSERT IGNORE INTO carreras (id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto, titulo)
VALUES (1, 'RES-1', 'Carrera QA', 'CQA', 'Título QA');
INSERT IGNORE INTO materias (id_materia, nombre_materia) VALUES (1, 'Materia 1'), (2, 'Materia 2'), (3, 'Materia 3'), (4, 'Materia 4');
INSERT IGNORE INTO carrera_materias (id_carrera, id_materia, anio_cursada) VALUES (1, 1, 1), (1, 2, 1), (1, 3, 1);
INSERT IGNORE INTO carrera_sede_turno (id_carrera, id_sede, id_turno) VALUES (1, 1, 1), (1, 2, 2);
INSERT IGNORE INTO personal (id_personal, apellidos, nombres, usuario_sistema, password_hash, id_tipo_personal)
VALUES (1, 'Docente', 'Uno', 'docente_qa', " . $pdo->quote($hash) . ", 'D'),
       (2, 'Preceptor', 'Uno', 'preceptor_qa', " . $pdo->quote($hash) . ", 'A');
INSERT IGNORE INTO docente_asignaciones (id_personal, id_carrera, id_materia) VALUES (1, 1, 1);
INSERT IGNORE INTO alumnos
  (id_alumno, id_tipo_documento, numero_documento, legajo, primer_apellido, primer_nombre, email, password_hash, alta_registro, confirmacion_registro, id_pais_nacimiento)
VALUES
  (1, 'DNI', 11111111, 'A1', 'Uno', 'Confirmado', 'confirmado@qa.test', " . $pdo->quote($hash) . ", NOW(), NOW(), 'AR'),
  (2, 'DNI', 22222222, 'A2', 'Dos', 'Otro', 'otro@qa.test', " . $pdo->quote($hash) . ", NOW(), NOW(), 'AR'),
  (3, 'DNI', 33333333, 'A3', 'Tres', 'Pendiente', 'pendiente@qa.test', " . $pdo->quote($hash) . ", NOW(), NULL, 'AR'),
  (4, 'DNI', 44444444, 'A4', 'Cuatro', 'SinClave', 'sinclave@qa.test', NULL, NOW(), NOW(), 'AR');
INSERT IGNORE INTO matriculacion (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta)
VALUES (1, 1, 2026, 1, 1, NOW());
INSERT IGNORE INTO matriculacion_detalle (id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia)
VALUES (1, 1, 2026, 1, '1');";
    $archivoSemilla = $dir . DIRECTORY_SEPARATOR . 'semilla.sql';
    file_put_contents($archivoSemilla, $semilla);
    $sembrar = ejecutar($comandoMysql, $archivoSemilla);
    verificar($sembrar['codigo'] === 0, 'Datos ficticios cargados', $sembrar['error']);

    $puerto = puertoLibre();
    $servidor = iniciarServidor($php, $dir, $puerto, [
        'CLEMENTINA_MAIL_FROM' => 'no-reply@qa.test',
        'LOGIN_RATE_MAX' => '1000',
        'CLEMENTINA_HMAC_SECRET' => 'qa016_secret_local',
    ]);
    $base = $servidor['base'];

    [$jarPublico] = crearJar($base, $dir, 'publico');
    $falloDesconocido = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '99999999',
        'password' => 'Clave123!',
    ], $jarPublico));
    $falloClave = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '11111111',
        'password' => 'Incorrecta123!',
    ], $jarPublico));
    $falloSinClave = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '44444444',
        'password' => 'Clave123!',
    ], $jarPublico));
    verificar(
        !empty($falloDesconocido['ok']) === false
            && ($falloDesconocido['mensaje'] ?? null) === $mensajeLoginGenerico
            && ($falloClave['mensaje'] ?? null) === $mensajeLoginGenerico
            && ($falloSinClave['mensaje'] ?? null) === $mensajeLoginGenerico,
        'QA-016: todos los fallos de login devuelven el mismo mensaje',
        json_encode([$falloDesconocido, $falloClave, $falloSinClave], JSON_UNESCAPED_UNICODE)
    );
    verificar(
        !contiene(json_encode([$falloDesconocido, $falloClave, $falloSinClave], JSON_UNESCAPED_UNICODE), [
            '99999999', '11111111', '44444444', 'No existe', 'incorrecta', 'contraseña configurada',
        ]),
        'QA-016: el login no revela existencia ni estado de cuenta'
    );

    [$jarPendiente] = crearJar($base, $dir, 'pendiente');
    $pendienteCorrecta = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '33333333',
        'password' => 'Clave123!',
    ], $jarPendiente));
    $pendienteIncorrecta = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '33333333',
        'password' => 'Incorrecta123!',
    ], $jarPendiente));
    verificar(
        empty($pendienteCorrecta['ok'])
            && !empty($pendienteCorrecta['verificacion_pendiente'])
            && ($pendienteCorrecta['mensaje'] ?? null) === 'Verificá tu correo antes de ingresar.',
        'QA-016: la verificación pendiente se mantiene sólo con credenciales correctas',
        json_encode($pendienteCorrecta, JSON_UNESCAPED_UNICODE)
    );
    verificar(
        empty($pendienteIncorrecta['ok'])
            && !isset($pendienteIncorrecta['verificacion_pendiente'])
            && ($pendienteIncorrecta['mensaje'] ?? null) === $mensajeLoginGenerico,
        'QA-016: una clave inválida nunca expone verificación pendiente',
        json_encode($pendienteIncorrecta, JSON_UNESCAPED_UNICODE)
    );

    require_once $dir . DIRECTORY_SEPARATOR . 'modelo' . DIRECTORY_SEPARATOR . 'Usuario.php';
    $duplicado = (new Usuario())->registrar(
        'DNI',
        '11111111',
        'Pérez',
        '',
        'Duplicado',
        '',
        'duplicado@qa.test',
        'Clave123!'
    );
    verificar(
        empty($duplicado['ok'])
            && !contiene((string) ($duplicado['mensaje'] ?? ''), ['11111111', 'duplicado@qa.test']),
        'QA-016: el registro no devuelve documentos ni emails ajenos',
        json_encode($duplicado, JSON_UNESCAPED_UNICODE)
    );

    [$jarAlumno, $csrfAlumno] = crearJar($base, $dir, 'alumno');
    $loginAlumno = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '11111111',
        'password' => 'Clave123!',
    ], $jarAlumno, [], $csrfAlumno));
    verificar(!empty($loginAlumno['ok']), 'Sesión de alumno iniciada para QA-020', json_encode($loginAlumno, JSON_UNESCAPED_UNICODE));

    [$jarDocente, $csrfDocente] = crearJar($base, $dir, 'docente');
    $loginDocente = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => 'docente_qa',
        'password' => 'Clave123!',
    ], $jarDocente, [], $csrfDocente));
    verificar(!empty($loginDocente['ok']), 'Sesión de docente iniciada para QA-019', json_encode($loginDocente, JSON_UNESCAPED_UNICODE));

    $pdo->exec("CREATE TRIGGER qa019_falla_nota BEFORE INSERT ON historial_academico
        FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'SECRETO_INTERNO_QA019'");
    $notaInterna = postJs(solicitar($base . '/clementina-docentes/controlador/guardar_nota.php', [
        'id_alumno' => 1,
        'id_carrera' => 1,
        'id_materia' => 1,
        'nota' => 8,
        'tipo_alumno' => 'R',
    ], $jarDocente, [], $csrfDocente));
    $cuerpoNotaInterna = json_encode($notaInterna, JSON_UNESCAPED_UNICODE);
    verificar(
        empty($notaInterna['ok']) && ($notaInterna['mensaje'] ?? null) === $mensajeNotaInterna,
        'QA-019: un error PDO se responde con mensaje genérico',
        $cuerpoNotaInterna
    );
    verificar(
        !contiene($cuerpoNotaInterna, [
            'SECRETO_INTERNO_QA019', 'SQLSTATE', 'historial_academico', 'PDOException', '45000',
        ]),
        'QA-019: la respuesta no filtra SQL, tablas ni mensajes internos',
        $cuerpoNotaInterna
    );

    $notaFechaInvalida = postJs(solicitar($base . '/clementina-docentes/controlador/guardar_nota.php', [
        'id_alumno' => 1,
        'id_carrera' => 1,
        'id_materia' => 1,
        'nota' => 8,
        'tipo_alumno' => 'R',
        'fecha_aprobacion' => '2026-02-31',
    ], $jarDocente, [], $csrfDocente));
    verificar(
        empty($notaFechaInvalida['ok'])
            && ($notaFechaInvalida['mensaje'] ?? null) === 'La fecha de aprobación no es válida.',
        'QA-019: una fecha imposible se rechaza antes de tocar la base',
        json_encode($notaFechaInvalida, JSON_UNESCAPED_UNICODE)
    );
    $pdo->exec('DROP TRIGGER qa019_falla_nota');

    $notaValida = postJs(solicitar($base . '/clementina-docentes/controlador/guardar_nota.php', [
        'id_alumno' => 1,
        'id_carrera' => 1,
        'id_materia' => 1,
        'nota' => 8,
        'tipo_alumno' => 'R',
    ], $jarDocente, [], $csrfDocente));
    verificar(
        !empty($notaValida['ok'])
            && (int) valorDb($pdo,
                'SELECT COUNT(*) FROM historial_academico
                 WHERE id_alumno = 1 AND id_carrera = 1 AND id_materia = 1 AND nota = 8'
            ) === 1,
        'QA-019: una nota válida sigue guardándose',
        json_encode($notaValida, JSON_UNESCAPED_UNICODE)
    );

    $datosPerfil = [
        'primer_nombre' => 'Confirmado',
        'otros_nombres' => '',
        'primer_apellido' => 'Uno',
        'otros_apellidos' => '',
        'email' => 'otro@qa.test',
        'telefono_principal' => '',
        'fecha_nacimiento' => '',
        'sexo' => '',
        'estado_civil' => '',
        'id_pais_nacimiento' => 'AR',
        'id_provincia' => '',
        'id_localidad_nacimiento' => '',
        'lugar_nacimiento_extranjero' => '',
        'cantidad_hijos' => 0,
        'cantidad_familiares_a_cargo' => 0,
    ];
    $emailDuplicado = postJs(solicitar($base . '/controlador/mis_datos.php', $datosPerfil, $jarAlumno, [], $csrfAlumno));
    verificar(
        empty($emailDuplicado['ok'])
            && ($emailDuplicado['mensaje'] ?? null) === $mensajeEmailDuplicado,
        'QA-020: el correo duplicado se responde con mensaje genérico',
        json_encode($emailDuplicado, JSON_UNESCAPED_UNICODE)
    );
    verificar(
        !contiene(json_encode($emailDuplicado, JSON_UNESCAPED_UNICODE), ['otro@qa.test', 'ya está registrado']),
        'QA-020: la respuesta no revela el correo ajeno',
        json_encode($emailDuplicado, JSON_UNESCAPED_UNICODE)
    );
    verificar(
        (string) valorDb($pdo, 'SELECT email FROM alumnos WHERE id_alumno = 1') === 'confirmado@qa.test',
        'QA-020: el correo propio permanece sin cambios'
    );

    require_once $dir . DIRECTORY_SEPARATOR . 'clementina-preceptores' . DIRECTORY_SEPARATOR . 'modelo' . DIRECTORY_SEPARATOR . 'ConfigAdmin.php';
    $config = new ConfigAdmin();
    $bajaBloqueada = $config->eliminar('carrera_materias', ['id_carrera' => 1, 'id_materia' => 1]);
    verificar(
        empty($bajaBloqueada['ok'])
            && contiene((string) ($bajaBloqueada['mensaje'] ?? ''), ['asignaciones docentes', 'matriculaciones', 'historial académico']),
        'QA-022: la baja bloquea asignaciones, matrículas e historial',
        json_encode($bajaBloqueada, JSON_UNESCAPED_UNICODE)
    );
    verificar(
        (int) valorDb($pdo,
            'SELECT COUNT(*) FROM carrera_materias WHERE id_carrera = 1 AND id_materia = 1'
        ) === 1,
        'QA-022: la relación bloqueada no se elimina'
    );

    $modificacionBloqueada = $config->actualizar(
        'carrera_materias',
        ['id_carrera' => 1, 'id_materia' => 1],
        ['id_carrera' => 1, 'id_materia' => 4, 'anio_cursada' => 2]
    );
    verificar(
        empty($modificacionBloqueada['ok'])
            && contiene((string) ($modificacionBloqueada['mensaje'] ?? ''), ['modificar', 'datos asociados']),
        'QA-022: no se puede reasignar una relación con dependencias',
        json_encode($modificacionBloqueada, JSON_UNESCAPED_UNICODE)
    );
    verificar(
        (int) valorDb($pdo,
            'SELECT COUNT(*) FROM carrera_materias WHERE id_carrera = 1 AND id_materia = 1'
        ) === 1,
        'QA-022: la relación bloqueada no se modifica'
    );

    $modificacionAnio = $config->actualizar(
        'carrera_materias',
        ['id_carrera' => 1, 'id_materia' => 1],
        ['id_carrera' => 1, 'id_materia' => 1, 'anio_cursada' => 2]
    );
    verificar(
        !empty($modificacionAnio['ok'])
            && (int) valorDb($pdo,
                'SELECT anio_cursada FROM carrera_materias WHERE id_carrera = 1 AND id_materia = 1'
            ) === 2,
        'QA-022: el año de cursada sí se puede actualizar',
        json_encode($modificacionAnio, JSON_UNESCAPED_UNICODE)
    );

    $bajaLibre = $config->eliminar('carrera_materias', ['id_carrera' => 1, 'id_materia' => 2]);
    verificar(
        !empty($bajaLibre['ok'])
            && (int) valorDb($pdo,
                'SELECT COUNT(*) FROM carrera_materias WHERE id_carrera = 1 AND id_materia = 2'
            ) === 0,
        'QA-022: una relación sin dependencias sí se puede eliminar',
        json_encode($bajaLibre, JSON_UNESCAPED_UNICODE)
    );

    $fkDirecto = false;
    try {
        $pdo->exec('DELETE FROM carrera_materias WHERE id_carrera = 1 AND id_materia = 1');
    } catch (PDOException $e) {
        $fkDirecto = (int) ($e->errorInfo[1] ?? 0) === 1451;
    }
    verificar($fkDirecto, 'QA-022: las FK impiden el borrado directo de la relación con dependencias');

    echo "\n$total verificaciones, $fallos fallos\n";
    $codigoSalida = $fallos === 0 ? 0 : 1;
} catch (Throwable $e) {
    echo '[FAIL] Error fatal: ' . $e->getMessage() . "\n";
} finally {
    if ($servidor !== null) {
        detenerServidor($servidor);
    }
    if ($pdo !== null) {
        try {
            $pdo->exec('DROP TRIGGER IF EXISTS qa019_falla_nota');
            $pdo = null;
            ejecutar($comandoMysql . ' -e ' . escapeshellarg('DROP DATABASE IF EXISTS `' . $db . '`;'));
        } catch (Throwable $e) {
            echo "[WARN] No se pudo eliminar la base temporal: " . $e->getMessage() . "\n";
        }
    }
    eliminarArbol($dir);
}

exit($codigoSalida);
