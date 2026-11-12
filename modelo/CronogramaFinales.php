<?php
/**
 * Modelo: Cronogramas de finales (PDFs por carrera).
 * ISFT N.º 182 "Clementina"
 *
 * Publica los cronogramas de finales como PDF sin modificar la base
 * de datos: cada carrera tiene su carpeta en
 * documentos/cronogramas_finales/{id_carrera}/ y el nombre del archivo
 * codifica fecha y título: {Ymd-His}__{titulo-saneado}.pdf
 *
 * Los preceptores suben los archivos y los alumnos los ven según las
 * carreras en las que están matriculados (tabla matriculacion, solo
 * lectura).
 */

require_once dirname(__DIR__) . '/modelo/Conexion.php';

class CronogramaFinales
{
    /** Tamaño máximo de suba: 10 MB. */
    public const TAMANIO_MAXIMO = 10485760;

    private PDO $db;
    private string $base;

    public function __construct()
    {
        $this->db   = Conexion::getInstancia()->getConexion();
        $this->base = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'documentos'
                    . DIRECTORY_SEPARATOR . 'cronogramas_finales';
    }

    /* ================================================================ */
    /* Carreras (lectura de la BD existente)                             */
    /* ================================================================ */

    /** Todas las carreras registradas (para el selector del preceptor). */
    public function listarCarreras(): array
    {
        return $this->db->query("
            SELECT id_carrera, nombre_carrera, nombre_carrera_corto
            FROM carreras
            ORDER BY nombre_carrera ASC
        ")->fetchAll();
    }

    /** Carreras en las que el alumno está matriculado. */
    public function carrerasDelAlumno(int $idAlumno): array
    {
        $stmt = $this->db->prepare("
            SELECT m.id_carrera, c.nombre_carrera, c.nombre_carrera_corto
            FROM matriculacion m
            INNER JOIN carreras c ON c.id_carrera = m.id_carrera
            WHERE m.id_alumno = :id
            ORDER BY c.nombre_carrera ASC
        ");
        $stmt->bindValue(':id', $idAlumno, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** Indica si el alumno está matriculado en la carrera indicada. */
    public function matriculadoEn(int $idAlumno, int $idCarrera): bool
    {
        $stmt = $this->db->prepare("
            SELECT 1 FROM matriculacion
            WHERE id_alumno = :id AND id_carrera = :carrera
            LIMIT 1
        ");
        $stmt->bindValue(':id', $idAlumno, PDO::PARAM_INT);
        $stmt->bindValue(':carrera', $idCarrera, PDO::PARAM_INT);
        $stmt->execute();
        return (bool) $stmt->fetch();
    }

    private function existeCarrera(int $idCarrera): bool
    {
        $stmt = $this->db->prepare("SELECT 1 FROM carreras WHERE id_carrera = :id LIMIT 1");
        $stmt->bindValue(':id', $idCarrera, PDO::PARAM_INT);
        $stmt->execute();
        return (bool) $stmt->fetch();
    }

    /* ================================================================ */
    /* Listados de archivos                                             */
    /* ================================================================ */

    /** Carreras del alumno con sus cronogramas publicados. */
    public function listarParaAlumno(int $idAlumno): array
    {
        return array_map(function (array $c) {
            $c['id_carrera'] = (int) $c['id_carrera'];
            $c['archivos']   = $this->archivosDeCarrera($c['id_carrera']);
            return $c;
        }, $this->carrerasDelAlumno($idAlumno));
    }

    /** Todas las carreras con sus cronogramas (panel de preceptores). */
    public function listarTodo(): array
    {
        return array_map(function (array $c) {
            $c['id_carrera'] = (int) $c['id_carrera'];
            $c['archivos']   = $this->archivosDeCarrera($c['id_carrera']);
            return $c;
        }, $this->listarCarreras());
    }

    /** Archivos publicados de una carrera, del más reciente al más viejo. */
    public function archivosDeCarrera(int $idCarrera): array
    {
        $dir = $this->base . DIRECTORY_SEPARATOR . (int) $idCarrera;
        if (!is_dir($dir)) {
            return [];
        }

        $archivos = [];
        $lista = @scandir($dir);
        if ($lista === false) {
            return [];
        }
        foreach ($lista as $nombre) {
            if ($nombre === '' || $nombre[0] === '.' || !$this->esArchivoCronograma($nombre)) {
                continue;
            }
            $ruta = $dir . DIRECTORY_SEPARATOR . $nombre;
            $mod  = filemtime($ruta);
            $tam  = filesize($ruta);
            $archivos[] = [
                'archivo'          => $nombre,
                'nombre'           => $this->nombreVisible($nombre),
                'fecha'            => date('d/m/Y H:i', $mod),
                'orden'            => date('Y-m-d H:i:s', $mod),
                'tamano'           => $tam,
                'tamano_legible'   => $this->legible($tam),
            ];
        }

        usort($archivos, function (array $a, array $b) {
            return strcmp($b['orden'], $a['orden']);
        });

        return $archivos;
    }

    /* ================================================================ */
    /* Subida y borrado (panel de preceptores)                          */
    /* ================================================================ */

    /**
     * Guarda el PDF subido en la carpeta de la carrera.
     * $archivo es el elemento de $_FILES correspondiente.
     */
    public function guardar(int $idCarrera, array $archivo): array
    {
        if ($idCarrera <= 0 || !$this->existeCarrera($idCarrera)) {
            return ['ok' => false, 'mensaje' => 'La carrera seleccionada no existe.'];
        }

        $error = (int) ($archivo['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error !== UPLOAD_ERR_OK) {
            return [
                'ok'      => false,
                'mensaje' => $error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE
                    ? 'El archivo supera el tamaño máximo permitido.'
                    : 'No se pudo recibir el archivo. Intentá de nuevo.',
            ];
        }

        if (($archivo['size'] ?? 0) > self::TAMANIO_MAXIMO) {
            return ['ok' => false, 'mensaje' => 'El archivo supera el máximo de 10 MB.'];
        }

        $nombreOriginal = (string) ($archivo['name'] ?? '');
        if (!preg_match('/\.pdf$/i', $nombreOriginal)) {
            return ['ok' => false, 'mensaje' => 'El archivo debe ser un PDF (.pdf).'];
        }

        $tmp = (string) ($archivo['tmp_name'] ?? '');
        if (!is_uploaded_file($tmp)) {
            return ['ok' => false, 'mensaje' => 'No se pudo recibir el archivo. Intentá de nuevo.'];
        }

        if (class_exists('finfo')) {
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
            if ($mime !== 'application/pdf') {
                return ['ok' => false, 'mensaje' => 'El contenido del archivo no es un PDF válido.'];
            }
        }

        $slug    = $this->slugificar((string) pathinfo($nombreOriginal, PATHINFO_FILENAME));
        $carpeta = $this->carpetaCarrera($idCarrera);
        $destino = $carpeta . DIRECTORY_SEPARATOR . date('Ymd-His') . '__' . $slug . '.pdf';

        if (!move_uploaded_file($tmp, $destino)) {
            return ['ok' => false, 'mensaje' => 'No se pudo guardar el archivo en el servidor.'];
        }

        return [
            'ok'      => true,
            'mensaje' => 'Cronograma publicado correctamente.',
            'archivo' => basename($destino),
        ];
    }

    /** Elimina un cronograma publicado de la carrera indicada. */
    public function borrar(int $idCarrera, string $nombreArchivo): array
    {
        $ruta = $this->resolverRuta($idCarrera, $nombreArchivo);
        if ($ruta === null) {
            return ['ok' => false, 'mensaje' => 'El archivo indicado no existe.'];
        }
        if (!@unlink($ruta)) {
            return ['ok' => false, 'mensaje' => 'No se pudo eliminar el archivo.'];
        }
        return ['ok' => true, 'mensaje' => 'Cronograma eliminado.'];
    }

    /* ================================================================ */
    /* Rutas y nombres                                                  */
    /* ================================================================ */

    /**
     * Ruta absoluta del archivo si el nombre es válido y existe en la
     * carpeta de la carrera; null en cualquier otro caso (evita
     * recorridos fuera de la carpeta).
     */
    public function resolverRuta(int $idCarrera, string $nombreArchivo): ?string
    {
        $nombre = basename($nombreArchivo);
        if (!$this->esArchivoCronograma($nombre)) {
            return null;
        }
        $ruta = $this->base . DIRECTORY_SEPARATOR . (int) $idCarrera . DIRECTORY_SEPARATOR . $nombre;
        return is_file($ruta) ? $ruta : null;
    }

    /** Nombre con el que se muestra y descarga el archivo. */
    public function nombreVisible(string $nombreArchivo): string
    {
        $pos = strpos($nombreArchivo, '__');
        if ($pos === false) {
            return $nombreArchivo;
        }
        $slug   = substr($nombreArchivo, $pos + 2);
        $sinExt = (string) preg_replace('/\.pdf$/i', '', $slug);
        return ucfirst(str_replace('-', ' ', $sinExt)) . '.pdf';
    }

    private function carpetaCarrera(int $idCarrera): string
    {
        $dir = $this->base . DIRECTORY_SEPARATOR . (int) $idCarrera;
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir;
    }

    /** Valida el formato interno de los archivos publicados. */
    private function esArchivoCronograma(string $nombre): bool
    {
        return (bool) preg_match('/^\d{8}-\d{6}__[a-z0-9\-]+\.pdf$/', $nombre);
    }

    private function slugificar(string $texto): string
    {
        $tabla = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
            'Á' => 'a', 'É' => 'e', 'Í' => 'i', 'Ó' => 'o', 'Ú' => 'u', 'Ü' => 'u', 'Ñ' => 'n',
        ];
        $texto = strtr($texto, $tabla);
        $texto = strtolower($texto);
        $texto = (string) preg_replace('/[^a-z0-9]+/', '-', $texto);
        $texto = trim($texto, '-');
        if (strlen($texto) > 80) {
            $texto = (string) preg_replace('/-[a-z0-9]*$/', '', substr($texto, 0, 80));
        }
        return $texto !== '' ? $texto : 'cronograma';
    }

    private function legible(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 1) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 0) . ' KB';
        }
        return $bytes . ' B';
    }
}
