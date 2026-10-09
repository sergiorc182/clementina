<?php
/**
 * Modelo: Conexión a la base de datos (patrón Singleton con PDO).
 * Todas las conexiones del sistema pasan por acá.
 */

require_once dirname(__DIR__) . '/config/config.php';

class Conexion
{
    private static $instancia = null;
    private $pdo;

    private function __construct()
    {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'ok'      => false,
                'mensaje' => 'Error de conexión a la base de datos. Verificá config/config.php.',
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    public static function getInstancia(): self
    {
        if (self::$instancia === null) {
            self::$instancia = new self();
        }
        return self::$instancia;
    }

    public function getConexion(): PDO
    {
        return $this->pdo;
    }
}