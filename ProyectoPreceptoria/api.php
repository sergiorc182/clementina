<?php
declare(strict_types=1);

require_once __DIR__ . '/../controlador/_sesion.php';
require_once __DIR__ . '/../modelo/Conexion.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$origen = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$origenesPermitidos = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
];
if (in_array($origen, $origenesPermitidos, true)) {
    header('Access-Control-Allow-Origin: ' . $origen);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$db = Conexion::getInstancia()->getConexion();
$metodo = (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET');
$rutaCruda = (string) ($_GET['r'] ?? '');
$partesRuta = parse_url($rutaCruda);
if (!is_array($partesRuta)) {
    $partesRuta = [];
}
$ruta = '/' . trim((string) ($partesRuta['path'] ?? ''), '/');
if (!empty($partesRuta['query'])) {
    parse_str((string) $partesRuta['query'], $parametrosRuta);
    foreach ($parametrosRuta as $clave => $valor) {
        $_GET[$clave] = $valor;
    }
}
$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = [];
}

function responder(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function ok($data = [], string $message = '', array $extra = []): void
{
    $payload = array_merge(['success' => true], $extra);
    if ($message !== '') {
        $payload['message'] = $message;
    }
    $payload['data'] = $data;
    responder($payload);
}

function fail(string $message, int $status = 400, array $extra = []): void
{
    responder(array_merge(['success' => false, 'message' => $message], $extra), $status);
}

/** Requiere sesión válida (restaura desde cookie si aplica). */
function apiRequerirSesion(): array
{
    if (empty($_SESSION['id_usuario'])) {
        responder(['success' => false, 'message' => 'No autenticado.'], 401);
    }
    $nombre   = trim((string) ($_SESSION['nombre'] ?? ''));
    $apellido = trim((string) ($_SESSION['apellido'] ?? ''));
    return [
        'id'              => (int) $_SESSION['id_usuario'],
        'tipo'            => $_SESSION['tipo_usuario'] ?? 'alumno',
        'rol'             => $_SESSION['rol'] ?? 'alumno',
        'documento'       => $_SESSION['dni'] ?? null,
        'legajo'          => $_SESSION['legajo'] ?? null,
        'nombre'          => $nombre,
        'apellido'        => $apellido,
        'nombre_completo' => trim($nombre . ' ' . $apellido),
    ];
}

function apiRequerirPersonal(): array
{
    $u = apiRequerirSesion();
    if (($u['tipo'] ?? '') !== 'personal') {
        responder(['success' => false, 'message' => 'Acceso restringido al personal institucional.'], 403);
    }
    return $u;
}

function apiRequerirPreceptorODirectivo(): array
{
    $u = apiRequerirPersonal();
    if (!in_array($u['rol'] ?? '', ['preceptor', 'directivo', 'secretaria', 'personal'], true)) {
        responder(['success' => false, 'message' => 'Sin permisos para esta acción.'], 403);
    }
    return $u;
}

function apiRequerirDocenteOPreceptor(): array
{
    $u = apiRequerirPersonal();
    if (!in_array($u['rol'] ?? '', ['docente', 'preceptor'], true)) {
        responder(['success' => false, 'message' => 'Acceso restringido a docentes y preceptores.'], 403);
    }
    return $u;
}

function apiRequerirCsrf(): void
{
    $token = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? ''));
    $esperado = (string) ($_SESSION['csrf_token'] ?? '');
    if ($esperado === '' || $token === '' || !hash_equals($esperado, $token)) {
        responder(['success' => false, 'message' => 'Token CSRF inválido o ausente.'], 403);
    }
}

function sqlAll(string $sql, array $params = []): array
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function sqlOne(string $sql, array $params = []): ?array
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $fila = $stmt->fetch();
    return $fila === false ? null : $fila;
}

function sqlExec(string $sql, array $params = []): int
{
    global $db;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

function asegurarEstructura(): void
{
    static $hecho = false;
    if ($hecho) {
        return;
    }
    $hecho = true;
    global $db;

    $ddl = [
        "ALTER TABLE rendiciones_finales ADD COLUMN IF NOT EXISTS modalidad ENUM('REGULAR','LIBRE') NOT NULL DEFAULT 'REGULAR' AFTER estado",
        "ALTER TABLE rendiciones_finales MODIFY COLUMN estado ENUM('INSCRIPTO','APROBADO','DESAPROBADO','AUSENTE','BAJA') NOT NULL DEFAULT 'INSCRIPTO'",
        "ALTER TABLE rendiciones_finales ADD COLUMN IF NOT EXISTS reasignada TINYINT(1) NOT NULL DEFAULT 0 AFTER motivo_excepcion",
        "ALTER TABLE rendiciones_finales ADD COLUMN IF NOT EXISTS fecha_baja DATETIME DEFAULT NULL AFTER reasignada",
        "ALTER TABLE carrera_materias ADD COLUMN IF NOT EXISTS carga_horaria_semanal TINYINT NOT NULL DEFAULT 4",
        "ALTER TABLE carrera_materias ADD COLUMN IF NOT EXISTS exceptuada_libre TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE carrera_materias ADD COLUMN IF NOT EXISTS tipo_espacio VARCHAR(45) NOT NULL DEFAULT 'Asignatura'",
        "ALTER TABLE historial_academico ADD COLUMN IF NOT EXISTS observaciones VARCHAR(255) DEFAULT NULL",
    ];
    foreach ($ddl as $sql) {
        try {
            $db->exec($sql);
        } catch (Throwable $e) {
        }
    }

    $tablas = [
        "CREATE TABLE IF NOT EXISTS auditoria_inscripciones_finales (
            id BIGINT NOT NULL AUTO_INCREMENT,
            id_rendicion BIGINT NOT NULL,
            accion VARCHAR(40) NOT NULL,
            detalle_anterior VARCHAR(255) DEFAULT NULL,
            detalle_nuevo VARCHAR(255) DEFAULT NULL,
            fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modificado_por VARCHAR(100) DEFAULT 'Preceptoría',
            PRIMARY KEY (id), KEY fk_aud_rendicion (id_rendicion)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS materia_horarios (
            id_horario INT NOT NULL AUTO_INCREMENT,
            id_carrera INT NOT NULL,
            id_materia INT NOT NULL,
            dia_semana VARCHAR(20) NOT NULL,
            hora_inicio TIME NOT NULL,
            hora_fin TIME NOT NULL,
            id_sede INT DEFAULT 1,
            id_turno INT DEFAULT 3,
            aula VARCHAR(45) DEFAULT NULL,
            comision VARCHAR(20) DEFAULT 'Única',
            PRIMARY KEY (id_horario),
            KEY fk_horario_carrera_materia (id_carrera, id_materia)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
    ];
    foreach ($tablas as $sql) {
        try {
            $db->exec($sql);
        } catch (Throwable $e) {
        }
    }
}

function rolApi(): string
{
    if (empty($_SESSION['id_usuario'])) {
        return 'anon';
    }
    $tipo = strtolower((string) ($_SESSION['tipo_usuario'] ?? ''));
    if ($tipo === 'alumno' || $tipo === 'estudiante') {
        return 'alumno';
    }
    if ($tipo === 'personal') {
        $rol = strtolower(trim((string) ($_SESSION['rol'] ?? '')));
        $permitidos = ['docente', 'preceptor', 'directivo', 'secretaria', 'personal'];
        if (in_array($rol, $permitidos, true)) {
            return $rol;
        }
        return 'anon';
    }
    return 'anon';
}

function esVerdaderoApi($valor): bool
{
    if ($valor === null) {
        return false;
    }
    return in_array(strtoupper(trim((string) $valor)), ['1', 'T', 'V', 'S', 'TRUE'], true);
}

function historialPorAlumnoCarrera(int $idAlumno, int $idCarrera): array
{
    $filas = sqlAll(
        "SELECT ha.id_alumno, ha.id_carrera, ha.id_materia, m.nombre_materia, cm.anio_cursada,
                ha.anio_regular, ha.fecha_aprobacion, ha.nota, ha.tipo_alumno,
                ha.validado_regular, ha.validado_examen, ha.resolucion
         FROM historial_academico ha
         INNER JOIN materias m ON m.id_materia = ha.id_materia
         INNER JOIN carrera_materias cm ON cm.id_carrera = ha.id_carrera AND cm.id_materia = ha.id_materia
         WHERE ha.id_alumno = ? AND ha.id_carrera = ?",
        [$idAlumno, $idCarrera]
    );
    $mapa = [];
    foreach ($filas as $fila) {
        $tipo = strtoupper(trim((string) ($fila['tipo_alumno'] ?? '')));
        $anioRegular = (int) ($fila['anio_regular'] ?? 0);
        $examenValidado = esVerdaderoApi($fila['validado_examen'] ?? null);
        $regular = $anioRegular > 0
            || esVerdaderoApi($fila['validado_regular'] ?? null)
            || $examenValidado
            || $tipo === 'R';
        $aprobada = (int) ($fila['nota'] ?? 0) >= 4 || $examenValidado || !empty($fila['fecha_aprobacion']);
        $fila['regularizada'] = $regular;
        $fila['aprobada'] = $aprobada;
        $fila['cumple'] = $regular || $aprobada;
        $mapa[(int) $fila['id_materia']] = $fila;
    }
    return $mapa;
}

function instanciaNombre($num): string
{
    $n = (int) $num;
    $nombres = [1 => 'Febrero / Marzo', 2 => 'Junio / Julio', 3 => 'Diciembre'];
    return $nombres[$n] ?? ('Turno ' . $n);
}

function instanciaPasada(int $anio, int $instancia): bool
{
    $fin = [1 => [3, 31], 2 => [7, 31], 3 => [12, 31]][$instancia] ?? [12, 31];
    $zona = new DateTimeZone('America/Argentina/Buenos_Aires');
    $hoy = new DateTime('now', $zona);
    $limite = new DateTime(sprintf('%04d-%02d-%02d 23:59:59', $anio, $fin[0], $fin[1]), $zona);
    return $hoy > $limite;
}

function turnosTranscurridos(int $anioRegular, int $anioTurno, int $instancia): array
{
    $numero = 1 + ($anioTurno - ($anioRegular + 1)) * 3 + $instancia;
    $limiteAnio = $anioRegular + 3;
    return [
        'numero' => $numero,
        'cumple' => $numero <= 8,
        'anterior' => $anioTurno < $anioRegular,
        'limite' => 'Febrero/Marzo ' . $limiteAnio . ' (Turno #8)',
    ];
}

function mapearRendicion(array $fila): array
{
    $fila['modalidad'] = $fila['modalidad'] ?? 'REGULAR';
    $fila['nombre_instancia'] = instanciaNombre($fila['turno_instancia'] ?? 0);
    $ausente = !empty($fila['es_ausente']);
    $estado = (string) ($fila['estado'] ?? '');
    $nota = $fila['nota'] ?? null;
    $fila['es_falla'] = !$ausente && $estado !== 'AUSENTE' && $estado !== 'BAJA' && (($nota !== null && (int) $nota < 4) || $estado === 'DESAPROBADO');
    return $fila;
}

function auditar(int $idRendicion, string $accion, ?string $anterior, string $nuevo, string $por): void
{
    try {
        sqlExec(
            "INSERT INTO auditoria_inscripciones_finales (id_rendicion, accion, detalle_anterior, detalle_nuevo, modificado_por) VALUES (?, ?, ?, ?, ?)",
            [$idRendicion, $accion, $anterior, $nuevo, $por]
        );
    } catch (Throwable $e) {
    }
}

function evaluarCondiciones(array $b): array
{
    asegurarEstructura();

    $idAlumno = (int) ($b['id_alumno'] ?? 0);
    $idCarrera = (int) ($b['id_carrera'] ?? 0);
    $idMateria = (int) ($b['id_materia'] ?? 0);
    $anioTurno = (int) ($b['anio_turno'] ?? date('Y'));
    $instancia = !empty($b['turno_instancia']) ? (int) $b['turno_instancia'] : null;
    $modalidad = strtoupper((string) ($b['modalidad'] ?? 'REGULAR')) === 'LIBRE' ? 'LIBRE' : 'REGULAR';
    $esExcepcion = !empty($b['es_excepcion']);

    $base = sqlOne(
        "SELECT a.id_alumno, a.primer_nombre, a.primer_apellido, a.numero_documento, a.email,
                c.id_carrera, c.nombre_carrera, m.id_materia, m.nombre_materia,
                cm.exceptuada_libre, cm.tipo_espacio
         FROM alumnos a
         CROSS JOIN carrera_materias cm ON cm.id_carrera = ? AND cm.id_materia = ?
         JOIN carreras c ON c.id_carrera = cm.id_carrera
         JOIN materias m ON m.id_materia = cm.id_materia
         WHERE a.id_alumno = ?",
        [$idCarrera, $idMateria, $idAlumno]
    );
    if (!$base) {
        fail('Alumno, carrera o materia no encontrados en la base de datos');
    }

    $historial = sqlOne(
        "SELECT anio_regular, validado_regular, nota, validado_examen, fecha_aprobacion, tipo_alumno
         FROM historial_academico WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?",
        [$idAlumno, $idCarrera, $idMateria]
    );
    $anioRegular = (int) ($historial['anio_regular'] ?? 0);
    $tipoAlumno = strtoupper(trim((string) ($historial['tipo_alumno'] ?? '')));
    $regularPorHistorial = esVerdaderoApi($historial['validado_regular'] ?? null)
        || esVerdaderoApi($historial['validado_examen'] ?? null)
        || $tipoAlumno === 'R';
    $regularValidado = $anioRegular > 0 || $regularPorHistorial;
    $exceptuada = !empty($base['exceptuada_libre']);
    $tipoEspacio = (string) ($base['tipo_espacio'] ?? 'Asignatura');

    $correlativas = [];
    try {
        $correlativas = sqlAll(
            "SELECT corr.id_materia_correlativa, m.nombre_materia, cm.anio_cursada,
                    ha.anio_regular, ha.validado_regular, ha.nota AS nota_historial, ha.validado_examen,
                    ha.fecha_aprobacion, ha.tipo_alumno
             FROM correlatividades corr
             JOIN materias m ON m.id_materia = corr.id_materia_correlativa
             LEFT JOIN carrera_materias cm ON cm.id_carrera = corr.id_carrera AND cm.id_materia = corr.id_materia_correlativa
             LEFT JOIN historial_academico ha ON ha.id_alumno = ? AND ha.id_carrera = corr.id_carrera AND ha.id_materia = corr.id_materia_correlativa
             WHERE corr.id_carrera = ? AND corr.id_materia = ? AND corr.id_materia_correlativa IS NOT NULL
               AND corr.id_materia_correlativa > 0 AND corr.id_materia_correlativa != corr.id_materia
               AND LOWER(TRIM(m.nombre_materia)) NOT IN ('', '-', 'ninguna', 'sin correlativa', 'sin correlativas', 'no tiene')
             ORDER BY cm.anio_cursada ASC, m.id_materia ASC",
            [$idAlumno, $idCarrera, $idMateria]
        );
    } catch (Throwable $e) {
        $correlativas = [];
    }

    $correlativasDetalle = [];
    $cumpleCorrelativas = true;
    foreach ($correlativas as $c) {
        $finalAprobado = esVerdaderoApi($c['validado_examen'] ?? null)
            || ((int) ($c['nota_historial'] ?? 0) >= 4)
            || !empty($c['fecha_aprobacion']);
        $tipoCorrelativa = strtoupper(trim((string) ($c['tipo_alumno'] ?? '')));
        $esRegular = (int) ($c['anio_regular'] ?? 0) > 0
            || esVerdaderoApi($c['validado_regular'] ?? null)
            || esVerdaderoApi($c['validado_examen'] ?? null)
            || $tipoCorrelativa === 'R';
        $cumpleCorrelativas = $cumpleCorrelativas && ($finalAprobado || $esRegular);
        $correlativasDetalle[] = [
            'id_materia_correlativa' => $c['id_materia_correlativa'],
            'nombre_materia_correlativa' => $c['nombre_materia'],
            'cumple' => $finalAprobado || $esRegular,
        ];
    }
    $condCorrelatividades = [
        'cumple' => $cumpleCorrelativas,
        'tieneCorrelativas' => count($correlativasDetalle) > 0,
        'correlativas' => $correlativasDetalle,
        'detalle' => count($correlativasDetalle) === 0
            ? 'Cumplida: La materia no posee espacios curriculares anteriores requeridos como correlativos.'
            : ($cumpleCorrelativas ? 'Correlatividades cumplidas.' : 'Correlatividades pendientes.'),
    ];

    if ($modalidad === 'REGULAR') {
        $condRegularidad = [
            'cumple' => $regularValidado,
            'exceptuadaLibre' => $exceptuada,
            'tipoEspacio' => $tipoEspacio,
            'detalle' => !$regularValidado
                ? 'El estudiante no registra la cursada regularizada en su historial académico.'
                : ($anioRegular > 0
                    ? 'Materia regularizada en el ciclo lectivo ' . $anioRegular . '.'
                    : 'Materia regularizada según la condición registrada en el historial académico.'),
        ];
    } else {
        $condRegularidad = [
            'cumple' => !$exceptuada && $cumpleCorrelativas,
            'exceptuadaLibre' => $exceptuada,
            'tipoEspacio' => $tipoEspacio,
            'detalle' => $exceptuada
                ? 'No se puede inscribir como libre: el espacio curricular "' . $base['nombre_materia'] . '" (' . $tipoEspacio . ') no admite condición Libre por excepción normativa institucional.'
                : 'Modalidad LIBRE habilitada: El espacio curricular admite examen libre (se validan correlatividades previas).',
        ];
    }

    $aprobada = sqlOne(
        "SELECT id_rendicion, nota FROM rendiciones_finales
         WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ? AND estado != 'BAJA'
           AND (estado = 'APROBADO' OR (nota IS NOT NULL AND nota >= 4)) LIMIT 1",
        [$idAlumno, $idCarrera, $idMateria]
    );
    $condNoAprobada = [
        'cumple' => $aprobada === null,
        'detalle' => $aprobada !== null
            ? 'La materia ya se encuentra aprobada con calificación ' . $aprobada['nota'] . '. No se permite nueva inscripción.'
            : 'La materia aún no ha sido aprobada. Habilitado para rendir.',
    ];

    if ($modalidad === 'REGULAR' && $anioRegular > 0) {
        $calc = turnosTranscurridos($anioRegular, $anioTurno, $instancia ?? 3);
        $condPlazoTurnos = [
            'cumple' => $calc['cumple'] && !$calc['anterior'],
            'detalle' => !$calc['cumple']
                ? 'Plazo vencido: El turno solicitado corresponde al turno #' . $calc['numero'] . ' desde que regularizó en ' . $anioRegular . '. El límite reglamentario es de 8 turnos (venció en ' . $calc['limite'] . '). El estudiante debe recursar.'
                : ($calc['anterior']
                    ? 'El turno seleccionado es anterior a la fecha de regularización (Diciembre ' . $anioRegular . ').'
                    : 'Turno #' . $calc['numero'] . ' de 8 permitidos. Regularidad vigente hasta ' . $calc['limite'] . '.'),
        ];
    } elseif ($modalidad === 'REGULAR' && $regularValidado) {
        $condPlazoTurnos = [
            'cumple' => true,
            'detalle' => 'Regularidad registrada en el historial académico sin año de cursada; no se aplica el cálculo de 8 turnos.',
        ];
    } elseif ($modalidad === 'REGULAR') {
        $condPlazoTurnos = [
            'cumple' => false,
            'detalle' => 'No se puede evaluar el plazo de 8 turnos sin una regularización vigente.',
        ];
    } else {
        $condPlazoTurnos = [
            'cumple' => true,
            'detalle' => 'En Modalidad LIBRE no aplica el cálculo de vencimiento de 8 turnos de regularidad.',
        ];
    }

    $fallas = sqlAll(
        "SELECT id_rendicion, anio_turno, turno_instancia, id_llamado, fecha_examen, nota, estado, es_ausente, es_excepcion
         FROM rendiciones_finales
         WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ? AND es_ausente = 0
           AND estado NOT IN ('AUSENTE','BAJA')
           AND ((nota IS NOT NULL AND nota < 4) OR estado = 'DESAPROBADO')
         ORDER BY anio_turno ASC, turno_instancia ASC",
        [$idAlumno, $idCarrera, $idMateria]
    );
    $ausentes = sqlOne(
        "SELECT COUNT(*) AS total FROM rendiciones_finales
         WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ? AND (es_ausente = 1 OR estado = 'AUSENTE')",
        [$idAlumno, $idCarrera, $idMateria]
    );
    $cantFallas = count($fallas);
    $cantAusentes = (int) ($ausentes['total'] ?? 0);
    $notaAusentes = $cantAusentes > 0
        ? ' (Registra ' . $cantAusentes . ' ausencia' . ($cantAusentes !== 1 ? 's' : '') . ' que no computa' . ($cantAusentes !== 1 ? 'n' : '') . ' como falla).'
        : '';
    $condFallas = [
        'cumple' => $modalidad === 'LIBRE' || $cantFallas <= 3,
        'cantidadFallas' => $cantFallas,
        'historialFallas' => $fallas,
        'detalle' => $modalidad === 'LIBRE'
            ? 'Las ausencias no computan como falla.'
            : ($cantFallas === 0 ? 'No registra aplazos en exámenes finales de esta materia.' . $notaAusentes : 'Registra ' . $cantFallas . ' falla(s) (aplazos) de 3 permitidas.' . $notaAusentes),
    ];

    if ($instancia === null) {
        $condVigencia = [
            'cumple' => false,
            'pendiente' => true,
            'detalle' => 'Pendiente: Seleccione una Instancia de Turno en el menú desplegable.',
        ];
    } else {
        $pasada = instanciaPasada($anioTurno, $instancia);
        $condVigencia = [
            'cumple' => $esExcepcion || !$pasada,
            'pendiente' => false,
            'detalle' => $pasada
                ? 'El turno seleccionado (' . instanciaNombre($instancia) . ' ' . $anioTurno . ') corresponde a un período anterior a hoy (ya finalizado). No admite nuevas inscripciones ordinarias.'
                : 'El turno seleccionado (' . instanciaNombre($instancia) . ' ' . $anioTurno . ') se encuentra vigente para inscripción.',
        ];
    }

    $cumpleAcademicas = $modalidad === 'REGULAR'
        ? ($condRegularidad['cumple'] && $condNoAprobada['cumple'] && $condPlazoTurnos['cumple'] && $condFallas['cumple'])
        : ($condRegularidad['cumple'] && $condCorrelatividades['cumple'] && $condNoAprobada['cumple']);
    $cumpleTodas = $cumpleAcademicas && $condVigencia['cumple'];
    $motivos = [];
    foreach (['regularidad' => $condRegularidad, 'noAprobada' => $condNoAprobada, 'plazoTurnos' => $condPlazoTurnos, 'limiteFallas' => $condFallas, 'correlatividades' => $condCorrelatividades, 'vigenciaTurno' => $condVigencia] as $clave => $cond) {
        if (empty($cond['cumple'])) {
            $motivos[] = $clave . ': ' . $cond['detalle'];
        }
    }

    return [
        'aptoParaInscribirse' => (bool) ($esExcepcion || $cumpleTodas),
        'cumpleCondicionesAcademicas' => $cumpleAcademicas,
        'modalidad' => $modalidad,
        'esExcepcion' => $esExcepcion,
        'cumpleTodasLasReglas' => $cumpleTodas,
        'motivosRechazo' => $motivos,
        'alumno' => [
            'id_alumno' => $base['id_alumno'],
            'nombre_completo' => $base['primer_apellido'] . ', ' . $base['primer_nombre'],
            'dni' => $base['numero_documento'],
            'email' => $base['email'],
        ],
        'materia' => [
            'id_materia' => $base['id_materia'],
            'nombre_materia' => $base['nombre_materia'],
            'id_carrera' => $base['id_carrera'],
            'nombre_carrera' => $base['nombre_carrera'],
        ],
        'turnoSeleccionado' => [
            'anio' => $anioTurno,
            'instancia' => $instancia,
            'nombre_instancia' => $instancia === null ? 'Sin seleccionar' : instanciaNombre($instancia),
        ],
        'condiciones' => [
            'regularidad' => $condRegularidad,
            'noAprobada' => $condNoAprobada,
            'plazoTurnos' => $condPlazoTurnos,
            'limiteFallas' => $condFallas,
            'correlatividades' => $condCorrelatividades,
            'vigenciaTurno' => $condVigencia,
        ],
    ];
}

function selectAlumnosBase(): string
{
    return "SELECT a.id_alumno, a.id_alumno AS id, a.id_tipo_documento, a.numero_documento, a.legajo,
        a.primer_apellido, a.otros_apellidos, a.primer_nombre, a.otros_nombres,
        CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), '')) AS apellido,
        CONCAT(a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), '')) AS nombre,
        a.email, c.id_carrera, COALESCE(c.nombre_carrera, 'Sin Carrera Asignada') AS carrera, c.nombre_carrera_corto
        FROM alumnos a
        LEFT JOIN matriculacion m ON a.id_alumno = m.id_alumno
        LEFT JOIN carreras c ON m.id_carrera = c.id_carrera";
}

if ($ruta === '/alumnos' && $metodo === 'GET') {
    $u = apiRequerirSesion();
    if (($u['tipo'] ?? '') === 'alumno') {
        $alumnos = sqlAll(selectAlumnosBase() . ' WHERE a.id_alumno = ?', [(int) $u['id']]);
        responder(['success' => true, 'total' => count($alumnos), 'data' => $alumnos]);
    }
    apiRequerirPersonal();
    $alumnos = sqlAll(selectAlumnosBase() . ' ORDER BY a.id_alumno DESC');
    responder(['success' => true, 'total' => count($alumnos), 'data' => $alumnos]);
}

if ($ruta === '/alumnos/catalogo/carreras' && $metodo === 'GET') {
    apiRequerirPersonal();
    $carreras = sqlAll('SELECT id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto, titulo FROM carreras ORDER BY id_carrera');
    ok($carreras);
}

if (preg_match('#^/alumnos/(\d+)$#', $ruta, $m) && $metodo === 'GET') {
    $u = apiRequerirSesion();
    $idPedido = (int) $m[1];
    if (($u['tipo'] ?? '') === 'alumno' && (int) $u['id'] !== $idPedido) {
        responder(['success' => false, 'message' => 'No autorizado para ver este alumno.'], 403);
    }
    if (($u['tipo'] ?? '') === 'personal') {
        // ok
    } else {
        // alumno ya validado arriba
    }
    $alumno = sqlOne(selectAlumnosBase() . ' WHERE a.id_alumno = ?', [$idPedido]);
    if (!$alumno) {
        fail('Alumno con ID ' . $idPedido . ' no encontrado en base de datos clementina', 404);
    }
    ok($alumno);
}

if ($ruta === '/alumnos' && $metodo === 'POST') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    $nombre = trim((string) ($input['nombre'] ?? ''));
    $apellido = trim((string) ($input['apellido'] ?? ''));
    $email = trim((string) ($input['email'] ?? ''));
    $carrera = (string) ($input['carrera'] ?? '');
    if ($nombre === '' || $apellido === '' || $email === '' || $carrera === '') {
        fail('Campos requeridos: nombre, apellido, email y carrera');
    }
    $carreraFila = sqlOne(
        "SELECT id_carrera FROM carreras WHERE id_carrera = ? OR nombre_carrera = ? OR nombre_carrera LIKE ? OR nombre_carrera_corto = ? LIMIT 1",
        [$carrera, $carrera, '%' . $carrera . '%', $carrera]
    );
    $idCarrera = (int) ($carreraFila['id_carrera'] ?? 1);
    $doc = (string) ($input['numero_documento'] ?? (string) random_int(10000000, 99999999));
    $legajo = (string) ($input['legajo'] ?? ('LEG-' . date('Y') . '-' . random_int(100, 999)));
    $tipoDoc = (string) ($input['id_tipo_documento'] ?? 'DNI');
    sqlExec(
        "INSERT INTO alumnos (id_tipo_documento, numero_documento, legajo, primer_apellido, primer_nombre, email, id_pais_nacimiento, alta_registro) VALUES (?, ?, ?, ?, ?, ?, 'AR', NOW())",
        [$tipoDoc, $doc, $legajo, $apellido, $nombre, $email]
    );
    $idNuevo = (int) $db->lastInsertId();
    sqlExec(
        "INSERT INTO matriculacion (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta) VALUES (?, ?, ?, 3, 1, NOW())",
        [$idNuevo, $idCarrera, (int) date('Y')]
    );
    $usuarioCreado = ['creado' => false, 'email' => strtolower($email), 'motivo' => 'La creación de usuario RBAC no está disponible en el despliegue PHP.'];
    if (!empty($input['crear_usuario'])) {
        try {
            $existe = sqlOne('SELECT id FROM users WHERE email = ? LIMIT 1', [strtolower($email)]);
            $rol = sqlOne("SELECT id FROM roles WHERE name = 'ALUMNO' LIMIT 1");
            if (!$existe && $rol) {
                $clave = (string) ($input['password_inicial'] ?? $doc);
                sqlExec(
                    'INSERT INTO users (email, password_hash, first_name, last_name, role_id, id_alumno, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
                    [strtolower($email), password_hash($clave, PASSWORD_BCRYPT), $nombre, $apellido, $rol['id'], $idNuevo]
                );
                $usuarioCreado = ['creado' => true, 'email' => strtolower($email), 'password_inicial' => $clave];
            }
        } catch (Throwable $e) {
        }
    }
    $alumno = sqlOne(selectAlumnosBase() . ' WHERE a.id_alumno = ?', [$idNuevo]);
    if ($alumno) {
        $alumno['usuario_creado'] = $usuarioCreado;
    }
    responder(['success' => true, 'message' => 'Alumno registrado y matriculado correctamente', 'data' => $alumno, 'usuario_creado' => $usuarioCreado]);
}

if (preg_match('#^/alumnos/(\d+)$#', $ruta, $m) && $metodo === 'PUT') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    $id = (int) $m[1];
    $nombre = trim((string) ($input['nombre'] ?? ''));
    $apellido = trim((string) ($input['apellido'] ?? ''));
    $email = trim((string) ($input['email'] ?? ''));
    $carrera = (string) ($input['carrera'] ?? '');
    if ($nombre === '' || $apellido === '' || $email === '' || $carrera === '') {
        fail('Campos requeridos: nombre, apellido, email y carrera');
    }
    if (!sqlOne('SELECT id_alumno FROM alumnos WHERE id_alumno = ?', [$id])) {
        fail('Alumno con ID ' . $id . ' no encontrado en base de datos clementina', 404);
    }
    sqlExec(
        'UPDATE alumnos SET primer_nombre = ?, primer_apellido = ?, email = ?, numero_documento = COALESCE(?, numero_documento) WHERE id_alumno = ?',
        [$nombre, $apellido, $email, ($input['numero_documento'] ?? null) ?: null, $id]
    );
    $carreraFila = sqlOne(
        'SELECT id_carrera FROM carreras WHERE id_carrera = ? OR nombre_carrera = ? OR nombre_carrera LIKE ? OR nombre_carrera_corto = ? LIMIT 1',
        [$carrera, $carrera, '%' . $carrera . '%', $carrera]
    );
    if ($carreraFila) {
        $idCarrera = (int) $carreraFila['id_carrera'];
        if (sqlOne('SELECT id_alumno FROM matriculacion WHERE id_alumno = ?', [$id])) {
            sqlExec('UPDATE matriculacion SET id_carrera = ?, fecha_mod = NOW() WHERE id_alumno = ?', [$idCarrera, $id]);
        } else {
            sqlExec('INSERT INTO matriculacion (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta) VALUES (?, ?, ?, 3, 1, NOW())', [$id, $idCarrera, (int) date('Y')]);
        }
    }
    ok([], 'Alumno actualizado con éxito en clementina');
}

if (preg_match('#^/alumnos/(\d+)$#', $ruta, $m) && $metodo === 'DELETE') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    $id = (int) $m[1];
    if (!sqlOne('SELECT id_alumno FROM alumnos WHERE id_alumno = ?', [$id])) {
        fail('Alumno con ID ' . $id . ' no encontrado en base de datos clementina', 404);
    }
    try {
        sqlExec('DELETE FROM users WHERE id_alumno = ?', [$id]);
    } catch (Throwable $e) {
        try {
            sqlExec('UPDATE users SET id_alumno = NULL, is_active = 0 WHERE id_alumno = ?', [$id]);
        } catch (Throwable $e2) {
        }
    }
    try {
        sqlExec('DELETE FROM matriculacion WHERE id_alumno = ?', [$id]);
    } catch (Throwable $e) {
    }
    try {
        sqlExec('DELETE FROM domicilios_alumno WHERE id_alumno = ?', [$id]);
    } catch (Throwable $e) {
    }
    try {
        sqlExec('DELETE FROM alumnos WHERE id_alumno = ?', [$id]);
    } catch (Throwable $e) {
        fail('No se pudo eliminar el alumno: ' . $e->getMessage(), 400);
    }
    ok([], 'Alumno #' . $id . ' eliminado correctamente de clementina');
}

if (preg_match('#^/finales/materias/(\d+)$#', $ruta, $m) && $metodo === 'GET') {
    $materias = sqlAll(
        'SELECT m.id_materia, m.nombre_materia, cm.anio_cursada, cm.id_carrera, c.nombre_carrera
         FROM carrera_materias cm JOIN materias m ON m.id_materia = cm.id_materia
         JOIN carreras c ON c.id_carrera = cm.id_carrera
         WHERE cm.id_carrera = ? ORDER BY cm.anio_cursada ASC, m.nombre_materia ASC',
        [(int) $m[1]]
    );
    ok($materias);
}

if (preg_match('#^/finales/alumno/(\d+)$#', $ruta, $m) && $metodo === 'GET') {
    $u = apiRequerirSesion();
    $idPedido = (int) $m[1];
    if (($u['tipo'] ?? '') === 'alumno' && (int) $u['id'] !== $idPedido) {
        responder(['success' => false, 'message' => 'No autorizado.'], 403);
    }
    if (($u['tipo'] ?? '') !== 'alumno' && ($u['tipo'] ?? '') !== 'personal') {
        responder(['success' => false, 'message' => 'No autorizado.'], 403);
    }
    asegurarEstructura();
    $params = [$idPedido];
    $extra = '';
    if (!empty($_GET['id_materia'])) {
        $extra = ' AND rf.id_materia = ?';
        $params[] = (int) $_GET['id_materia'];
    }
    $filas = sqlAll(
        "SELECT rf.*, a.primer_apellido, a.primer_nombre, a.numero_documento, c.nombre_carrera, m.nombre_materia,
                ha.anio_regular, ha.validado_regular
         FROM rendiciones_finales rf
         JOIN alumnos a ON a.id_alumno = rf.id_alumno
         JOIN carreras c ON c.id_carrera = rf.id_carrera
         JOIN materias m ON m.id_materia = rf.id_materia
         LEFT JOIN historial_academico ha ON ha.id_alumno = rf.id_alumno AND ha.id_carrera = rf.id_carrera AND ha.id_materia = rf.id_materia
         WHERE rf.id_alumno = ?" . $extra . ' ORDER BY rf.anio_turno DESC, rf.turno_instancia DESC, rf.id_rendicion DESC',
        $params
    );
    ok(array_map('mapearRendicion', $filas));
}

if ($ruta === '/finales/listado' && $metodo === 'GET') {
    apiRequerirDocenteOPreceptor();
    asegurarEstructura();
    $filas = sqlAll(
        "SELECT rf.*, a.primer_apellido, a.otros_apellidos, a.primer_nombre, a.otros_nombres,
                a.numero_documento, a.legajo, a.email, c.nombre_carrera, c.nombre_carrera_corto,
                m.nombre_materia, cm.anio_cursada, ha.anio_regular, ha.validado_regular
         FROM rendiciones_finales rf
         JOIN alumnos a ON a.id_alumno = rf.id_alumno
         JOIN carreras c ON c.id_carrera = rf.id_carrera
         JOIN materias m ON m.id_materia = rf.id_materia
         LEFT JOIN carrera_materias cm ON cm.id_carrera = rf.id_carrera AND cm.id_materia = rf.id_materia
         LEFT JOIN historial_academico ha ON ha.id_alumno = rf.id_alumno AND ha.id_carrera = rf.id_carrera AND ha.id_materia = rf.id_materia
         ORDER BY rf.anio_turno DESC, rf.turno_instancia DESC, rf.id_llamado ASC, c.nombre_carrera ASC, m.nombre_materia ASC, a.primer_apellido ASC, a.primer_nombre ASC"
    );
    ok(array_map('mapearRendicion', $filas));
}

if ($ruta === '/finales/validar' && $metodo === 'POST') {
    $u = apiRequerirSesion();
    apiRequerirCsrf();
    if (empty($input['id_alumno']) || empty($input['id_carrera']) || empty($input['id_materia'])) {
        fail('Faltan parámetros obligatorios: id_alumno, id_carrera, id_materia');
    }
    $idAlumnoReq = (int) $input['id_alumno'];
    if (($u['tipo'] ?? '') === 'alumno' && (int) $u['id'] !== $idAlumnoReq) {
        responder(['success' => false, 'message' => 'No autorizado.'], 403);
    }
    $esExcepcion = false;
    if (($u['tipo'] ?? '') !== 'alumno') {
        apiRequerirDocenteOPreceptor();
        $esExcepcion = !empty($input['es_excepcion']);
    }
    $evaluacion = evaluarCondiciones([
        'id_alumno' => $input['id_alumno'],
        'id_carrera' => $input['id_carrera'],
        'id_materia' => $input['id_materia'],
        'anio_turno' => $input['anio_turno'] ?? date('Y'),
        'turno_instancia' => $input['turno_instancia'] ?? null,
        'modalidad' => $input['modalidad'] ?? 'REGULAR',
        'es_excepcion' => $esExcepcion,
    ]);
    ok($evaluacion);
}

if ($ruta === '/finales/inscribir' && $metodo === 'POST') {
    $u = apiRequerirSesion();
    apiRequerirCsrf();
    foreach (['id_alumno', 'id_carrera', 'id_materia', 'anio_turno', 'turno_instancia'] as $campo) {
        if (empty($input[$campo])) {
            fail('Faltan campos obligatorios para la inscripción');
        }
    }
    $idAlumno = (int) $input['id_alumno'];
    if (($u['tipo'] ?? '') === 'alumno' && (int) $u['id'] !== $idAlumno) {
        responder(['success' => false, 'message' => 'No autorizado: solo puede inscribirse a sí mismo.'], 403);
    }
    $esExcepcion = false;
    if (($u['tipo'] ?? '') !== 'alumno') {
        apiRequerirDocenteOPreceptor();
        $esExcepcion = !empty($input['es_excepcion']);
    } else {
        if (!empty($input['es_excepcion'])) {
            fail('Los usuarios con rol de alumno no están habilitados para inscribirse por excepción', 403);
        }
    }
    $evaluacion = evaluarCondiciones([
        'id_alumno' => $idAlumno,
        'id_carrera' => (int) $input['id_carrera'],
        'id_materia' => (int) $input['id_materia'],
        'anio_turno' => (int) $input['anio_turno'],
        'turno_instancia' => (int) $input['turno_instancia'],
        'modalidad' => $input['modalidad'] ?? 'REGULAR',
        'es_excepcion' => $esExcepcion,
    ]);
    if (empty($evaluacion['aptoParaInscribirse'])) {
        fail('Inscripción rechazada: ' . implode(' | ', $evaluacion['motivosRechazo']), 400, ['evaluacion' => $evaluacion]);
    }

    $idCarrera = (int) $input['id_carrera'];
    $idMateria = (int) $input['id_materia'];
    $anioTurno = (int) $input['anio_turno'];
    $instancia = (int) $input['turno_instancia'];
    $llamado = (int) ($input['id_llamado'] ?? 1);
    $modalidad = $evaluacion['modalidad'];

    $duplicado = sqlOne(
        "SELECT id_rendicion FROM rendiciones_finales WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ? AND anio_turno = ? AND turno_instancia = ? AND id_llamado = ? AND estado != 'BAJA'",
        [$idAlumno, $idCarrera, $idMateria, $anioTurno, $instancia, $llamado]
    );
    if ($duplicado) {
        fail('El estudiante ya registra una inscripción en este turno (' . instanciaNombre($instancia) . ' ' . $anioTurno . ', Llamado ' . $llamado . ')');
    }

    sqlExec(
        "INSERT INTO rendiciones_finales (id_alumno, id_carrera, id_materia, anio_turno, turno_instancia, id_llamado, fecha_examen, estado, modalidad, es_excepcion, motivo_excepcion, fecha_registro)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'INSCRIPTO', ?, ?, ?, NOW())",
        [$idAlumno, $idCarrera, $idMateria, $anioTurno, $instancia, $llamado, ($input['fecha_examen'] ?? null) ?: null, $modalidad, $esExcepcion ? 1 : 0, $esExcepcion ? (($input['motivo_excepcion'] ?? '') ?: 'Inscripción autorizada por excepción') : null]
    );
    $idRendicion = (int) $db->lastInsertId();
    $detalle = 'Año ' . $anioTurno . ' - ' . instanciaNombre($instancia) . ' - ' . $llamado . '° Llamado - Modalidad: ' . $modalidad . ($esExcepcion ? ' (Excepción)' : '');
    auditar($idRendicion, 'ALTA', null, $detalle, $esExcepcion ? 'Preceptoría (Excepción)' : 'Sistema');

    $mensaje = $esExcepcion
        ? 'Inscripción registrada con éxito a modo de EXCEPCIÓN'
        : ($modalidad === 'LIBRE'
            ? 'Inscripción en modalidad LIBRE registrada correctamente (correlatividades verificadas)'
            : 'Inscripción registrada correctamente cumpliendo todos los requisitos reglamentarios');
    ok(['id_rendicion' => $idRendicion, 'modalidad' => $modalidad, 'mensaje' => $mensaje, 'evaluacion' => $evaluacion]);
}

if (preg_match('#^/finales/calificar/(\d+)$#', $ruta, $m) && $metodo === 'PUT') {
    asegurarEstructura();
    $id = (int) $m[1];
    $rend = sqlOne('SELECT * FROM rendiciones_finales WHERE id_rendicion = ?', [$id]);
    if (!$rend) {
        fail('Rendición con ID ' . $id . ' no encontrada', 404);
    }
    $ausente = !empty($input['es_ausente']);
    if ($ausente) {
        $estado = 'AUSENTE';
        $nota = null;
        $flag = 1;
    } elseif (isset($input['nota']) && $input['nota'] !== '') {
        $nota = (int) $input['nota'];
        $estado = $nota >= 4 ? 'APROBADO' : 'DESAPROBADO';
        $flag = 0;
    } else {
        $estado = 'INSCRIPTO';
        $nota = null;
        $flag = 0;
    }
    $fecha = ($input['fecha_examen'] ?? null) ?: null;
    sqlExec('UPDATE rendiciones_finales SET nota = ?, estado = ?, es_ausente = ?, fecha_examen = COALESCE(?, fecha_examen) WHERE id_rendicion = ?', [$nota, $estado, $flag, $fecha, $id]);
    if ($estado === 'APROBADO') {
        sqlExec(
            "INSERT INTO historial_academico (id_alumno, id_carrera, id_materia, nota, validado_examen, fecha_aprobacion, fecha_alta)
             VALUES (?, ?, ?, ?, 'T', COALESCE(?, CURDATE()), NOW())
             ON DUPLICATE KEY UPDATE nota = VALUES(nota), validado_examen = 'T', fecha_aprobacion = VALUES(fecha_aprobacion), fecha_mod = NOW()",
            [$rend['id_alumno'], $rend['id_carrera'], $rend['id_materia'], $nota, $fecha]
        );
    }
    ok(['id_rendicion' => $id, 'nuevoEstado' => $estado, 'nota' => $nota, 'es_ausente' => (bool) $flag], 'Calificación/estado de examen final registrado con éxito');
}

if (preg_match('#^/finales/(\d+)/auditoria$#', $ruta, $m) && $metodo === 'GET') {
    apiRequerirDocenteOPreceptor();
    asegurarEstructura();
    try {
        $logs = sqlAll('SELECT fecha_cambio, accion, detalle_anterior, detalle_nuevo, modificado_por FROM auditoria_inscripciones_finales WHERE id_rendicion = ? ORDER BY fecha_cambio ASC, id ASC', [(int) $m[1]]);
    } catch (Throwable $e) {
        $logs = [];
    }
    ok($logs);
}

if (preg_match('#^/finales/(\d+)/reasignar$#', $ruta, $m) && $metodo === 'PATCH') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    asegurarEstructura();
    $id = (int) $m[1];
    $actual = sqlOne(
        "SELECT rf.*, m.nombre_materia, cm.exceptuada_libre, cm.tipo_espacio
         FROM rendiciones_finales rf JOIN materias m ON m.id_materia = rf.id_materia
         LEFT JOIN carrera_materias cm ON cm.id_carrera = rf.id_carrera AND cm.id_materia = rf.id_materia
         WHERE rf.id_rendicion = ?",
        [$id]
    );
    if (!$actual) {
        fail('Inscripción #' . $id . ' no encontrada.', 404);
    }
    if ($actual['estado'] === 'BAJA') {
        fail('No se puede reasignar una inscripción que fue dada de baja.');
    }
    if (in_array($actual['estado'], ['APROBADO', 'DESAPROBADO', 'AUSENTE'], true) || $actual['nota'] !== null) {
        fail('No se puede reasignar un examen que ya tiene calificación final asentada (' . $actual['estado'] . ').');
    }
    $nuevoAnio = !empty($input['anio_turno']) ? (int) $input['anio_turno'] : (int) $actual['anio_turno'];
    $nuevoTurno = !empty($input['turno_instancia']) ? (int) $input['turno_instancia'] : (int) $actual['turno_instancia'];
    $nuevoLlamado = !empty($input['id_llamado']) ? (int) $input['id_llamado'] : (int) ($actual['id_llamado'] ?? 1);
    $nuevaModalidad = !empty($input['modalidad'])
        ? (strtoupper((string) $input['modalidad']) === 'LIBRE' ? 'LIBRE' : 'REGULAR')
        : ($actual['modalidad'] ?? 'REGULAR');
    if ($nuevaModalidad === 'LIBRE' && !empty($actual['exceptuada_libre'])) {
        fail('No se puede cambiar a modalidad LIBRE: el espacio curricular "' . $actual['nombre_materia'] . '" (' . ($actual['tipo_espacio'] ?: 'Asignatura') . ') está exceptuado por normativa institucional.');
    }
    $choque = sqlOne(
        "SELECT id_rendicion FROM rendiciones_finales WHERE id_rendicion != ? AND id_alumno = ? AND id_carrera = ? AND id_materia = ? AND anio_turno = ? AND turno_instancia = ? AND id_llamado = ? AND estado != 'BAJA'",
        [$id, $actual['id_alumno'], $actual['id_carrera'], $actual['id_materia'], $nuevoAnio, $nuevoTurno, $nuevoLlamado]
    );
    if ($choque) {
        fail('El estudiante ya tiene otra inscripción activa (#' . $choque['id_rendicion'] . ') en ' . instanciaNombre($nuevoTurno) . ' ' . $nuevoAnio . ' (' . $nuevoLlamado . '° Llamado).', 409);
    }
    $anterior = 'Año ' . $actual['anio_turno'] . ' - ' . instanciaNombre($actual['turno_instancia']) . ' - ' . $actual['id_llamado'] . '° Llamado - Modalidad: ' . ($actual['modalidad'] ?? 'REGULAR');
    $nuevo = 'Año ' . $nuevoAnio . ' - ' . instanciaNombre($nuevoTurno) . ' - ' . $nuevoLlamado . '° Llamado - Modalidad: ' . $nuevaModalidad;
    sqlExec('UPDATE rendiciones_finales SET anio_turno = ?, turno_instancia = ?, id_llamado = ?, modalidad = ?, reasignada = 1 WHERE id_rendicion = ?', [$nuevoAnio, $nuevoTurno, $nuevoLlamado, $nuevaModalidad, $id]);
    auditar($id, 'REASIGNACION', $anterior, $nuevo, (string) ($input['modificado_por'] ?? 'Preceptoría'));
    ok(['id_rendicion' => $id, 'anio_turno' => $nuevoAnio, 'turno_instancia' => $nuevoTurno, 'id_llamado' => $nuevoLlamado, 'modalidad' => $nuevaModalidad], 'Inscripción reasignada con éxito y registrada en el historial de auditoría.');
}

if (preg_match('#^/finales/(\d+)$#', $ruta, $m) && $metodo === 'DELETE') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    asegurarEstructura();
    $id = (int) $m[1];
    $rend = sqlOne('SELECT * FROM rendiciones_finales WHERE id_rendicion = ?', [$id]);
    if (!$rend) {
        fail('Inscripción #' . $id . ' no encontrada.', 404);
    }
    if ($rend['estado'] === 'BAJA') {
        fail('Esta inscripción ya se encontraba dada de baja.');
    }
    if (in_array($rend['estado'], ['APROBADO', 'DESAPROBADO'], true) || $rend['nota'] !== null) {
        fail('No se puede dar de baja un examen que ya fue calificado (' . $rend['estado'] . ', Nota: ' . $rend['nota'] . ').');
    }
    $anterior = 'Estado: ' . $rend['estado'] . ' | Año ' . $rend['anio_turno'] . ' - ' . instanciaNombre($rend['turno_instancia']) . ' - ' . $rend['id_llamado'] . '° Llamado - Modalidad: ' . ($rend['modalidad'] ?? 'REGULAR');
    sqlExec("UPDATE rendiciones_finales SET estado = 'BAJA', fecha_baja = NOW() WHERE id_rendicion = ?", [$id]);
    auditar($id, 'BAJA_LOGICA', $anterior, 'Estado: BAJA (Baja lógica registrada sin borrado físico)', (string) ($input['modificado_por'] ?? 'Preceptoría'));
    ok(['id_rendicion' => $id, 'estado' => 'BAJA', 'fecha_baja' => date('c')], 'Inscripción dada de baja lógicamente y registrada en auditoría.');
}

if ($ruta === '/catalogos/carreras' && $metodo === 'GET') {
    apiRequerirSesion();
    $carreras = sqlAll('SELECT id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto, titulo, color_r, color_g, color_b FROM carreras ORDER BY nombre_carrera');
    ok($carreras);
}

if ($ruta === '/catalogos/carreras' && $metodo === 'POST') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    $nombre = trim((string) ($input['nombre_carrera'] ?? ''));
    if ($nombre === '') {
        fail('El nombre de la carrera es obligatorio');
    }
    $params = [
        $nombre,
        (string) ($input['nombre_carrera_corto'] ?? ''),
        (string) ($input['nro_resolucion'] ?? ''),
        (string) ($input['titulo'] ?? ''),
    ];
    if (!empty($input['id_carrera'])) {
        sqlExec('UPDATE carreras SET nombre_carrera = ?, nombre_carrera_corto = ?, nro_resolucion = ?, titulo = ? WHERE id_carrera = ?', array_merge($params, [(int) $input['id_carrera']]));
        $idCarrera = (int) $input['id_carrera'];
    } else {
        $siguiente = sqlOne('SELECT COALESCE(MAX(id_carrera), 0) + 1 AS siguiente FROM carreras');
        $idCarrera = (int) ($siguiente['siguiente'] ?? 1);
        sqlExec('INSERT INTO carreras (id_carrera, nombre_carrera, nombre_carrera_corto, nro_resolucion, titulo) VALUES (?, ?, ?, ?, ?)', array_merge([$idCarrera], $params));
    }
    ok(['id_carrera' => $idCarrera]);
}

if (preg_match('#^/catalogos/carreras/(\d+)$#', $ruta, $m) && $metodo === 'DELETE') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    try {
        sqlExec('DELETE FROM carreras WHERE id_carrera = ?', [(int) $m[1]]);
    } catch (Throwable $e) {
        fail('No se pudo eliminar la carrera: ' . $e->getMessage());
    }
    ok([]);
}

if ($ruta === '/catalogos/alumnos' && $metodo === 'GET') {
    $u = apiRequerirSesion();
    $mapEstadoCivil = ['1' => 'Soltero/a', '2' => 'Casado/a', '3' => 'Divorciado/a', '4' => 'Viudo/a', '5' => 'Unión convivencial'];
    if (($u['tipo'] ?? '') === 'alumno') {
        $alumnos = sqlAll(
            "SELECT a.id_alumno, a.id_tipo_documento, td.descripcion AS tipo_documento,
                    a.numero_documento, a.legajo, a.primer_apellido, a.otros_apellidos,
                    a.primer_nombre, a.otros_nombres,
                    CONCAT(a.primer_apellido, ' ', COALESCE(a.otros_apellidos, '')) AS apellidos,
                    CONCAT(a.primer_nombre, ' ', COALESCE(a.otros_nombres, '')) AS nombres,
                    CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), ''), ', ', a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), '')) AS apellido_nombres,
                    a.email, a.email AS mail, m.id_carrera,
                    COALESCE(c.nombre_carrera, 'Sin Carrera Asignada') AS carrera,
                    c.nro_resolucion AS resolucion,
                    DATE_FORMAT(a.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
                    TIMESTAMPDIFF(YEAR, a.fecha_nacimiento, CURDATE()) AS edad,
                    a.sexo, a.estado_civil, a.cantidad_hijos, a.cantidad_hijos AS hijos,
                    p.nacionalidad, loc.nombre AS ciudad_nacimiento,
                    prov.nombre AS provincia_nacimiento,
                    d.calle, d.calle AS domicilio, d.numero, d.piso, d.depto,
                    d.telefono_principal AS celular, d.telefono_alternativo,
                    d_loc.nombre AS localidad_barrio, part.nombre AS partido
             FROM alumnos a
             LEFT JOIN matriculacion m ON m.id_alumno = a.id_alumno
             LEFT JOIN carreras c ON c.id_carrera = m.id_carrera
             LEFT JOIN tipos_documento td ON td.id_tipo_documento = a.id_tipo_documento
             LEFT JOIN paises p ON p.id_pais = a.id_pais_nacimiento
             LEFT JOIN localidades loc ON loc.id_localidad = a.id_localidad_nacimiento
             LEFT JOIN provincias prov ON prov.id_provincia = loc.id_provincia
             LEFT JOIN domicilios_alumno d ON d.id_alumno = a.id_alumno
             LEFT JOIN localidades d_loc ON d_loc.id_localidad = d.id_localidad
             LEFT JOIN partidos part ON part.id_partido = d_loc.id_partido
             WHERE a.id_alumno = ?
             ORDER BY a.id_alumno DESC",
            [(int) $u['id']]
        );
        foreach ($alumnos as &$al) {
            $ec = (string) ($al['estado_civil'] ?? '');
            if ($ec !== '' && isset($mapEstadoCivil[$ec])) { $al['estado_civil'] = $mapEstadoCivil[$ec]; }
        }
        unset($al);
        ok($alumnos);
    }
    apiRequerirPersonal();
    $alumnos = sqlAll(
        "SELECT a.id_alumno, a.id_tipo_documento, td.descripcion AS tipo_documento,
                a.numero_documento, a.legajo, a.primer_apellido, a.otros_apellidos,
                a.primer_nombre, a.otros_nombres,
                CONCAT(a.primer_apellido, ' ', COALESCE(a.otros_apellidos, '')) AS apellidos,
                CONCAT(a.primer_nombre, ' ', COALESCE(a.otros_nombres, '')) AS nombres,
                CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), ''), ', ', a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), '')) AS apellido_nombres,
                a.email, a.email AS mail, m.id_carrera,
                COALESCE(c.nombre_carrera, 'Sin Carrera Asignada') AS carrera,
                c.nro_resolucion AS resolucion,
                DATE_FORMAT(a.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
                TIMESTAMPDIFF(YEAR, a.fecha_nacimiento, CURDATE()) AS edad,
                a.sexo, a.estado_civil, a.cantidad_hijos, a.cantidad_hijos AS hijos,
                p.nacionalidad, loc.nombre AS ciudad_nacimiento,
                prov.nombre AS provincia_nacimiento,
                d.calle, d.calle AS domicilio, d.numero, d.piso, d.depto,
                d.telefono_principal AS celular, d.telefono_alternativo,
                d_loc.nombre AS localidad_barrio, part.nombre AS partido
         FROM alumnos a
         LEFT JOIN matriculacion m ON m.id_alumno = a.id_alumno
         LEFT JOIN carreras c ON c.id_carrera = m.id_carrera
         LEFT JOIN tipos_documento td ON td.id_tipo_documento = a.id_tipo_documento
         LEFT JOIN paises p ON p.id_pais = a.id_pais_nacimiento
         LEFT JOIN localidades loc ON loc.id_localidad = a.id_localidad_nacimiento
         LEFT JOIN provincias prov ON prov.id_provincia = loc.id_provincia
         LEFT JOIN domicilios_alumno d ON d.id_alumno = a.id_alumno
         LEFT JOIN localidades d_loc ON d_loc.id_localidad = d.id_localidad
         LEFT JOIN partidos part ON part.id_partido = d_loc.id_partido
         ORDER BY a.id_alumno DESC");
    foreach ($alumnos as &$al) {
        $ec = (string) ($al['estado_civil'] ?? '');
        if ($ec !== '' && isset($mapEstadoCivil[$ec])) { $al['estado_civil'] = $mapEstadoCivil[$ec]; }
    }
    unset($al);
    ok($alumnos);
}

if (preg_match('#^/catalogos/alumnos/(\d+)$#', $ruta, $m) && $metodo === 'GET') {
    $u = apiRequerirSesion();
    $idPedido = (int) $m[1];
    if (($u['tipo'] ?? '') === 'alumno' && (int) $u['id'] !== $idPedido) {
        responder(['success' => false, 'message' => 'No autorizado.'], 403);
    }
    if (($u['tipo'] ?? '') !== 'alumno' && ($u['tipo'] ?? '') !== 'personal') {
        responder(['success' => false, 'message' => 'No autorizado.'], 403);
    }
    $mapEstadoCivil = ['1' => 'Soltero/a', '2' => 'Casado/a', '3' => 'Divorciado/a', '4' => 'Viudo/a', '5' => 'Unión convivencial'];
    $alumno = sqlOne(
        "SELECT a.id_alumno, a.id_tipo_documento, td.descripcion AS tipo_documento,
                a.numero_documento, a.legajo, a.primer_apellido, a.otros_apellidos,
                a.primer_nombre, a.otros_nombres,
                CONCAT(a.primer_apellido, ' ', COALESCE(a.otros_apellidos, '')) AS apellidos,
                CONCAT(a.primer_nombre, ' ', COALESCE(a.otros_nombres, '')) AS nombres,
                CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), ''), ', ', a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), '')) AS apellido_nombres,
                a.email, a.email AS mail, m.id_carrera,
                c.nombre_carrera AS carrera, c.nro_resolucion AS resolucion,
                COALESCE(m.anio_inscripcion, YEAR(CURDATE())) AS anio_lectivo,
                DATE_FORMAT(a.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
                TIMESTAMPDIFF(YEAR, a.fecha_nacimiento, CURDATE()) AS edad,
                a.sexo, a.estado_civil, a.cantidad_hijos, a.cantidad_hijos AS hijos,
                p.nacionalidad, loc.nombre AS ciudad_nacimiento,
                prov.nombre AS provincia_nacimiento,
                d.calle, d.calle AS domicilio, d.numero, d.piso, d.depto,
                d.telefono_principal AS celular, d.telefono_alternativo,
                d_loc.nombre AS localidad_barrio, part.nombre AS partido
         FROM alumnos a
         LEFT JOIN matriculacion m ON m.id_alumno = a.id_alumno
         LEFT JOIN carreras c ON c.id_carrera = m.id_carrera
         LEFT JOIN tipos_documento td ON td.id_tipo_documento = a.id_tipo_documento
         LEFT JOIN paises p ON p.id_pais = a.id_pais_nacimiento
         LEFT JOIN localidades loc ON loc.id_localidad = a.id_localidad_nacimiento
         LEFT JOIN provincias prov ON prov.id_provincia = loc.id_provincia
         LEFT JOIN domicilios_alumno d ON d.id_alumno = a.id_alumno
         LEFT JOIN localidades d_loc ON d_loc.id_localidad = d.id_localidad
         LEFT JOIN partidos part ON part.id_partido = d_loc.id_partido
         WHERE a.id_alumno = ? LIMIT 1",
        [$idPedido]
    );
    if ($alumno) {
        $ec = (string) ($alumno['estado_civil'] ?? '');
        if ($ec !== '' && isset($mapEstadoCivil[$ec])) { $alumno['estado_civil'] = $mapEstadoCivil[$ec]; }
    }
    if (!$alumno) {
        fail('Alumno no encontrado', 404);
    }
    $notas = [];
    $historialNotas = sqlAll(
        "SELECT id_materia, nota, DATE_FORMAT(fecha_aprobacion, '%d/%m/%Y') AS fecha, anio_regular AS cursada
         FROM historial_academico
         WHERE id_alumno = ? AND (validado_examen = 'T' OR nota >= 4)",
        [$idPedido]
    );
    $letras = [4 => 'Cuatro', 5 => 'Cinco', 6 => 'Seis', 7 => 'Siete', 8 => 'Ocho', 9 => 'Nueve', 10 => 'Diez'];
    foreach ($historialNotas as $nota) {
        $notas[(int) $nota['id_materia']] = [
            'nota_num' => (string) ($nota['nota'] ?? ''),
            'nota_letra' => $letras[(int) ($nota['nota'] ?? 0)] ?? (string) ($nota['nota'] ?? ''),
            'fecha' => (string) ($nota['fecha'] ?? ''),
            'cursada' => (string) ($nota['cursada'] ?? ''),
        ];
    }
    $alumno['notas_previas'] = $notas;
    ok($alumno);
}

if (preg_match('#^/catalogos/carreras/(\d+)/materias$#', $ruta, $m) && $metodo === 'GET') {
    apiRequerirSesion();
    asegurarEstructura();
    $idCarrera = (int) $m[1];
    $idAlumno = (int) ($_GET['idAlumno'] ?? 0);
    if (rolApi() === 'alumno' && $idAlumno > 0 && $idAlumno !== (int) ($_SESSION['id_usuario'] ?? 0)) {
        responder(['success' => false, 'message' => 'No autorizado.'], 403);
    }
    $materias = sqlAll(
        "SELECT cm.id_carrera, cm.id_materia, cm.anio_cursada,
                COALESCE(cm.carga_horaria_semanal, 4) AS carga_horaria_semanal,
                COALESCE(cm.carga_horaria_semanal, 4) AS horas,
                m.nombre_materia
         FROM carrera_materias cm JOIN materias m ON m.id_materia = cm.id_materia
         WHERE cm.id_carrera = ? ORDER BY cm.anio_cursada ASC, m.nombre_materia ASC",
        [$idCarrera]
    );
    $correlativas = sqlAll(
        "SELECT corr.id_materia, corr.id_materia_correlativa, m.nombre_materia AS nombre_materia_correlativa
         FROM correlatividades corr JOIN materias m ON m.id_materia = corr.id_materia_correlativa
         WHERE corr.id_carrera = ? ORDER BY corr.id_materia, corr.id_materia_correlativa",
        [$idCarrera]
    );
    $horarios = sqlAll(
        "SELECT id_horario, id_carrera, id_materia, dia_semana, hora_inicio, hora_fin, aula, comision
         FROM materia_horarios WHERE id_carrera = ?
         ORDER BY FIELD(dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'), hora_inicio",
        [$idCarrera]
    );
    $historial = $idAlumno > 0 ? historialPorAlumnoCarrera($idAlumno, $idCarrera) : [];
    $porMateria = [];
    foreach ($correlativas as $correlativa) {
        $estado = $historial[(int) $correlativa['id_materia_correlativa']] ?? null;
        $correlativa['cumplida'] = $estado ? (bool) $estado['cumple'] : false;
        $correlativa['estado'] = $estado
            ? ($estado['aprobada'] ? 'Aprobada' : ($estado['regularizada'] ? 'Regular' : 'Pendiente'))
            : 'No cursada';
        $porMateria[(int) $correlativa['id_materia']][] = $correlativa;
    }
    $horariosPorMateria = [];
    foreach ($horarios as $horario) {
        $horariosPorMateria[(int) $horario['id_materia']][] = $horario;
    }
    foreach ($materias as &$materia) {
        $correlativasMateria = $porMateria[(int) $materia['id_materia']] ?? [];
        $cumplidas = true;
        foreach ($correlativasMateria as $correlativa) {
            if (!$correlativa['cumplida']) {
                $cumplidas = false;
                break;
            }
        }
        $dentroAlcance = (int) $materia['anio_cursada'] >= 2;
        $motivoBloqueo = null;
        if (!$dentroAlcance) {
            $motivoBloqueo = 'Materia de 1º año fuera de alcance en esta etapa.';
        } elseif (!$cumplidas && $idAlumno > 0) {
            $faltantes = [];
            foreach ($correlativasMateria as $correlativa) {
                if (!$correlativa['cumplida']) {
                    $faltantes[] = $correlativa['nombre_materia_correlativa'];
                }
            }
            $motivoBloqueo = 'Correlativas adeudadas: ' . implode(', ', $faltantes);
        }
        $estadoHistorial = $historial[(int) $materia['id_materia']] ?? null;
        $materia['horarios'] = $horariosPorMateria[(int) $materia['id_materia']] ?? [];
        $materia['correlativas'] = $correlativasMateria;
        $materia['habilitada'] = $dentroAlcance && ($idAlumno === 0 || $cumplidas);
        $materia['motivo_bloqueo'] = $motivoBloqueo;
        $materia['estado_historial'] = $estadoHistorial;
        $materia['aprobada'] = $estadoHistorial ? (bool) $estadoHistorial['aprobada'] : false;
    }
    unset($materia);
    $sedesTurnos = sqlAll(
        "SELECT cst.id_carrera, cst.id_sede, s.nombre_sede, cst.id_turno, t.turno
         FROM carrera_sede_turno cst
         INNER JOIN sedes s ON s.id_sede = cst.id_sede
         INNER JOIN turnos t ON t.id_turno = cst.id_turno
         WHERE cst.id_carrera = ? ORDER BY cst.id_sede, cst.id_turno",
        [$idCarrera]
    );
    ok(['materias' => $materias, 'sedes_turnos' => $sedesTurnos]);
}

if (preg_match('#^/catalogos/carreras/(\d+)/materias$#', $ruta, $m) && $metodo === 'POST') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    asegurarEstructura();
    $idCarrera = (int) $m[1];
    $nombre = trim((string) ($input['nombre_materia'] ?? ''));
    if ($nombre === '') {
        fail('El nombre de la materia es obligatorio');
    }
    $horas = max(1, min(32, (int) ($input['horas'] ?? $input['carga_horaria_semanal'] ?? 4)));
    $anio = (int) ($input['anio_cursada'] ?? 1);
    if (!empty($input['id_materia'])) {
        $idMateria = (int) $input['id_materia'];
        sqlExec('UPDATE materias SET nombre_materia = ? WHERE id_materia = ?', [$nombre, $idMateria]);
    } else {
        $existe = sqlOne('SELECT id_materia FROM materias WHERE nombre_materia = ? LIMIT 1', [$nombre]);
        if ($existe) {
            $idMateria = (int) $existe['id_materia'];
            sqlExec('UPDATE materias SET nombre_materia = ? WHERE id_materia = ?', [$nombre, $idMateria]);
        } else {
            $siguiente = sqlOne('SELECT COALESCE(MAX(id_materia), 0) + 1 AS siguiente FROM materias');
            $idMateria = (int) ($siguiente['siguiente'] ?? 1);
            sqlExec('INSERT INTO materias (id_materia, nombre_materia) VALUES (?, ?)', [$idMateria, $nombre]);
        }
    }
    sqlExec(
        "INSERT INTO carrera_materias (id_carrera, id_materia, anio_cursada, carga_horaria_semanal) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE anio_cursada = VALUES(anio_cursada), carga_horaria_semanal = VALUES(carga_horaria_semanal)",
        [$idCarrera, $idMateria, $anio, $horas]
    );
    ok(['id_materia' => $idMateria, 'id_carrera' => $idCarrera, 'anio_cursada' => $anio, 'horas' => $horas]);
}

if (preg_match('#^/catalogos/carreras/(\d+)/materias/(\d+)$#', $ruta, $m) && $metodo === 'DELETE') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    try {
        sqlExec('DELETE FROM carrera_materias WHERE id_carrera = ? AND id_materia = ?', [(int) $m[1], (int) $m[2]]);
        sqlExec('DELETE FROM materia_horarios WHERE id_carrera = ? AND id_materia = ?', [(int) $m[1], (int) $m[2]]);
    } catch (Throwable $e) {
        fail('No se pudo eliminar la materia: ' . $e->getMessage());
    }
    ok([]);
}

if ($ruta === '/catalogos/horarios' && $metodo === 'POST') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    asegurarEstructura();
    $idCarrera = (int) ($input['id_carrera'] ?? 0);
    $idMateria = (int) ($input['id_materia'] ?? 0);
    $dia = (string) ($input['dia_semana'] ?? '');
    $inicio = (string) ($input['hora_inicio'] ?? '');
    $fin = (string) ($input['hora_fin'] ?? '');
    if ($idCarrera <= 0 || $idMateria <= 0 || $dia === '' || $inicio === '' || $fin === '') {
        fail('Faltan datos del horario');
    }
    $params = [$idCarrera, $idMateria, $dia, $inicio, $fin, ($input['aula'] ?? null) ?: null, (string) ($input['comision'] ?? 'Única')];
    if (!empty($input['id_horario'])) {
        sqlExec('UPDATE materia_horarios SET dia_semana = ?, hora_inicio = ?, hora_fin = ?, aula = ?, comision = ? WHERE id_horario = ?', [$dia, $inicio, $fin, $params[5], $params[6], (int) $input['id_horario']]);
        $idHorario = (int) $input['id_horario'];
    } else {
        sqlExec('INSERT INTO materia_horarios (id_carrera, id_materia, dia_semana, hora_inicio, hora_fin, id_sede, id_turno, aula, comision) VALUES (?, ?, ?, ?, ?, 1, 3, ?, ?)', $params);
        $idHorario = (int) $db->lastInsertId();
    }
    ok(['id_horario' => $idHorario]);
}

if (preg_match('#^/catalogos/horarios/(\d+)$#', $ruta, $m) && $metodo === 'DELETE') {
    apiRequerirPreceptorODirectivo();
    apiRequerirCsrf();
    asegurarEstructura();
    sqlExec('DELETE FROM materia_horarios WHERE id_horario = ?', [(int) $m[1]]);
    ok([]);
}

if (preg_match('#^/estudiantes/(\d+)/carga-horaria$#', $ruta, $m) && $metodo === 'GET') {
    $idAlumno = (int) $m[1];
    $materias = [];
    if (!empty($_GET['materias'])) {
        $materias = array_values(array_filter(array_map('intval', explode(',', (string) $_GET['materias']))));
    }
    $detalles = [];
    $total = 0;
    if (count($materias) > 0) {
        $marks = implode(',', array_fill(0, count($materias), '?'));
        $detalles = sqlAll(
            "SELECT m.id_materia, m.nombre_materia, COALESCE(cm.carga_horaria_semanal, 4) AS horas
             FROM materias m JOIN carrera_materias cm ON cm.id_materia = m.id_materia
             WHERE m.id_materia IN ($marks)",
            $materias
        );
        foreach ($detalles as $d) {
            $total += (int) $d['horas'];
        }
    }
    ok(['id_alumno' => $idAlumno, 'total_horas' => $total, 'max_horas' => 32, 'excede' => $total > 32, 'detalles' => $detalles]);
}

if ($ruta === '/inscripciones-materias' && $metodo === 'POST') {
    $u = apiRequerirSesion();
    apiRequerirCsrf();
    asegurarEstructura();
    $idAlumno = (int) ($input['id_alumno'] ?? 0);
    if (($u['tipo'] ?? '') === 'alumno') {
        $idAlumno = (int) $u['id'];
    }
    $idCarrera = (int) ($input['id_carrera'] ?? 0);
    $idTurno = (int) ($input['id_turno'] ?? 3);
    $idSede = (int) ($input['id_sede'] ?? 1);
    $anio = (int) ($input['ciclo_lectivo'] ?? date('Y'));
    $materias = is_array($input['materias'] ?? null) ? $input['materias'] : [];
    if ($idAlumno <= 0 || $idCarrera <= 0 || count($materias) === 0) {
        fail('Faltan datos para la inscripción', 400, ['codigo' => 'DATOS_INCOMPLETOS', 'bloqueos' => []]);
    }
    $totalHoras = 0;
    $ids = [];
    foreach ($materias as $materia) {
        $idMateria = (int) ($materia['id_materia'] ?? 0);
        if ($idMateria <= 0) {
            continue;
        }
        $ids[] = $idMateria;
        $fila = sqlOne('SELECT COALESCE(carga_horaria_semanal, 4) AS horas FROM carrera_materias WHERE id_carrera = ? AND id_materia = ?', [$idCarrera, $idMateria]);
        $totalHoras += (int) ($fila['horas'] ?? 4);
    }
    if ($totalHoras > 32) {
        fail('La carga horaria seleccionada supera el máximo de 32 horas semanales.', 400, ['codigo' => 'CARGA_HORARIA_EXCEDIDA', 'bloqueos' => [['tipo' => 'horas', 'detalle' => 'Total: ' . $totalHoras . ' hs']]]);
    }
    $historial = historialPorAlumnoCarrera($idAlumno, $idCarrera);
    $bloqueos = [];
    $detalles = [];
    foreach ($ids as $idMateria) {
        $infoMateria = sqlOne(
            "SELECT cm.anio_cursada, m.nombre_materia
             FROM carrera_materias cm JOIN materias m ON m.id_materia = cm.id_materia
             WHERE cm.id_carrera = ? AND cm.id_materia = ?",
            [$idCarrera, $idMateria]
        );
        $nombreMateria = $infoMateria['nombre_materia'] ?? ('Materia #' . $idMateria);
        $anioCursada = (int) ($infoMateria['anio_cursada'] ?? 0);
        if ($anioCursada === 1) {
            $bloqueos[] = [
                'id_materia' => $idMateria,
                'nombre_materia' => $nombreMateria,
                'anio_cursada' => 1,
                'motivo' => 'Inscripción de 1º año excluida en esta etapa del sistema (Alcance: 2º y 3º año).',
            ];
            continue;
        }
        $correlativas = sqlAll(
            "SELECT corr.id_materia_correlativa, m.nombre_materia AS nombre_correlativa
             FROM correlatividades corr JOIN materias m ON m.id_materia = corr.id_materia_correlativa
             WHERE corr.id_carrera = ? AND corr.id_materia = ?",
            [$idCarrera, $idMateria]
        );
        $faltantes = [];
        foreach ($correlativas as $correlativa) {
            $estado = $historial[(int) $correlativa['id_materia_correlativa']] ?? null;
            if (!$estado || empty($estado['cumple'])) {
                $faltantes[] = [
                    'id_materia_correlativa' => (int) $correlativa['id_materia_correlativa'],
                    'nombre_correlativa' => $correlativa['nombre_correlativa'],
                    'motivo' => 'Requiere cursada regularizada (validado_regular = 1) o final aprobado.',
                ];
            }
        }
        if (count($faltantes) > 0) {
            $nombres = array_column($faltantes, 'nombre_correlativa');
            $bloqueos[] = [
                'id_materia' => $idMateria,
                'nombre_materia' => $nombreMateria,
                'anio_cursada' => $anioCursada,
                'correlativas_faltantes' => $faltantes,
                'motivo' => 'Correlativas no cumplidas: ' . implode(', ', $nombres),
            ];
        } else {
            $detalles[] = ['id_materia' => $idMateria, 'nombre_materia' => $nombreMateria, 'habilitada' => true];
        }
    }
    if (count($bloqueos) > 0) {
        fail('No se pudo completar la inscripción por restricciones académicas.', 400, [
            'codigo' => 'CORRELATIVAS_NO_CUMPLIDAS',
            'bloqueos' => $bloqueos,
            'detalleCarga' => ['total_horas' => $totalHoras, 'max_horas' => 32, 'detalles' => $detalles],
        ]);
    }
    try {
        sqlExec(
            "INSERT INTO matriculacion (id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta) VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE id_turno = VALUES(id_turno), id_sede = VALUES(id_sede), fecha_mod = NOW()",
            [$idAlumno, $idCarrera, $anio, $idTurno, $idSede]
        );
        foreach ($ids as $idMateria) {
            $tipo = '1';
            foreach ($materias as $materia) {
                if ((int) ($materia['id_materia'] ?? 0) === $idMateria) {
                    $tipo = (string) ($materia['tipo_asistencia'] ?? '1');
                    break;
                }
            }
            sqlExec(
                "INSERT INTO matriculacion_detalle (id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia) VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE tipo_asistencia = VALUES(tipo_asistencia)",
                [$idAlumno, $idCarrera, $anio, $idMateria, $tipo]
            );
        }
    } catch (Throwable $e) {
        fail('No se pudo registrar la inscripción: ' . $e->getMessage(), 400, ['codigo' => 'ERROR_BD', 'bloqueos' => []]);
    }
    ok(['id_alumno' => $idAlumno, 'id_carrera' => $idCarrera, 'anio' => $anio, 'materias' => $ids, 'total_horas' => $totalHoras]);
}

if ($ruta === '/reportes/inscripciones' && $metodo === 'GET') {
    apiRequerirPersonal();
    $where = ['1=1'];
    $params = [];
    if (!empty($_GET['carrera'])) {
        $where[] = 'c.id_carrera = ?';
        $params[] = (int) $_GET['carrera'];
    }
    if (!empty($_GET['anio'])) {
        $where[] = 'cm.anio_cursada = ?';
        $params[] = (int) $_GET['anio'];
    }
    if (!empty($_GET['ciclo_lectivo'])) {
        $where[] = 'md.anio_matriculacion = ?';
        $params[] = (int) $_GET['ciclo_lectivo'];
    }
    $sql = "SELECT a.id_alumno, a.legajo, a.numero_documento,
                   CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), '')) AS apellidos,
                   CONCAT(a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), '')) AS nombres,
                   c.nombre_carrera, c.nombre_carrera_corto, m.id_materia, m.nombre_materia, cm.anio_cursada,
                   md.tipo_asistencia, t.turno, s.nombre_sede AS nombre_sede,
                    ha.validado_regular, ha.nota, ha.validado_examen, ha.fecha_aprobacion
            FROM matriculacion_detalle md
            JOIN matriculacion mat ON mat.id_alumno = md.id_alumno AND mat.id_carrera = md.id_carrera
            JOIN alumnos a ON a.id_alumno = md.id_alumno
            JOIN carreras c ON c.id_carrera = md.id_carrera
            JOIN materias m ON m.id_materia = md.id_materia
            JOIN carrera_materias cm ON cm.id_carrera = md.id_carrera AND cm.id_materia = md.id_materia
            LEFT JOIN turnos t ON t.id_turno = mat.id_turno
            LEFT JOIN sedes s ON s.id_sede = mat.id_sede
            LEFT JOIN historial_academico ha ON ha.id_alumno = md.id_alumno AND ha.id_carrera = md.id_carrera AND ha.id_materia = md.id_materia
            WHERE " . implode(' AND ', $where) . ' ORDER BY a.id_alumno, cm.anio_cursada, m.nombre_materia';
    try {
        $filas = sqlAll($sql, $params);
    } catch (Throwable $e) {
        fail('Error al obtener el reporte de inscripciones: ' . $e->getMessage(), 500);
    }
    $situacionFiltro = strtolower((string) ($_GET['situacion'] ?? ''));
    $inscripciones = [];
    $asistencia = [];
    $porAnio = [];
    $alumnosUnicos = [];
    foreach ($filas as $f) {
        $codigo = (string) ($f['tipo_asistencia'] ?? '1');
        $situacion = $codigo === '2' ? 'Libre' : ($codigo === '3' ? 'Vocacional' : 'Presencial');
        $recursa = $codigo === '2';
        $aprobadoReporte = esVerdaderoApi($f['validado_examen'] ?? null)
            || ((int) ($f['nota'] ?? 0) >= 4)
            || !empty($f['fecha_aprobacion']);
        $condicion = $aprobadoReporte
            ? 'Aprobada'
            : (esVerdaderoApi($f['validado_regular'] ?? null) ? 'Regular' : 'Libre');
        $fila = [
            'id_alumno' => $f['id_alumno'],
            'legajo' => $f['legajo'],
            'apellidos' => $f['apellidos'],
            'nombres' => $f['nombres'],
            'numero_documento' => $f['numero_documento'],
            'nombre_carrera' => $f['nombre_carrera'],
            'nombre_carrera_corto' => $f['nombre_carrera_corto'],
            'id_materia' => $f['id_materia'],
            'nombre_materia' => $f['nombre_materia'],
            'anio_cursada' => $f['anio_cursada'],
            'situacion_asistencia' => $situacion,
            'condicion_cursada' => $condicion,
            'es_recursa' => $recursa,
            'turno' => $f['turno'] ?? '',
            'nombre_sede' => $f['nombre_sede'] ?? '',
        ];
        if ($situacionFiltro !== '' && strpos(strtolower($situacion), $situacionFiltro) === false && !($situacionFiltro === 'recursante' && $recursa)) {
            continue;
        }
        $inscripciones[] = $fila;
        $alumnosUnicos[$f['id_alumno']] = true;
        $asistencia[$situacion] = ($asistencia[$situacion] ?? 0) + 1;
        $anioKey = 'Año ' . $f['anio_cursada'];
        $porAnio[$anioKey] = ($porAnio[$anioKey] ?? 0) + 1;
    }
    ok([
        'metricas' => [
            'total_alumnos_inscriptos' => count($alumnosUnicos),
            'total_inscripciones_materias' => count($inscripciones),
            'distribucion_asistencia' => $asistencia,
            'distribucion_por_anio_cursada' => $porAnio,
        ],
        'inscripciones' => $inscripciones,
    ]);
}

fail('Ruta no encontrada: ' . $metodo . ' ' . $ruta, 404);
