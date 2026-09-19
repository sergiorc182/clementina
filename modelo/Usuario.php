<?php
/**
 * Modelo: Usuario (login).
 *
 * Base local `clementina` (esquema normalizado):
 *   - Alumnos:  login con `email`, contraseña en `password_hash`.
 *   - Personal: login con `usuario_sistema`, contraseña en `password_hash`.
 *
 * La contraseña se compara de forma segura: si está hasheada (bcrypt)
 * se usa password_verify(); mientras haya datos en texto plano también
 * se acepta (ver análisis de normalización, punto H).
 */

require_once dirname(__DIR__) . '/modelo/Conexion.php';

class Usuario
{
    private $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Busca el usuario que ingresa por `usuario` (email de alumno o
     * usuario de personal). Devuelve null si no existe.
     */
    public function buscarPorUsuario(string $usuario): ?array
    {
        // Alumno: login con el email.
        $sql = "SELECT id_alumno, primer_nombre, otros_nombres,
                       primer_apellido, otros_apellidos, email, password_hash
                FROM alumnos
                WHERE email = :usuario
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':usuario', $usuario);
        $stmt->execute();

        $fila = $stmt->fetch();
        if ($fila) {
            return [
                'rol'            => 'alumno',
                'id'             => (int) $fila['id_alumno'],
                'usuario'        => $fila['email'],
                'nombre'         => $fila['primer_nombre'],
                'segundo_nombre' => $fila['otros_nombres'] ?? '',
                'apellido'       => $fila['primer_apellido'],
                'password'       => (string) $fila['password_hash'],
            ];
        }

        // Personal: login con usuario_sistema.
        $sql = "SELECT id_personal, nombres, apellidos, usuario_sistema, password_hash
                FROM personal
                WHERE usuario_sistema = :usuario
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':usuario', $usuario);
        $stmt->execute();

        $fila = $stmt->fetch();
        if (!$fila) {
            return null;
        }

        return [
            'rol'            => 'personal',
            'id'             => (int) $fila['id_personal'],
            'usuario'        => $fila['usuario_sistema'],
            'nombre'         => $fila['nombres'],
            'segundo_nombre' => '',
            'apellido'       => $fila['apellidos'],
            'password'       => (string) $fila['password_hash'],
        ];
    }

    /**
     * Verifica la contraseña ingresada contra la guardada.
     * Soporta hash (bcrypt) y, para esta base de prueba, texto plano.
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