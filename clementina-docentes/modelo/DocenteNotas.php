<?php
require_once dirname(__DIR__, 2) . '/modelo/Conexion.php';

class DocenteNotas
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /** @return array<int,array> */
    public function carrerasConMateriasAsignadas(int $idPersonal): array
    {
        $sql = "SELECT c.id_carrera, c.nombre_carrera, c.nombre_carrera_corto,
                       m.id_materia, m.nombre_materia, cm.anio_cursada
                FROM docente_asignaciones da
                INNER JOIN carrera_materias cm
                  ON cm.id_carrera = da.id_carrera AND cm.id_materia = da.id_materia
                INNER JOIN carreras c ON c.id_carrera = cm.id_carrera
                INNER JOIN materias m ON m.id_materia = cm.id_materia
                WHERE da.id_personal = :idp
                ORDER BY c.nombre_carrera ASC, cm.anio_cursada ASC, m.nombre_materia ASC";
        $st = $this->db->prepare($sql);
        $st->execute([':idp' => $idPersonal]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    /** @return array<int,array> */
    public function catalogoCompleto(): array
    {
        $sql = "SELECT c.id_carrera, c.nombre_carrera, c.nombre_carrera_corto,
                       m.id_materia, m.nombre_materia, cm.anio_cursada
                FROM carrera_materias cm
                INNER JOIN carreras c ON c.id_carrera = cm.id_carrera
                INNER JOIN materias m ON m.id_materia = cm.id_materia
                ORDER BY c.nombre_carrera ASC, cm.anio_cursada ASC, m.nombre_materia ASC";
        $st = $this->db->prepare($sql);
        $st->execute();
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    /** @param array<int,array> $rows */
    public function materiasPorCarreraMap(array $rows): array
    {
        $map = [];
        foreach ($rows as $r) {
            $cid = (int) $r['id_carrera'];
            if (!isset($map[$cid])) {
                $map[$cid] = [
                    'id_carrera' => $cid,
                    'nombre_carrera' => $r['nombre_carrera'],
                    'materias' => [],
                ];
            }
            $map[$cid]['materias'][] = [
                'id_materia' => (int) $r['id_materia'],
                'nombre_materia' => $r['nombre_materia'],
                'anio_cursada' => (int) $r['anio_cursada'],
            ];
        }
        return array_values($map);
    }

    /** Años de inscripción disponibles para una carrera. */
    public function aniosDisponibles(int $idCarrera): array
    {
        $st = $this->db->prepare(
            'SELECT DISTINCT anio_inscripcion
             FROM matriculacion
             WHERE id_carrera = :c AND anio_inscripcion > 0
             ORDER BY anio_inscripcion DESC'
        );
        $st->bindValue(':c', $idCarrera, PDO::PARAM_INT);
        $st->execute();
        return array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN));
    }

    /** Alumnos matriculados en la carrera, con filtros opcionales de año y búsqueda. */
    public function alumnosPorCarreraMateria(
        int $idCarrera,
        int $idMateria,
        int $anio = 0,
        string $busqueda = ''
    ): array {
        $sql = "SELECT a.id_alumno,
                       a.numero_documento,
                       a.legajo,
                       mat.anio_inscripcion,
                       TRIM(CONCAT(a.primer_apellido,' ',COALESCE(a.otros_apellidos,''))) AS apellido,
                       TRIM(CONCAT(a.primer_nombre,' ',COALESCE(a.otros_nombres,''))) AS nombre,
                       ha.nota,
                       ha.tipo_alumno,
                       ha.anio_regular,
                       ha.fecha_aprobacion,
                       ha.validado_regular,
                       ha.validado_examen,
                       ha.tomo_acta,
                       ha.folio_acta
                FROM matriculacion mat
                INNER JOIN alumnos a ON a.id_alumno = mat.id_alumno
                LEFT JOIN historial_academico ha
                  ON ha.id_alumno = a.id_alumno
                 AND ha.id_carrera = mat.id_carrera
                 AND ha.id_materia = :id_materia
                WHERE mat.id_carrera = :id_carrera";

        if ($anio > 0) {
            $sql .= ' AND mat.anio_inscripcion = :anio';
        }

        $busqueda = trim($busqueda);
        if ($busqueda !== '') {
            $sql .= " AND (
                a.primer_apellido LIKE :q1
                OR a.otros_apellidos LIKE :q2
                OR a.primer_nombre LIKE :q3
                OR a.otros_nombres LIKE :q4
                OR a.legajo LIKE :q5
                OR a.numero_documento LIKE :q6
            )";
        }

        $sql .= ' ORDER BY a.primer_apellido ASC, a.primer_nombre ASC';

        $st = $this->db->prepare($sql);
        $st->bindValue(':id_materia', $idMateria, PDO::PARAM_INT);
        $st->bindValue(':id_carrera', $idCarrera, PDO::PARAM_INT);
        if ($anio > 0) {
            $st->bindValue(':anio', $anio, PDO::PARAM_INT);
        }
        if ($busqueda !== '') {
            $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $busqueda) . '%';
            for ($i = 1; $i <= 6; $i++) {
                $st->bindValue(':q' . $i, $like, PDO::PARAM_STR);
            }
        }
        $st->execute();
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Guarda o actualiza la calificación de un alumno en una materia asignada.
     * Escribe sobre historial_academico, que ya existe en el esquema.
     *
     * @param array<string,mixed> $datos
     * @return array<string,mixed>
     */
    public function guardarNota(
        int $idPersonal,
        int $idAlumno,
        int $idCarrera,
        int $idMateria,
        array $datos,
        bool $permitirSinAsignacion = false
    ): array {
        $notaBruta = $datos['nota'] ?? '';
        if ($notaBruta === '' || $notaBruta === null || !is_numeric($notaBruta)) {
            throw new InvalidArgumentException('Ingresá una nota válida.');
        }
        if ((float) $notaBruta !== floor((float) $notaBruta)) {
            throw new InvalidArgumentException('La nota debe ser un número entero.');
        }
        $nota = (int) $notaBruta;
        if ($nota < 0 || $nota > 10) {
            throw new InvalidArgumentException('La nota debe estar entre 0 y 10.');
        }

        $tipo = strtoupper(trim((string) ($datos['tipo_alumno'] ?? 'X')));
        if (!in_array($tipo, ['P', 'R', 'L', 'X'], true)) {
            throw new InvalidArgumentException('La condición seleccionada no es válida.');
        }
        if ($tipo === 'P' && $nota < 4) {
            throw new InvalidArgumentException('Para promocionar, la nota debe ser 4 o mayor.');
        }
        if ($tipo === 'L' && $nota > 0) {
            throw new InvalidArgumentException('Un alumno libre no puede tener nota de final.');
        }

        $fecha = trim((string) ($datos['fecha_aprobacion'] ?? ''));
        if ($fecha !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            throw new InvalidArgumentException('La fecha de aprobación no es válida.');
        }
        if ($nota >= 4 && $fecha === '') {
            $fecha = date('Y-m-d');
        }
        if ($nota < 4) {
            $fecha = null;
        }

        $tomo = $this->numeroOpcional($datos['tomo_acta'] ?? null);
        $folio = $this->numeroOpcional($datos['folio_acta'] ?? null);

        $this->db->beginTransaction();
        try {
            if (!$permitirSinAsignacion) {
                $st = $this->db->prepare(
                    'SELECT 1 FROM docente_asignaciones
                     WHERE id_personal = :p AND id_carrera = :c AND id_materia = :m LIMIT 1'
                );
                $st->execute([':p' => $idPersonal, ':c' => $idCarrera, ':m' => $idMateria]);
                if (!$st->fetchColumn()) {
                    throw new RuntimeException('No tenés asignada esa materia.');
                }
            }

            $st = $this->db->prepare(
                'SELECT 1 FROM matriculacion
                 WHERE id_alumno = :a AND id_carrera = :c LIMIT 1'
            );
            $st->execute([':a' => $idAlumno, ':c' => $idCarrera]);
            if (!$st->fetchColumn()) {
                throw new RuntimeException('El alumno no está matriculado en esa carrera.');
            }

            $st = $this->db->prepare(
                'SELECT 1 FROM carrera_materias
                 WHERE id_carrera = :c AND id_materia = :m LIMIT 1'
            );
            $st->execute([':c' => $idCarrera, ':m' => $idMateria]);
            if (!$st->fetchColumn()) {
                throw new RuntimeException('La materia no pertenece a la carrera.');
            }

            $st = $this->db->prepare(
                "INSERT INTO historial_academico
                    (id_alumno, id_carrera, id_materia, nota, tipo_alumno,
                     fecha_aprobacion, tomo_acta, folio_acta, fecha_alta, fecha_mod)
                 VALUES
                    (:a, :c, :m, :nota, :tipo, :fecha,
                     COALESCE(:tomo, 0), COALESCE(:folio, 0), NOW(), NOW())
                 ON DUPLICATE KEY UPDATE
                    nota = VALUES(nota),
                    tipo_alumno = VALUES(tipo_alumno),
                    fecha_aprobacion = VALUES(fecha_aprobacion),
                    tomo_acta = COALESCE(:tomo_upd, tomo_acta),
                    folio_acta = COALESCE(:folio_upd, folio_acta),
                    fecha_mod = NOW()"
            );
            $st->execute([
                ':a' => $idAlumno,
                ':c' => $idCarrera,
                ':m' => $idMateria,
                ':nota' => $nota,
                ':tipo' => $tipo,
                ':fecha' => $fecha,
                ':tomo' => $tomo,
                ':folio' => $folio,
                ':tomo_upd' => $tomo,
                ':folio_upd' => $folio,
            ]);

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }

        $alumno = $this->alumnoPorCarreraMateria($idAlumno, $idCarrera, $idMateria);
        if ($alumno === null) {
            throw new RuntimeException('No se pudo recuperar el registro guardado.');
        }
        return $alumno;
    }

    /** @return array<string,mixed>|null */
    public function alumnoPorCarreraMateria(int $idAlumno, int $idCarrera, int $idMateria): ?array
    {
        $sql = "SELECT a.id_alumno,
                       a.numero_documento,
                       a.legajo,
                       TRIM(CONCAT(a.primer_apellido,' ',COALESCE(a.otros_apellidos,''))) AS apellido,
                       TRIM(CONCAT(a.primer_nombre,' ',COALESCE(a.otros_nombres,''))) AS nombre,
                       ha.nota,
                       ha.tipo_alumno,
                       ha.anio_regular,
                       ha.fecha_aprobacion,
                       ha.validado_regular,
                       ha.validado_examen,
                       ha.tomo_acta,
                       ha.folio_acta
                FROM matriculacion mat
                INNER JOIN alumnos a ON a.id_alumno = mat.id_alumno
                LEFT JOIN historial_academico ha
                  ON ha.id_alumno = a.id_alumno
                 AND ha.id_carrera = mat.id_carrera
                 AND ha.id_materia = :id_materia
                WHERE mat.id_carrera = :id_carrera
                  AND a.id_alumno = :id_alumno
                LIMIT 1";
        $st = $this->db->prepare($sql);
        $st->execute([
            ':id_carrera' => $idCarrera,
            ':id_materia' => $idMateria,
            ':id_alumno' => $idAlumno,
        ]);
        $fila = $st->fetch(PDO::FETCH_ASSOC);
        return $fila === false ? null : $fila;
    }

    private function numeroOpcional($valor): ?int
    {
        if ($valor === null || $valor === '') {
            return null;
        }
        if (!is_numeric($valor)) {
            throw new InvalidArgumentException('El número de acta no es válido.');
        }
        return max(0, (int) $valor);
    }
}
