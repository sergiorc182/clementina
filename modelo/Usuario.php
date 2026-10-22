<?php
/**
 * Modelo: Usuario (login).
 *
 * Esquema normalizado (docs/esquema_normalizado.sql):
 *   - Alumnos: login con `email` o `numero_documento` (DNI).
 *     La contraseña se guarda hasheada en `alumnos.password_hash`.
 *
 * La comparación es segura: se usa password_verify() para hashes (bcrypt)
 * y hash_equals() como respaldo para valores que todavía estén en texto
 * plano (por ejemplo, datos migrados de la base vieja sin rehashear).
 */

require_once __DIR__ . '/Conexion.php';

class Usuario
{
    private $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Busca al alumno que ingresa por email o por número de documento.
     * Devuelve null si no existe.
     */
    public function buscarPorUsuario(string $usuario): ?array
    {
        $columnas = "id_alumno, id_tipo_documento, numero_documento,
                     primer_nombre, otros_nombres, primer_apellido,
                     otros_apellidos, email, password_hash";

        // 1) Por email.
        $stmt = $this->db->prepare(
            "SELECT $columnas FROM alumnos WHERE email = :usuario LIMIT 1"
        );
        $stmt->bindValue(':usuario', $usuario);
        $stmt->execute();
        $fila = $stmt->fetch();

        // 2) Si no hay coincidencia y el valor es numérico, por documento.
        //    Se prioriza DNI por si el mismo número existe con otro tipo.
        if (!$fila && ctype_digit($usuario)) {
            $stmt = $this->db->prepare(
                "SELECT $columnas FROM alumnos
                 WHERE numero_documento = :doc
                 ORDER BY (id_tipo_documento = 'DNI') DESC
                 LIMIT 1"
            );
            $stmt->bindValue(':doc', $usuario, PDO::PARAM_INT);
            $stmt->execute();
            $fila = $stmt->fetch();
        }

        if (!$fila) {
            return null;
        }

        return [
            'rol'            => 'alumno',
            'id'             => (int) $fila['id_alumno'],
            'tipo_documento' => (string) $fila['id_tipo_documento'],
            'documento'      => (int) $fila['numero_documento'],
            'usuario'        => $fila['email'],
            'nombre'         => trim((string) $fila['primer_nombre']),
            'segundo_nombre' => trim((string) ($fila['otros_nombres'] ?? '')),
            'apellido'       => trim((string) $fila['primer_apellido']),
            'password'       => (string) ($fila['password_hash'] ?? ''),
        ];
    }

    /**
     * Verifica la contraseña ingresada contra la guardada.
     * Soporta hash (bcrypt) y, como respaldo, texto plano.
     */
    public function verificarContraseña(string $guardada, string $ingresada): bool
    {
        if ($guardada === '') {
            return false;
        }

        if (password_verify($ingresada, $guardada)) {
            return true;
        }

        return hash_equals($guardada, $ingresada);
    }
}
