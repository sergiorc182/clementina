<?php
require_once 'Conexion.php';

class ActivacionCuenta
{
    private $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    public function emitir(int $idAlumno): array
    {
        if ($idAlumno <= 0) {
            return ['ok' => false, 'mensaje' => 'Alumno no válido.'];
        }

        try {
            $stmt = $this->db->prepare("
                SELECT id_alumno, email, primer_nombre, otros_nombres, password_hash
                FROM alumnos
                WHERE id_alumno = :id
                LIMIT 1
            ");
            $stmt->execute([':id' => $idAlumno]);
            $alumno = $stmt->fetch();

            if (!$alumno) {
                return ['ok' => false, 'mensaje' => 'No se encontró el alumno.'];
            }
            if (!empty($alumno['password_hash'])) {
                return ['ok' => false, 'mensaje' => 'La cuenta ya tiene una contraseña activa.'];
            }

            $token = bin2hex(random_bytes(32));
            $hash = hash('sha256', $token);

            $stmt = $this->db->prepare("
                UPDATE alumnos
                SET activacion_token_hash = :hash,
                    activacion_expira_en = DATE_ADD(NOW(), INTERVAL 48 HOUR),
                    activacion_usada_en = NULL
                WHERE id_alumno = :id
            ");
            $stmt->execute([':hash' => $hash, ':id' => $idAlumno]);

            return [
                'ok' => true,
                'token' => $token,
                'email' => (string) $alumno['email'],
                'nombre' => trim((string) $alumno['primer_nombre'] . ' ' . (string) $alumno['otros_nombres']),
            ];
        } catch (Throwable $e) {
            error_log('[Clementina Activacion emitir] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo generar la invitación. Intentá nuevamente.'];
        }
    }

    public function activar(string $token, string $password): array
    {
        $token = trim($token);
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            return ['ok' => false, 'mensaje' => 'El enlace de activación no es válido, venció o ya fue usado.'];
        }
        if (mb_strlen($password) < 8 || mb_strlen($password) > 255) {
            return ['ok' => false, 'mensaje' => 'La contraseña debe tener entre 8 y 255 caracteres.'];
        }

        $hash = hash('sha256', $token);

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("
                SELECT id_alumno
                FROM alumnos
                WHERE activacion_token_hash = :hash
                  AND activacion_usada_en IS NULL
                  AND activacion_expira_en > NOW()
                FOR UPDATE
            ");
            $stmt->execute([':hash' => $hash]);
            $alumno = $stmt->fetch();

            if (!$alumno) {
                $this->db->rollBack();
                return ['ok' => false, 'mensaje' => 'El enlace de activación no es válido, venció o ya fue usado.'];
            }

            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            if ($passwordHash === false) {
                $this->db->rollBack();
                return ['ok' => false, 'mensaje' => 'No se pudo guardar la contraseña. Intentá nuevamente.'];
            }

            $stmt = $this->db->prepare("
                UPDATE alumnos
                SET password_hash = :password_hash,
                    confirmacion_registro = NOW(),
                    activacion_usada_en = NOW(),
                    activacion_token_hash = NULL,
                    activacion_expira_en = NULL,
                    fecha_ultima_actualizacion = NOW()
                WHERE id_alumno = :id
                  AND activacion_token_hash = :hash
                  AND activacion_usada_en IS NULL
                  AND activacion_expira_en > NOW()
            ");
            $stmt->execute([
                ':password_hash' => $passwordHash,
                ':id' => (int) $alumno['id_alumno'],
                ':hash' => $hash,
            ]);

            if ($stmt->rowCount() !== 1) {
                $this->db->rollBack();
                return ['ok' => false, 'mensaje' => 'El enlace de activación no es válido, venció o ya fue usado.'];
            }

            $this->db->commit();

            return ['ok' => true, 'mensaje' => 'Contraseña configurada correctamente. Ya podés iniciar sesión.'];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[Clementina Activacion activar] ' . $e->getMessage());
            return ['ok' => false, 'mensaje' => 'No se pudo activar la cuenta. Intentá nuevamente.'];
        }
    }
}
