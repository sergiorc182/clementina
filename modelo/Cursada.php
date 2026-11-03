<?php
/**
 * Modelo: Validación de cursadas.
 *
 * Búsqueda de alumnos y consulta de las materias en las que están
 * matriculados. La validación se guarda en `historial_academico`:
 *   validado_regular = 'V' -> cursada aprobada
 *   validado_regular = 'F' -> cursada no aprobada (con registro existente)
 *   sin registro            -> pendiente de validación
 */

require_once __DIR__ . '/Conexion.php';

class Cursada
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Busca alumnos por DNI, legajo, nombre, apellido o email.
     * Sin texto de búsqueda devuelve la cola de alumnos con cursadas pendientes.
     */
    public function buscarAlumnos(string $buscar = '', bool $soloPendientes = true, int $limite = 40): array
    {
        $buscar = trim($buscar);
        $condiciones = [];
        $params = [];

        if ($buscar !== '') {
            $condiciones[] = "(CAST(a.numero_documento AS CHAR) LIKE :q_dni
                OR a.legajo LIKE :q_legajo
                OR a.primer_apellido LIKE :q_apellido
                OR a.otros_apellidos LIKE :q_otros_apellidos
                OR a.primer_nombre LIKE :q_nombre
                OR a.otros_nombres LIKE :q_otros_nombres
                OR a.email LIKE :q_email)";
            $comodin = '%' . $buscar . '%';
            $params[':q_dni'] = $comodin;
            $params[':q_legajo'] = $comodin;
            $params[':q_apellido'] = $comodin;
            $params[':q_otros_apellidos'] = $comodin;
            $params[':q_nombre'] = $comodin;
            $params[':q_otros_nombres'] = $comodin;
            $params[':q_email'] = $comodin;
        }

        if ($soloPendientes) {
            $condiciones[] = 'COALESCE(p.pendientes, 0) > 0';
        }

        $where = $condiciones ? 'WHERE ' . implode(' AND ', $condiciones) : '';
        $limite = max(1, min(100, $limite));

        $sql = "SELECT a.id_alumno,
                       a.numero_documento,
                       a.legajo,
                       a.email,
                       TRIM(CONCAT_WS(' ', a.primer_apellido, a.otros_apellidos,
                                           a.primer_nombre, a.otros_nombres)) AS nombre_completo,
                       COALESCE(p.pendientes, 0) AS pendientes,
                       (SELECT GROUP_CONCAT(DISTINCT c.nombre_carrera_corto
                                            ORDER BY c.nombre_carrera_corto SEPARATOR ' / ')
                        FROM matriculacion m
                        INNER JOIN carreras c ON c.id_carrera = m.id_carrera
                        WHERE m.id_alumno = a.id_alumno) AS carreras
                FROM alumnos a
                LEFT JOIN (
                    SELECT md.id_alumno,
                           COUNT(DISTINCT CONCAT_WS('-', md.id_carrera, md.id_materia)) AS pendientes
                    FROM matriculacion_detalle md
                    LEFT JOIN historial_academico h
                           ON h.id_alumno = md.id_alumno
                          AND h.id_carrera = md.id_carrera
                          AND h.id_materia = md.id_materia
                    WHERE (h.id_alumno IS NULL
                           OR h.validado_regular IS NULL
                           OR h.validado_regular NOT IN ('V', 'F'))
                      AND (h.validado_examen IS NULL OR h.validado_examen <> 'V')
                      AND COALESCE(h.nota, 0) < 4
                    GROUP BY md.id_alumno
                ) p ON p.id_alumno = a.id_alumno
                $where
                ORDER BY a.primer_apellido ASC, a.otros_apellidos ASC,
                         a.primer_nombre ASC, a.otros_nombres ASC
                LIMIT $limite";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($filas as &$fila) {
            $fila['id_alumno'] = (int) $fila['id_alumno'];
            $fila['numero_documento'] = (int) $fila['numero_documento'];
            $fila['pendientes'] = (int) $fila['pendientes'];
        }

        return $filas;
    }

    /**
     * Devuelve los datos del alumno y las carreras en las que está inscripto.
     */
    public function obtenerAlumno(int $idAlumno): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT a.id_alumno,
                    a.numero_documento,
                    a.legajo,
                    a.email,
                    TRIM(CONCAT_WS(' ', a.primer_apellido, a.otros_apellidos,
                                        a.primer_nombre, a.otros_nombres)) AS nombre_completo
             FROM alumnos a
             WHERE a.id_alumno = :id
             LIMIT 1"
        );
        $stmt->execute([':id' => $idAlumno]);
        $alumno = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$alumno) {
            return null;
        }

        $stmt = $this->db->prepare(
            "SELECT DISTINCT c.id_carrera, c.nombre_carrera, c.nombre_carrera_corto
             FROM carreras c
             WHERE c.id_carrera IN (
                 SELECT m.id_carrera FROM matriculacion m WHERE m.id_alumno = :id1
                 UNION
                 SELECT h.id_carrera FROM historial_academico h WHERE h.id_alumno = :id2
             )
             ORDER BY c.nombre_carrera ASC"
        );
        $stmt->execute([':id1' => $idAlumno, ':id2' => $idAlumno]);
        $carreras = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $alumno['id_alumno'] = (int) $alumno['id_alumno'];
        $alumno['numero_documento'] = (int) $alumno['numero_documento'];
        $alumno['carreras'] = array_map(static function (array $c): array {
            return [
                'id_carrera' => (int) $c['id_carrera'],
                'nombre_carrera' => $c['nombre_carrera'],
                'nombre_carrera_corto' => $c['nombre_carrera_corto'],
            ];
        }, $carreras);

        return $alumno;
    }

    /**
     * Materias cargadas para el alumno, combinando matriculación e historial.
     */
    public function obtenerMaterias(int $idAlumno): array
    {
        $filas = array_merge(
            $this->_materiasMatriculadas($idAlumno),
            $this->_materiasSoloHistorial($idAlumno)
        );

        usort($filas, static function (array $a, array $b): int {
            $cmp = strcmp((string) $a['nombre_carrera'], (string) $b['nombre_carrera']);
            if ($cmp !== 0) {
                return $cmp;
            }
            $cmp = ((int) $a['anio_cursada']) <=> ((int) $b['anio_cursada']);
            if ($cmp !== 0) {
                return $cmp;
            }
            return strcmp((string) $a['nombre_materia'], (string) $b['nombre_materia']);
        });

        return array_map([$this, '_formatearMateria'], $filas);
    }

    /**
     * Guarda la validación de una cursada.
     */
    public function validar(int $idAlumno, int $idCarrera, int $idMateria, string $estado): array
    {
        if (!in_array($estado, ['aprobada', 'no_aprobada'], true)) {
            return ['ok' => false, 'mensaje' => 'Estado de cursada inválido.'];
        }
        if ($idAlumno <= 0 || $idCarrera <= 0 || $idMateria <= 0) {
            return ['ok' => false, 'mensaje' => 'Faltan datos para validar la cursada.'];
        }

        $stmt = $this->db->prepare('SELECT 1 FROM alumnos WHERE id_alumno = :id LIMIT 1');
        $stmt->execute([':id' => $idAlumno]);
        if (!$stmt->fetchColumn()) {
            return ['ok' => false, 'mensaje' => 'El alumno no existe.'];
        }

        $stmt = $this->db->prepare(
            "SELECT 1 FROM matriculacion_detalle
             WHERE id_alumno = :id1 AND id_carrera = :c1 AND id_materia = :m1
             UNION ALL
             SELECT 1 FROM historial_academico
             WHERE id_alumno = :id2 AND id_carrera = :c2 AND id_materia = :m2
             LIMIT 1"
        );
        $stmt->execute([
            ':id1' => $idAlumno, ':c1' => $idCarrera, ':m1' => $idMateria,
            ':id2' => $idAlumno, ':c2' => $idCarrera, ':m2' => $idMateria,
        ]);
        if (!$stmt->fetchColumn()) {
            return ['ok' => false, 'mensaje' => 'La materia no pertenece a las cursadas del alumno.'];
        }

        $stmt = $this->db->prepare(
            "SELECT nota, validado_examen
             FROM historial_academico
             WHERE id_alumno = :id AND id_carrera = :carrera AND id_materia = :materia
             LIMIT 1"
        );
        $stmt->execute([':id' => $idAlumno, ':carrera' => $idCarrera, ':materia' => $idMateria]);
        $actual = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($actual) {
            $nota = (int) ($actual['nota'] ?? 0);
            $examen = strtoupper(trim((string) ($actual['validado_examen'] ?? '')));
            if ($nota >= 4 || $examen === 'V') {
                return [
                    'ok' => false,
                    'mensaje' => 'La materia ya tiene el final aprobado y no se puede modificar la cursada.',
                ];
            }
        }

        $anioRegular = 0;
        if ($estado === 'aprobada') {
            $stmt = $this->db->prepare(
                "SELECT MAX(anio_matriculacion)
                 FROM matriculacion_detalle
                 WHERE id_alumno = :id AND id_carrera = :carrera AND id_materia = :materia"
            );
            $stmt->execute([':id' => $idAlumno, ':carrera' => $idCarrera, ':materia' => $idMateria]);
            $anioRegular = (int) $stmt->fetchColumn();
            if ($anioRegular <= 0) {
                $anioRegular = (int) date('Y');
            }
        }

        $validado = $estado === 'aprobada' ? 'V' : 'F';
        $tipoNuevo = $estado === 'aprobada' ? 'R' : 'X';

        try {
            $stmt = $this->db->prepare(
                "INSERT INTO historial_academico
                    (id_alumno, id_carrera, id_materia, anio_regular, tipo_alumno,
                     validado_regular, validado_examen, fecha_alta, fecha_mod)
                 VALUES
                    (:id, :carrera, :materia, :anio, :tipo, :validado, 'F', NOW(), NOW())
                 ON DUPLICATE KEY UPDATE
                    anio_regular = VALUES(anio_regular),
                    validado_regular = VALUES(validado_regular),
                    tipo_alumno = IF(historial_academico.tipo_alumno IS NULL
                                     OR historial_academico.tipo_alumno = '',
                                     VALUES(tipo_alumno), historial_academico.tipo_alumno),
                    fecha_mod = NOW()"
            );
            $stmt->execute([
                ':id' => $idAlumno,
                ':carrera' => $idCarrera,
                ':materia' => $idMateria,
                ':anio' => $anioRegular,
                ':tipo' => $tipoNuevo,
                ':validado' => $validado,
            ]);
        } catch (PDOException $e) {
            error_log('Cursada::validar ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo guardar la validación.'];
        }

        return [
            'ok' => true,
            'mensaje' => $estado === 'aprobada'
                ? 'Cursada marcada como aprobada.'
                : 'Cursada marcada como no aprobada.',
            'estado' => $estado,
            'validado_regular' => $validado,
            'anio_regular' => $anioRegular,
            'fecha_mod' => date('Y-m-d H:i:s'),
        ];
    }

    private function _materiasMatriculadas(int $idAlumno): array
    {
        $stmt = $this->db->prepare(
            "SELECT md.id_carrera,
                    md.id_materia,
                    c.nombre_carrera,
                    c.nombre_carrera_corto,
                    m.nombre_materia,
                    COALESCE(cm.anio_cursada, 0) AS anio_cursada,
                    MAX(COALESCE(md.anio_matriculacion, 0)) AS anio_matriculacion,
                    MAX(md.tipo_asistencia) AS tipo_asistencia,
                    h.validado_regular,
                    h.validado_examen,
                    h.anio_regular,
                    h.tipo_alumno,
                    h.nota,
                    h.fecha_aprobacion,
                    h.fecha_mod,
                    MAX(CASE WHEN h.id_alumno IS NULL THEN 0 ELSE 1 END) AS tiene_historial
             FROM matriculacion_detalle md
             INNER JOIN carreras c ON c.id_carrera = md.id_carrera
             INNER JOIN materias m ON m.id_materia = md.id_materia
             LEFT JOIN carrera_materias cm
                    ON cm.id_carrera = md.id_carrera
                   AND cm.id_materia = md.id_materia
             LEFT JOIN historial_academico h
                    ON h.id_alumno = md.id_alumno
                   AND h.id_carrera = md.id_carrera
                   AND h.id_materia = md.id_materia
             WHERE md.id_alumno = :id
             GROUP BY md.id_carrera, md.id_materia, c.nombre_carrera, c.nombre_carrera_corto,
                      m.nombre_materia, cm.anio_cursada, h.validado_regular, h.validado_examen,
                      h.anio_regular, h.tipo_alumno, h.nota, h.fecha_aprobacion, h.fecha_mod
             ORDER BY c.nombre_carrera ASC, cm.anio_cursada ASC, m.nombre_materia ASC"
        );
        $stmt->execute([':id' => $idAlumno]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function _materiasSoloHistorial(int $idAlumno): array
    {
        $stmt = $this->db->prepare(
            "SELECT h.id_carrera,
                    h.id_materia,
                    c.nombre_carrera,
                    c.nombre_carrera_corto,
                    m.nombre_materia,
                    COALESCE(cm.anio_cursada, 0) AS anio_cursada,
                    0 AS anio_matriculacion,
                    NULL AS tipo_asistencia,
                    h.validado_regular,
                    h.validado_examen,
                    h.anio_regular,
                    h.tipo_alumno,
                    h.nota,
                    h.fecha_aprobacion,
                    h.fecha_mod,
                    1 AS tiene_historial
             FROM historial_academico h
             INNER JOIN carreras c ON c.id_carrera = h.id_carrera
             INNER JOIN materias m ON m.id_materia = h.id_materia
             LEFT JOIN carrera_materias cm
                    ON cm.id_carrera = h.id_carrera
                   AND cm.id_materia = h.id_materia
             WHERE h.id_alumno = :id1
               AND NOT EXISTS (
                   SELECT 1
                   FROM matriculacion_detalle md
                   WHERE md.id_alumno = :id2
                     AND md.id_carrera = h.id_carrera
                     AND md.id_materia = h.id_materia
               )
             ORDER BY c.nombre_carrera ASC, cm.anio_cursada ASC, m.nombre_materia ASC"
        );
        $stmt->execute([':id1' => $idAlumno, ':id2' => $idAlumno]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function _formatearMateria(array $r): array
    {
        $validado = strtoupper(trim((string) ($r['validado_regular'] ?? '')));
        $examen = strtoupper(trim((string) ($r['validado_examen'] ?? '')));
        $nota = (int) ($r['nota'] ?? 0);
        $tieneHistorial = (int) ($r['tiene_historial'] ?? 0) === 1;

        if ($nota >= 4 || $examen === 'V') {
            $estado = 'final_aprobada';
            $estadoTexto = 'Final aprobada';
            $badge = 'badge--success';
        } elseif ($validado === 'V') {
            $estado = 'aprobada';
            $estadoTexto = 'Cursada aprobada';
            $badge = 'badge--success';
        } elseif ($tieneHistorial && $validado === 'F') {
            $estado = 'no_aprobada';
            $estadoTexto = 'Cursada no aprobada';
            $badge = 'badge--error';
        } else {
            $estado = 'pendiente';
            $estadoTexto = 'Pendiente';
            $badge = 'badge--warning';
        }

        return [
            'id_carrera' => (int) $r['id_carrera'],
            'id_materia' => (int) $r['id_materia'],
            'carrera' => $r['nombre_carrera'],
            'carrera_corta' => $r['nombre_carrera_corto'],
            'materia' => $r['nombre_materia'],
            'anio_cursada' => (int) $r['anio_cursada'],
            'anio_matriculacion' => (int) $r['anio_matriculacion'],
            'tipo_asistencia' => $r['tipo_asistencia'],
            'estado' => $estado,
            'estado_texto' => $estadoTexto,
            'badge' => $badge,
            'puede_validar' => $estado !== 'final_aprobada',
            'validado_regular' => $validado,
            'validado_examen' => $examen,
            'anio_regular' => (int) ($r['anio_regular'] ?? 0),
            'tipo_alumno' => strtoupper(trim((string) ($r['tipo_alumno'] ?? ''))),
            'nota' => $nota,
            'fecha_aprobacion' => $r['fecha_aprobacion'],
            'fecha_mod' => $r['fecha_mod'],
            'tiene_historial' => $tieneHistorial,
        ];
    }
}
