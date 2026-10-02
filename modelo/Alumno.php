<?php
/**
 * Modelo: Alumno.
 *
 * Datos personales y alta de alumnos. Reúne las consultas que antes
 * estaban escritas dentro de los controladores mis_datos y registro.
 *
 * OJO: buscarPorDocumento() usa las columnas de la base real
 * (`numerodocumento`, `idemail`, ...), igual que el login. Los métodos
 * de registro conservan las consultas originales, que apuntan al
 * esquema normalizado (`id_alumno`, `email`, `password_hash`,
 * `domicilios_alumno`): contra la base real no funcionan hasta que se
 * migre el esquema o se reescriban con las columnas actuales.
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
     * Datos personales del alumno por número de documento.
     * Devuelve null si no existe.
     */
    public function buscarPorDocumento(int $documento): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT idtipodocumento  AS tipo_documento,
                    primernombre     AS primer_nombre,
                    otrosnombres     AS otros_nombres,
                    primerapellido   AS primer_apellido,
                    otrosapellidos   AS otros_apellidos,
                    numerodocumento  AS numero_documento,
                    idemail          AS email,
                    telefonopricipal AS telefono_principal
             FROM alumnos
             WHERE numerodocumento = :doc
             LIMIT 1"
        );
        $stmt->bindValue(':doc', $documento, PDO::PARAM_INT);
        $stmt->execute();

        $fila = $stmt->fetch();
        return $fila ?: null;
    }

    /* ------------------------------------------------------------------ */
    /* Registro (esquema normalizado, ver nota de cabecera)               */
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
        $stmt->bindValue(':dni', $dni, PDO::PARAM_INT);
        $stmt->execute();

        return (bool) $stmt->fetch();
    }

    /**
     * Crea el alumno y guarda su teléfono, todo en una transacción.
     * Espera las claves nombre, apellido, dni, email, telefono y hash.
     */
    public function registrar(array $datos): int
    {
        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare(
                "INSERT INTO alumnos
                   (id_tipo_documento, numero_documento, primer_apellido,
                    primer_nombre, email, password_hash, alta_registro)
                 VALUES ('DNI', :dni, :apellido, :nombre, :email, :hash, NOW())"
            );
            $stmt->bindValue(':dni', $datos['dni'], PDO::PARAM_INT);
            $stmt->bindValue(':apellido', $datos['apellido']);
            $stmt->bindValue(':nombre', $datos['nombre']);
            $stmt->bindValue(':email', $datos['email']);
            $stmt->bindValue(':hash', $datos['hash']);
            $stmt->execute();

            $idAlumno = (int) $this->db->lastInsertId();

            $stmt = $this->db->prepare(
                "INSERT INTO domicilios_alumno (id_alumno, telefono_principal)
                 VALUES (:id_alumno, :telefono)"
            );
            $stmt->bindValue(':id_alumno', $idAlumno, PDO::PARAM_INT);
            $stmt->bindValue(':telefono', $datos['telefono']);
            $stmt->execute();

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
