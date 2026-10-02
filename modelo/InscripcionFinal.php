<?php
/**
 * Modelo: Inscripción a finales.
 *
 * Reglas del módulo y acceso a datos. Trabaja sobre la base real
 * (`u714838186_desarrollo`), con sus tablas y columnas actuales:
 *
 *   parametros            período de mesas (año, turno, fechas, tope)
 *   matriculacion         carreras en las que está el alumno
 *   rel_carrera_materias  materias de cada carrera
 *   materias / carreras   nombres
 *   historialacademico    materias aprobadas y regularidades
 *   correlatividades      correlativas que hay que tener aprobadas
 *   inscripciones         inscripciones a mesas (acá se escribe)
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
    public const LLAMADOS = [1 => 'Primer llamado', 2 => 'Segundo llamado'];

    private $db;
    private $tipoDocumento;
    private $documento;

    /** Recibe la clave del alumno: tipo y número de documento. */
    public function __construct(string $tipoDocumento, int $documento)
    {
        $this->db            = Conexion::getInstancia()->getConexion();
        $this->tipoDocumento = $tipoDocumento;
        $this->documento     = $documento;
    }

    /* ------------------------------------------------------------------ */
    /* Consultas                                                           */
    /* ------------------------------------------------------------------ */

    /**
     * Período de mesas cargado en `parametros`.
     * Devuelve null si todavía no hay ninguno configurado.
     */
    public function periodo(): ?array
    {
        $fila = $this->db->query(
            "SELECT aniomesas        AS anio,
                    idturnomesas     AS id_turno,
                    fechainiciomesas AS fecha_inicio,
                    fechafinmesas    AS fecha_fin,
                    topemesas        AS tope
             FROM parametros
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
                    cm.idcarrera     AS id_carrera,
                    c.nombrecarrera  AS carrera,
                    cm.idmateria     AS id_materia,
                    m.nombremateria  AS materia,
                    cm.aniocursada   AS anio_cursada,
                    h.anioregular    AS anio_regular
             FROM matriculacion mt
             JOIN rel_carrera_materias cm ON cm.idcarrera = mt.idcarrera
             JOIN materias m ON m.idmateria = cm.idmateria
             JOIN carreras c ON c.idcarrera = cm.idcarrera
             LEFT JOIN historialacademico h
                    ON h.idtipodocumento = mt.idtipodocumento
                   AND h.numerodocumento = mt.numerodocumento
                   AND h.idcarrera = cm.idcarrera
                   AND h.idmateria = cm.idmateria
             WHERE mt.idtipodocumento = :tipo
               AND mt.numerodocumento = :doc
               AND (h.nota IS NULL OR h.nota < :aprobado)
             ORDER BY c.nombrecarrera, cm.aniocursada, m.nombremateria"
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
            "SELECT i.idcarrera     AS id_carrera,
                    c.nombrecarrera AS carrera,
                    i.idmateria     AS id_materia,
                    m.nombremateria AS materia,
                    i.idllamado     AS id_llamado,
                    i.fechahora     AS fecha_inscripcion
             FROM inscripciones i
             JOIN materias m ON m.idmateria = i.idmateria
             JOIN carreras c ON c.idcarrera = i.idcarrera
             WHERE i.idtipodedocumento = :tipo
               AND i.iddocumento = :doc
               AND i.anio = :anio
               AND i.idturno = :turno
             ORDER BY i.idllamado, m.nombremateria"
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

        // Los datos personales se copian desde `alumnos` porque la tabla
        // `inscripciones` actual los guarda en columnas propias.
        $stmt = $this->db->prepare(
            "INSERT INTO inscripciones
               (idtipodedocumento, iddocumento, primernombre, otrosnombres,
                primerapellido, otrosapellidos, idemail, idcarrera, idmateria,
                anio, idturno, idllamado, estado, verificada, fechahora)
             SELECT a.idtipodocumento, a.numerodocumento, a.primernombre, a.otrosnombres,
                    a.primerapellido, a.otrosapellidos, a.idemail, :carrera, :materia,
                    :anio, :turno, :llamado, :estado, :verificada, NOW()
             FROM alumnos a
             WHERE a.idtipodocumento = :tipo AND a.numerodocumento = :doc
             LIMIT 1"
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
             WHERE idtipodedocumento = :tipo
               AND iddocumento = :doc
               AND idcarrera = :carrera
               AND idmateria = :materia
               AND anio = :anio
               AND idturno = :turno"
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
     * "idcarrera-idmateria" => [nombres de las materias que faltan].
     */
    private function correlativasPendientes(): array
    {
        $stmt = $this->db->prepare(
            "SELECT DISTINCT
                    co.idcarrera    AS id_carrera,
                    co.idmateria    AS id_materia,
                    m.nombremateria AS correlativa
             FROM matriculacion mt
             JOIN correlatividades co ON co.idcarrera = mt.idcarrera
             JOIN materias m ON m.idmateria = co.idmateriacorrelativa
             LEFT JOIN historialacademico h
                    ON h.idtipodocumento = mt.idtipodocumento
                   AND h.numerodocumento = mt.numerodocumento
                   AND h.idcarrera = co.idcarrera
                   AND h.idmateria = co.idmateriacorrelativa
                   AND h.nota >= :aprobado
             WHERE mt.idtipodocumento = :tipo
               AND mt.numerodocumento = :doc
               AND h.idmateria IS NULL
             ORDER BY m.nombremateria"
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
        $stmt->bindValue(':tipo', $this->tipoDocumento);
        $stmt->bindValue(':doc', $this->documento, PDO::PARAM_INT);
    }

    /** Normaliza una fecha de la base; null si está vacía o es 0000-00-00. */
    private function fecha($valor): ?string
    {
        $valor = substr((string) $valor, 0, 10);
        return ($valor === '' || $valor === '0000-00-00') ? null : $valor;
    }
}
