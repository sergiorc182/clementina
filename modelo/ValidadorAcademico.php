<?php
require_once __DIR__ . '/Conexion.php';

class ValidadorAcademico
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Conexion::getInstancia()->getConexion();
    }

    public function docenteAsignado(int $idPersonal, int $idCarrera, int $idMateria): bool
    {
        $stmt = $this->db->prepare(
            "SELECT 1
             FROM docente_asignaciones
             WHERE id_personal = :personal
               AND id_carrera = :carrera
               AND id_materia = :materia
             LIMIT 1"
        );
        $stmt->execute([
            ':personal' => $idPersonal,
            ':carrera'  => $idCarrera,
            ':materia'  => $idMateria,
        ]);
        return (bool) $stmt->fetchColumn();
    }

    public function alumnosConDerecho(int $idCarrera, int $idMateria): array
    {
        $stmt = $this->db->prepare(
            "SELECT DISTINCT m.id_alumno
             FROM matriculacion m
             INNER JOIN matriculacion_detalle md
                     ON md.id_alumno = m.id_alumno
                    AND md.id_carrera = m.id_carrera
                    AND md.anio_matriculacion = m.anio_inscripcion
             INNER JOIN carrera_materias cm
                     ON cm.id_carrera = md.id_carrera
                    AND cm.id_materia = md.id_materia
             WHERE m.id_carrera = :carrera
                AND md.id_materia = :materia
                AND TRIM(COALESCE(md.tipo_asistencia, '')) IN ('', '1', '2', '3')"
        );
        $stmt->execute([
            ':carrera' => $idCarrera,
            ':materia' => $idMateria,
        ]);

        $permitidos = [];
        foreach ($stmt->fetchAll() as $fila) {
            $permitidos[(int) $fila['id_alumno']] = true;
        }
        return $permitidos;
    }

    public function verificarDerecho(int $idAlumno, int $idCarrera, int $idMateria): array
    {
        $stmt = $this->db->prepare(
            "SELECT m.anio_inscripcion,
                    md.anio_matriculacion,
                    TRIM(COALESCE(md.tipo_asistencia, '')) AS tipo_asistencia
             FROM matriculacion m
             INNER JOIN matriculacion_detalle md
                     ON md.id_alumno = m.id_alumno
                    AND md.id_carrera = m.id_carrera
                    AND md.anio_matriculacion = m.anio_inscripcion
             INNER JOIN carrera_materias cm
                     ON cm.id_carrera = md.id_carrera
                    AND cm.id_materia = md.id_materia
             WHERE m.id_alumno = :alumno
               AND m.id_carrera = :carrera
               AND md.id_materia = :materia
             LIMIT 1"
        );
        $stmt->execute([
            ':alumno'  => $idAlumno,
            ':carrera' => $idCarrera,
            ':materia' => $idMateria,
        ]);
        $fila = $stmt->fetch();

        if (!$fila) {
            $stmt = $this->db->prepare(
                "SELECT 1 FROM matriculacion
                 WHERE id_alumno = :alumno AND id_carrera = :carrera LIMIT 1"
            );
            $stmt->execute([':alumno' => $idAlumno, ':carrera' => $idCarrera]);
            if (!$stmt->fetchColumn()) {
                throw new DomainException('El alumno no está matriculado en esa carrera.');
            }

            $stmt = $this->db->prepare(
                "SELECT 1 FROM carrera_materias
                 WHERE id_carrera = :carrera AND id_materia = :materia LIMIT 1"
            );
            $stmt->execute([':carrera' => $idCarrera, ':materia' => $idMateria]);
            if (!$stmt->fetchColumn()) {
                throw new DomainException('La materia no corresponde al plan de estudios de esa carrera.');
            }

            throw new DomainException('El alumno no tiene una matrícula vigente para esa materia y año académico.');
        }

        $tipoAsistencia = trim((string) $fila['tipo_asistencia']);
        if ($tipoAsistencia !== '' && !in_array($tipoAsistencia, ['1', '2', '3'], true)) {
            throw new DomainException('La condición de matrícula del alumno no es válida para esta evaluación.');
        }

        return [
            'anio'            => (int) $fila['anio_matriculacion'],
            'anio_inscripcion' => (int) $fila['anio_inscripcion'],
            'tipo_asistencia' => $tipoAsistencia,
        ];
    }

    public function sincronizarDetalleMatriculacion(int $idAlumno, int $idCarrera, int $anio): void
    {
        $stmt = $this->db->prepare(
            "INSERT IGNORE INTO matriculacion_detalle
                (id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia)
             SELECT :alumno, :carrera, :anio, cm.id_materia, '1'
             FROM carrera_materias cm
             WHERE cm.id_carrera = :carrera2"
        );
        $stmt->bindValue(':alumno', $idAlumno, PDO::PARAM_INT);
        $stmt->bindValue(':carrera', $idCarrera, PDO::PARAM_INT);
        $stmt->bindValue(':carrera2', $idCarrera, PDO::PARAM_INT);
        $stmt->bindValue(':anio', $anio, PDO::PARAM_INT);
        $stmt->execute();
    }
}
