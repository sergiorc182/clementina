<?php
/**
 * Modelo: Parámetros del sistema — Panel de preceptores.
 * ISFT 182 "Clementina"
 *
 * La base normalizada separa los parámetros en cinco tablas de un único
 * registro (id_registro = 1). Este modelo las reúne en un solo objeto
 * para mostrarlas y editarlas desde una única pantalla.
 */

require_once __DIR__ . '/../../modelo/Conexion.php';

class ParametrosAdmin
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /** Devuelve los cinco bloques de parámetros, con valores por defecto. */
    public function obtenerTodo(): array
    {
        $generales = $this->fila(
            "SELECT id_registro, nombre_instituto, ciclo_lectivo
             FROM parametros_generales WHERE id_registro = 1 LIMIT 1",
            ['id_registro' => 1, 'nombre_instituto' => '', 'ciclo_lectivo' => null]
        );

        $mesas = $this->fila(
            "SELECT id_registro, anio_mesas, id_turno, fecha_inicio, fecha_fin, tope_mesas
             FROM parametros_mesas WHERE id_registro = 1 LIMIT 1",
            ['id_registro' => 1, 'anio_mesas' => null, 'id_turno' => null,
             'fecha_inicio' => null, 'fecha_fin' => null, 'tope_mesas' => null]
        );

        $inscripcion = $this->fila(
            "SELECT id_registro, anio_inscripcion_carrera, fecha_inicio, fecha_fin
             FROM parametros_inscripcion WHERE id_registro = 1 LIMIT 1",
            ['id_registro' => 1, 'anio_inscripcion_carrera' => null,
             'fecha_inicio' => null, 'fecha_fin' => null]
        );

        $matriculacion = $this->fila(
            "SELECT id_registro, anio_matriculacion, fecha_inicio, fecha_fin,
                    carpeta_vista_alumno, carpeta_vista_preceptoria
             FROM parametros_matriculacion WHERE id_registro = 1 LIMIT 1",
            ['id_registro' => 1, 'anio_matriculacion' => null,
             'fecha_inicio' => null, 'fecha_fin' => null,
             'carpeta_vista_alumno' => null, 'carpeta_vista_preceptoria' => null]
        );

        $aspirantes = $this->fila(
            "SELECT id_registro, anio
             FROM aspirantes_parametros WHERE id_registro = 1 LIMIT 1",
            ['id_registro' => 1, 'anio' => null]
        );

        return [
            'generales'      => $generales,
            'mesas'          => $mesas,
            'inscripcion'    => $inscripcion,
            'matriculacion'  => $matriculacion,
            'aspirantes'     => $aspirantes,
        ];
    }

    /** Turnos para el select de parámetros de mesas. */
    public function turnos(): array
    {
        return $this->db->query(
            "SELECT id_turno, turno FROM turnos ORDER BY id_turno ASC"
        )->fetchAll();
    }

    public function existeTurno(int $idTurno): bool
    {
        $stmt = $this->db->prepare("SELECT 1 FROM turnos WHERE id_turno = :id LIMIT 1");
        $stmt->execute([':id' => $idTurno]);
        return (bool) $stmt->fetchColumn();
    }

    /** Guarda los cinco bloques en una sola transacción. */
    public function guardar(array $d): array
    {
        try {
            $this->db->beginTransaction();

            $this->upsert(
                "INSERT INTO parametros_generales (id_registro, nombre_instituto, ciclo_lectivo)
                 VALUES (1, :nombre, :ciclo)
                 ON DUPLICATE KEY UPDATE
                    nombre_instituto = VALUES(nombre_instituto),
                    ciclo_lectivo = VALUES(ciclo_lectivo)",
                [':nombre' => $d['nombre_instituto'], ':ciclo' => $d['ciclo_lectivo']]
            );

            $this->upsert(
                "INSERT INTO parametros_mesas
                    (id_registro, anio_mesas, id_turno, fecha_inicio, fecha_fin, tope_mesas)
                 VALUES (1, :anio, :turno, :inicio, :fin, :tope)
                 ON DUPLICATE KEY UPDATE
                    anio_mesas = VALUES(anio_mesas),
                    id_turno = VALUES(id_turno),
                    fecha_inicio = VALUES(fecha_inicio),
                    fecha_fin = VALUES(fecha_fin),
                    tope_mesas = VALUES(tope_mesas)",
                [
                    ':anio'   => $d['anio_mesas'],
                    ':turno'  => $d['id_turno'],
                    ':inicio' => $d['mesas_fecha_inicio'],
                    ':fin'    => $d['mesas_fecha_fin'],
                    ':tope'   => $d['tope_mesas'],
                ]
            );

            $this->upsert(
                "INSERT INTO parametros_inscripcion
                    (id_registro, anio_inscripcion_carrera, fecha_inicio, fecha_fin)
                 VALUES (1, :anio, :inicio, :fin)
                 ON DUPLICATE KEY UPDATE
                    anio_inscripcion_carrera = VALUES(anio_inscripcion_carrera),
                    fecha_inicio = VALUES(fecha_inicio),
                    fecha_fin = VALUES(fecha_fin)",
                [
                    ':anio'   => $d['anio_inscripcion_carrera'],
                    ':inicio' => $d['inscripcion_fecha_inicio'],
                    ':fin'    => $d['inscripcion_fecha_fin'],
                ]
            );

            $this->upsert(
                "INSERT INTO parametros_matriculacion
                    (id_registro, anio_matriculacion, fecha_inicio, fecha_fin,
                     carpeta_vista_alumno, carpeta_vista_preceptoria)
                 VALUES (1, :anio, :inicio, :fin, :carpeta_alumno, :carpeta_precep)
                 ON DUPLICATE KEY UPDATE
                    anio_matriculacion = VALUES(anio_matriculacion),
                    fecha_inicio = VALUES(fecha_inicio),
                    fecha_fin = VALUES(fecha_fin),
                    carpeta_vista_alumno = VALUES(carpeta_vista_alumno),
                    carpeta_vista_preceptoria = VALUES(carpeta_vista_preceptoria)",
                [
                    ':anio'           => $d['anio_matriculacion'],
                    ':inicio'         => $d['matriculacion_fecha_inicio'],
                    ':fin'            => $d['matriculacion_fecha_fin'],
                    ':carpeta_alumno' => $d['carpeta_vista_alumno'],
                    ':carpeta_precep' => $d['carpeta_vista_preceptoria'],
                ]
            );

            if ($d['anio_aspirantes'] !== null) {
                $this->upsert(
                    "INSERT INTO aspirantes_parametros (id_registro, anio)
                     VALUES (1, :anio)
                     ON DUPLICATE KEY UPDATE anio = VALUES(anio)",
                    [':anio' => $d['anio_aspirantes']]
                );
            }

            $this->db->commit();

            return [
                'ok'      => true,
                'mensaje' => 'Parámetros guardados correctamente.',
                'datos'   => $this->obtenerTodo(),
            ];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[Clementina ParametrosAdmin] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudieron guardar los parámetros. Intentá nuevamente.'];
        }
    }

    private function fila(string $sql, array $porDefecto): array
    {
        $fila = $this->db->query($sql)->fetch();
        return $fila === false ? $porDefecto : $fila;
    }

    private function upsert(string $sql, array $params): void
    {
        $stmt = $this->db->prepare($sql);
        foreach ($params as $clave => $valor) {
            $tipo = $valor === null ? PDO::PARAM_NULL
                : (is_int($valor) ? PDO::PARAM_INT : PDO::PARAM_STR);
            $stmt->bindValue($clave, $valor, $tipo);
        }
        $stmt->execute();
    }
}
