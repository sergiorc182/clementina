<?php
/**
 * Modelo: Configuración académica — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * CRUD de las tablas de configuración:
 *   - materias
 *   - carrera_materias      (relación carreras ↔ materias + año de cursada)
 *   - carrera_sede_turno    (relación carreras ↔ sedes ↔ turnos)
 *   - turnos
 *
 * También devuelve las opciones de los catálogos para los formularios.
 */

require_once __DIR__ . '/../../modelo/Conexion.php';

class ConfigAdmin
{
    private PDO $db;

    private const ENTIDADES = ['materias', 'carrera_materias', 'carrera_sede_turno', 'turnos'];

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    public static function entidadValida(string $entidad): bool
    {
        return in_array($entidad, self::ENTIDADES, true);
    }

    /* ================================================================== */
    /* Listados                                                            */
    /* ================================================================== */

    public function listar(string $entidad): array
    {
        switch ($entidad) {
            case 'materias':
                $sql = "SELECT id_materia, nombre_materia
                        FROM materias
                        ORDER BY nombre_materia ASC";
                break;

            case 'turnos':
                $sql = "SELECT id_turno, turno
                        FROM turnos
                        ORDER BY id_turno ASC";
                break;

            case 'carrera_materias':
                $sql = "SELECT cm.id_carrera, cm.id_materia, cm.anio_cursada,
                               c.nombre_carrera, m.nombre_materia
                        FROM carrera_materias cm
                        INNER JOIN carreras c ON c.id_carrera = cm.id_carrera
                        INNER JOIN materias m ON m.id_materia = cm.id_materia
                        ORDER BY c.nombre_carrera ASC, cm.anio_cursada ASC, m.nombre_materia ASC";
                break;

            case 'carrera_sede_turno':
                $sql = "SELECT cst.id_carrera, cst.id_sede, cst.id_turno,
                               c.nombre_carrera, s.nombre_sede, t.turno
                        FROM carrera_sede_turno cst
                        INNER JOIN carreras c ON c.id_carrera = cst.id_carrera
                        INNER JOIN sedes s ON s.id_sede = cst.id_sede
                        INNER JOIN turnos t ON t.id_turno = cst.id_turno
                        ORDER BY c.nombre_carrera ASC, s.nombre_sede ASC, t.id_turno ASC";
                break;

            default:
                return [];
        }

        return $this->db->query($sql)->fetchAll();
    }

    /** Opciones de los catálogos para los selects de los formularios. */
    public function opciones(): array
    {
        return [
            'carreras' => $this->db->query(
                "SELECT id_carrera, nombre_carrera FROM carreras ORDER BY nombre_carrera ASC"
            )->fetchAll(),
            'materias' => $this->db->query(
                "SELECT id_materia, nombre_materia FROM materias ORDER BY nombre_materia ASC"
            )->fetchAll(),
            'sedes' => $this->db->query(
                "SELECT id_sede, nombre_sede FROM sedes ORDER BY nombre_sede ASC"
            )->fetchAll(),
            'turnos' => $this->db->query(
                "SELECT id_turno, turno FROM turnos ORDER BY id_turno ASC"
            )->fetchAll(),
        ];
    }

    /* ================================================================== */
    /* Alta                                                                */
    /* ================================================================== */

    public function crear(string $entidad, array $datos): array
    {
        try {
            switch ($entidad) {
                case 'materias':
                    return $this->crearMateria($datos);
                case 'turnos':
                    return $this->crearTurno($datos);
                case 'carrera_materias':
                    return $this->crearRelacionMateria($datos);
                case 'carrera_sede_turno':
                    return $this->crearRelacionSedeTurno($datos);
            }
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[Clementina ConfigAdmin crear] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo crear el registro. Intentá nuevamente.'];
        }

        return ['ok' => false, 'mensaje' => 'Entidad no válida.'];
    }

    private function crearMateria(array $datos): array
    {
        $this->db->beginTransaction();

        $id = $datos['id_materia'];
        $stmt = $this->db->prepare("SELECT 1 FROM materias WHERE id_materia = :id");
        $stmt->execute([':id' => $id]);
        if ($stmt->fetchColumn()) {
            $this->db->rollBack();
            return ['ok' => false, 'mensaje' => 'Ya existe una materia con ese ID.'];
        }

        $stmt = $this->db->prepare(
            "INSERT INTO materias (id_materia, nombre_materia) VALUES (:id, :nombre)"
        );
        $stmt->execute([':id' => $id, ':nombre' => $datos['nombre_materia']]);

        $this->db->commit();
        return ['ok' => true, 'mensaje' => 'Materia creada correctamente.'];
    }

    private function crearTurno(array $datos): array
    {
        $this->db->beginTransaction();

        $id = $datos['id_turno'];
        $stmt = $this->db->prepare("SELECT 1 FROM turnos WHERE id_turno = :id");
        $stmt->execute([':id' => $id]);
        if ($stmt->fetchColumn()) {
            $this->db->rollBack();
            return ['ok' => false, 'mensaje' => 'Ya existe un turno con ese ID.'];
        }

        $stmt = $this->db->prepare(
            "INSERT INTO turnos (id_turno, turno) VALUES (:id, :turno)"
        );
        $stmt->execute([':id' => $id, ':turno' => $datos['turno']]);

        $this->db->commit();
        return ['ok' => true, 'mensaje' => 'Turno creado correctamente.'];
    }

    private function crearRelacionMateria(array $datos): array
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM carrera_materias WHERE id_carrera = :c AND id_materia = :m"
        );
        $stmt->execute([':c' => $datos['id_carrera'], ':m' => $datos['id_materia']]);
        if ($stmt->fetchColumn()) {
            return ['ok' => false, 'mensaje' => 'Esa materia ya está asociada a la carrera.'];
        }

        $stmt = $this->db->prepare(
            "INSERT INTO carrera_materias (id_carrera, id_materia, anio_cursada)
             VALUES (:c, :m, :anio)"
        );
        $stmt->execute([
            ':c'    => $datos['id_carrera'],
            ':m'    => $datos['id_materia'],
            ':anio' => $datos['anio_cursada'],
        ]);

        return ['ok' => true, 'mensaje' => 'Relación creada correctamente.'];
    }

    private function crearRelacionSedeTurno(array $datos): array
    {
        $stmt = $this->db->prepare(
            "SELECT 1 FROM carrera_sede_turno
             WHERE id_carrera = :c AND id_sede = :s AND id_turno = :t"
        );
        $stmt->execute([':c' => $datos['id_carrera'], ':s' => $datos['id_sede'], ':t' => $datos['id_turno']]);
        if ($stmt->fetchColumn()) {
            return ['ok' => false, 'mensaje' => 'Esa combinación de carrera, sede y turno ya existe.'];
        }

        $stmt = $this->db->prepare(
            "INSERT INTO carrera_sede_turno (id_carrera, id_sede, id_turno)
             VALUES (:c, :s, :t)"
        );
        $stmt->execute([
            ':c' => $datos['id_carrera'],
            ':s' => $datos['id_sede'],
            ':t' => $datos['id_turno'],
        ]);

        return ['ok' => true, 'mensaje' => 'Relación creada correctamente.'];
    }

    /* ================================================================== */
    /* Edición                                                             */
    /* ================================================================== */

    public function actualizar(string $entidad, array $pk, array $datos): array
    {
        try {
            switch ($entidad) {
                case 'materias':
                    return $this->actualizarMateria($pk, $datos);
                case 'turnos':
                    return $this->actualizarTurno($pk, $datos);
                case 'carrera_materias':
                    return $this->actualizarRelacionMateria($pk, $datos);
                case 'carrera_sede_turno':
                    return $this->actualizarRelacionSedeTurno($pk, $datos);
            }
        } catch (DomainException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return ['ok' => false, 'mensaje' => $e->getMessage()];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[Clementina ConfigAdmin actualizar] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo actualizar el registro. Intentá nuevamente.'];
        }

        return ['ok' => false, 'mensaje' => 'Entidad no válida.'];
    }

    private function actualizarMateria(array $pk, array $datos): array
    {
        $stmt = $this->db->prepare(
            "UPDATE materias SET nombre_materia = :nombre WHERE id_materia = :id"
        );
        $stmt->execute([':nombre' => $datos['nombre_materia'], ':id' => $pk['id_materia']]);
        return ['ok' => true, 'mensaje' => 'Materia actualizada correctamente.'];
    }

    private function actualizarTurno(array $pk, array $datos): array
    {
        $stmt = $this->db->prepare(
            "UPDATE turnos SET turno = :turno WHERE id_turno = :id"
        );
        $stmt->execute([':turno' => $datos['turno'], ':id' => $pk['id_turno']]);
        return ['ok' => true, 'mensaje' => 'Turno actualizado correctamente.'];
    }

    private function actualizarRelacionMateria(array $pk, array $datos): array
    {
        $carrera = (int) $datos['id_carrera'];
        $materia = (int) $datos['id_materia'];
        $carreraActual = (int) $pk['id_carrera'];
        $materiaActual = (int) $pk['id_materia'];

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "SELECT 1 FROM carrera_materias
                 WHERE id_carrera = :pc AND id_materia = :pm
                 LIMIT 1 FOR UPDATE"
            );
            $stmt->execute([':pc' => $carreraActual, ':pm' => $materiaActual]);
            if (!$stmt->fetchColumn()) {
                throw new DomainException('La relación ya no existe.');
            }

            if ($carrera !== $carreraActual || $materia !== $materiaActual) {
                $stmt = $this->db->prepare(
                    "SELECT 1 FROM carrera_materias
                     WHERE id_carrera = :c AND id_materia = :m
                     LIMIT 1"
                );
                $stmt->execute([':c' => $carrera, ':m' => $materia]);
                if ($stmt->fetchColumn()) {
                    throw new DomainException('Ya existe una relación con esa carrera y materia.');
                }

                $bloqueos = $this->buscarDependenciasRelacion($carreraActual, $materiaActual);
                if ($bloqueos) {
                    throw new DomainException(
                        'No se puede modificar la relación porque tiene datos asociados: '
                        . implode(', ', $bloqueos) . '.'
                    );
                }
            }

            $stmt = $this->db->prepare(
                "UPDATE carrera_materias
                 SET id_carrera = :c, id_materia = :m, anio_cursada = :anio
                 WHERE id_carrera = :pc AND id_materia = :pm"
            );
            $stmt->execute([
                ':c'    => $carrera,
                ':m'    => $materia,
                ':anio' => $datos['anio_cursada'],
                ':pc'   => $carreraActual,
                ':pm'   => $materiaActual,
            ]);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }

        return ['ok' => true, 'mensaje' => 'Relación actualizada correctamente.'];
    }

    private function actualizarRelacionSedeTurno(array $pk, array $datos): array
    {
        $carrera = (int) $datos['id_carrera'];
        $sede = (int) $datos['id_sede'];
        $turno = (int) $datos['id_turno'];
        $carreraActual = (int) $pk['id_carrera'];
        $sedeActual = (int) $pk['id_sede'];
        $turnoActual = (int) $pk['id_turno'];

        if ($carrera === $carreraActual && $sede === $sedeActual && $turno === $turnoActual) {
            return ['ok' => true, 'mensaje' => 'Relación actualizada correctamente.'];
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "SELECT 1 FROM carrera_sede_turno
                 WHERE id_carrera = :pc AND id_sede = :ps AND id_turno = :pt
                 LIMIT 1 FOR UPDATE"
            );
            $stmt->execute([':pc' => $carreraActual, ':ps' => $sedeActual, ':pt' => $turnoActual]);
            if (!$stmt->fetchColumn()) {
                throw new DomainException('La relación ya no existe.');
            }
            if ($this->matriculacionesAsociadas($carreraActual, $sedeActual, $turnoActual) > 0) {
                throw new DomainException('No se puede modificar la relación porque tiene matriculaciones asociadas.');
            }

            $stmt = $this->db->prepare(
                "UPDATE carrera_sede_turno
                 SET id_carrera = :c, id_sede = :s, id_turno = :t
                 WHERE id_carrera = :pc AND id_sede = :ps AND id_turno = :pt"
            );
            $stmt->execute([
                ':c'  => $carrera,
                ':s'  => $sede,
                ':t'  => $turno,
                ':pc' => $carreraActual,
                ':ps' => $sedeActual,
                ':pt' => $turnoActual,
            ]);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
        return ['ok' => true, 'mensaje' => 'Relación actualizada correctamente.'];
    }

    /* ================================================================== */
    /* Baja                                                                */
    /* ================================================================== */

    public function eliminar(string $entidad, array $pk): array
    {
        try {
            switch ($entidad) {
                case 'materias':
                    return $this->eliminarMateria($pk);
                case 'turnos':
                    return $this->eliminarTurno($pk);
                case 'carrera_materias':
                    return $this->eliminarRelacionMateria($pk);
                case 'carrera_sede_turno':
                    return $this->eliminarRelacionSedeTurno($pk);
            }
        } catch (DomainException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return ['ok' => false, 'mensaje' => $e->getMessage()];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[Clementina ConfigAdmin eliminar] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo eliminar el registro. Intentá nuevamente.'];
        }

        return ['ok' => false, 'mensaje' => 'Entidad no válida.'];
    }

    private function eliminarMateria(array $pk): array
    {
        $id = $pk['id_materia'];

        $dependencias = [
            'planes de carrera'        => ['carrera_materias', 'id_materia'],
            'historial académico'      => ['historial_academico', 'id_materia'],
            'inscripciones a finales'  => ['inscripciones', 'id_materia'],
            'matriculaciones'          => ['matriculacion_detalle', 'id_materia'],
        ];

        $bloqueos = $this->buscarDependencias($dependencias, $id);
        if ($bloqueos) {
            return [
                'ok'      => false,
                'mensaje' => 'No se puede eliminar la materia porque tiene datos asociados: '
                             . implode(', ', $bloqueos) . '.',
            ];
        }

        $stmt = $this->db->prepare("DELETE FROM materias WHERE id_materia = :id");
        $stmt->execute([':id' => $id]);
        return ['ok' => true, 'mensaje' => 'Materia eliminada correctamente.'];
    }

    private function eliminarTurno(array $pk): array
    {
        $id = $pk['id_turno'];

        $dependencias = [
            'carreras/sedes'          => ['carrera_sede_turno', 'id_turno'],
            'matriculaciones'         => ['matriculacion', 'id_turno'],
            'inscripciones a finales' => ['inscripciones', 'id_turno'],
            'parámetros de mesas'     => ['parametros_mesas', 'id_turno'],
        ];

        $bloqueos = $this->buscarDependencias($dependencias, $id);
        if ($bloqueos) {
            return [
                'ok'      => false,
                'mensaje' => 'No se puede eliminar el turno porque tiene datos asociados: '
                             . implode(', ', $bloqueos) . '.',
            ];
        }

        $stmt = $this->db->prepare("DELETE FROM turnos WHERE id_turno = :id");
        $stmt->execute([':id' => $id]);
        return ['ok' => true, 'mensaje' => 'Turno eliminado correctamente.'];
    }

    private function eliminarRelacionMateria(array $pk): array
    {
        $carrera = (int) $pk['id_carrera'];
        $materia = (int) $pk['id_materia'];

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "SELECT 1 FROM carrera_materias
                 WHERE id_carrera = :c AND id_materia = :m
                 LIMIT 1 FOR UPDATE"
            );
            $stmt->execute([':c' => $carrera, ':m' => $materia]);
            if (!$stmt->fetchColumn()) {
                throw new DomainException('La relación ya no existe.');
            }

            $bloqueos = $this->buscarDependenciasRelacion($carrera, $materia);
            if ($bloqueos) {
                throw new DomainException(
                    'No se puede eliminar la relación porque tiene datos asociados: '
                    . implode(', ', $bloqueos) . '.'
                );
            }

            $stmt = $this->db->prepare(
                "DELETE FROM carrera_materias WHERE id_carrera = :c AND id_materia = :m"
            );
            $stmt->execute([':c' => $carrera, ':m' => $materia]);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }

        return ['ok' => true, 'mensaje' => 'Relación eliminada correctamente.'];
    }

    private function eliminarRelacionSedeTurno(array $pk): array
    {
        $carrera = (int) $pk['id_carrera'];
        $sede = (int) $pk['id_sede'];
        $turno = (int) $pk['id_turno'];

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "SELECT 1 FROM carrera_sede_turno
                 WHERE id_carrera = :c AND id_sede = :s AND id_turno = :t
                 LIMIT 1 FOR UPDATE"
            );
            $stmt->execute([':c' => $carrera, ':s' => $sede, ':t' => $turno]);
            if (!$stmt->fetchColumn()) {
                throw new DomainException('La relación ya no existe.');
            }
            if ($this->matriculacionesAsociadas($carrera, $sede, $turno) > 0) {
                throw new DomainException('No se puede eliminar la relación porque tiene matriculaciones asociadas.');
            }

            $stmt = $this->db->prepare(
                "DELETE FROM carrera_sede_turno
                 WHERE id_carrera = :c AND id_sede = :s AND id_turno = :t"
            );
            $stmt->execute([':c' => $carrera, ':s' => $sede, ':t' => $turno]);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }

        return ['ok' => true, 'mensaje' => 'Relación eliminada correctamente.'];
    }

    /* ================================================================== */
    /* Utilidades                                                          */
    /* ================================================================== */

    private function buscarDependenciasRelacion(int $idCarrera, int $idMateria): array
    {
        $dependencias = [
            'asignaciones docentes'   => ['docente_asignaciones', 'id_carrera', 'id_materia'],
            'correlatividades'        => ['correlatividades', 'id_carrera', 'id_materia'],
            'historial académico'     => ['historial_academico', 'id_carrera', 'id_materia'],
            'inscripciones a finales' => ['inscripciones', 'id_carrera', 'id_materia'],
            'matriculaciones'         => ['matriculacion_detalle', 'id_carrera', 'id_materia'],
        ];

        $encontradas = [];
        foreach ($dependencias as $etiqueta => $info) {
            [$tabla, $columnaCarrera, $columnaMateria] = $info;
            $stmt = $this->db->prepare(
                "SELECT COUNT(*) FROM {$tabla}
                 WHERE {$columnaCarrera} = :c AND {$columnaMateria} = :m"
            );
            $stmt->execute([':c' => $idCarrera, ':m' => $idMateria]);
            if ((int) $stmt->fetchColumn() > 0) {
                $encontradas[] = $etiqueta;
            }
        }
        return $encontradas;
    }

    private function matriculacionesAsociadas(int $idCarrera, int $idSede, int $idTurno): int
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM matriculacion
             WHERE id_carrera = :c AND id_sede = :s AND id_turno = :t"
        );
        $stmt->execute([':c' => $idCarrera, ':s' => $idSede, ':t' => $idTurno]);
        return (int) $stmt->fetchColumn();
    }

    private function buscarDependencias(array $dependencias, int $id): array
    {
        $encontradas = [];
        foreach ($dependencias as $etiqueta => $info) {
            [$tabla, $columna] = $info;
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM {$tabla} WHERE {$columna} = :id");
            $stmt->execute([':id' => $id]);
            if ((int) $stmt->fetchColumn() > 0) {
                $encontradas[] = $etiqueta;
            }
        }
        return $encontradas;
    }
}
