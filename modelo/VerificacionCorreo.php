<?php
require_once 'Conexion.php';

/**
 * Verificación de correo basada exclusivamente en MySQL.
 *
 * La tabla verificaciones_correo guarda el hash SHA-256 del token, su
 * vencimiento y los estados de uso/revocación. La columna
 * alumnos.confirmacion_registro es la única fuente de verdad del estado
 * confirmado de la cuenta. No se utiliza ningún archivo JSON.
 */
class VerificacionCorreo
{
    private const VIGENCIA = 24 * 3600;
    private const MENSAJE_INVALIDO = 'El enlace de verificación no es válido, venció o ya fue usado.';

    private PDO $db;

    /** @param string|null $secreto Parámetro heredado; se ignora. */
    public function __construct(?string $secreto = null)
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Genera y persiste un token nuevo, invalidando los pendientes anteriores.
     * Administra su propia transacción (flujo de reenvío).
     */
    public function emitir(int $idAlumno, string $email, string $dni): array
    {
        try {
            $this->db->beginTransaction();
            $emitida = $this->emitirEnTransaccion($this->db, $idAlumno, $email, $dni);
            $this->db->commit();

            return ['ok' => true] + $emitida;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[Clementina VerificacionCorreo emitir] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo generar un nuevo enlace. Intentá nuevamente.'];
        }
    }

    /**
     * Variante para el registro: reutiliza la transacción que ya creó la cuenta.
     * No hace commit; devuelve el token en claro para que el controlador lo envíe.
     */
    public function emitirEnTransaccion(PDO $db, int $idAlumno, string $email, string $dni): array
    {
        $email = mb_strtolower(trim($email));
        if ($idAlumno <= 0 || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || !preg_match('/^\d{6,8}$/', $dni)) {
            throw new RuntimeException('Datos de verificación no válidos.');
        }

        $stmt = $db->prepare(
            'SELECT id_alumno, email, confirmacion_registro
               FROM alumnos
              WHERE id_alumno = :id
              LIMIT 1
              FOR UPDATE'
        );
        $stmt->execute([':id' => $idAlumno]);
        $alumno = $stmt->fetch();

        if (!$alumno) {
            throw new RuntimeException('Alumno no encontrado.');
        }
        if ($alumno['confirmacion_registro'] !== null) {
            throw new RuntimeException('La cuenta ya está verificada.');
        }
        if (mb_strtolower((string) $alumno['email']) !== $email) {
            throw new RuntimeException('El correo no corresponde a la cuenta.');
        }

        $token = bin2hex(random_bytes(32));
        $hash  = hash('sha256', $token);
        $ahora = date('Y-m-d H:i:s');
        $expira = date('Y-m-d H:i:s', time() + self::VIGENCIA);

        $stmt = $db->prepare(
            'UPDATE verificaciones_correo
                SET revocada_en = :ahora
              WHERE id_alumno = :id
                AND usada_en IS NULL
                AND revocada_en IS NULL'
        );
        $stmt->execute([':ahora' => $ahora, ':id' => $idAlumno]);

        $stmt = $db->prepare(
            'INSERT INTO verificaciones_correo
                (id_alumno, token_hash, expira_en, creado_en)
             VALUES
                (:id, :hash, :expira, :creado)'
        );
        $stmt->execute([
            ':id'     => $idAlumno,
            ':hash'   => $hash,
            ':expira' => $expira,
            ':creado' => $ahora,
        ]);

        return [
            'token' => $token,
            'email' => (string) $alumno['email'],
        ];
    }

    /** Confirma una cuenta y marca el token como usado en una sola transacción. */
    public function confirmar(string $token): array
    {
        $token = trim($token);
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            return ['ok' => false, 'mensaje' => self::MENSAJE_INVALIDO];
        }

        $hash = hash('sha256', $token);
        $ahora = date('Y-m-d H:i:s');

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare(
                'SELECT v.id_verificacion, v.id_alumno
                   FROM verificaciones_correo v
                   INNER JOIN alumnos a ON a.id_alumno = v.id_alumno
                  WHERE v.token_hash = :hash
                    AND v.usada_en IS NULL
                    AND v.revocada_en IS NULL
                    AND v.expira_en > :ahora
                    AND a.confirmacion_registro IS NULL
                  LIMIT 1
                  FOR UPDATE'
            );
            $stmt->execute([':hash' => $hash, ':ahora' => $ahora]);
            $registro = $stmt->fetch();

            if (!$registro) {
                $this->db->rollBack();
                return ['ok' => false, 'mensaje' => self::MENSAJE_INVALIDO];
            }

            $stmt = $this->db->prepare(
                'UPDATE verificaciones_correo
                    SET usada_en = :ahora
                  WHERE id_verificacion = :id
                    AND usada_en IS NULL
                    AND revocada_en IS NULL
                    AND expira_en > :ahora2'
            );
            $stmt->execute([
                ':ahora'  => $ahora,
                ':id'     => (int) $registro['id_verificacion'],
                ':ahora2' => $ahora,
            ]);
            if ($stmt->rowCount() !== 1) {
                $this->db->rollBack();
                return ['ok' => false, 'mensaje' => self::MENSAJE_INVALIDO];
            }

            $stmt = $this->db->prepare(
                'UPDATE alumnos
                    SET confirmacion_registro = :ahora,
                        fecha_ultima_actualizacion = :ahora2
                  WHERE id_alumno = :id
                    AND confirmacion_registro IS NULL'
            );
            $stmt->execute([
                ':ahora'  => $ahora,
                ':ahora2' => $ahora,
                ':id'     => (int) $registro['id_alumno'],
            ]);
            if ($stmt->rowCount() !== 1) {
                $this->db->rollBack();
                return ['ok' => false, 'mensaje' => self::MENSAJE_INVALIDO];
            }

            $stmt = $this->db->prepare(
                'UPDATE verificaciones_correo
                    SET revocada_en = :ahora
                  WHERE id_alumno = :id
                    AND id_verificacion <> :usada
                    AND usada_en IS NULL
                    AND revocada_en IS NULL'
            );
            $stmt->execute([
                ':ahora' => $ahora,
                ':id'    => (int) $registro['id_alumno'],
                ':usada' => (int) $registro['id_verificacion'],
            ]);

            $this->db->commit();

            return ['ok' => true, 'mensaje' => 'Correo verificado correctamente. Ya podés iniciar sesión.'];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[Clementina VerificacionCorreo confirmar] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo verificar el correo. Intentá nuevamente.'];
        }
    }

    /** Devuelve la cuenta pendiente asociada a un correo, o null. */
    public function buscarPendientePorEmail(string $email): ?array
    {
        $email = mb_strtolower(trim($email));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        $stmt = $this->db->prepare(
            'SELECT id_alumno, email, numero_documento, primer_nombre, otros_nombres
               FROM alumnos
              WHERE email = :email
                AND confirmacion_registro IS NULL
              LIMIT 1'
        );
        $stmt->execute([':email' => $email]);
        $alumno = $stmt->fetch();

        return $alumno === false ? null : $alumno;
    }
}
