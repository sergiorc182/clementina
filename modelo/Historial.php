<?php
/**
 * Modelo: Historial Académico
 * ISFT N.º 182 "Clementina"
 *
 * Consultas para obtener carreras e historial de materias cursadas/aprobadas
 * para el alumno autenticado.
 */

require_once dirname(__DIR__) . '/modelo/Conexion.php';

class Historial
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Obtiene las carreras asociadas al alumno (desde matriculacion o historial).
     *
     * @param int $dni
     * @return array
     */
    public function obtenerCarrerasDelAlumno(int $dni): array
    {
        $sql = "SELECT DISTINCT c.idcarrera, c.nombrecarrera, c.nombrecarreracorto, c.nroresol
                FROM carreras c
                WHERE c.idcarrera IN (
                    SELECT m.idcarrera FROM matriculacion m WHERE m.numerodocumento = :dni1
                    UNION
                    SELECT h.idcarrera FROM historialacademico h WHERE h.numerodocumento = :dni2
                )
                ORDER BY c.nombrecarrera ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':dni1', $dni, PDO::PARAM_INT);
        $stmt->bindValue(':dni2', $dni, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Obtiene el historial de materias del alumno para una o todas las carreras.
     *
     * @param int $dni
     * @param int|null $idCarrera
     * @return array
     */
    public function obtenerMateriasHistorial(int $dni, ?int $idCarrera = null): array
    {
        $whereCarrera = ($idCarrera !== null && $idCarrera > 0) ? "AND h.idcarrera = :idcarrera" : "";

        $sql = "SELECT 
                    h.idcarrera,
                    c.nombrecarrera,
                    h.idmateria,
                    m.nombremateria,
                    COALESCE(cm.aniocursada, 1) AS anio_cursada,
                    h.anioregular,
                    h.fechaaprobacion,
                    h.tomoacta,
                    h.folioacta,
                    h.nota,
                    h.tipoalumno,
                    h.validadoregular,
                    h.validadoexamen,
                    h.resolucion
                FROM historialacademico h
                INNER JOIN materias m ON h.idmateria = m.idmateria
                INNER JOIN carreras c ON h.idcarrera = c.idcarrera
                LEFT JOIN rel_carrera_materias cm ON (h.idcarrera = cm.idcarrera AND h.idmateria = cm.idmateria)
                WHERE h.numerodocumento = :dni
                  $whereCarrera
                ORDER BY COALESCE(cm.aniocursada, 1) ASC, m.nombremateria ASC, h.fechaaprobacion DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':dni', $dni, PDO::PARAM_INT);
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
