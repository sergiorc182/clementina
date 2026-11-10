<?php
/**
 * Modelo: Dashboard administrativo.
 * ISFT 182 "Clementina" — Panel de preceptores
 *
 * Devuelve estadísticas institucionales reales consultando la BD normalizada.
 * NO usa números ficticios: todo sale de MySQL.
 */

require_once __DIR__ . '/../../modelo/Conexion.php';

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
                   COUNT(m.id_alumno) AS matriculados
            FROM carreras c
            LEFT JOIN matriculacion m ON m.id_carrera = c.id_carrera
            GROUP BY c.id_carrera, c.nombre_carrera, c.nombre_carrera_corto
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

    /** Período de mesas vigente o el más reciente. */
    private function obtenerMesasVigentes(): array
    {
        // Primero busca el período vigente hoy
        $hoy  = date('Y-m-d');
        $stmt = $this->db->prepare("
            SELECT pm.*, t.turno
            FROM parametros_mesas pm
            LEFT JOIN turnos t ON t.id_turno = pm.id_turno
            WHERE pm.fecha_inicio <= :hoy AND pm.fecha_fin >= :hoy
            ORDER BY pm.fecha_inicio DESC
            LIMIT 1
        ");
        $stmt->execute([':hoy' => $hoy]);
        $vigente = $stmt->fetch();

        if ($vigente) {
            $vigente['estado'] = 'abierto';
            return $vigente;
        }

        // Si no hay vigente, devuelve el más reciente
        $stmt2 = $this->db->query("
            SELECT pm.*, t.turno
            FROM parametros_mesas pm
            LEFT JOIN turnos t ON t.id_turno = pm.id_turno
            ORDER BY pm.fecha_inicio DESC
            LIMIT 1
        ");
        $reciente = $stmt2->fetch();
        if ($reciente) {
            $reciente['estado'] = $reciente['fecha_inicio'] > $hoy ? 'proximo' : 'cerrado';
            return $reciente;
        }

        return ['estado' => 'sin_datos'];
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
