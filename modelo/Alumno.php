<?php
/**
 * Modelo: Alumno.
 *
 * Datos personales y alta de alumnos sobre el esquema normalizado
 * (docs/esquema_normalizado.sql): el alumno se identifica por
 * `alumnos.id_alumno` y el teléfono vive en `domicilios_alumno`.
 */

require_once __DIR__ . '/Conexion.php';

class Alumno
{
    private $db;

    public function __construct()
    {
        $this->db = Conexion::getInstancia()->getConexion();
    }

    /**
     * Datos personales del alumno por su id interno.
     * Devuelve null si no existe.
     */
    public function buscarPorId(int $idAlumno): ?array
    {
        // Un alumno puede tener más de un domicilio: se toma el primero cargado.
        $stmt = $this->db->prepare(
            "SELECT a.id_tipo_documento  AS tipo_documento,
                    a.primer_nombre,
                    a.otros_nombres,
                    a.primer_apellido,
                    a.otros_apellidos,
                    a.numero_documento,
                    a.legajo,
                    a.email,
                    (SELECT d.telefono_principal
                       FROM domicilios_alumno d
                      WHERE d.id_alumno = a.id_alumno
                      ORDER BY d.id_domicilio
                      LIMIT 1)           AS telefono_principal
             FROM alumnos a
             WHERE a.id_alumno = :id
             LIMIT 1"
        );
        $stmt->bindValue(':id', $idAlumno, PDO::PARAM_INT);
        $stmt->execute();

        $fila = $stmt->fetch();
        return $fila ?: null;
    }

    /**
     * Id interno del alumno a partir del número de documento
     * (se prioriza DNI si el número existe con más de un tipo).
     * Devuelve null si no existe.
     */
    public function idPorDocumento(int $documento): ?int
    {
        $stmt = $this->db->prepare(
            "SELECT id_alumno FROM alumnos
             WHERE numero_documento = :doc
             ORDER BY (id_tipo_documento = 'DNI') DESC
             LIMIT 1"
        );
        $stmt->bindValue(':doc', $documento, PDO::PARAM_INT);
        $stmt->execute();

        $id = $stmt->fetchColumn();
        return $id === false ? null : (int) $id;
    }

    /* ------------------------------------------------------------------ */
    /* Registro                                                            */
    /* ------------------------------------------------------------------ */

    public function existeEmail(string $email): bool
    {
        $stmt = $this->db->prepare(
            "SELECT id_alumno FROM alumnos WHERE email = :email LIMIT 1"
        );
        $stmt->bindValue(':email', $email);
        $stmt->execute();

        return (bool) $stmt->fetch();
    }

    public function existeDni(string $dni): bool
    {
        $stmt = $this->db->prepare(
            "SELECT id_alumno FROM alumnos
             WHERE id_tipo_documento = 'DNI' AND numero_documento = :dni LIMIT 1"
        );
        $stmt->bindValue(':dni', (int) $dni, PDO::PARAM_INT);
        $stmt->execute();

        return (bool) $stmt->fetch();
    }

    /**
     * Crea el alumno (DNI) y, si hay teléfono, su fila en domicilios_alumno,
     * todo en una transacción. Devuelve el id_alumno nuevo.
     *
     * Claves esperadas en $datos: primer_nombre, otros_nombres,
     * primer_apellido, otros_apellidos, dni, email, telefono, hash.
     * Los opcionales vacíos se guardan como NULL. Si hay un duplicado
     * (email o DNI) lanza PDOException con SQLSTATE 23000.
     */
    public function registrar(array $datos): int
    {
        $nulo = static function ($v) {
            $v = trim((string) ($v ?? ''));
            return $v === '' ? null : $v;
        };

        // Mismo formato de legajo que modelo/Usuario.php.
        $legajo = date('Y') . '-DNI-' . $datos['dni'];

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare(
                "INSERT INTO alumnos
                   (id_tipo_documento, numero_documento, legajo,
                    primer_apellido, otros_apellidos,
                    primer_nombre, otros_nombres,
                    email, password_hash, alta_registro)
                 VALUES ('DNI', :dni, :legajo,
                         :primer_apellido, :otros_apellidos,
                         :primer_nombre, :otros_nombres,
                         :email, :hash, NOW())"
            );
            $stmt->bindValue(':dni', (int) $datos['dni'], PDO::PARAM_INT);
            $stmt->bindValue(':legajo', $legajo);
            $stmt->bindValue(':primer_apellido', $datos['primer_apellido']);
            $stmt->bindValue(':otros_apellidos', $nulo($datos['otros_apellidos'] ?? null));
            $stmt->bindValue(':primer_nombre', $datos['primer_nombre']);
            $stmt->bindValue(':otros_nombres', $nulo($datos['otros_nombres'] ?? null));
            $stmt->bindValue(':email', $datos['email']);
            $stmt->bindValue(':hash', $datos['hash']);
            $stmt->execute();

            $idAlumno = (int) $this->db->lastInsertId();

            $telefono = $nulo($datos['telefono'] ?? null);
            if ($telefono !== null) {
                $stmt = $this->db->prepare(
                    "INSERT INTO domicilios_alumno (id_alumno, telefono_principal)
                     VALUES (:id_alumno, :telefono)"
                );
                $stmt->bindValue(':id_alumno', $idAlumno, PDO::PARAM_INT);
                $stmt->bindValue(':telefono', $telefono);
                $stmt->execute();
            }

            $this->db->commit();

            return $idAlumno;
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }
}
