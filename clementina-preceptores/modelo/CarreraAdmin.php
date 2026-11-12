<?php
/**
 * Modelo: Gestión de carreras — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * Listado, alta, edición y baja de carreras. La baja se rechaza si la
 * carrera tiene datos asociados (matriculaciones, materias, inscripciones,
 * historial o sedes/turnos).
 */

require_once __DIR__ . '/../../modelo/Conexion.php';

class CarreraAdmin
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /** Listado de carreras con cantidad de alumnos matriculados. */
    public function listar(): array
    {
        $stmt = $this->db->query("
            SELECT c.id_carrera,
                   c.nro_resolucion,
                   c.nombre_carrera,
                   c.nombre_carrera_corto,
                   c.titulo,
                   COUNT(m.id_alumno) AS matriculados
            FROM carreras c
            LEFT JOIN matriculacion m ON m.id_carrera = c.id_carrera
            GROUP BY c.id_carrera, c.nro_resolucion, c.nombre_carrera,
                     c.nombre_carrera_corto, c.titulo
            ORDER BY c.nombre_carrera ASC
        ");
        return $stmt->fetchAll();
    }

    public function obtenerPorId(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM carreras WHERE id_carrera = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $fila = $stmt->fetch();
        return $fila === false ? null : $fila;
    }

    public function crear(array $datos, string $usuario): array
    {
        $stmt = $this->db->prepare("
            SELECT id_carrera FROM carreras WHERE nombre_carrera = :nombre LIMIT 1
        ");
        $stmt->execute([':nombre' => $datos['nombre_carrera']]);
        if ($stmt->fetch()) {
            return ['ok' => false, 'mensaje' => 'Ya existe una carrera con ese nombre.'];
        }

        try {
            $this->db->beginTransaction();

            // id_carrera no es AUTO_INCREMENT en el esquema: se calcula el siguiente.
            $stmt = $this->db->query("
                SELECT id_carrera FROM carreras ORDER BY id_carrera DESC LIMIT 1 FOR UPDATE
            ");
            $ultimo = $stmt->fetchColumn();
            $id     = $ultimo === false ? 1 : ((int) $ultimo + 1);

            $stmt = $this->db->prepare("
                INSERT INTO carreras
                    (id_carrera, nro_resolucion, nombre_carrera, nombre_carrera_corto,
                     titulo, color_r, color_g, color_b, usuario_alta, fecha_alta)
                VALUES
                    (:id, :resolucion, :nombre, :corto, :titulo, 255, 0, 0, :usuario, NOW())
            ");
            $stmt->execute([
                ':id'         => $id,
                ':resolucion' => $datos['nro_resolucion'],
                ':nombre'     => $datos['nombre_carrera'],
                ':corto'      => $datos['nombre_carrera_corto'],
                ':titulo'     => $datos['titulo'],
                ':usuario'    => $usuario !== '' ? $usuario : null,
            ]);

            $this->db->commit();

            return [
                'ok'      => true,
                'mensaje' => 'Carrera creada correctamente.',
                'carrera' => $this->obtenerPorId($id),
            ];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[Clementina CarreraAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'Error al crear la carrera. Intentá nuevamente.'];
        }
    }

    public function actualizar(int $id, array $datos, string $usuario): array
    {
        if ($this->obtenerPorId($id) === null) {
            return ['ok' => false, 'mensaje' => 'Carrera no encontrada.'];
        }

        $stmt = $this->db->prepare("
            SELECT id_carrera FROM carreras
            WHERE nombre_carrera = :nombre AND id_carrera <> :id
            LIMIT 1
        ");
        $stmt->execute([':nombre' => $datos['nombre_carrera'], ':id' => $id]);
        if ($stmt->fetch()) {
            return ['ok' => false, 'mensaje' => 'Ya existe otra carrera con ese nombre.'];
        }

        try {
            $stmt = $this->db->prepare("
                UPDATE carreras SET
                    nro_resolucion = :resolucion,
                    nombre_carrera = :nombre,
                    nombre_carrera_corto = :corto,
                    titulo = :titulo,
                    usuario_mod = :usuario,
                    fecha_mod = NOW()
                WHERE id_carrera = :id
            ");
            $stmt->execute([
                ':resolucion' => $datos['nro_resolucion'],
                ':nombre'     => $datos['nombre_carrera'],
                ':corto'      => $datos['nombre_carrera_corto'],
                ':titulo'     => $datos['titulo'],
                ':usuario'    => $usuario !== '' ? $usuario : null,
                ':id'         => $id,
            ]);

            return [
                'ok'      => true,
                'mensaje' => 'Carrera actualizada correctamente.',
                'carrera' => $this->obtenerPorId($id),
            ];
        } catch (Throwable $e) {
            error_log('[Clementina CarreraAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'Error al actualizar la carrera. Intentá nuevamente.'];
        }
    }

    public function eliminar(int $id): array
    {
        if ($this->obtenerPorId($id) === null) {
            return ['ok' => false, 'mensaje' => 'Carrera no encontrada.'];
        }

        $dependencias = [
            'matriculaciones'       => 'matriculacion',
            'registros de historial' => 'historial_academico',
            'inscripciones a finales' => 'inscripciones',
            'materias del plan'      => 'carrera_materias',
            'sedes/turnos'           => 'carrera_sede_turno',
        ];

        $encontradas = [];
        foreach ($dependencias as $etiqueta => $tabla) {
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM {$tabla} WHERE id_carrera = :id");
            $stmt->execute([':id' => $id]);
            if ((int) $stmt->fetchColumn() > 0) {
                $encontradas[] = $etiqueta;
            }
        }

        if ($encontradas) {
            return [
                'ok'      => false,
                'mensaje' => 'No se puede eliminar la carrera porque tiene datos asociados: '
                             . implode(', ', $encontradas) . '.',
            ];
        }

        try {
            $stmt = $this->db->prepare("DELETE FROM carreras WHERE id_carrera = :id");
            $stmt->execute([':id' => $id]);
            return ['ok' => true, 'mensaje' => 'Carrera eliminada correctamente.'];
        } catch (Throwable $e) {
            error_log('[Clementina CarreraAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo eliminar la carrera. Intentá nuevamente.'];
        }
    }
}
