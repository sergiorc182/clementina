<?php
/**
 * Modelo: Dashboard administrativo.
 * ISFT 182 "Clementina" — Panel de preceptores
 *
 * Devuelve estadísticas institucionales reales consultando la BD normalizada.
 * NO usa números ficticios: todo sale de MySQL.
 */

require_once __DIR__ . '/../../modelo/Conexion.php';
require_once __DIR__ . '/../../modelo/InscripcionFinal.php';

class Dashboard
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Devuelve todas las estadísticas del dashboard en un solo objeto.
     */
    public function obtenerEstadisticas(): array
    {
        return [
            'alumnos'          => $this->contarAlumnos(),
            'carreras'         => $this->obtenerCarreras(),
            'inscripciones'    => $this->contarInscripciones(),
            'mesas'            => $this->obtenerMesasVigentes(),
            'matriculaciones'  => $this->contarMatriculaciones(),
            'historial'        => $this->resumenHistorial(),
        ];
    }

    /** Total de alumnos registrados en el sistema. */
    private function contarAlumnos(): array
    {
        $stmt = $this->db->query("SELECT COUNT(*) AS total FROM alumnos");
        $row  = $stmt->fetch();
        $total = (int)($row['total'] ?? 0);

        // Alumnos con al menos una matriculación activa
        $stmt2 = $this->db->query("SELECT COUNT(DISTINCT id_alumno) AS activos FROM matriculacion");
        $row2  = $stmt2->fetch();

        return [
            'total'   => $total,
            'activos' => (int)($row2['activos'] ?? 0),
        ];
    }

    /** Listado de carreras con cantidad de matriculados. */
    private function obtenerCarreras(): array
    {
        $stmt = $this->db->query("
            SELECT c.id_carrera,
                   c.nombre_carrera,
                   c.nombre_carrera_corto,
                   c.nro_resolucion,
                   COUNT(m.id_alumno) AS matriculados
            FROM carreras c
            LEFT JOIN matriculacion m ON m.id_carrera = c.id_carrera
            GROUP BY c.id_carrera, c.nombre_carrera, c.nombre_carrera_corto, c.nro_resolucion
            ORDER BY matriculados DESC
        ");
        return $stmt->fetchAll();
    }

    /** Inscripciones a finales: total y activas (estado != cancelado). */
    private function contarInscripciones(): array
    {
        $stmt = $this->db->query("
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN estado = 'A' THEN 1 ELSE 0 END) AS activas
            FROM inscripciones
        ");
        $row = $stmt->fetch();
        return [
            'total'   => (int)($row['total'] ?? 0),
            'activas' => (int)($row['activas'] ?? 0),
        ];
    }

    /** Período de mesas vigente, el próximo a abrir o el último cerrado. */
    private function obtenerMesasVigentes(): array
    {
        // Primero busca el período vigente hoy
        $hoy  = date('Y-m-d');
        $stmt = $this->db->prepare("
            SELECT pm.*, t.turno
            FROM parametros_mesas pm
            LEFT JOIN turnos t ON t.id_turno = pm.id_turno
            WHERE pm.fecha_inicio <= :hoyDesde AND pm.fecha_fin >= :hoyHasta
            ORDER BY pm.fecha_inicio DESC
            LIMIT 1
        ");
        $stmt->execute([':hoyDesde' => $hoy, ':hoyHasta' => $hoy]);
        $vigente = $stmt->fetch();

        if ($vigente) {
            $vigente['estado'] = 'abierto';
            return $this->nombrarTurnoMesas($vigente);
        }

        // Si no hay vigente, devuelve el próximo a abrir (el más cercano)
        $stmt2 = $this->db->prepare("
            SELECT pm.*, t.turno
            FROM parametros_mesas pm
            LEFT JOIN turnos t ON t.id_turno = pm.id_turno
            WHERE pm.fecha_inicio IS NOT NULL
              AND pm.fecha_fin IS NOT NULL
              AND pm.fecha_inicio > :hoy
            ORDER BY pm.fecha_inicio ASC
            LIMIT 1
        ");
        $stmt2->execute([':hoy' => $hoy]);
        $proximo = $stmt2->fetch();
        if ($proximo) {
            $proximo['estado'] = 'proximo';
            return $this->nombrarTurnoMesas($proximo);
        }

        // Si ya pasaron todos, devuelve el último cerrado
        $stmt3 = $this->db->prepare("
            SELECT pm.*, t.turno
            FROM parametros_mesas pm
            LEFT JOIN turnos t ON t.id_turno = pm.id_turno
            WHERE pm.fecha_inicio IS NOT NULL
              AND pm.fecha_fin IS NOT NULL
              AND pm.fecha_fin < :hoy
            ORDER BY pm.fecha_inicio DESC
            LIMIT 1
        ");
        $stmt3->execute([':hoy' => $hoy]);
        $cerrado = $stmt3->fetch();
        if ($cerrado) {
            $cerrado['estado'] = 'cerrado';
            return $this->nombrarTurnoMesas($cerrado);
        }

        return ['estado' => 'sin_datos'];
    }

    /**
     * Usa el nombre del turno que viene de la tabla `turnos` (JOIN) y,
     * solo si no existe, cae al nombre por defecto.
     */
    private function nombrarTurnoMesas(array $fila): array
    {
        if (trim((string) ($fila['turno'] ?? '')) === '') {
            $idTurno = (int) ($fila['id_turno'] ?? 0);
            $fila['turno'] = InscripcionFinal::TURNOS[$idTurno] ?? ('Turno ' . $idTurno);
        }
        return $fila;
    }

    /** Cantidad total de matriculaciones por año. */
    private function contarMatriculaciones(): array
    {
        $stmt = $this->db->query("
            SELECT anio_inscripcion AS anio, COUNT(*) AS total
            FROM matriculacion
            GROUP BY anio_inscripcion
            ORDER BY anio_inscripcion DESC
            LIMIT 5
        ");
        return $stmt->fetchAll();
    }

    /** Resumen del historial académico: aprobadas, regulares, etc. */
    private function resumenHistorial(): array
    {
        $stmt = $this->db->query("
            SELECT
                COUNT(*) AS total_registros,
                SUM(CASE WHEN nota >= 4 THEN 1 ELSE 0 END) AS aprobadas,
                SUM(CASE WHEN nota > 0 AND nota < 4 THEN 1 ELSE 0 END) AS desaprobadas,
                SUM(CASE WHEN nota = 0 AND anio_regular > 0 THEN 1 ELSE 0 END) AS regulares
            FROM historial_academico
        ");
        $row = $stmt->fetch();
        return [
            'total'       => (int)($row['total_registros'] ?? 0),
            'aprobadas'   => (int)($row['aprobadas'] ?? 0),
            'desaprobadas'=> (int)($row['desaprobadas'] ?? 0),
            'regulares'   => (int)($row['regulares'] ?? 0),
        ];
    }
}
