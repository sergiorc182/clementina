<?php
$raiz = dirname(__DIR__, 2);
$php = PHP_BINARY;
$mysql = getenv('CLEMENTINA_MYSQL') ?: 'C:\\xampp\\mysql\\bin\\mysql.exe';
$baseTemporal = getenv('CLEMENTINA_TEST_TMP') ?: sys_get_temp_dir();
$sufijo = date('YmdHis') . '_' . getmypid();
$dir = rtrim($baseTemporal, '\\/') . DIRECTORY_SEPARATOR . 'qa014_qa015_' . $sufijo;
$db = 'clementina_qa014_' . $sufijo;
$fallos = 0;
$total = 0;
$servidores = [];

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
        if ($entrada->isDir()) {
            if (!is_dir($destinoActual)) {
                mkdir($destinoActual, 0777, true);
            }
            continue;
        }
        $padre = dirname($destinoActual);
        if (!is_dir($padre)) {
            mkdir($padre, 0777, true);
        }
        copy($entrada->getPathname(), $destinoActual);
    }
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

function iniciarServidor(string $php, string $docroot, int $puerto, array $variables, string $prefijo): array
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
        1 => ['file', $docroot . DIRECTORY_SEPARATOR . $prefijo . '.out', 'w'],
        2 => ['file', $docroot . DIRECTORY_SEPARATOR . $prefijo . '.err', 'w'],
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

function solicitar(
    string $url,
    ?array $post = null,
    ?string $cookieJar = null,
    array $headers = [],
    ?string $csrf = null
): array {
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

function csrf(string $base, string $dir, string $prefijo): array
{
    $jar = $dir . DIRECTORY_SEPARATOR . 'cookies_' . $prefijo . '.txt';
    solicitar($base . '/controlador/verificar_correo.php', null, $jar);
    return [$jar, csrfDesdeJar($jar)];
}

function logoutConJar(string $base, string $jar): array
{
    return postJs(solicitar($base . '/controlador/cerrar_sesion.php', [], $jar, [], csrfDesdeJar($jar)));
}

function jsonRespuesta(array $respuesta): array
{
    $datos = json_decode(trim($respuesta['body']), true);
    return is_array($datos) ? $datos : [];
}

function postJs(array $respuesta): array
{
    return jsonRespuesta($respuesta);
}

function detenerServidores(array $procesos): void
{
    foreach ($procesos as $proceso) {
        if (!is_resource($proceso)) {
            continue;
        }
        $estado = proc_get_status($proceso);
        $pid = (int) ($estado['pid'] ?? 0);
        if ($pid > 0) {
            ejecutar('taskkill /PID ' . $pid . ' /T /F');
        }
        proc_terminate($proceso);
        proc_close($proceso);
    }
    usleep(300000);
}

function buscarTokenEnArbol(string $directorio, string $token): bool
{
    $iterador = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directorio, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterador as $entrada) {
        if ($entrada->isFile() && strpos((string) file_get_contents($entrada->getPathname()), $token) !== false) {
            return true;
        }
    }
    return false;
}

function crearAlumno(PDO $pdo, string $dni, string $email, bool $confirmado, string $hash): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO alumnos
           (id_tipo_documento, numero_documento, primer_apellido, primer_nombre,
            email, password_hash, alta_registro, confirmacion_registro)
         VALUES (\'DNI\', :dni, :apellido, :nombre, :email, :hash, NOW(), :confirmacion)'
    );
    $stmt->execute([
        ':dni' => (int) $dni,
        ':apellido' => 'Prueba',
        ':nombre' => 'Alumno',
        ':email' => $email,
        ':hash' => $hash,
        ':confirmacion' => $confirmado ? date('Y-m-d H:i:s') : null,
    ]);
    return (int) $pdo->lastInsertId();
}

function emitirToken(string $php, string $dir, int $id, string $email, string $dni): string
{
    $codigo = 'require ' . var_export($dir . DIRECTORY_SEPARATOR . 'modelo' . DIRECTORY_SEPARATOR . 'VerificacionCorreo.php', true)
        . '; $v = new VerificacionCorreo(); echo json_encode($v->emitir('
        . $id . ', ' . var_export($email, true) . ', ' . var_export($dni, true) . '));';
    $resultado = ejecutar(escapeshellarg($php) . ' -r ' . escapeshellarg($codigo), null, $dir);
    $datos = json_decode($resultado['salida'], true);
    if (!is_array($datos) || empty($datos['ok']) || !preg_match('/^[a-f0-9]{64}$/', (string) ($datos['token'] ?? ''))) {
        throw new RuntimeException('No se pudo emitir el token de prueba: ' . $resultado['error'] . $resultado['salida']);
    }
    return (string) $datos['token'];
}

function valorDb(PDO $pdo, string $sql, array $params = [])
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchColumn();
}

try {
    if (!is_file($mysql)) {
        throw new RuntimeException('No se encontró mysql.exe en ' . $mysql);
    }
    if (strpos($db, 'clementina_qa014_') !== 0) {
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

    $migracion = (string) file_get_contents($raiz . DIRECTORY_SEPARATOR . 'docs' . DIRECTORY_SEPARATOR . 'migracion_qa014_qa015.sql');
    $archivoMigracion = $dir . DIRECTORY_SEPARATOR . 'migracion.sql';
    file_put_contents($archivoMigracion, 'USE `' . $db . '`;' . PHP_EOL . $migracion);
    $aplicar = ejecutar($comandoMysql, $archivoMigracion);
    verificar($aplicar['codigo'] === 0, 'Migración QA-014/QA-015 aplicada', $aplicar['error']);

    $pdo = new PDO('mysql:host=localhost;dbname=' . $db . ';charset=utf8mb4', 'root', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec("INSERT IGNORE INTO tipos_documento (id_tipo_documento, descripcion) VALUES ('DNI', 'Documento Nacional de Identidad')");
    $pdo->exec("INSERT IGNORE INTO paises (id_pais, iso3, nombre, nacionalidad) VALUES ('ZZ', 'ZZZ', 'Sin especificar', 'Sin especificar')");

    verificar(
        (int) valorDb($pdo, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = :db AND table_name = 'verificaciones_correo'", [':db' => $db]) === 1,
        'Tabla verificaciones_correo presente'
    );
    verificar(
        (int) valorDb($pdo, "SELECT COUNT(DISTINCT index_name) FROM information_schema.statistics WHERE table_schema = :db AND table_name = 'verificaciones_correo' AND index_name = 'idx_verificacion_alumno_estado'", [':db' => $db]) === 1,
        'Índice de estado por alumno presente'
    );

    $hash = (string) password_hash('Clave123!', PASSWORD_DEFAULT);
    $idPendiente = crearAlumno($pdo, '22222222', 'pendiente@qa.test', false, $hash);
    $idConfirmado = crearAlumno($pdo, '11111111', 'confirmado@qa.test', true, $hash);
    $idReenvio = crearAlumno($pdo, '44444444', 'reenvio@qa.test', false, $hash);
    $pdo->exec("INSERT INTO personal (apellidos, nombres, usuario_sistema, password_hash, id_tipo_personal) VALUES ('Prueba', 'Docente', 'docente_qa', " . $pdo->quote($hash) . ", 'D')");
    $pdo->exec("INSERT INTO personal (apellidos, nombres, usuario_sistema, password_hash, id_tipo_personal) VALUES ('Prueba', 'Preceptor', 'preceptor_qa', " . $pdo->quote($hash) . ", 'A')");

    $puerto1 = puertoLibre();
    $puerto2 = puertoLibre();
    while ($puerto2 === $puerto1) {
        $puerto2 = puertoLibre();
    }
    $puerto3 = puertoLibre();
    while (in_array($puerto3, [$puerto1, $puerto2], true)) {
        $puerto3 = puertoLibre();
    }
    $variables = [
        'CLEMENTINA_MAIL_FROM' => 'no-reply@qa.test',
        'LOGIN_RATE_MAX' => '1000',
        'LOGIN_RATE_WINDOW' => '900',
        'APP_ENV' => 'testing',
    ];
    $servidor = iniciarServidor($php, $dir, $puerto1, $variables, 'servidor_principal');
    $servidores[] = $servidor['proceso'];
    $base = $servidor['base'];
    echo "Servidor de pruebas: $base\n";

    $tokenPendiente = emitirToken($php, $dir, $idPendiente, 'pendiente@qa.test', '22222222');
    verificar(
        (int) valorDb($pdo, 'SELECT COUNT(*) FROM verificaciones_correo WHERE id_alumno = :id', [':id' => $idPendiente]) === 1,
        'Token de cuenta pendiente persistido en MySQL'
    );
    verificar(
        (string) valorDb($pdo, 'SELECT token_hash FROM verificaciones_correo WHERE id_alumno = :id', [':id' => $idPendiente]) !== $tokenPendiente,
        'Token no se guarda en texto plano'
    );

    [$jarPendiente] = csrf($base, $dir, 'pendiente');
    $loginPendiente = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '22222222',
        'password' => 'Clave123!',
    ], $jarPendiente));
    verificar(
        empty($loginPendiente['ok']) && !empty($loginPendiente['verificacion_pendiente']),
        'QA-015: alumno pendiente no puede iniciar sesión',
        json_encode($loginPendiente, JSON_UNESCAPED_UNICODE)
    );

    $sesionPendiente = postJs(solicitar($base . '/controlador/verificar_sesion.php', null, $jarPendiente));
    verificar(
        empty($sesionPendiente['ok']),
        'QA-015: no se crea sesión autenticada antes de confirmar'
    );

    $archivoJson = $dir . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . '.registro_verificaciones.json';
    file_put_contents($archivoJson, json_encode(['tokens' => ['falso.token' => time() + 3600]]));
    $loginConJson = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '22222222',
        'password' => 'Clave123!',
    ], $jarPendiente));
    verificar(
        empty($loginConJson['ok']),
        'QA-015: archivo JSON favorable no habilita el login'
    );

    unlink($archivoJson);
    $loginSinJson = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '22222222',
        'password' => 'Clave123!',
    ], $jarPendiente));
    verificar(
        empty($loginSinJson['ok']) && !empty($loginSinJson['verificacion_pendiente']),
        'QA-015: borrar el JSON no habilita el login'
    );

    [$jarConfirmar, $csrfConfirmar] = csrf($base, $dir, 'confirmar');
    $confirmar = postJs(solicitar($base . '/controlador/verificar_correo.php', [
        'token' => $tokenPendiente,
    ], $jarConfirmar, [], $csrfConfirmar));
    verificar(
        !empty($confirmar['ok']),
        'QA-015: confirmación con token válida contra MySQL',
        json_encode($confirmar, JSON_UNESCAPED_UNICODE)
    );
    verificar(
        strpos($confirmar['mensaje'] ?? '', $tokenPendiente) === false,
        'QA-015: respuesta de confirmación no expone el token'
    );
    verificar(
        (string) valorDb($pdo, 'SELECT confirmacion_registro FROM alumnos WHERE id_alumno = :id', [':id' => $idPendiente]) !== '',
        'QA-015: confirmacion_registro pasa a NOT NULL en MySQL'
    );
    verificar(
        (string) valorDb($pdo, 'SELECT usada_en FROM verificaciones_correo WHERE id_alumno = :id', [':id' => $idPendiente]) !== '',
        'QA-015: token queda marcado como usado'
    );

    $reutilizar = postJs(solicitar($base . '/controlador/verificar_correo.php', [
        'token' => $tokenPendiente,
    ], $jarConfirmar, [], $csrfConfirmar));
    verificar(empty($reutilizar['ok']), 'QA-015: token de un solo uso rechazado en reintento');

    $jarConfirmado = $dir . DIRECTORY_SEPARATOR . 'cookies_confirmado.txt';
    $loginConfirmado = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '22222222',
        'password' => 'Clave123!',
    ], $jarConfirmado));
    verificar(!empty($loginConfirmado['ok']), 'Login exitoso luego de la confirmación');
    $sesionConfirmada = postJs(solicitar($base . '/controlador/verificar_sesion.php', null, $jarConfirmado));
    verificar(!empty($sesionConfirmada['ok']), 'Sesión autenticada disponible luego de la confirmación');

    [$jarRegistro, $csrfRegistro] = csrf($base, $dir, 'registro');
    $registro = postJs(solicitar($base . '/controlador/registro.php', [
        'primer_nombre' => 'Sin',
        'otros_nombres' => 'Correo',
        'primer_apellido' => 'Prueba',
        'dni' => '33333333',
        'email' => 'sin-correo@qa.test',
        'password' => 'Clave123!',
        'password2' => 'Clave123!',
    ], $jarRegistro, [], $csrfRegistro));
    verificar(
        !empty($registro['ok']) && !empty($registro['verificacion_pendiente']) && array_key_exists('correo_enviado', $registro),
        'QA-014: registro responde con estado de verificación explícito',
        json_encode($registro, JSON_UNESCAPED_UNICODE)
    );
    verificar(
        ($registro['correo_enviado'] ?? null) === false,
        'QA-014: fallo de correo simulado correctamente',
        json_encode($registro, JSON_UNESCAPED_UNICODE)
    );

    $idSinCorreo = (int) valorDb($pdo, 'SELECT id_alumno FROM alumnos WHERE numero_documento = :dni', [':dni' => 33333333]);
    verificar($idSinCorreo > 0, 'QA-014: cuenta creada a pesar del fallo de correo');
    verificar(
        (string) valorDb($pdo, 'SELECT confirmacion_registro FROM alumnos WHERE id_alumno = :id', [':id' => $idSinCorreo]) === '',
        'QA-014: cuenta queda pendiente en MySQL'
    );
    verificar(
        (int) valorDb($pdo, 'SELECT COUNT(*) FROM verificaciones_correo WHERE id_alumno = :id AND usada_en IS NULL AND revocada_en IS NULL', [':id' => $idSinCorreo]) === 1,
        'QA-014: token persiste aunque falle el correo'
    );

    $jarSinCorreo = $dir . DIRECTORY_SEPARATOR . 'cookies_sin_correo.txt';
    $loginSinCorreo = postJs(solicitar($base . '/controlador/login.php', [
        'usuario' => '33333333',
        'password' => 'Clave123!',
    ], $jarSinCorreo));
    verificar(
        empty($loginSinCorreo['ok']) && !empty($loginSinCorreo['verificacion_pendiente']),
        'QA-014: fallo de correo NO habilita login (fail-closed)',
        json_encode($loginSinCorreo, JSON_UNESCAPED_UNICODE)
    );
    $sesionSinCorreo = postJs(solicitar($base . '/controlador/verificar_sesion.php', null, $jarSinCorreo));
    verificar(empty($sesionSinCorreo['ok']), 'QA-014: no hay sesión autenticada cuando falló el correo');

    $tokenSinCorreo = emitirToken($php, $dir, $idSinCorreo, 'sin-correo@qa.test', '33333333');
    [$jarRecuperar, $csrfRecuperar] = csrf($base, $dir, 'recuperar');
    $recuperar = postJs(solicitar($base . '/controlador/verificar_correo.php', [
        'token' => $tokenSinCorreo,
    ], $jarRecuperar, [], $csrfRecuperar));
    verificar(!empty($recuperar['ok']), 'QA-014: ruta de recuperación por token funciona');
    verificar(
        strpos((string) file_get_contents($dir . DIRECTORY_SEPARATOR . 'servidor_principal.err'), $tokenSinCorreo) === false,
        'QA-014: token no aparece en logs del servidor'
    );
    verificar(!buscarTokenEnArbol($dir, $tokenSinCorreo), 'QA-014: token no aparece en archivos temporales');

    $tokenViejo = emitirToken($php, $dir, $idReenvio, 'reenvio@qa.test', '44444444');
    [$jarReenvio, $csrfReenvio] = csrf($base, $dir, 'reenvio');
    $reenvio = postJs(solicitar($base . '/controlador/reenviar_verificacion.php', [
        'email' => 'reenvio@qa.test',
    ], $jarReenvio, [], $csrfReenvio));
    verificar(!empty($reenvio['ok']), 'Reenvío: solicitud aceptada');
    verificar(
        strpos($reenvio['mensaje'] ?? '', 'reenvio@qa.test') === false,
        'Reenvío: mensaje no revela la cuenta'
    );
    verificar(
        (int) valorDb($pdo, 'SELECT COUNT(*) FROM verificaciones_correo WHERE id_alumno = :id AND usada_en IS NULL AND revocada_en IS NULL', [':id' => $idReenvio]) === 1,
        'Reenvío: queda exactamente un token activo'
    );
    verificar(
        (string) valorDb($pdo, 'SELECT revocada_en FROM verificaciones_correo WHERE token_hash = :hash', [':hash' => hash('sha256', $tokenViejo)]) !== '',
        'Reenvío: token anterior revocado'
    );
    $tokenViejoConfirm = postJs(solicitar($base . '/controlador/verificar_correo.php', [
        'token' => $tokenViejo,
    ], $jarReenvio, [], $csrfReenvio));
    verificar(empty($tokenViejoConfirm['ok']), 'Reenvío: token anterior deja de ser válido');

    $noExiste = postJs(solicitar($base . '/controlador/reenviar_verificacion.php', [
        'email' => 'no-existe@qa.test',
    ], $jarReenvio, [], $csrfReenvio));
    verificar(
        !empty($noExiste['ok']) && ($noExiste['mensaje'] ?? '') === ($reenvio['mensaje'] ?? ''),
        'Reenvío: correo inexistente responde igual que cuenta pendiente'
    );
    $yaConfirmado = postJs(solicitar($base . '/controlador/reenviar_verificacion.php', [
        'email' => 'pendiente@qa.test',
    ], $jarReenvio, [], $csrfReenvio));
    verificar(
        !empty($yaConfirmado['ok']) && ($yaConfirmado['mensaje'] ?? '') === ($reenvio['mensaje'] ?? ''),
        'Reenvío: correo ya confirmado responde igual'
    );

    $archivoIntentos = $dir . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . '.login_attempts.json';
    if (is_file($archivoIntentos)) {
        unlink($archivoIntentos);
    }
    $servidor2 = iniciarServidor($php, $dir, $puerto2, array_merge($variables, ['LOGIN_RATE_MAX' => '2']), 'servidor_rate');
    $servidores[] = $servidor2['proceso'];
    [$jarRate, $csrfRate] = csrf($servidor2['base'], $dir, 'rate');
    $rate1 = solicitar($servidor2['base'] . '/controlador/reenviar_verificacion.php', [
        'email' => 'reenvio@qa.test',
    ], $jarRate, [], $csrfRate);
    $rate2 = solicitar($servidor2['base'] . '/controlador/reenviar_verificacion.php', [
        'email' => 'reenvio@qa.test',
    ], $jarRate, [], $csrfRate);
    $rate3 = solicitar($servidor2['base'] . '/controlador/reenviar_verificacion.php', [
        'email' => 'reenvio@qa.test',
    ], $jarRate, [], $csrfRate);
    verificar($rate1['status'] === 200 && $rate2['status'] === 200, 'Reenvío: primeros dos intentos permitidos');
    verificar($rate3['status'] === 429 && empty(jsonRespuesta($rate3)['ok']), 'Reenvío: tercer intento bloqueado por rate limit');
    verificar(
        strpos($rate3['body'], 'reenvio@qa.test') === false,
        'Reenvío: respuesta de rate limit no revela la cuenta'
    );

    $paneles = [
        [
            'usuario' => 'docente_qa',
            'redirigir' => 'docente',
            'endpoint' => '/clementina-docentes/controlador/verificar_sesion.php',
            'etiqueta' => 'docente',
        ],
        [
            'usuario' => 'preceptor_qa',
            'redirigir' => 'admin',
            'endpoint' => '/clementina-preceptores/controlador/verificar_sesion.php',
            'etiqueta' => 'preceptor',
        ],
    ];
    foreach ($paneles as $indice => $panelPrueba) {
        $jarPanel = $dir . DIRECTORY_SEPARATOR . 'cookies_regresion_' . $indice . '.txt';
        $loginPanel = postJs(solicitar($base . '/controlador/login.php', [
            'usuario' => $panelPrueba['usuario'],
            'password' => 'Clave123!',
        ], $jarPanel));
        verificar(
            !empty($loginPanel['ok']) && ($loginPanel['redirigir'] ?? '') === $panelPrueba['redirigir'],
            'Regresión ' . $panelPrueba['etiqueta'] . ': login y redirección por rol',
            json_encode($loginPanel, JSON_UNESCAPED_UNICODE)
        );
        $sesionPanel = postJs(solicitar($base . $panelPrueba['endpoint'], null, $jarPanel));
        verificar(!empty($sesionPanel['ok']), 'Regresión ' . $panelPrueba['etiqueta'] . ': panel reconoce la sesión');
        $logout = logoutConJar($base, $jarPanel);
        verificar(!empty($logout['ok']), 'Regresión ' . $panelPrueba['etiqueta'] . ': logout revoca token/sesión');
        $sesionTrasLogout = postJs(solicitar($base . $panelPrueba['endpoint'], null, $jarPanel));
        verificar(empty($sesionTrasLogout['ok']), 'Regresión ' . $panelPrueba['etiqueta'] . ': panel rechaza sesión cerrada');
        $sesionRaizTrasLogout = postJs(solicitar($base . '/controlador/verificar_sesion.php', null, $jarPanel));
        verificar(empty($sesionRaizTrasLogout['ok']), 'Regresión ' . $panelPrueba['etiqueta'] . ': endpoint raíz rechaza sesión cerrada');
    }

    $servidor3 = iniciarServidor(
        $php,
        $dir,
        $puerto3,
        array_merge($variables, ['CLEMENTINA_MAIL_FROM' => '']),
        'servidor_sin_verificacion'
    );
    $servidores[] = $servidor3['proceso'];
    [$jarSinVerificacion, $csrfSinVerificacion] = csrf($servidor3['base'], $dir, 'sin_verificacion');
    $registroSinVerificacion = postJs(solicitar($servidor3['base'] . '/controlador/registro.php', [
        'primer_nombre' => 'Sin',
        'primer_apellido' => 'Verificacion',
        'dni' => '55555555',
        'email' => 'sin-verificacion@qa.test',
        'password' => 'Clave123!',
        'password2' => 'Clave123!',
    ], $jarSinVerificacion, [], $csrfSinVerificacion));
    verificar(
        !empty($registroSinVerificacion['ok'])
            && ($registroSinVerificacion['verificacion_pendiente'] ?? null) === false,
        'Compatibilidad: sin remitente configurado la cuenta queda confirmada',
        json_encode($registroSinVerificacion, JSON_UNESCAPED_UNICODE)
    );
    $idSinVerificacion = (int) valorDb($pdo, 'SELECT id_alumno FROM alumnos WHERE numero_documento = :dni', [':dni' => 55555555]);
    verificar(
        (string) valorDb($pdo, 'SELECT confirmacion_registro FROM alumnos WHERE id_alumno = :id', [':id' => $idSinVerificacion]) !== '',
        'Compatibilidad: confirmacion_registro queda NOT NULL'
    );
    $jarSinVerificacionLogin = $dir . DIRECTORY_SEPARATOR . 'cookies_sin_verificacion_login.txt';
    $loginSinVerificacion = postJs(solicitar($servidor3['base'] . '/controlador/login.php', [
        'usuario' => '55555555',
        'password' => 'Clave123!',
    ], $jarSinVerificacionLogin));
    verificar(!empty($loginSinVerificacion['ok']), 'Compatibilidad: login directo sin verificación');
} catch (Throwable $e) {
    verificar(false, 'Ejecución de la batería', $e->getMessage());
} finally {
    detenerServidores($servidores);
    if (isset($pdo)) {
        try {
            $pdo->exec('DROP DATABASE IF EXISTS `' . $db . '`');
        } catch (Throwable $e) {
            echo "[WARN] No se pudo eliminar la base temporal: " . $e->getMessage() . "\n";
        }
    }
    if (is_dir($dir) && getenv('CLEMENTINA_TEST_KEEP') !== '1') {
        $iterador = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterador as $entrada) {
            $ruta = $entrada->getPathname();
            if ($entrada->isDir()) {
                @rmdir($ruta);
            } else {
                @unlink($ruta);
            }
        }
        @rmdir($dir);
    } else {
        echo "Artefactos conservados en: $dir\n";
    }
}

echo "\nResumen: $total verificaciones, $fallos fallos.\n";
exit($fallos === 0 ? 0 : 1);
