<?php
/**
 * Modelo: Inscripciones a finales — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * Listado de inscripciones y acciones de gestión: cancelar, reactivar
 * y eliminar registros cargados por error.
 */

require_once __DIR__ . '/../../modelo/Conexion.php';

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
                   COALESCE(t.turno, CONCAT('Turno ', i.id_turno)) AS turno,
                   i.anio,
                   i.estado,
                   i.fecha_hora
            FROM inscripciones i
            INNER JOIN alumnos a  ON a.id_alumno  = i.id_alumno
            INNER JOIN materias m ON m.id_materia  = i.id_materia
            INNER JOIN carreras c ON c.id_carrera  = i.id_carrera
            LEFT JOIN turnos t    ON t.id_turno    = i.id_turno
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

        return [
            'inscripciones' => $stmt->fetchAll(),
            'total'         => $total,
            'paginas'       => (int)ceil($total / $porPagina),
        ];
    }

    public function obtenerPorId(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT id_inscripcion, estado
            FROM inscripciones
            WHERE id_inscripcion = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $fila = $stmt->fetch();
        return $fila === false ? null : $fila;
    }

    /** Cambia el estado de una inscripción: 'A' activa, 'C' cancelada. */
    public function cambiarEstado(int $id, string $estado): array
    {
        if (!in_array($estado, ['A', 'C'], true)) {
            return ['ok' => false, 'mensaje' => 'Estado no válido.'];
        }

        $inscripcion = $this->obtenerPorId($id);
        if ($inscripcion === null) {
            return ['ok' => false, 'mensaje' => 'Inscripción no encontrada.'];
        }
        if ($inscripcion['estado'] === $estado) {
            return ['ok' => true, 'mensaje' => 'La inscripción ya tiene ese estado.'];
        }

        try {
            $stmt = $this->db->prepare("
                UPDATE inscripciones SET estado = :estado WHERE id_inscripcion = :id
            ");
            $stmt->execute([':estado' => $estado, ':id' => $id]);

            return [
                'ok'      => true,
                'mensaje' => $estado === 'C' ? 'Inscripción cancelada.' : 'Inscripción reactivada.',
            ];
        } catch (Throwable $e) {
            error_log('[Clementina InscripcionesAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo actualizar la inscripción.'];
        }
    }

    /** Elimina físicamente una inscripción cargada por error. */
    public function eliminar(int $id): array
    {
        if ($this->obtenerPorId($id) === null) {
            return ['ok' => false, 'mensaje' => 'Inscripción no encontrada.'];
        }

        try {
            $stmt = $this->db->prepare("DELETE FROM inscripciones WHERE id_inscripcion = :id");
            $stmt->execute([':id' => $id]);
            return ['ok' => true, 'mensaje' => 'Inscripción eliminada.'];
        } catch (Throwable $e) {
            error_log('[Clementina InscripcionesAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo eliminar la inscripción.'];
        }
    }
}
