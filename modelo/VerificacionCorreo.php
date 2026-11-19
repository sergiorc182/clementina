<?php
require_once 'Conexion.php';

class VerificacionCorreo
{
    private const VIGENCIA = 48 * 3600;

    private PDO $db;
    private string $secreto;
    private string $archivo;

    public function __construct(string $secreto)
    {
        $this->db = Conexion::getInstancia()->getConexion();
        $this->secreto = $secreto;
        $this->archivo = dirname(__DIR__) . '/config/.registro_verificaciones.json';
    }

    public function emitir(int $idAlumno, string $email, string $dni): array
    {
        if ($idAlumno <= 0 || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || !preg_match('/^\d{6,8}$/', $dni)) {
            return ['ok' => false, 'mensaje' => 'No se pudo iniciar la verificación del correo.'];
        }

        $nonce = bin2hex(random_bytes(16));
        $expira = time() + self::VIGENCIA;
        $payload = json_encode(['n' => $nonce, 'e' => $expira], JSON_UNESCAPED_UNICODE);
        $firma = rtrim(strtr(base64_encode(hash_hmac('sha256', $payload, $this->secreto, true)), '+/', '-_'), '=');
        $token = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=') . '.' . $firma;
        $hash = hash('sha256', $token);

        $registro = [
            'id_alumno' => $idAlumno,
            'expira' => $expira,
            'email_hash' => hash('sha256', mb_strtolower($email)),
            'dni_hash' => hash('sha256', $dni),
        ];

        if (!$this->conArchivo(function (array &$datos) use ($hash, $registro): bool {
            $datos[$hash] = $registro;
            return true;
        })) {
            return ['ok' => false, 'mensaje' => 'No se pudo iniciar la verificación del correo.'];
        }

        return ['ok' => true, 'token' => $token, 'email' => $email];
    }

    public function confirmar(string $token): array
    {
        $validacion = $this->validarToken($token);
        if (!$validacion['ok']) {
            return ['ok' => false, 'mensaje' => 'El enlace de verificación no es válido, venció o ya fue usado.'];
        }

        $hash = hash('sha256', $token);
        return $this->conArchivo(function (array &$datos, int $ahora) use ($hash): array {
            $registro = $datos[$hash] ?? null;
            if ($registro === null || (int) ($registro['expira'] ?? 0) <= $ahora) {
                unset($datos[$hash]);
                return ['ok' => false, 'mensaje' => 'El enlace de verificación no es válido, venció o ya fue usado.'];
            }

            try {
                $this->db->beginTransaction();
                $stmt = $this->db->prepare(
                    "UPDATE alumnos
                     SET confirmacion_registro = NOW(), fecha_ultima_actualizacion = NOW()
                     WHERE id_alumno = :id AND confirmacion_registro IS NULL"
                );
                $stmt->execute([':id' => (int) $registro['id_alumno']]);

                if ($stmt->rowCount() !== 1) {
                    $this->db->rollBack();
                    unset($datos[$hash]);
                    return ['ok' => false, 'mensaje' => 'El enlace de verificación ya fue usado. Podés iniciar sesión.'];
                }

                $this->db->commit();
                unset($datos[$hash]);
                return ['ok' => true, 'mensaje' => 'Correo verificado correctamente. Ya podés iniciar sesión.'];
            } catch (Throwable $e) {
                if ($this->db->inTransaction()) {
                    $this->db->rollBack();
                }
                error_log('[Clementina VerificacionCorreo] ' . $e->getMessage());
                return ['ok' => false, 'mensaje' => 'No se pudo verificar el correo. Intentá nuevamente.'];
            }
        });
    }

    public function descartar(int $idAlumno): void
    {
        $this->conArchivo(function (array &$datos) use ($idAlumno): bool {
            foreach ($datos as $hash => $registro) {
                if ((int) ($registro['id_alumno'] ?? 0) === $idAlumno) {
                    unset($datos[$hash]);
                }
            }
            return true;
        });
    }

    public static function hayPendiente(string $identificador): bool
    {
        $archivo = dirname(__DIR__) . '/config/.registro_verificaciones.json';
        if (!is_file($archivo)) {
            return false;
        }

        $handle = @fopen($archivo, 'rb');
        if ($handle === false) {
            return false;
        }

        flock($handle, LOCK_SH);
        $datos = json_decode((string) stream_get_contents($handle), true);
        flock($handle, LOCK_UN);
        fclose($handle);

        if (!is_array($datos)) {
            return false;
        }

        $identificador = trim($identificador);
        $emailHash = hash('sha256', mb_strtolower($identificador));
        $dniHash = hash('sha256', $identificador);
        $ahora = time();

        foreach ($datos as $registro) {
            if (!is_array($registro) || (int) ($registro['expira'] ?? 0) <= $ahora) {
                continue;
            }
            if (hash_equals((string) ($registro['email_hash'] ?? ''), $emailHash)
                || hash_equals((string) ($registro['dni_hash'] ?? ''), $dniHash)) {
                return true;
            }
        }

        return false;
    }

    private function validarToken(string $token): array
    {
        $token = trim($token);
        if (!preg_match('/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/', $token) || strlen($token) > 512) {
            return ['ok' => false];
        }

        $partes = explode('.', $token, 2);
        $payload = $this->base64urlDecodificar($partes[0]);
        $firma = $this->base64urlDecodificar($partes[1]);
        if ($payload === false || $firma === false) {
            return ['ok' => false];
        }

        $esperada = hash_hmac('sha256', $payload, $this->secreto, true);
        if (!hash_equals($esperada, $firma)) {
            return ['ok' => false];
        }

        $datos = json_decode($payload, true);
        if (!is_array($datos) || !isset($datos['e']) || (int) $datos['e'] <= time()) {
            return ['ok' => false];
        }

        return ['ok' => true];
    }

    private function base64urlDecodificar(string $valor)
    {
        $relleno = (4 - strlen($valor) % 4) % 4;
        return base64_decode(strtr($valor, '-_', '+/') . str_repeat('=', $relleno), true);
    }

    private function conArchivo(callable $callback)
    {
        $directorio = dirname($this->archivo);
        if (!is_dir($directorio)) {
            @mkdir($directorio, 0755, true);
        }

        $handle = @fopen($this->archivo, 'c+');
        if ($handle === false) {
            error_log('[Clementina VerificacionCorreo] No se pudo abrir el archivo de verificaciones.');
            return false;
        }

        flock($handle, LOCK_EX);
        rewind($handle);
        $datos = json_decode((string) stream_get_contents($handle), true);
        if (!is_array($datos)) {
            $datos = [];
        }

        $ahora = time();
        foreach ($datos as $hash => $registro) {
            if (!is_array($registro) || (int) ($registro['expira'] ?? 0) <= $ahora) {
                unset($datos[$hash]);
            }
        }

        $resultado = $callback($datos, $ahora);

        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($datos));
        fflush($handle);
        flock($handle, LOCK_UN);
        fclose($handle);
        @chmod($this->archivo, 0600);

        return $resultado;
    }
}
