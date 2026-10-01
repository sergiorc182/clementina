<?php
/**
 * Modelo: Usuario (login).
 *
 * Base real `u714838186_desarrollo`:
 *   - Alumnos: login con `idemail` (email) o `numerodocumento` (DNI).
 *     La contraseña se guarda en `alumnos.password`.
 *
 * La comparación es segura: se usa password_verify() para hashes (bcrypt)
 * y hash_equals() como respaldo para valores en texto plano.
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
     * Busca al alumno que ingresa por email (`idemail`) o DNI
     * (`numerodocumento`). Devuelve null si no existe.
     */
    public function buscarPorUsuario(string $usuario): ?array
    {
        $columnas = "numerodocumento, primernombre, otrosnombres,
                     primerapellido, otrosapellidos, idemail, password";

        // 1) Por email.
        $stmt = $this->db->prepare(
            "SELECT $columnas FROM alumnos WHERE idemail = :usuario LIMIT 1"
        );
        $stmt->bindValue(':usuario', $usuario);
        $stmt->execute();
        $fila = $stmt->fetch();

        // 2) Si no hay coincidencia y el valor es numérico, por DNI.
        if (!$fila && ctype_digit($usuario)) {
            $stmt = $this->db->prepare(
                "SELECT $columnas FROM alumnos WHERE numerodocumento = :doc LIMIT 1"
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
            'id'             => (int) $fila['numerodocumento'],
            'usuario'        => $fila['idemail'],
            'nombre'         => trim((string) $fila['primernombre']),
            'segundo_nombre' => trim((string) ($fila['otrosnombres'] ?? '')),
            'apellido'       => trim((string) $fila['primerapellido']),
            'password'       => (string) $fila['password'],
        ];
    }

    /**
     * Verifica la contraseña ingresada contra la guardada.
     * Soporta hash (bcrypt) y, para esta base, texto plano.
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
