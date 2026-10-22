<?php
/**
 * Modelo: Inscripción a Carreras
 * ISFT N.º 182 "Clementina"
 *
 * Gestiona la verificación de períodos lectivos, oferta académica
 * (carreras, sedes, turnos) y el registro formal de matrícula del alumno.
 * Esquema normalizado.
 */

require_once dirname(__DIR__) . '/modelo/Conexion.php';

class InscripcionCarrera
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Obtiene los parámetros de inscripción y generales del instituto.
     */
    public function obtenerParametrosInscripcion(): array
    {
        $stmt = $this->db->query("
            SELECT anio_inscripcion_carrera, fecha_inicio, fecha_fin
            FROM parametros_inscripcion
            ORDER BY id_registro ASC
            LIMIT 1
        ");
        $ins = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $stmt = $this->db->query("
            SELECT nombre_instituto, ciclo_lectivo
            FROM parametros_generales
            ORDER BY id_registro ASC
            LIMIT 1
        ");
        $gen = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $anioInscripcion = (int) ($ins['anio_inscripcion_carrera'] ?? 0);
        if ($anioInscripcion <= 0) {
            $anioInscripcion = (int) date('Y') + 1;
        }

        $cicloLectivo = (int) ($gen['ciclo_lectivo'] ?? 0);
        if ($cicloLectivo <= 0) {
            $cicloLectivo = (int) date('Y');
        }

        $nomInstituto = trim((string) ($gen['nombre_instituto'] ?? ''));
        if ($nomInstituto === '') {
            $nomInstituto = 'ISFT N.º 182';
        }

        $fechaInicioTimestamp = $this->parsearFecha((string) ($ins['fecha_inicio'] ?? ''));
        $fechaFinTimestamp    = $this->parsearFecha((string) ($ins['fecha_fin'] ?? ''), true);

        $ahora = time();
        $abierto = false;
        if ($fechaInicioTimestamp !== null && $fechaFinTimestamp !== null) {
            $abierto = ($ahora >= $fechaInicioTimestamp && $ahora <= $fechaFinTimestamp);
        }

        $fechaInicioFormateada = $fechaInicioTimestamp ? date('d/m/Y', $fechaInicioTimestamp) : 'A confirmar';
        $fechaFinFormateada    = $fechaFinTimestamp ? date('d/m/Y', $fechaFinTimestamp) : 'A confirmar';

        return [
            'anio_inscripcion' => $anioInscripcion,
            'ciclo_lectivo'    => $cicloLectivo,
            'instituto'        => $nomInstituto,
            'abierto'          => $abierto,
            'fecha_inicio'     => $fechaInicioFormateada,
            'fecha_fin'        => $fechaFinFormateada,
            'mensaje_cerrado'  => "El período de inscripción a las carreras para el año {$anioInscripcion} está cerrado.",
        ];
    }

    /**
     * Devuelve todas las carreras activas indicando si el alumno ya está matriculado en ellas.
     */
    public function obtenerCarrerasParaInscripcion(int $idAlumno): array
    {
        // 1. Carreras en las que el alumno ya está matriculado
        $stmtMat = $this->db->prepare("SELECT id_carrera FROM matriculacion WHERE id_alumno = :id");
        $stmtMat->bindValue(':id', $idAlumno, PDO::PARAM_INT);
        $stmtMat->execute();
        $matriculadas = $stmtMat->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $matriculadas = array_map('intval', $matriculadas);

        // 2. Listado de carreras
        $stmtCarr = $this->db->query("
            SELECT id_carrera, nombre_carrera, nombre_carrera_corto, nro_resolucion, titulo
            FROM carreras
            ORDER BY nombre_carrera ASC
        ");
        $carreras = $stmtCarr->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $resultado = [];
        foreach ($carreras as $c) {
            $id = (int) $c['id_carrera'];
            $yaMatriculado = in_array($id, $matriculadas, true);
            $resultado[] = [
                'id_carrera'           => $id,
                'nombre_carrera'       => trim((string) $c['nombre_carrera']),
                'nombre_carrera_corto' => trim((string) ($c['nombre_carrera_corto'] ?? '')),
                'nro_resolucion'       => trim((string) ($c['nro_resolucion'] ?? '')),
                'titulo'               => trim((string) ($c['titulo'] ?? '')),
                'ya_matriculado'       => $yaMatriculado,
            ];
        }

        return $resultado;
    }

    /**
     * Obtiene las sedes y turnos habilitados para una carrera según carrera_sede_turno.
     */
    public function obtenerSedesYTurnos(int $idCarrera): array
    {
        $stmt = $this->db->prepare("
            SELECT 
                r.id_carrera,
                r.id_sede,
                s.nombre_sede,
                r.id_turno,
                t.turno
            FROM carrera_sede_turno r
            INNER JOIN sedes s ON r.id_sede = s.id_sede
            INNER JOIN turnos t ON r.id_turno = t.id_turno
            WHERE r.id_carrera = :carrera
            ORDER BY s.nombre_sede ASC, t.id_turno ASC
        ");
        $stmt->bindValue(':carrera', $idCarrera, PDO::PARAM_INT);
        $stmt->execute();
        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $sedes = [];
        $turnosPorSede = [];

        foreach ($filas as $f) {
            $idSede    = (int) $f['id_sede'];
            $nombreSede = trim((string) $f['nombre_sede']);
            $idTurno   = (int) $f['id_turno'];
            $nombreTurno = trim((string) $f['turno']);

            if (!isset($sedes[$idSede])) {
                $sedes[$idSede] = [
                    'id_sede'     => $idSede,
                    'nombre_sede' => $nombreSede,
                ];
                $turnosPorSede[$idSede] = [];
            }

            $turnosPorSede[$idSede][] = [
                'id_turno'     => $idTurno,
                'nombre_turno' => $nombreTurno,
            ];
        }

        return [
            'sedes'  => array_values($sedes),
            'turnos' => $turnosPorSede,
        ];
    }

    /**
     * Registra formalmente al alumno en la tabla matriculacion.
     */
    public function registrarInscripcion(int $idAlumno, int $idCarrera, int $idSede, int $idTurno): array
    {
        // 1. Obtener parámetros para año de inscripción
        $param = $this->obtenerParametrosInscripcion();
        $anioInscripcion = $param['anio_inscripcion'];

        // 2. Verificar que no esté ya matriculado
        $stmtCheck = $this->db->prepare("
            SELECT 1 FROM matriculacion 
            WHERE id_alumno = :id AND id_carrera = :carrera 
            LIMIT 1
        ");
        $stmtCheck->bindValue(':id', $idAlumno, PDO::PARAM_INT);
        $stmtCheck->bindValue(':carrera', $idCarrera, PDO::PARAM_INT);
        $stmtCheck->execute();
        if ($stmtCheck->fetch()) {
            throw new RuntimeException("Ya te encontrás matriculado en esta carrera.");
        }

        // 3. Validar que la combinación carrera/sede/turno sea válida en el instituto
        $stmtVal = $this->db->prepare("
            SELECT 1 FROM carrera_sede_turno 
            WHERE id_carrera = :carrera AND id_sede = :sede AND id_turno = :turno 
            LIMIT 1
        ");
        $stmtVal->bindValue(':carrera', $idCarrera, PDO::PARAM_INT);
        $stmtVal->bindValue(':sede', $idSede, PDO::PARAM_INT);
        $stmtVal->bindValue(':turno', $idTurno, PDO::PARAM_INT);
        $stmtVal->execute();
        if (!$stmtVal->fetch()) {
            throw new RuntimeException("La sede o el turno seleccionados no corresponden a esta carrera.");
        }

        // 4. Documento del alumno (para el número de trámite)
        $stmtAlu = $this->db->prepare("SELECT numero_documento FROM alumnos WHERE id_alumno = :id LIMIT 1");
        $stmtAlu->bindValue(':id', $idAlumno, PDO::PARAM_INT);
        $stmtAlu->execute();
        $numeroDocumento = (int) $stmtAlu->fetchColumn();

        // 5. Insertar en tabla matriculacion
        $stmtIns = $this->db->prepare("
            INSERT INTO matriculacion (
                id_alumno,
                id_carrera,
                anio_inscripcion,
                id_turno,
                id_sede,
                fecha_alta
            ) VALUES (
                :id,
                :carrera,
                :anio,
                :turno,
                :sede,
                NOW()
            )
        ");
        $stmtIns->bindValue(':id', $idAlumno, PDO::PARAM_INT);
        $stmtIns->bindValue(':carrera', $idCarrera, PDO::PARAM_INT);
        $stmtIns->bindValue(':anio', $anioInscripcion, PDO::PARAM_INT);
        $stmtIns->bindValue(':turno', $idTurno, PDO::PARAM_INT);
        $stmtIns->bindValue(':sede', $idSede, PDO::PARAM_INT);
        $stmtIns->execute();

        // 6. Generar número de trámite
        $nroTramite = sprintf("MAT-%d-%d-%02d", $anioInscripcion, $numeroDocumento, $idCarrera);

        return [
            'tramite'          => $nroTramite,
            'anio_inscripcion' => $anioInscripcion,
            'id_carrera'       => $idCarrera,
            'id_sede'          => $idSede,
            'id_turno'         => $idTurno,
            'fecha_alta'       => date('d/m/Y H:i:s'),
        ];
    }

    /**
     * Obtiene los datos detallados de una inscripción para emitir el comprobante.
     */
    public function obtenerDetalleComprobante(int $idAlumno, int $idCarrera): ?array
    {
        $sql = "
            SELECT 
                a.numero_documento,
                a.id_tipo_documento,
                m.anio_inscripcion,
                m.fecha_alta,
                a.primer_nombre,
                a.otros_nombres,
                a.primer_apellido,
                a.otros_apellidos,
                a.email,
                d.telefono_principal,
                c.nombre_carrera,
                c.nro_resolucion,
                c.titulo,
                s.nombre_sede,
                t.turno
            FROM matriculacion m
            INNER JOIN alumnos a ON m.id_alumno = a.id_alumno
            INNER JOIN carreras c ON m.id_carrera = c.id_carrera
            INNER JOIN sedes s ON m.id_sede = s.id_sede
            INNER JOIN turnos t ON m.id_turno = t.id_turno
            LEFT JOIN domicilios_alumno d ON d.id_alumno = a.id_alumno
            WHERE m.id_alumno = :id AND m.id_carrera = :carrera
            ORDER BY m.fecha_alta DESC
            LIMIT 1
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':id', $idAlumno, PDO::PARAM_INT);
        $stmt->bindValue(':carrera', $idCarrera, PDO::PARAM_INT);
        $stmt->execute();
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$fila) {
            return null;
        }

        $nombre = trim(implode(' ', array_filter([$fila['primer_nombre'], $fila['otros_nombres']])));
        $apellido = trim(implode(' ', array_filter([$fila['primer_apellido'], $fila['otros_apellidos']])));
        $nombreCompleto = trim("$nombre $apellido");

        $faltaTs = !empty($fila['fecha_alta']) ? strtotime($fila['fecha_alta']) : time();

        return [
            'tramite'          => sprintf("MAT-%d-%d-%02d", $fila['anio_inscripcion'], $fila['numero_documento'], $idCarrera),
            'dni'              => (int) $fila['numero_documento'],
            'tipo_documento'   => $fila['id_tipo_documento'],
            'alumno_nombre'    => $nombreCompleto,
            'email'            => $fila['email'],
            'telefono'         => $fila['telefono_principal'] ?: '—',
            'carrera'          => $fila['nombre_carrera'],
            'resolucion'       => $fila['nro_resolucion'] ?: '—',
            'titulo'           => $fila['titulo'] ?: '—',
            'sede'             => $fila['nombre_sede'],
            'turno'            => $fila['turno'],
            'anio_inscripcion' => (int) $fila['anio_inscripcion'],
            'fecha_alta'       => date('d/m/Y H:i', $faltaTs),
        ];
    }

    /**
     * Parsea strings de fecha tipo YYYYMMDD o YYYY-MM-DD.
     */
    private function parsearFecha(string $raw, bool $esFin = false): ?int
    {
        $raw = trim($raw);
        if ($raw === '' || $raw === '00000000' || $raw === '0000-00-00') {
            return null;
        }

        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $raw, $m)) {
            $h = $esFin ? 23 : 0;
            $i = $esFin ? 59 : 0;
            $s = $esFin ? 59 : 0;
            return mktime($h, $i, $s, (int) $m[2], (int) $m[3], (int) $m[1]);
        }

        $t = strtotime($raw);
        if ($t === false) {
            return null;
        }

        if ($esFin) {
            return strtotime(date('Y-m-d 23:59:59', $t));
        }
        return strtotime(date('Y-m-d 00:00:00', $t));
    }
}
