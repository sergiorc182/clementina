<?php
/**
 * Modelo: Gestión de alumnos — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * Consultas para listar, buscar y obtener detalle de alumnos.
 * Solo lectura: el panel de preceptores no modifica datos académicos.
 */

require_once __DIR__ . '/../../modelo/Conexion.php';

class AlumnoAdmin
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Lista alumnos con búsqueda y paginación.
     *
     * @param string $busqueda  Texto libre (nombre, apellido, documento, legajo)
     * @param int    $pagina    Número de página (base 1)
     * @param int    $porPagina Registros por página
     */
    public function listar(string $busqueda, int $pagina, int $porPagina): array
    {
        $offset = ($pagina - 1) * $porPagina;
        $params = [];

        $where = '';
        if ($busqueda !== '') {
            $like   = '%' . $busqueda . '%';
            $where  = "WHERE a.primer_apellido LIKE :b1
                          OR a.otros_apellidos LIKE :b2
                          OR a.primer_nombre LIKE :b3
                          OR a.otros_nombres LIKE :b4
                          OR CAST(a.numero_documento AS CHAR) LIKE :b5
                          OR a.legajo LIKE :b6
                          OR a.email LIKE :b7";
            $params = [
                ':b1' => $like, ':b2' => $like, ':b3' => $like,
                ':b4' => $like, ':b5' => $like, ':b6' => $like, ':b7' => $like,
            ];
        }

        // Contar total para paginación
        $stmtCount = $this->db->prepare("SELECT COUNT(*) FROM alumnos a $where");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        // Obtener página
        $sql = "
            SELECT a.id_alumno,
                   a.numero_documento,
                   a.legajo,
                   CONCAT(a.primer_apellido,
                          CASE WHEN a.otros_apellidos IS NOT NULL AND a.otros_apellidos <> '' THEN CONCAT(' ', a.otros_apellidos) ELSE '' END
                   ) AS apellido,
                   CONCAT(a.primer_nombre,
                          CASE WHEN a.otros_nombres IS NOT NULL AND a.otros_nombres <> '' THEN CONCAT(' ', a.otros_nombres) ELSE '' END
                   ) AS nombre,
                   a.email,
                   a.alta_registro,
                   GROUP_CONCAT(c.nombre_carrera_corto ORDER BY c.nombre_carrera SEPARATOR ', ') AS carreras
            FROM alumnos a
            LEFT JOIN matriculacion m ON m.id_alumno = a.id_alumno
            LEFT JOIN carreras c ON c.id_carrera = m.id_carrera
            $where
            GROUP BY a.id_alumno
            ORDER BY a.primer_apellido ASC, a.primer_nombre ASC
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
            'alumnos' => $stmt->fetchAll(),
            'total'   => $total,
            'paginas' => (int)ceil($total / $porPagina),
        ];
    }

    /**
     * Devuelve el detalle completo de un alumno por su id_alumno.
     */
    public function obtenerPorId(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT a.id_alumno,
                   a.id_tipo_documento,
                   a.numero_documento,
                   a.legajo,
                   a.primer_apellido,
                   a.otros_apellidos,
                   a.primer_nombre,
                   a.otros_nombres,
                   a.email,
                   a.fecha_nacimiento,
                   a.sexo,
                   a.estado_civil,
                   a.cantidad_hijos,
                   a.cantidad_familiares_a_cargo,
                   a.alta_registro,
                   p.nombre AS pais_nacimiento,
                   l.nombre AS localidad_nacimiento,
                   d.calle,
                   d.numero AS numero_calle,
                   d.piso,
                   d.depto,
                   d.telefono_principal,
                   d.telefono_alternativo
            FROM alumnos a
            LEFT JOIN paises p ON p.id_pais = a.id_pais_nacimiento
            LEFT JOIN localidades l ON l.id_localidad = a.id_localidad_nacimiento
            LEFT JOIN domicilios_alumno d ON d.id_alumno = a.id_alumno
            WHERE a.id_alumno = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $alumno = $stmt->fetch();
        if (!$alumno) { return null; }

        // Carreras matriculadas
        $stmt2 = $this->db->prepare("
            SELECT c.id_carrera, c.nombre_carrera, c.nombre_carrera_corto,
                   m.anio_inscripcion, t.turno, s.nombre_sede
            FROM matriculacion m
            INNER JOIN carreras c ON c.id_carrera = m.id_carrera
            LEFT JOIN turnos t ON t.id_turno = m.id_turno
            LEFT JOIN sedes s ON s.id_sede = m.id_sede
            WHERE m.id_alumno = :id
            ORDER BY c.nombre_carrera ASC
        ");
        $stmt2->execute([':id' => $id]);
        $alumno['carreras'] = $stmt2->fetchAll();

        return $alumno;
    }

    /**
     * Devuelve el alumno por número de documento (para acceso rápido por DNI).
     */
    public function obtenerPorDocumento(int $documento): ?array
    {
        $stmt = $this->db->prepare("
            SELECT id_alumno FROM alumnos WHERE numero_documento = :doc LIMIT 1
        ");
        $stmt->execute([':doc' => $documento]);
        $row = $stmt->fetch();
        if (!$row) { return null; }
        return $this->obtenerPorId((int)$row['id_alumno']);
    }
}
