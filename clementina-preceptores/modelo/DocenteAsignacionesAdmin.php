<?php
require_once dirname(__DIR__, 2) . '/modelo/Conexion.php';

class DocenteAsignacionesAdmin
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    public function listarDocentes(): array
    {
        $st = $this->db->query("SELECT id_personal, apellidos, nombres, usuario_sistema
            FROM personal
            WHERE id_tipo_personal = 'D'
            ORDER BY apellidos, nombres");
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    public function carrerasMateriasFlat(): array
    {
        $sql = "SELECT cm.id_carrera, c.nombre_carrera, c.nombre_carrera_corto,
                       cm.id_materia, m.nombre_materia, cm.anio_cursada
                FROM carrera_materias cm
                INNER JOIN carreras c ON c.id_carrera = cm.id_carrera
                INNER JOIN materias m ON m.id_materia = cm.id_materia
                ORDER BY c.nombre_carrera, cm.anio_cursada, m.nombre_materia";
        $st = $this->db->query($sql);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    public function buscarDocentes(string $q, int $limite = 8): array
    {
        $q = trim($q);
        if ($q === '') {
            return [];
        }
        $like = '%' . $q . '%';
        $sql = "SELECT id_personal, apellidos, nombres, usuario_sistema
                FROM personal
                WHERE id_tipo_personal = 'D'
                  AND (apellidos LIKE :b1 OR nombres LIKE :b2
                       OR usuario_sistema LIKE :b3
                       OR CONCAT(apellidos, ' ', nombres) LIKE :b4)
                ORDER BY apellidos, nombres
                LIMIT " . max(1, min(20, $limite));
        $st = $this->db->prepare($sql);
        $st->execute([
            ':b1' => $like,
            ':b2' => $like,
            ':b3' => $like,
            ':b4' => $like,
        ]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    public function buscarMaterias(string $q, int $limite = 8): array
    {
        $q = trim($q);
        if ($q === '') {
            return [];
        }
        $like = '%' . $q . '%';
        $sql = "SELECT cm.id_carrera, c.nombre_carrera, c.nombre_carrera_corto,
                       cm.id_materia, m.nombre_materia, cm.anio_cursada
                FROM carrera_materias cm
                INNER JOIN carreras c ON c.id_carrera = cm.id_carrera
                INNER JOIN materias m ON m.id_materia = cm.id_materia
                WHERE m.nombre_materia LIKE :b1
                   OR c.nombre_carrera LIKE :b2
                   OR c.nombre_carrera_corto LIKE :b3
                   OR CONCAT(c.nombre_carrera, ' ', m.nombre_materia) LIKE :b4
                ORDER BY c.nombre_carrera, cm.anio_cursada, m.nombre_materia
                LIMIT " . max(1, min(20, $limite));
        $st = $this->db->prepare($sql);
        $st->execute([
            ':b1' => $like,
            ':b2' => $like,
            ':b3' => $like,
            ':b4' => $like,
        ]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    private function sqlAsignaciones(): string
    {
        return "SELECT da.id_asignacion, da.id_personal, da.id_carrera, da.id_materia,
                       p.apellidos, p.nombres, p.usuario_sistema,
                       c.nombre_carrera_corto, c.nombre_carrera,
                       m.nombre_materia, cm.anio_cursada
                FROM docente_asignaciones da
                INNER JOIN personal p ON p.id_personal = da.id_personal
                INNER JOIN carreras c ON c.id_carrera = da.id_carrera
                INNER JOIN materias m ON m.id_materia = da.id_materia
                INNER JOIN carrera_materias cm
                  ON cm.id_carrera = da.id_carrera AND cm.id_materia = da.id_materia";
    }

    public function listarAsignaciones(): array
    {
        $st = $this->db->query(
            $this->sqlAsignaciones()
            . " ORDER BY p.apellidos, p.nombres, c.nombre_carrera, m.nombre_materia"
        );
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listarAsignacionesPorDocente(int $idPersonal): array
    {
        $st = $this->db->prepare(
            $this->sqlAsignaciones()
            . " WHERE da.id_personal = ?
                ORDER BY c.nombre_carrera, cm.anio_cursada, m.nombre_materia"
        );
        $st->execute([$idPersonal]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    public function crear(int $idPersonal, int $idCarrera, int $idMateria): array
    {
        try {
            $docente = $this->db->prepare(
                "SELECT id_personal FROM personal
                 WHERE id_personal = ? AND id_tipo_personal = 'D'
                 LIMIT 1"
            );
            $docente->execute([$idPersonal]);
            if (!$docente->fetch()) {
                return ['ok' => false, 'mensaje' => 'La persona seleccionada no es personal docente.'];
            }

            $relacion = $this->db->prepare(
                "SELECT 1 FROM carrera_materias
                 WHERE id_carrera = ? AND id_materia = ?
                 LIMIT 1"
            );
            $relacion->execute([$idCarrera, $idMateria]);
            if (!$relacion->fetch()) {
                return ['ok' => false, 'mensaje' => 'La materia no pertenece a la carrera seleccionada.'];
            }

            $st = $this->db->prepare(
                "INSERT INTO docente_asignaciones (id_personal, id_carrera, id_materia)
                 VALUES (?, ?, ?)"
            );
            $st->execute([$idPersonal, $idCarrera, $idMateria]);
            return ['ok' => true, 'mensaje' => 'Asignación creada.'];
        } catch (PDOException $e) {
            $codigo = (int) ($e->errorInfo[1] ?? 0);
            if ($codigo === 1062) {
                return ['ok' => false, 'mensaje' => 'Esa asignación ya existe.'];
            }
            if ($codigo === 1452) {
                return ['ok' => false, 'mensaje' => 'Carrera, materia o docente inválido.'];
            }
            error_log('[DocenteAsignacionesAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo crear la asignación.'];
        }
    }

    public function eliminar(int $idAsignacion): array
    {
        try {
            $st = $this->db->prepare("DELETE FROM docente_asignaciones WHERE id_asignacion = ?");
            $st->execute([$idAsignacion]);
            if ($st->rowCount() < 1) {
                return ['ok' => false, 'mensaje' => 'No se encontró la asignación.'];
            }
            return ['ok' => true, 'mensaje' => 'Asignación eliminada.'];
        } catch (PDOException $e) {
            error_log('[DocenteAsignacionesAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo eliminar la asignación.'];
        }
    }
}
