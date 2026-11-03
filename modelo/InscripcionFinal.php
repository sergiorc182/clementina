<?php

require_once __DIR__ . '/Conexion.php';

class InscripcionFinal
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    public function buscarAlumnos(string $buscar = '', int $limite = 40): array
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

        $where = $condiciones ? 'WHERE ' . implode(' AND ', $condiciones) : '';
        $limite = max(1, min(100, $limite));

        $sql = "SELECT a.id_alumno,
                       a.numero_documento,
                       a.legajo,
                       a.email,
                       TRIM(CONCAT_WS(' ', a.primer_apellido, a.otros_apellidos,
                                           a.primer_nombre, a.otros_nombres)) AS nombre_completo,
                       (SELECT COUNT(*)
                        FROM inscripciones i
                        WHERE i.id_alumno = a.id_alumno
                          AND i.estado = 'A') AS finales_activos,
                       (SELECT GROUP_CONCAT(DISTINCT c.nombre_carrera_corto
                                            ORDER BY c.nombre_carrera_corto SEPARATOR ' / ')
                        FROM carreras c
                        WHERE c.id_carrera IN (
                            SELECT m.id_carrera FROM matriculacion m WHERE m.id_alumno = a.id_alumno
                            UNION
                            SELECT h.id_carrera FROM historial_academico h WHERE h.id_alumno = a.id_alumno
                            UNION
                            SELECT i.id_carrera FROM inscripciones i WHERE i.id_alumno = a.id_alumno
                        )) AS carreras
                FROM alumnos a
                $where
                ORDER BY finales_activos DESC, a.primer_apellido ASC,
                         a.otros_apellidos ASC, a.primer_nombre ASC, a.otros_nombres ASC
                LIMIT $limite";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($filas as &$fila) {
            $fila['id_alumno'] = (int) $fila['id_alumno'];
            $fila['numero_documento'] = (int) $fila['numero_documento'];
            $fila['finales_activos'] = (int) $fila['finales_activos'];
        }

        return $filas;
    }

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

        $alumno['id_alumno'] = (int) $alumno['id_alumno'];
        $alumno['numero_documento'] = (int) $alumno['numero_documento'];
        $alumno['carreras'] = $this->_carrerasAlumno($idAlumno);

        return $alumno;
    }

    public function obtenerInscripciones(int $idAlumno): array
    {
        $stmt = $this->db->prepare(
            "SELECT i.id_inscripcion,
                    i.id_alumno,
                    i.id_carrera,
                    i.id_materia,
                    i.anio,
                    i.id_turno,
                    i.id_llamado,
                    i.estado,
                    i.verificada,
                    i.fecha_hora,
                    c.nombre_carrera,
                    c.nombre_carrera_corto,
                    m.nombre_materia,
                    t.turno,
                    h.nota,
                    h.validado_regular,
                    h.validado_examen,
                    h.fecha_aprobacion
             FROM inscripciones i
             INNER JOIN carreras c ON c.id_carrera = i.id_carrera
             INNER JOIN materias m ON m.id_materia = i.id_materia
             INNER JOIN turnos t ON t.id_turno = i.id_turno
             LEFT JOIN historial_academico h
                    ON h.id_alumno = i.id_alumno
                   AND h.id_carrera = i.id_carrera
                   AND h.id_materia = i.id_materia
             WHERE i.id_alumno = :id
             ORDER BY i.anio DESC, i.id_turno ASC, i.id_llamado ASC, m.nombre_materia ASC"
        );
        $stmt->execute([':id' => $idAlumno]);

        return array_map([$this, '_formatearInscripcion'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function obtenerOpciones(int $idAlumno): array
    {
        $carreras = $this->_carrerasAlumno($idAlumno);
        $turnos = $this->db->query('SELECT id_turno, turno FROM turnos ORDER BY id_turno ASC')
            ->fetchAll(PDO::FETCH_ASSOC);
        $turnos = array_map(static function (array $t): array {
            return ['id_turno' => (int) $t['id_turno'], 'turno' => $t['turno']];
        }, $turnos);

        $anios = [];
        $stmt = $this->db->query(
            "SELECT anio_mesas AS anio FROM parametros_mesas
             UNION
             SELECT anio FROM inscripciones
             UNION
             SELECT ciclo_lectivo AS anio FROM parametros_generales"
        );
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $anio) {
            $anio = (int) $anio;
            if ($anio > 0) { $anios[$anio] = $anio; }
        }
        $anioActual = (int) date('Y');
        $anios[$anioActual] = $anioActual;
        krsort($anios);

        $mesas = $this->db->query(
            "SELECT pm.id_registro,
                    pm.anio_mesas,
                    pm.id_turno,
                    pm.fecha_inicio,
                    pm.fecha_fin,
                    pm.tope_mesas,
                    t.turno
             FROM parametros_mesas pm
             LEFT JOIN turnos t ON t.id_turno = pm.id_turno
             ORDER BY pm.anio_mesas DESC, pm.id_turno ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        if ($carreras) {
            $ids = array_map(static function (array $c): int {
                return (int) $c['id_carrera'];
            }, $carreras);
            $in = implode(',', $ids);

            $stmt = $this->db->prepare(
                "SELECT cm.id_carrera,
                        cm.id_materia,
                        cm.anio_cursada,
                        m.nombre_materia,
                        CASE WHEN h.id_alumno IS NULL THEN 0 ELSE 1 END AS tiene_historial,
                        h.validado_regular,
                        h.validado_examen,
                        h.anio_regular,
                        h.tipo_alumno,
                        h.nota,
                        h.fecha_aprobacion,
                        (SELECT COUNT(*)
                         FROM matriculacion_detalle md
                         WHERE md.id_alumno = :id1
                           AND md.id_carrera = cm.id_carrera
                           AND md.id_materia = cm.id_materia) AS matriculada,
                        (SELECT MIN(i.id_inscripcion)
                         FROM inscripciones i
                         WHERE i.id_alumno = :id2
                           AND i.id_carrera = cm.id_carrera
                           AND i.id_materia = cm.id_materia
                           AND i.estado = 'A') AS inscripcion_activa
                 FROM carrera_materias cm
                 INNER JOIN materias m ON m.id_materia = cm.id_materia
                 LEFT JOIN historial_academico h
                        ON h.id_alumno = :id3
                       AND h.id_carrera = cm.id_carrera
                       AND h.id_materia = cm.id_materia
                 WHERE cm.id_carrera IN ($in)
                 ORDER BY cm.id_carrera ASC, cm.anio_cursada ASC, m.nombre_materia ASC"
            );
            $stmt->execute([':id1' => $idAlumno, ':id2' => $idAlumno, ':id3' => $idAlumno]);

            $porCarrera = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $materia) {
                $idCarrera = (int) $materia['id_carrera'];
                $nota = (int) ($materia['nota'] ?? 0);
                $examen = strtoupper(trim((string) ($materia['validado_examen'] ?? '')));
                $regular = strtoupper(trim((string) ($materia['validado_regular'] ?? '')));
                $tipo = strtoupper(trim((string) ($materia['tipo_alumno'] ?? '')));

                $porCarrera[$idCarrera][] = [
                    'id_materia' => (int) $materia['id_materia'],
                    'nombre_materia' => $materia['nombre_materia'],
                    'anio_cursada' => (int) $materia['anio_cursada'],
                    'matriculada' => (int) $materia['matriculada'] > 0,
                    'tiene_historial' => (int) $materia['tiene_historial'] === 1,
                    'regular' => $regular === 'V' || (int) $materia['anio_regular'] > 0 || $tipo === 'R',
                    'final_aprobada' => $nota >= 4 || $examen === 'V',
                    'nota' => $nota,
                    'fecha_aprobacion' => $materia['fecha_aprobacion'],
                    'inscripcion_activa' => $materia['inscripcion_activa'] !== null
                        ? (int) $materia['inscripcion_activa']
                        : null,
                ];
            }

            foreach ($carreras as &$carrera) {
                $carrera['materias'] = $porCarrera[(int) $carrera['id_carrera']] ?? [];
            }
            unset($carrera);
        }

        return [
            'carreras' => $carreras,
            'turnos' => $turnos,
            'anios' => array_values($anios),
            'mesas' => $mesas,
        ];
    }

    public function guardar(array $datos, ?int $idInscripcion = null): array
    {
        $idAlumno = (int) ($datos['id_alumno'] ?? 0);
        $idCarrera = (int) ($datos['id_carrera'] ?? 0);
        $idMateria = (int) ($datos['id_materia'] ?? 0);
        $anio = (int) ($datos['anio'] ?? 0);
        $idTurno = (int) ($datos['id_turno'] ?? 0);
        $idLlamado = (int) ($datos['id_llamado'] ?? 0);

        if ($idAlumno <= 0 || $idCarrera <= 0 || $idMateria <= 0
            || $anio < 1900 || $anio > 2200 || $idTurno <= 0
            || !in_array($idLlamado, [1, 2], true)) {
            return ['ok' => false, 'mensaje' => 'Faltan datos o hay valores inválidos para la inscripción.'];
        }

        $stmt = $this->db->prepare('SELECT 1 FROM alumnos WHERE id_alumno = :id LIMIT 1');
        $stmt->execute([':id' => $idAlumno]);
        if (!$stmt->fetchColumn()) {
            return ['ok' => false, 'mensaje' => 'El alumno no existe.'];
        }

        if ($idInscripcion !== null) {
            $stmt = $this->db->prepare(
                'SELECT id_alumno, estado FROM inscripciones WHERE id_inscripcion = :id LIMIT 1'
            );
            $stmt->execute([':id' => $idInscripcion]);
            $existente = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$existente) {
                return ['ok' => false, 'mensaje' => 'La inscripción no existe.'];
            }
            if ((int) $existente['id_alumno'] !== $idAlumno) {
                return ['ok' => false, 'mensaje' => 'No se puede cambiar el alumno de la inscripción.'];
            }
            if (strtoupper(trim((string) $existente['estado'])) === 'C') {
                return ['ok' => false, 'mensaje' => 'La inscripción está cerrada y no se puede editar.'];
            }
        }

        $stmt = $this->db->prepare(
            'SELECT 1 FROM carrera_materias WHERE id_carrera = :carrera AND id_materia = :materia LIMIT 1'
        );
        $stmt->execute([':carrera' => $idCarrera, ':materia' => $idMateria]);
        if (!$stmt->fetchColumn()) {
            return ['ok' => false, 'mensaje' => 'La materia no pertenece al plan de la carrera seleccionada.'];
        }

        if (!$this->_alumnoEnCarrera($idAlumno, $idCarrera)) {
            return ['ok' => false, 'mensaje' => 'El alumno no está asociado a la carrera seleccionada.'];
        }

        if ($this->_finalAprobado($idAlumno, $idCarrera, $idMateria)) {
            return ['ok' => false, 'mensaje' => 'La materia ya tiene el final aprobado.'];
        }

        $duplicada = $this->_inscripcionDuplicada(
            $idAlumno,
            $idCarrera,
            $idMateria,
            $anio,
            $idTurno,
            $idLlamado,
            $idInscripcion
        );
        if ($duplicada) {
            $estado = strtoupper(trim((string) $duplicada['estado']));
            if ($estado === 'A') {
                return ['ok' => false, 'mensaje' => 'Ya existe una inscripción activa para ese final.'];
            }
            if ($estado === 'B') {
                return ['ok' => false, 'mensaje' => 'Ya existe una inscripción dada de baja para ese final. Reactivala desde el listado.'];
            }
            return ['ok' => false, 'mensaje' => 'Ya existe una inscripción cerrada para ese final.'];
        }

        try {
            if ($idInscripcion !== null) {
                $stmt = $this->db->prepare(
                    "UPDATE inscripciones
                     SET id_carrera = :carrera,
                         id_materia = :materia,
                         anio = :anio,
                         id_turno = :turno,
                         id_llamado = :llamado,
                         verificada = 'V'
                     WHERE id_inscripcion = :id"
                );
                $stmt->execute([
                    ':carrera' => $idCarrera,
                    ':materia' => $idMateria,
                    ':anio' => $anio,
                    ':turno' => $idTurno,
                    ':llamado' => $idLlamado,
                    ':id' => $idInscripcion,
                ]);
                $idResultado = $idInscripcion;
                $mensaje = 'Inscripción actualizada.';
            } else {
                $stmt = $this->db->prepare(
                    "INSERT INTO inscripciones
                        (id_alumno, id_carrera, id_materia, anio, id_turno, id_llamado,
                         estado, verificada, fecha_hora)
                     VALUES
                        (:alumno, :carrera, :materia, :anio, :turno, :llamado,
                         'A', 'V', NOW())"
                );
                $stmt->execute([
                    ':alumno' => $idAlumno,
                    ':carrera' => $idCarrera,
                    ':materia' => $idMateria,
                    ':anio' => $anio,
                    ':turno' => $idTurno,
                    ':llamado' => $idLlamado,
                ]);
                $idResultado = (int) $this->db->lastInsertId();
                $mensaje = 'Inscripción creada.';
            }
        } catch (PDOException $e) {
            error_log('InscripcionFinal::guardar ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo guardar la inscripción.'];
        }

        return [
            'ok' => true,
            'mensaje' => $mensaje,
            'id_inscripcion' => $idResultado,
        ];
    }

    public function cambiarEstado(int $idInscripcion, string $estado): array
    {
        $estado = strtoupper(trim($estado));
        if ($idInscripcion <= 0 || !in_array($estado, ['A', 'B'], true)) {
            return ['ok' => false, 'mensaje' => 'Estado de inscripción inválido.'];
        }

        $stmt = $this->db->prepare(
            "SELECT id_alumno, id_carrera, id_materia, anio, id_turno, id_llamado, estado
             FROM inscripciones
             WHERE id_inscripcion = :id
             LIMIT 1"
        );
        $stmt->execute([':id' => $idInscripcion]);
        $inscripcion = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$inscripcion) {
            return ['ok' => false, 'mensaje' => 'La inscripción no existe.'];
        }
        if (strtoupper(trim((string) $inscripcion['estado'])) === 'C') {
            return ['ok' => false, 'mensaje' => 'La inscripción está cerrada y no se puede modificar.'];
        }

        if ($estado === 'A') {
            $idAlumno = (int) $inscripcion['id_alumno'];
            $idCarrera = (int) $inscripcion['id_carrera'];
            $idMateria = (int) $inscripcion['id_materia'];

            if ($this->_finalAprobado($idAlumno, $idCarrera, $idMateria)) {
                return ['ok' => false, 'mensaje' => 'La materia ya tiene el final aprobado.'];
            }

            $duplicada = $this->_inscripcionDuplicada(
                $idAlumno,
                $idCarrera,
                $idMateria,
                (int) $inscripcion['anio'],
                (int) $inscripcion['id_turno'],
                (int) $inscripcion['id_llamado'],
                $idInscripcion
            );
            if ($duplicada && strtoupper(trim((string) $duplicada['estado'])) === 'A') {
                return ['ok' => false, 'mensaje' => 'Ya existe otra inscripción activa para ese final.'];
            }
        }

        try {
            $stmt = $this->db->prepare(
                "UPDATE inscripciones
                 SET estado = :estado, verificada = 'V'
                 WHERE id_inscripcion = :id"
            );
            $stmt->execute([':estado' => $estado, ':id' => $idInscripcion]);
        } catch (PDOException $e) {
            error_log('InscripcionFinal::cambiarEstado ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo actualizar la inscripción.'];
        }

        return [
            'ok' => true,
            'mensaje' => $estado === 'A' ? 'Inscripción reactivada.' : 'Inscripción dada de baja.',
            'estado' => $estado,
        ];
    }

    private function _carrerasAlumno(int $idAlumno): array
    {
        $stmt = $this->db->prepare(
            "SELECT DISTINCT c.id_carrera, c.nombre_carrera, c.nombre_carrera_corto
             FROM carreras c
             WHERE c.id_carrera IN (
                 SELECT m.id_carrera FROM matriculacion m WHERE m.id_alumno = :a1
                 UNION
                 SELECT md.id_carrera FROM matriculacion_detalle md WHERE md.id_alumno = :a2
                 UNION
                 SELECT h.id_carrera FROM historial_academico h WHERE h.id_alumno = :a3
                 UNION
                 SELECT i.id_carrera FROM inscripciones i WHERE i.id_alumno = :a4
             )
             ORDER BY c.nombre_carrera ASC"
        );
        $stmt->execute([
            ':a1' => $idAlumno,
            ':a2' => $idAlumno,
            ':a3' => $idAlumno,
            ':a4' => $idAlumno,
        ]);

        return array_map(static function (array $c): array {
            return [
                'id_carrera' => (int) $c['id_carrera'],
                'nombre_carrera' => $c['nombre_carrera'],
                'nombre_carrera_corto' => $c['nombre_carrera_corto'],
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function _alumnoEnCarrera(int $idAlumno, int $idCarrera): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM matriculacion
             WHERE id_alumno = :a1 AND id_carrera = :c1
             UNION ALL
             SELECT 1 FROM matriculacion_detalle
             WHERE id_alumno = :a2 AND id_carrera = :c2
             UNION ALL
             SELECT 1 FROM historial_academico
             WHERE id_alumno = :a3 AND id_carrera = :c3
             UNION ALL
             SELECT 1 FROM inscripciones
             WHERE id_alumno = :a4 AND id_carrera = :c4
             LIMIT 1"
        );
        $stmt->execute([
            ':a1' => $idAlumno, ':c1' => $idCarrera,
            ':a2' => $idAlumno, ':c2' => $idCarrera,
            ':a3' => $idAlumno, ':c3' => $idCarrera,
            ':a4' => $idAlumno, ':c4' => $idCarrera,
        ]);

        return (bool) $stmt->fetchColumn();
    }

    private function _finalAprobado(int $idAlumno, int $idCarrera, int $idMateria): bool
    {
        $stmt = $this->db->prepare(
            "SELECT nota, validado_examen
             FROM historial_academico
             WHERE id_alumno = :id AND id_carrera = :carrera AND id_materia = :materia
             LIMIT 1"
        );
        $stmt->execute([':id' => $idAlumno, ':carrera' => $idCarrera, ':materia' => $idMateria]);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$fila) {
            return false;
        }

        return (int) ($fila['nota'] ?? 0) >= 4
            || strtoupper(trim((string) ($fila['validado_examen'] ?? ''))) === 'V';
    }

    private function _inscripcionDuplicada(
        int $idAlumno,
        int $idCarrera,
        int $idMateria,
        int $anio,
        int $idTurno,
        int $idLlamado,
        ?int $excluirId = null
    ): ?array {
        $sql = "SELECT id_inscripcion, estado
                FROM inscripciones
                WHERE id_alumno = :alumno
                  AND id_carrera = :carrera
                  AND id_materia = :materia
                  AND anio = :anio
                  AND id_turno = :turno
                  AND id_llamado = :llamado";
        $params = [
            ':alumno' => $idAlumno,
            ':carrera' => $idCarrera,
            ':materia' => $idMateria,
            ':anio' => $anio,
            ':turno' => $idTurno,
            ':llamado' => $idLlamado,
        ];

        if ($excluirId !== null) {
            $sql .= ' AND id_inscripcion <> :excluir';
            $params[':excluir'] = $excluirId;
        }

        $sql .= ' LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $fila = $stmt->fetch(PDO::FETCH_ASSOC);

        return $fila ?: null;
    }

    private function _formatearInscripcion(array $r): array
    {
        $codigo = strtoupper(trim((string) ($r['estado'] ?? '')));
        $mapa = [
            'A' => ['activa', 'Activa', 'badge--success', true, true, false],
            'B' => ['baja', 'Dada de baja', 'badge--neutral', true, false, true],
            'C' => ['cerrada', 'Cerrada', 'badge--info', false, false, false],
        ];
        $estado = $mapa[$codigo] ?? ['desconocido', 'Sin estado', 'badge--neutral', false, false, false];

        $nota = (int) ($r['nota'] ?? 0);
        $examen = strtoupper(trim((string) ($r['validado_examen'] ?? '')));

        return [
            'id_inscripcion' => (int) $r['id_inscripcion'],
            'id_alumno' => (int) $r['id_alumno'],
            'id_carrera' => (int) $r['id_carrera'],
            'id_materia' => (int) $r['id_materia'],
            'anio' => (int) $r['anio'],
            'id_turno' => (int) $r['id_turno'],
            'id_llamado' => (int) $r['id_llamado'],
            'carrera' => $r['nombre_carrera'],
            'carrera_corta' => $r['nombre_carrera_corto'],
            'materia' => $r['nombre_materia'],
            'turno' => $r['turno'],
            'estado_codigo' => $codigo,
            'estado' => $estado[0],
            'estado_texto' => $estado[1],
            'badge' => $estado[2],
            'puede_editar' => $estado[3],
            'puede_baja' => $estado[4],
            'puede_reactivar' => $estado[5],
            'verificada' => strtoupper(trim((string) ($r['verificada'] ?? ''))) === 'V',
            'final_aprobada' => $nota >= 4 || $examen === 'V',
            'nota' => $nota,
            'fecha_aprobacion' => $r['fecha_aprobacion'],
            'fecha_hora' => $r['fecha_hora'],
            'llamado_texto' => ((int) $r['id_llamado'] === 1 ? '1.º' : '2.º') . ' llamado',
        ];
    }
}
