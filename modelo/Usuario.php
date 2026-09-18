<?php
/**
 * Modelo: Usuario (login).
 *
 * Base de prueba `test_clementina`:
 *   Tabla alumnos(id, usuario, password).
 *   El login se hace con la columna `usuario`.
 *
 * La contraseña se compara de forma segura: si está hasheada (bcrypt)
 * se usa password_verify(); mientras la base de prueba la tenga en texto
 * plano también se acepta (ver análisis de normalización, punto H).
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
     * Busca al alumno por su usuario.
     * Devuelve null si no existe.
     */
    public function buscarPorUsuario(string $usuario): ?array
    {
        $sql = "SELECT id, usuario, password
                FROM alumnos
                WHERE usuario = :usuario
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':usuario', $usuario);
        $stmt->execute();

        $fila = $stmt->fetch();
        if (!$fila) {
            return null;
        }

        return [
            'rol'            => 'alumno',
            'id'             => (int) $fila['id'],
            'usuario'        => $fila['usuario'],
            'nombre'         => $fila['usuario'],
            'segundo_nombre' => '',
            'apellido'       => '',
            'password'       => (string) $fila['password'],
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