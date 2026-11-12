<?php
/**
 * Modelo: Gestión de alumnos — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * Consultas para listar, buscar y obtener detalle de alumnos, y
 * actualización de datos administrativos y de contacto (legajo, email,
 * teléfono y domicilio).
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

    /**
     * Actualiza legajo, email, teléfono y domicilio del alumno.
     *
     * @param array $datos Claves: legajo, email, telefono_principal,
     *                     calle, numero, piso, depto.
     * @return array{ok:bool,mensaje:string,alumno?:array}
     */
    public function actualizarDatos(int $id, array $datos): array
    {
        $stmt = $this->db->prepare("SELECT id_alumno FROM alumnos WHERE id_alumno = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            return ['ok' => false, 'mensaje' => 'Alumno no encontrado.'];
        }

        $stmt = $this->db->prepare("
            SELECT id_alumno FROM alumnos
            WHERE email = :email AND id_alumno <> :id
            LIMIT 1
        ");
        $stmt->execute([':email' => $datos['email'], ':id' => $id]);
        if ($stmt->fetch()) {
            return ['ok' => false, 'mensaje' => 'El email ya está registrado por otro alumno.'];
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("
                UPDATE alumnos SET
                    legajo = :legajo,
                    email = :email,
                    fecha_ultima_actualizacion = NOW()
                WHERE id_alumno = :id
            ");
            $stmt->bindValue(':legajo', $datos['legajo'], $datos['legajo'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $stmt->bindValue(':email', $datos['email'], PDO::PARAM_STR);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $stmt = $this->db->prepare("
                SELECT id_domicilio FROM domicilios_alumno
                WHERE id_alumno = :id
                ORDER BY id_domicilio ASC
                LIMIT 1
            ");
            $stmt->execute([':id' => $id]);
            $idDomicilio = $stmt->fetchColumn();

            if ($idDomicilio !== false) {
                $stmt = $this->db->prepare("
                    UPDATE domicilios_alumno SET
                        calle = :calle,
                        numero = :numero,
                        piso = :piso,
                        depto = :depto,
                        telefono_principal = :telefono
                    WHERE id_domicilio = :id_domicilio
                ");
                $stmt->bindValue(':id_domicilio', $idDomicilio, PDO::PARAM_INT);
                $this->vincularDomicilio($stmt, $datos);
                $stmt->execute();
            } else {
                $tieneDatos = $datos['calle'] !== null
                    || $datos['numero'] !== null
                    || $datos['piso'] !== null
                    || $datos['depto'] !== null
                    || $datos['telefono_principal'] !== null;

                if ($tieneDatos) {
                    $stmt = $this->db->prepare("
                        INSERT INTO domicilios_alumno
                            (id_alumno, calle, numero, piso, depto, telefono_principal)
                        VALUES (:id, :calle, :numero, :piso, :depto, :telefono)
                    ");
                    $stmt->bindValue(':id', $id, PDO::PARAM_INT);
                    $this->vincularDomicilio($stmt, $datos);
                    $stmt->execute();
                }
            }

            $this->db->commit();

            return [
                'ok'      => true,
                'mensaje' => 'Datos actualizados correctamente.',
                'alumno'  => $this->obtenerPorId($id),
            ];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[Clementina AlumnoAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'Error al actualizar los datos. Intentá nuevamente.'];
        }
    }

    /**
     * Vincula los parámetros de domicilio respetando los valores NULL.
     */
    private function vincularDomicilio(PDOStatement $stmt, array $datos): void
    {
        $stmt->bindValue(':calle', $datos['calle'], $datos['calle'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':numero', $datos['numero'], $datos['numero'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(':piso', $datos['piso'], $datos['piso'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':depto', $datos['depto'], $datos['depto'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue(':telefono', $datos['telefono_principal'], $datos['telefono_principal'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    }
}
