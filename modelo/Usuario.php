<?php
require_once 'Conexion.php';

class Usuario {
    private $conexion;
    
    public function __construct() {
        $this->conexion = Conexion::getInstancia()->getConexion();
    }
    
    public function registrar($tipoDocumento, $numeroDocumento, $primerApellido, $otrosApellidos, $primerNombre, $otrosNombres, $email, $password) {
        $this->conexion->beginTransaction();
        try {
            $stmt = $this->conexion->prepare("
                SELECT id_alumno FROM alumnos
                WHERE id_tipo_documento = ? AND numero_documento = ?
                LIMIT 1
            ");
            $stmt->execute([$tipoDocumento, $numeroDocumento]);
            if ($stmt->fetch()) {
                $this->conexion->rollBack();
                return ['ok' => false, 'mensaje' => 'El documento ' . $numeroDocumento . ' ya está registrado.'];
            }
            
            $stmt = $this->conexion->prepare("SELECT id_alumno FROM alumnos WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $this->conexion->rollBack();
                return ['ok' => false, 'mensaje' => 'El email ' . $email . ' ya está registrado.'];
            }
            
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $legajo = date('Y') . '-' . $tipoDocumento . '-' . $numeroDocumento;
            
            $stmt = $this->conexion->prepare("
                INSERT INTO alumnos
                    (id_tipo_documento, numero_documento, legajo, primer_apellido, otros_apellidos,
                     primer_nombre, otros_nombres, email, password_hash, alta_registro)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $tipoDocumento,
                $numeroDocumento,
                $legajo,
                $primerApellido,
                ($otrosApellidos === '' ? null : $otrosApellidos),
                $primerNombre,
                ($otrosNombres === '' ? null : $otrosNombres),
                $email,
                $passwordHash
            ]);
            
            $this->conexion->commit();
            return ['ok' => true, 'mensaje' => 'Registro exitoso. Ahora podés iniciar sesión con tu DNI.'];
        } catch (PDOException $e) {
            $this->conexion->rollBack();
            return ['ok' => false, 'mensaje' => 'Error al registrarse: ' . $e->getMessage()];
        }
    }
    
    public function login($identificador, $password) {
        try {
            $stmt = $this->conexion->prepare("
                SELECT id_alumno, numero_documento, legajo, primer_apellido, otros_apellidos,
                       primer_nombre, otros_nombres, email, password_hash
                FROM alumnos
                WHERE email = ? OR numero_documento = ?
                LIMIT 1
            ");
            $stmt->execute([$identificador, $identificador]);
            $alumno = $stmt->fetch();
            
            if ($alumno) {
                if (empty($alumno['password_hash'])) {
                    return ['ok' => false, 'mensaje' => 'La cuenta no tiene una contraseña configurada.'];
                }
                if (!password_verify($password, $alumno['password_hash'])) {
                    return ['ok' => false, 'mensaje' => 'La contraseña es incorrecta.'];
                }
                return [
                    'ok' => true,
                    'usuario' => [
                        'id' => $alumno['id_alumno'],
                        'tipo' => 'alumno',
                        'rol' => 'alumno',
                        'nombre' => trim($alumno['primer_nombre'] . ' ' . $alumno['otros_nombres']),
                        'apellido' => trim($alumno['primer_apellido'] . ' ' . $alumno['otros_apellidos']),
                        'email' => $alumno['email'],
                        'dni' => $alumno['numero_documento'],
                        'legajo' => $alumno['legajo']
                    ]
                ];
            }
            
            $stmt = $this->conexion->prepare("
                SELECT id_personal, apellidos, nombres, usuario_sistema, password_hash, id_tipo_personal
                FROM personal
                WHERE usuario_sistema = ?
                LIMIT 1
            ");
            $stmt->execute([$identificador]);
            $personal = $stmt->fetch();
            
            if ($personal) {
                if (empty($personal['password_hash'])) {
                    return ['ok' => false, 'mensaje' => 'La cuenta no tiene una contraseña configurada.'];
                }
                if (!password_verify($password, $personal['password_hash'])) {
                    return ['ok' => false, 'mensaje' => 'La contraseña es incorrecta.'];
                }
                $roles = ['A' => 'administrador', 'D' => 'directivo', 'P' => 'docente', 'S' => 'preceptor'];
                return [
                    'ok' => true,
                    'usuario' => [
                        'id' => $personal['id_personal'],
                        'tipo' => 'personal',
                        'rol' => $roles[$personal['id_tipo_personal']] ?? 'personal',
                        'nombre' => $personal['nombres'],
                        'apellido' => $personal['apellidos'],
                        'email' => null,
                        'dni' => null,
                        'legajo' => null
                    ]
                ];
            }
            
            return ['ok' => false, 'mensaje' => 'No existe una cuenta con ese DNI, email o usuario.'];
        } catch (PDOException $e) {
            return ['ok' => false, 'mensaje' => 'Error al iniciar sesión: ' . $e->getMessage()];
        }
    }
    
    public function obtenerDatosAlumno($id_alumno) {
        try {
            $stmt = $this->conexion->prepare("
                SELECT a.numero_documento, a.legajo, a.primer_apellido, a.otros_apellidos,
                       a.primer_nombre, a.otros_nombres, a.email, a.fecha_nacimiento,
                       a.sexo, a.estado_civil, a.id_pais_nacimiento, a.id_localidad_nacimiento,
                       a.lugar_nacimiento_extranjero, a.cantidad_hijos, a.cantidad_familiares_a_cargo,
                       a.alta_registro,
                       p.nombre AS pais_nombre,
                       l.nombre AS localidad_nombre,
                       d.telefono_principal, d.telefono_alternativo
                FROM alumnos a
                LEFT JOIN paises p ON p.id_pais = a.id_pais_nacimiento
                LEFT JOIN localidades l ON l.id_localidad = a.id_localidad_nacimiento
                LEFT JOIN domicilios_alumno d ON d.id_alumno = a.id_alumno
                WHERE a.id_alumno = ?
            ");
            $stmt->execute([$id_alumno]);
            return $stmt->fetch();
        } catch (PDOException $e) {
            return false;
        }
    }
    
    public function actualizarDatosAlumno($id_alumno, $datos) {
        try {
            $stmt = $this->conexion->prepare("
                SELECT id_alumno FROM alumnos WHERE email = ? AND id_alumno <> ? LIMIT 1
            ");
            $stmt->execute([$datos['email'], $id_alumno]);
            if ($stmt->fetch()) {
                return ['ok' => false, 'mensaje' => 'El email ' . $datos['email'] . ' ya está registrado por otro usuario.'];
            }

            $this->conexion->beginTransaction();

            $stmt = $this->conexion->prepare("
                UPDATE alumnos SET
                    primer_apellido = ?,
                    otros_apellidos = ?,
                    primer_nombre = ?,
                    otros_nombres = ?,
                    email = ?,
                    fecha_nacimiento = ?,
                    sexo = ?,
                    estado_civil = ?,
                    id_pais_nacimiento = ?,
                    id_localidad_nacimiento = ?,
                    lugar_nacimiento_extranjero = ?,
                    cantidad_hijos = ?,
                    cantidad_familiares_a_cargo = ?,
                    fecha_ultima_actualizacion = NOW()
                WHERE id_alumno = ?
            ");
            $stmt->execute([
                $datos['primer_apellido'],
                ($datos['otros_apellidos'] === '' ? null : $datos['otros_apellidos']),
                $datos['primer_nombre'],
                ($datos['otros_nombres'] === '' ? null : $datos['otros_nombres']),
                $datos['email'],
                ($datos['fecha_nacimiento'] ?: null),
                ($datos['sexo'] ?: null),
                ($datos['estado_civil'] ?: null),
                ($datos['id_pais_nacimiento'] ?: 'ZZ'),
                ($datos['id_localidad_nacimiento'] ?: null),
                ($datos['lugar_nacimiento_extranjero'] ?: null),
                intval($datos['cantidad_hijos']),
                intval($datos['cantidad_familiares_a_cargo']),
                $id_alumno
            ]);

            $telefono = isset($datos['telefono_principal']) ? trim($datos['telefono_principal']) : null;
            if ($telefono !== null) {
                $stmt = $this->conexion->prepare("SELECT id_domicilio FROM domicilios_alumno WHERE id_alumno = ? LIMIT 1");
                $stmt->execute([$id_alumno]);
                $domicilio = $stmt->fetch();
                if ($domicilio) {
                    $upd = $this->conexion->prepare("UPDATE domicilios_alumno SET telefono_principal = ? WHERE id_domicilio = ?");
                    $upd->execute([($telefono === '' ? null : $telefono), $domicilio['id_domicilio']]);
                } elseif ($telefono !== '') {
                    $ins = $this->conexion->prepare("INSERT INTO domicilios_alumno (id_alumno, telefono_principal) VALUES (?, ?)");
                    $ins->execute([$id_alumno, $telefono]);
                }
            }

            $this->conexion->commit();
            return ['ok' => true, 'mensaje' => 'Datos actualizados correctamente.'];
        } catch (PDOException $e) {
            $this->conexion->rollBack();
            return ['ok' => false, 'mensaje' => 'Error al actualizar los datos: ' . $e->getMessage()];
        }
    }
}
?>