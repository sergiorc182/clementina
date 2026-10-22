<?php
/**
 * Modelo: Historial Académico
 * ISFT N.º 182 "Clementina"
 *
 * Consultas para obtener carreras e historial de materias cursadas/aprobadas
 * para el alumno autenticado.
 */

require_once __DIR__ . '/Conexion.php';

class Historial
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Obtiene las carreras asociadas al alumno (desde matriculacion o historial).
     * Las columnas se devuelven con los nombres que espera la vista.
     *
     * @param int $idAlumno  alumnos.id_alumno
     * @return array
     */
    public function obtenerCarrerasDelAlumno(int $idAlumno): array
    {
        $sql = "SELECT DISTINCT
                    c.id_carrera           AS idcarrera,
                    c.nombre_carrera       AS nombrecarrera,
                    c.nombre_carrera_corto AS nombrecarreracorto,
                    c.nro_resolucion       AS nroresol
                FROM carreras c
                WHERE c.id_carrera IN (
                    SELECT m.id_carrera FROM matriculacion m WHERE m.id_alumno = :alumno1
                    UNION
                    SELECT h.id_carrera FROM historial_academico h WHERE h.id_alumno = :alumno2
                )
                ORDER BY c.nombre_carrera ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':alumno1', $idAlumno, PDO::PARAM_INT);
        $stmt->bindValue(':alumno2', $idAlumno, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Obtiene el historial de materias del alumno para una o todas las carreras.
     *
     * @param int $idAlumno  alumnos.id_alumno
     * @param int|null $idCarrera
     * @return array
     */
    public function obtenerMateriasHistorial(int $idAlumno, ?int $idCarrera = null): array
    {
        $whereCarrera = ($idCarrera !== null && $idCarrera > 0) ? "AND h.id_carrera = :idcarrera" : "";

        $sql = "SELECT
                    h.id_carrera        AS idcarrera,
                    c.nombre_carrera    AS nombrecarrera,
                    h.id_materia        AS idmateria,
                    m.nombre_materia    AS nombremateria,
                    COALESCE(cm.anio_cursada, 1) AS anio_cursada,
                    h.anio_regular      AS anioregular,
                    h.fecha_aprobacion  AS fechaaprobacion,
                    h.tomo_acta         AS tomoacta,
                    h.folio_acta        AS folioacta,
                    h.nota,
                    h.tipo_alumno       AS tipoalumno,
                    h.validado_regular  AS validadoregular,
                    h.validado_examen   AS validadoexamen,
                    h.resolucion
                FROM historial_academico h
                INNER JOIN materias m ON h.id_materia = m.id_materia
                INNER JOIN carreras c ON h.id_carrera = c.id_carrera
                LEFT JOIN carrera_materias cm ON (h.id_carrera = cm.id_carrera AND h.id_materia = cm.id_materia)
                WHERE h.id_alumno = :alumno
                  $whereCarrera
                ORDER BY COALESCE(cm.anio_cursada, 1) ASC, m.nombre_materia ASC, h.fecha_aprobacion DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':alumno', $idAlumno, PDO::PARAM_INT);
        if ($idCarrera !== null && $idCarrera > 0) {
            $stmt->bindValue(':idcarrera', $idCarrera, PDO::PARAM_INT);
        }
        $stmt->execute();

        $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map([$this, 'formatearRegistroHistorial'], $filas);
    }

    /**
     * Enriquece y normaliza los datos del registro académico para el frontend.
     */
    private function formatearRegistroHistorial(array $r): array
    {
        $nota = (int) ($r['nota'] ?? 0);
        $tipoAlumno = strtoupper(trim((string) ($r['tipoalumno'] ?? '')));
        $validadoRegular = strtoupper(trim((string) ($r['validadoregular'] ?? '')));
        $validadoExamen = strtoupper(trim((string) ($r['validadoexamen'] ?? '')));
        $fechaAprobacion = (string) ($r['fechaaprobacion'] ?? '');

        $anioRegular = (int) ($r['anioregular'] ?? 0);
        $anioRegularDisplay = ($anioRegular > 0) ? (string) $anioRegular : '—';

        // Determinación de la condición y badge
        $estadoTexto = 'En curso';
        $estadoBadge = 'badge--neutral';

        if ($nota >= 4) {
            if ($tipoAlumno === 'P') {
                $estadoTexto = 'Promocionada';
            } else {
                $estadoTexto = 'Aprobada';
            }
            $estadoBadge = 'badge--success';
        } elseif ($nota > 0 && $nota < 4) {
            $estadoTexto = 'Desaprobada';
            $estadoBadge = 'badge--error';
        } else {
            // Nota es 0 (pendiente de rendir final)
            if ($anioRegular > 0 || $validadoRegular === 'V' || $validadoExamen === 'V' || $tipoAlumno === 'R') {
                $estadoTexto = 'Regular';
                $estadoBadge = 'badge--info';
            } elseif ($tipoAlumno === 'L') {
                $estadoTexto = 'Libre';
                $estadoBadge = 'badge--warning';
            } else {
                $estadoTexto = 'En curso';
                $estadoBadge = 'badge--neutral';
            }
        }

        // Formato de fecha de aprobación del final
        $fechaFormateada = '—';
        if ($fechaAprobacion !== '' && $fechaAprobacion !== '0000-00-00') {
            $timestamp = strtotime($fechaAprobacion);
            if ($timestamp !== false) {
                $fechaFormateada = date('d/m/Y', $timestamp);
            }
        }

        // Acta (tomo y folio)
        $tomo = (int) ($r['tomoacta'] ?? 0);
        $folio = (int) ($r['folioacta'] ?? 0);
        $actaTexto = ($tomo > 0 && $folio > 0) ? "T. {$tomo} / F. {$folio}" : '—';

        // Nota visual
        $notaDisplay = ($nota > 0) ? (string) $nota : '—';

        return [
            'id_carrera'            => (int) $r['idcarrera'],
            'carrera'               => trim((string) $r['nombrecarrera']),
            'id_materia'            => (int) $r['idmateria'],
            'materia'               => trim((string) $r['nombremateria']),
            'anio_cursada'          => (int) $r['anio_cursada'],
            'anio_regular'          => $anioRegular,
            'anio_regular_display'  => $anioRegularDisplay,
            'nota'                  => $nota,
            'nota_display'          => $notaDisplay,
            'estado_texto'          => $estadoTexto,
            'estado_badge'          => $estadoBadge,
            'fecha_aprobacion'      => $fechaFormateada,
            'acta_texto'            => $actaTexto,
            'tipo_alumno'           => $tipoAlumno,
        ];
    }
}
