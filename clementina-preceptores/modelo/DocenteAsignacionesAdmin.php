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

    public function listarAsignaciones(): array
    {
        $sql = "SELECT da.id_asignacion, da.id_personal, da.id_carrera, da.id_materia,
                       p.apellidos, p.nombres, p.usuario_sistema,
                       c.nombre_carrera_corto, c.nombre_carrera,
                       m.nombre_materia
                FROM docente_asignaciones da
                INNER JOIN personal p ON p.id_personal = da.id_personal
                INNER JOIN carreras c ON c.id_carrera = da.id_carrera
                INNER JOIN materias m ON m.id_materia = da.id_materia
                ORDER BY p.apellidos, p.nombres, c.nombre_carrera, m.nombre_materia";
        $st = $this->db->query($sql);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    public function crear(int $idPersonal, int $idCarrera, int $idMateria): array
    {
        try {
            $st = $this->db->prepare("INSERT INTO docente_asignaciones (id_personal, id_carrera, id_materia)
                VALUES (?, ?, ?)");
            $st->execute([$idPersonal, $idCarrera, $idMateria]);
            return ['ok' => true, 'mensaje' => 'Asignaci��n creada.'];
        } catch (PDOException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                return ['ok' => false, 'mensaje' => 'Esa asignaci��n ya existe.'];
            }
            if ((int) ($e->errorInfo[1] ?? 0) === 1452) {
                return ['ok' => false, 'mensaje' => 'Carrera/materia inv��lida o docente inv��lido.'];
            }
            error_log('[DocenteAsignacionesAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo crear la asignaci��n.'];
        }
    }

    public function eliminar(int $idAsignacion): array
    {
        $st = $this->db->prepare("DELETE FROM docente_asignaciones WHERE id_asignacion = ?");
        $st->execute([$idAsignacion]);
        if ($st->rowCount() < 1) {
            return ['ok' => false, 'mensaje' => 'No encontrada.'];
        }
        return ['ok' => true, 'mensaje' => 'Asignaci��n eliminada.'];
    }
}
