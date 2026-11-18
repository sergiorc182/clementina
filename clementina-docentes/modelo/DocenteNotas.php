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

    /** Alumnos matriculados en la carrera que tienen historial/inscripci��n en esa materia (o todos matriculados en carrera). */
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
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }
}
