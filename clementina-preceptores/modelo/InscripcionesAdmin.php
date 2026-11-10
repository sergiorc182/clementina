<?php
/**
 * Modelo: Inscripciones a finales — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * Solo lectura: consulta inscripciones sin modificarlas.
 */

require_once __DIR__ . '/../../modelo/Conexion.php';
require_once __DIR__ . '/../../modelo/InscripcionFinal.php';

class InscripcionesAdmin
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Lista inscripciones con filtro y paginación.
     *
     * @param string      $busqueda  Texto libre
     * @param string|null $estado    'A' (activa) | 'C' (cancelada) | null (todas)
     * @param int         $pagina
     * @param int         $porPagina
     */
    public function listar(string $busqueda, ?string $estado, int $pagina, int $porPagina): array
    {
        $offset = ($pagina - 1) * $porPagina;
        $condiciones = [];
        $params = [];

        if ($busqueda !== '') {
            $like = '%' . $busqueda . '%';
            $condiciones[] = "(CONCAT(a.primer_apellido, ' ', a.primer_nombre) LIKE :b1
                               OR m.nombre_materia LIKE :b2
                               OR c.nombre_carrera LIKE :b3
                               OR CAST(a.numero_documento AS CHAR) LIKE :b4)";
            $params[':b1'] = $like;
            $params[':b2'] = $like;
            $params[':b3'] = $like;
            $params[':b4'] = $like;
        }

        if ($estado !== null && $estado !== '') {
            $condiciones[] = 'i.estado = :estado';
            $params[':estado'] = $estado;
        }

        $where = $condiciones ? 'WHERE ' . implode(' AND ', $condiciones) : '';

        $stmtCount = $this->db->prepare("
            SELECT COUNT(*)
            FROM inscripciones i
            INNER JOIN alumnos a  ON a.id_alumno  = i.id_alumno
            INNER JOIN materias m ON m.id_materia  = i.id_materia
            INNER JOIN carreras c ON c.id_carrera  = i.id_carrera
            $where
        ");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $sql = "
            SELECT i.id_inscripcion,
                   CONCAT(a.primer_apellido, ', ', a.primer_nombre) AS alumno,
                   a.numero_documento,
                   m.nombre_materia AS materia,
                   c.nombre_carrera_corto AS carrera,
                   i.id_turno,
                   i.anio,
                   i.estado,
                   i.fecha_hora
            FROM inscripciones i
            INNER JOIN alumnos a  ON a.id_alumno  = i.id_alumno
            INNER JOIN materias m ON m.id_materia  = i.id_materia
            INNER JOIN carreras c ON c.id_carrera  = i.id_carrera
            $where
            ORDER BY i.fecha_hora DESC
            LIMIT :limite OFFSET :offset
        ";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limite', $porPagina, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        /* En inscripciones, id_turno es el turno de MESAS
           (1=Febrero, 2=Agosto, 3=Diciembre), no el de cursada. */
        $inscripciones = array_map(function (array $fila): array {
            $fila['turno'] = InscripcionFinal::TURNOS[(int) $fila['id_turno']] ?? ('Turno ' . $fila['id_turno']);
            return $fila;
        }, $stmt->fetchAll());

        return [
            'inscripciones' => $inscripciones,
            'total'         => $total,
            'paginas'       => (int)ceil($total / $porPagina),
        ];
    }
}
