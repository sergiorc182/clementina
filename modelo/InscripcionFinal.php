<?php
/**
 * Modelo: Inscripción a finales.
 *
 * Reglas del módulo y acceso a datos. Trabaja sobre el esquema
 * normalizado (docs/esquema_normalizado.sql):
 *
 *   parametros_mesas      período de mesas (año, turno, fechas, tope)
 *   matriculacion         carreras en las que está el alumno
 *   carrera_materias      materias de cada carrera
 *   materias / carreras   nombres
 *   historial_academico   materias aprobadas y regularidades
 *   correlatividades      correlativas que hay que tener aprobadas
 *   inscripciones         inscripciones a mesas (acá se escribe)
 *
 * El alumno se identifica siempre por `alumnos.id_alumno`.
 *
 * Las reglas que no se cumplen se informan con DomainException, y el
 * controlador muestra ese mensaje tal cual al alumno.
 */

require_once __DIR__ . '/Conexion.php';

class InscripcionFinal
{
    /** Nota mínima para dar una materia por aprobada. */
    private const NOTA_APROBACION = 4;

    /** Valores con los que se graba una inscripción nueva. */
    private const ESTADO_ACTIVA = 'A';
    private const SIN_VERIFICAR = 'N';

    public const TURNOS   = [1 => 'Febrero', 2 => 'Agosto', 3 => 'Diciembre'];
    public const LLAMADOS = [1 => 'Primer llamado'];

    private $db;
    private $idAlumno;

    /** Recibe el id interno del alumno (alumnos.id_alumno). */
    public function __construct(int $idAlumno)
    {
        $this->db       = Conexion::getInstancia()->getConexion();
        $this->idAlumno = $idAlumno;
    }

    /* ------------------------------------------------------------------ */
    /* Consultas                                                           */
    /* ------------------------------------------------------------------ */

    /**
     * Período de mesas cargado en `parametros_mesas`.
     * Si hay más de un registro, se usa el que está vigente hoy y, si
     * ninguno lo está, el que empieza más tarde.
     * Devuelve null si todavía no hay ninguno configurado.
     */
    public function periodo(): ?array
    {
        $fila = $this->db->query(
            "SELECT anio_mesas   AS anio,
                    id_turno,
                    fecha_inicio,
                    fecha_fin,
                    tope_mesas   AS tope
             FROM parametros_mesas
             ORDER BY (CURDATE() BETWEEN fecha_inicio AND fecha_fin) DESC,
                      fecha_inicio DESC
             LIMIT 1"
        )->fetch();

        $inicio = $fila ? $this->fecha($fila['fecha_inicio']) : null;
        $fin    = $fila ? $this->fecha($fila['fecha_fin']) : null;

        if (!$fila || $inicio === null || $fin === null) {
            return null;
        }

        $hoy     = date('Y-m-d');
        $idTurno = (int) $fila['id_turno'];

        return [
            'anio'         => (int) $fila['anio'],
            'id_turno'     => $idTurno,
            'turno'        => self::TURNOS[$idTurno] ?? ('Turno ' . $idTurno),
            'fecha_inicio' => $inicio,
            'fecha_fin'    => $fin,
            'tope'         => (int) $fila['tope'],
            'abierto'      => $hoy >= $inicio && $hoy <= $fin,
        ];
    }

    /**
     * Materias que el alumno todavía no aprobó, de las carreras en las
     * que está matriculado. Cada una indica su condición, las
     * correlativas que le faltan y si ya está inscripto en el período.
     */
    public function materias(?array $periodo): array
    {
        $stmt = $this->db->prepare(
            "SELECT DISTINCT
                    cm.id_carrera,
                    c.nombre_carrera AS carrera,
                    cm.id_materia,
                    m.nombre_materia AS materia,
                    cm.anio_cursada,
                    h.anio_regular
             FROM matriculacion mt
             JOIN carrera_materias cm ON cm.id_carrera = mt.id_carrera
             JOIN materias m ON m.id_materia = cm.id_materia
             JOIN carreras c ON c.id_carrera = cm.id_carrera
             LEFT JOIN historial_academico h
                    ON h.id_alumno = mt.id_alumno
                   AND h.id_carrera = cm.id_carrera
                   AND h.id_materia = cm.id_materia
             WHERE mt.id_alumno = :alumno
               AND (h.nota IS NULL OR h.nota < :aprobado)
             ORDER BY c.nombre_carrera, cm.anio_cursada, m.nombre_materia"
        );
        $this->bindAlumno($stmt);
        $stmt->bindValue(':aprobado', self::NOTA_APROBACION, PDO::PARAM_INT);
        $stmt->execute();

        $pendientes = $this->correlativasPendientes();
        $inscriptas = [];
        foreach ($periodo ? $this->inscripciones($periodo) : [] as $insc) {
            $inscriptas[$insc['id_carrera'] . '-' . $insc['id_materia']] = $insc['id_llamado'];
        }

        $materias = [];
        foreach ($stmt->fetchAll() as $fila) {
            $clave = $fila['id_carrera'] . '-' . $fila['id_materia'];
            $materias[] = [
                'id_carrera'   => (int) $fila['id_carrera'],
                'carrera'      => $fila['carrera'],
                'id_materia'   => (int) $fila['id_materia'],
                'materia'      => $fila['materia'],
                'anio_cursada' => (int) $fila['anio_cursada'],
                'condicion'    => ((int) $fila['anio_regular']) > 0 ? 'Regular' : 'Libre',
                'correlativas' => $pendientes[$clave] ?? [],
                'llamado'      => $inscriptas[$clave] ?? null,
            ];
        }

        return $materias;
    }

    /** Inscripciones del alumno en el período indicado. */
    public function inscripciones(array $periodo): array
    {
        $stmt = $this->db->prepare(
            "SELECT i.id_carrera,
                    c.nombre_carrera AS carrera,
                    i.id_materia,
                    m.nombre_materia AS materia,
                    i.id_llamado,
                    i.fecha_hora     AS fecha_inscripcion
             FROM inscripciones i
             JOIN materias m ON m.id_materia = i.id_materia
             JOIN carreras c ON c.id_carrera = i.id_carrera
             WHERE i.id_alumno = :alumno
               AND i.anio = :anio
               AND i.id_turno = :turno
             ORDER BY i.id_llamado, m.nombre_materia"
        );
        $this->bindAlumno($stmt);
        $stmt->bindValue(':anio', $periodo['anio'], PDO::PARAM_INT);
        $stmt->bindValue(':turno', $periodo['id_turno'], PDO::PARAM_INT);
        $stmt->execute();

        $inscripciones = [];
        foreach ($stmt->fetchAll() as $fila) {
            $idLlamado = (int) $fila['id_llamado'];
            $inscripciones[] = [
                'id_carrera'        => (int) $fila['id_carrera'],
                'carrera'           => $fila['carrera'],
                'id_materia'        => (int) $fila['id_materia'],
                'materia'           => $fila['materia'],
                'id_llamado'        => $idLlamado,
                'llamado'           => self::LLAMADOS[$idLlamado] ?? ('Llamado ' . $idLlamado),
                'fecha_inscripcion' => $fila['fecha_inscripcion'],
            ];
        }

        return $inscripciones;
    }

    /* ------------------------------------------------------------------ */
    /* Acciones                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Inscribe al alumno en una materia y llamado del período vigente.
     * Lanza DomainException si no se cumple alguna regla.
     */
    public function inscribir(int $idCarrera, int $idMateria, int $idLlamado): void
    {
        $periodo = $this->periodoAbierto();

        if (!isset(self::LLAMADOS[$idLlamado])) {
            throw new DomainException('Elegí un llamado válido.');
        }

        $materia = $this->buscarMateria($this->materias($periodo), $idCarrera, $idMateria);

        if ($materia === null) {
            throw new DomainException('Esa materia no está disponible para rendir.');
        }
        if ($materia['llamado'] !== null) {
            throw new DomainException('Ya estás inscripto en esa materia para este turno.');
        }
        if ($materia['correlativas']) {
            throw new DomainException(
                'Te falta aprobar correlativas: ' . implode(', ', $materia['correlativas']) . '.'
            );
        }
        if ($periodo['tope'] > 0 && count($this->inscripciones($periodo)) >= $periodo['tope']) {
            throw new DomainException(
                'Llegaste al máximo de ' . $periodo['tope'] . ' mesas para este turno.'
            );
        }

        // Los datos personales ya no se copian: se leen de `alumnos` con JOIN.
        $stmt = $this->db->prepare(
            "INSERT INTO inscripciones
               (id_alumno, id_carrera, id_materia, anio, id_turno,
                id_llamado, estado, verificada, fecha_hora)
             VALUES
               (:alumno, :carrera, :materia, :anio, :turno,
                :llamado, :estado, :verificada, NOW())"
        );
        $this->bindAlumno($stmt);
        $stmt->bindValue(':carrera', $idCarrera, PDO::PARAM_INT);
        $stmt->bindValue(':materia', $idMateria, PDO::PARAM_INT);
        $stmt->bindValue(':anio', $periodo['anio'], PDO::PARAM_INT);
        $stmt->bindValue(':turno', $periodo['id_turno'], PDO::PARAM_INT);
        $stmt->bindValue(':llamado', $idLlamado, PDO::PARAM_INT);
        $stmt->bindValue(':estado', self::ESTADO_ACTIVA);
        $stmt->bindValue(':verificada', self::SIN_VERIFICAR);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            throw new DomainException('No se pudo registrar la inscripción.');
        }
    }

    /**
     * Da de baja la inscripción del alumno a una materia del período
     * vigente. Solo se puede mientras la inscripción esté abierta.
     */
    public function cancelar(int $idCarrera, int $idMateria): void
    {
        $periodo = $this->periodoAbierto();

        $stmt = $this->db->prepare(
            "DELETE FROM inscripciones
             WHERE id_alumno = :alumno
               AND id_carrera = :carrera
               AND id_materia = :materia
               AND anio = :anio
               AND id_turno = :turno"
        );
        $this->bindAlumno($stmt);
        $stmt->bindValue(':carrera', $idCarrera, PDO::PARAM_INT);
        $stmt->bindValue(':materia', $idMateria, PDO::PARAM_INT);
        $stmt->bindValue(':anio', $periodo['anio'], PDO::PARAM_INT);
        $stmt->bindValue(':turno', $periodo['id_turno'], PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            throw new DomainException('No estabas inscripto en esa materia.');
        }
    }

    /* ------------------------------------------------------------------ */
    /* Internos                                                            */
    /* ------------------------------------------------------------------ */

    /** Período vigente, o DomainException si la inscripción está cerrada. */
    private function periodoAbierto(): array
    {
        $periodo = $this->periodo();

        if ($periodo === null || !$periodo['abierto']) {
            throw new DomainException('La inscripción a finales está cerrada.');
        }

        return $periodo;
    }

    /**
     * Correlativas que el alumno todavía no aprobó, agrupadas por
     * "id_carrera-id_materia" => [nombres de las materias que faltan].
     */
    private function correlativasPendientes(): array
    {
        $stmt = $this->db->prepare(
            "SELECT DISTINCT
                    co.id_carrera,
                    co.id_materia,
                    m.nombre_materia AS correlativa
             FROM matriculacion mt
             JOIN correlatividades co ON co.id_carrera = mt.id_carrera
             JOIN materias m ON m.id_materia = co.id_materia_correlativa
             LEFT JOIN historial_academico h
                    ON h.id_alumno = mt.id_alumno
                   AND h.id_carrera = co.id_carrera
                   AND h.id_materia = co.id_materia_correlativa
                   AND h.nota >= :aprobado
             WHERE mt.id_alumno = :alumno
               AND h.id_materia IS NULL
             ORDER BY m.nombre_materia"
        );
        $this->bindAlumno($stmt);
        $stmt->bindValue(':aprobado', self::NOTA_APROBACION, PDO::PARAM_INT);
        $stmt->execute();

        $pendientes = [];
        foreach ($stmt->fetchAll() as $fila) {
            $pendientes[$fila['id_carrera'] . '-' . $fila['id_materia']][] = $fila['correlativa'];
        }

        return $pendientes;
    }

    private function buscarMateria(array $materias, int $idCarrera, int $idMateria): ?array
    {
        foreach ($materias as $materia) {
            if ($materia['id_carrera'] === $idCarrera && $materia['id_materia'] === $idMateria) {
                return $materia;
            }
        }
        return null;
    }

    private function bindAlumno(PDOStatement $stmt): void
    {
        $stmt->bindValue(':alumno', $this->idAlumno, PDO::PARAM_INT);
    }

    /** Normaliza una fecha de la base; null si está vacía o es 0000-00-00. */
    private function fecha($valor): ?string
    {
        $valor = substr((string) $valor, 0, 10);
        return ($valor === '' || $valor === '0000-00-00') ? null : $valor;
    }
}
