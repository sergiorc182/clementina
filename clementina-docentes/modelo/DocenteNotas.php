<?php
require_once dirname(__DIR__, 2) . '/modelo/Conexion.php';
require_once dirname(__DIR__, 2) . '/modelo/ValidadorAcademico.php';

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

    /** Alumnos matriculados en la carrera que tienen historial/inscripción en esa materia (o todos matriculados en carrera). */
    public function alumnosPorCarreraMateria(int $idCarrera, int $idMateria): array
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
                ORDER BY a.primer_apellido ASC, a.primer_nombre ASC";
        $st = $this->db->prepare($sql);
        $st->execute([':id_carrera' => $idCarrera, ':id_materia' => $idMateria]);

        $validador = new ValidadorAcademico($this->db);
        $permitidos = $validador->alumnosConDerecho($idCarrera, $idMateria);
        $filas = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            if (isset($permitidos[(int) $fila['id_alumno']])) {
                $filas[] = $fila;
            }
        }
        return $filas;
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
        array $datos
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
        if ($fecha !== '') {
            $partesFecha = array_map('intval', explode('-', $fecha));
            $fechaValida = preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) === 1
                && count($partesFecha) === 3
                && checkdate($partesFecha[1], $partesFecha[2], $partesFecha[0]);
            if (!$fechaValida) {
                throw new InvalidArgumentException('La fecha de aprobación no es válida.');
            }
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
            $validador = new ValidadorAcademico($this->db);
            if (!$validador->docenteAsignado($idPersonal, $idCarrera, $idMateria)) {
                throw new RuntimeException('No tenés asignada esa materia.');
            }

            $st = $this->db->prepare(
                'SELECT id_alumno FROM matriculacion
                 WHERE id_alumno = :a AND id_carrera = :c LIMIT 1 FOR UPDATE'
            );
            $st->execute([':a' => $idAlumno, ':c' => $idCarrera]);
            if (!$st->fetchColumn()) {
                throw new RuntimeException('El alumno no está matriculado en esa carrera.');
            }

            $derecho = $validador->verificarDerecho($idAlumno, $idCarrera, $idMateria);

            $st = $this->db->prepare(
                "INSERT INTO historial_academico
                    (id_alumno, id_carrera, id_materia, anio_regular, nota, tipo_alumno,
                     fecha_aprobacion, tomo_acta, folio_acta, fecha_alta, fecha_mod)
                 VALUES
                    (:a, :c, :m, :anio, :nota, :tipo, :fecha,
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
                ':anio' => $derecho['anio'],
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

    private function numeroOpcional(mixed $valor): ?int
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
