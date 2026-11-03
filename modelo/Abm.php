<?php
/**
 * Modelo: ABM genérico.
 *
 * Un único motor de Alta / Baja / Modificación manejado por configuración.
 * Cada entidad declara su tabla, su clave primaria (simple o compuesta) y sus
 * campos. El controlador nunca recibe nombres de tabla ni de columna desde el
 * cliente: todo sale de este registro, que además es la lista blanca contra la
 * que se validan los datos.
 */

require_once 'Conexion.php';

class Abm
{
    private $conexion;

    public function __construct()
    {
        $this->conexion = Conexion::getInstancia()->getConexion();
    }

    /* ============================================================== */
    /* Registro de entidades                                          */
    /* ============================================================== */

    /**
     * Campos disponibles:
     *   col       (string)  nombre real de la columna
     *   label     (string)  etiqueta para el formulario / tabla
     *   tipo      (string)  text | email | number | date | datetime | tel
     *                       | textarea | select | fk | password
     *   req       (bool)    obligatorio
     *   max       (int)     maxlength (texto)
     *   min/maxv  (num)     límites (number)
     *   step      (num)     paso (number)
     *   opciones  (array)   valor => texto (select)
     *   fk        (array)   ['tabla','pk','texto'] (fk)
     *   lista     (bool)    se muestra en la tabla del panel
     *   form      (bool)    se muestra en el formulario (por defecto true)
     *   auto      (string)  alta | mod | alta_mod  (lo completa el sistema)
     *   hash      (bool)    contraseña: se guarda con password_hash()
     *   pista     (string)  texto de ayuda bajo el campo
     *   ancho     (string)  full (ocupa las dos columnas del formulario)
     */
    private static $ENTIDADES = [

        /* ---------- Geografía y catálogos ---------- */

        'paises' => [
            'titulo' => 'Países', 'titulo_singular' => 'País', 'grupo' => 'Geografía',
            'tabla' => 'paises', 'pk' => ['id_pais'], 'autoincrement' => false, 'orden' => 'id_pais',
            'campos' => [
                ['col' => 'id_pais', 'label' => 'Código (ISO 2)', 'tipo' => 'text', 'req' => true, 'max' => 2, 'lista' => true],
                ['col' => 'iso3', 'label' => 'ISO 3', 'tipo' => 'text', 'max' => 3, 'lista' => true],
                ['col' => 'nombre', 'label' => 'Nombre', 'tipo' => 'text', 'max' => 45, 'req' => true, 'lista' => true],
                ['col' => 'nacionalidad', 'label' => 'Nacionalidad', 'tipo' => 'text', 'max' => 45, 'lista' => true],
                ['col' => 'orden', 'label' => 'Orden', 'tipo' => 'number', 'lista' => true],
            ],
        ],

        'provincias' => [
            'titulo' => 'Provincias', 'titulo_singular' => 'Provincia', 'grupo' => 'Geografía',
            'tabla' => 'provincias', 'pk' => ['id_provincia'], 'autoincrement' => false, 'orden' => 'nombre',
            'campos' => [
                ['col' => 'id_provincia', 'label' => 'N.º de provincia', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'nombre', 'label' => 'Nombre', 'tipo' => 'text', 'max' => 31, 'req' => true, 'lista' => true],
            ],
        ],

        'partidos' => [
            'titulo' => 'Partidos', 'titulo_singular' => 'Partido', 'grupo' => 'Geografía',
            'tabla' => 'partidos', 'pk' => ['id_partido'], 'autoincrement' => false, 'orden' => 'nombre',
            'campos' => [
                ['col' => 'id_partido', 'label' => 'N.º de partido', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'id_provincia', 'label' => 'Provincia', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'provincias', 'pk' => 'id_provincia', 'texto' => "CONCAT(id_provincia, ' · ', nombre)"]],
                ['col' => 'nombre', 'label' => 'Nombre', 'tipo' => 'text', 'max' => 60, 'req' => true, 'lista' => true],
            ],
        ],

        'localidades' => [
            'titulo' => 'Localidades', 'titulo_singular' => 'Localidad', 'grupo' => 'Geografía',
            'tabla' => 'localidades', 'pk' => ['id_localidad'], 'autoincrement' => false, 'orden' => 'nombre',
            'campos' => [
                ['col' => 'id_localidad', 'label' => 'N.º de localidad', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'id_provincia', 'label' => 'Provincia', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'provincias', 'pk' => 'id_provincia', 'texto' => "CONCAT(id_provincia, ' · ', nombre)"]],
                ['col' => 'id_partido', 'label' => 'Partido', 'tipo' => 'fk', 'lista' => true,
                    'fk' => ['tabla' => 'partidos', 'pk' => 'id_partido', 'texto' => "CONCAT(id_partido, ' · ', nombre)"]],
                ['col' => 'nombre', 'label' => 'Nombre', 'tipo' => 'text', 'max' => 83, 'req' => true, 'lista' => true],
            ],
        ],

        'tipos_documento' => [
            'titulo' => 'Tipos de documento', 'titulo_singular' => 'Tipo de documento', 'grupo' => 'Catálogos',
            'tabla' => 'tipos_documento', 'pk' => ['id_tipo_documento'], 'autoincrement' => false, 'orden' => 'id_tipo_documento',
            'campos' => [
                ['col' => 'id_tipo_documento', 'label' => 'Código', 'tipo' => 'text', 'req' => true, 'max' => 4, 'lista' => true],
                ['col' => 'descripcion', 'label' => 'Descripción', 'tipo' => 'text', 'max' => 30, 'req' => true, 'lista' => true],
            ],
        ],

        'tipos_personal' => [
            'titulo' => 'Tipos de personal', 'titulo_singular' => 'Tipo de personal', 'grupo' => 'Catálogos',
            'tabla' => 'tipos_personal', 'pk' => ['id_tipo_personal'], 'autoincrement' => false, 'orden' => 'id_tipo_personal',
            'campos' => [
                ['col' => 'id_tipo_personal', 'label' => 'Código', 'tipo' => 'text', 'req' => true, 'max' => 1, 'lista' => true],
                ['col' => 'descripcion', 'label' => 'Descripción', 'tipo' => 'text', 'max' => 30, 'req' => true, 'lista' => true],
            ],
        ],

        'turnos' => [
            'titulo' => 'Turnos', 'titulo_singular' => 'Turno', 'grupo' => 'Catálogos',
            'tabla' => 'turnos', 'pk' => ['id_turno'], 'autoincrement' => false, 'orden' => 'id_turno',
            'campos' => [
                ['col' => 'id_turno', 'label' => 'N.º de turno', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'turno', 'label' => 'Turno', 'tipo' => 'text', 'max' => 20, 'req' => true, 'lista' => true],
            ],
        ],

        'sedes' => [
            'titulo' => 'Sedes', 'titulo_singular' => 'Sede', 'grupo' => 'Catálogos',
            'tabla' => 'sedes', 'pk' => ['id_sede'], 'autoincrement' => false, 'orden' => 'nombre_sede',
            'campos' => [
                ['col' => 'id_sede', 'label' => 'N.º de sede', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'nombre_sede', 'label' => 'Nombre', 'tipo' => 'text', 'max' => 45, 'req' => true, 'lista' => true],
            ],
        ],

        /* ---------- Académico ---------- */

        'carreras' => [
            'titulo' => 'Carreras', 'titulo_singular' => 'Carrera', 'grupo' => 'Académico',
            'tabla' => 'carreras', 'pk' => ['id_carrera'], 'autoincrement' => false, 'orden' => 'nombre_carrera',
            'campos' => [
                ['col' => 'id_carrera', 'label' => 'N.º de carrera', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'nro_resolucion', 'label' => 'N.º de resolución', 'tipo' => 'text', 'max' => 45, 'req' => true, 'lista' => true],
                ['col' => 'nombre_carrera', 'label' => 'Nombre', 'tipo' => 'text', 'max' => 100, 'req' => true, 'lista' => true, 'ancho' => 'full'],
                ['col' => 'nombre_carrera_corto', 'label' => 'Nombre corto', 'tipo' => 'text', 'max' => 45, 'req' => true, 'lista' => true],
                ['col' => 'titulo', 'label' => 'Título', 'tipo' => 'text', 'max' => 100, 'req' => true, 'lista' => true],
                ['col' => 'color_r', 'label' => 'Color R', 'tipo' => 'number', 'min' => 0, 'maxv' => 255],
                ['col' => 'color_g', 'label' => 'Color G', 'tipo' => 'number', 'min' => 0, 'maxv' => 255],
                ['col' => 'color_b', 'label' => 'Color B', 'tipo' => 'number', 'min' => 0, 'maxv' => 255],
                ['col' => 'usuario_alta', 'label' => 'Usuario alta', 'tipo' => 'text', 'form' => false, 'auto' => 'alta'],
                ['col' => 'usuario_mod', 'label' => 'Usuario mod.', 'tipo' => 'text', 'form' => false, 'auto' => 'mod'],
                ['col' => 'fecha_alta', 'label' => 'Fecha alta', 'tipo' => 'datetime', 'form' => false, 'auto' => 'alta'],
                ['col' => 'fecha_mod', 'label' => 'Fecha mod.', 'tipo' => 'datetime', 'form' => false, 'auto' => 'mod'],
            ],
        ],

        'materias' => [
            'titulo' => 'Materias', 'titulo_singular' => 'Materia', 'grupo' => 'Académico',
            'tabla' => 'materias', 'pk' => ['id_materia'], 'autoincrement' => false, 'orden' => 'nombre_materia',
            'campos' => [
                ['col' => 'id_materia', 'label' => 'N.º de materia', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'nombre_materia', 'label' => 'Nombre', 'tipo' => 'text', 'max' => 100, 'req' => true, 'lista' => true],
            ],
        ],

        'carrera_materias' => [
            'titulo' => 'Plan de materias por carrera', 'titulo_singular' => 'Materia de carrera', 'grupo' => 'Académico',
            'tabla' => 'carrera_materias', 'pk' => ['id_carrera', 'id_materia'], 'autoincrement' => false, 'orden' => 'id_carrera, anio_cursada',
            'campos' => [
                ['col' => 'id_carrera', 'label' => 'Carrera', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'carreras', 'pk' => 'id_carrera', 'texto' => "CONCAT(id_carrera, ' · ', nombre_carrera)"]],
                ['col' => 'id_materia', 'label' => 'Materia', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'materias', 'pk' => 'id_materia', 'texto' => "CONCAT(id_materia, ' · ', nombre_materia)"]],
                ['col' => 'anio_cursada', 'label' => 'Año de cursada', 'tipo' => 'number', 'req' => true, 'lista' => true],
            ],
        ],

        'correlatividades' => [
            'titulo' => 'Correlatividades', 'titulo_singular' => 'Correlatividad', 'grupo' => 'Académico',
            'tabla' => 'correlatividades', 'pk' => ['id_carrera', 'id_materia', 'id_materia_correlativa'], 'autoincrement' => false,
            'orden' => 'id_carrera',
            'campos' => [
                ['col' => 'id_carrera', 'label' => 'Carrera', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'carreras', 'pk' => 'id_carrera', 'texto' => "CONCAT(id_carrera, ' · ', nombre_carrera)"]],
                ['col' => 'id_materia', 'label' => 'Materia', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'materias', 'pk' => 'id_materia', 'texto' => "CONCAT(id_materia, ' · ', nombre_materia)"]],
                ['col' => 'id_materia_correlativa', 'label' => 'Materia correlativa', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'materias', 'pk' => 'id_materia', 'texto' => "CONCAT(id_materia, ' · ', nombre_materia)"]],
            ],
        ],

        /* ---------- Personas ---------- */

        'alumnos' => [
            'titulo' => 'Alumnos', 'titulo_singular' => 'Alumno', 'grupo' => 'Personas',
            'tabla' => 'alumnos', 'pk' => ['id_alumno'], 'autoincrement' => true, 'orden' => 'primer_apellido, primer_nombre',
            'campos' => [
                ['col' => 'id_alumno', 'label' => 'N.º de alumno', 'tipo' => 'number', 'lista' => true],
                ['col' => 'id_tipo_documento', 'label' => 'Tipo de documento', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'tipos_documento', 'pk' => 'id_tipo_documento', 'texto' => "CONCAT(id_tipo_documento, ' · ', descripcion)"]],
                ['col' => 'numero_documento', 'label' => 'N.º de documento', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'legajo', 'label' => 'Legajo', 'tipo' => 'text', 'max' => 45, 'lista' => true],
                ['col' => 'primer_apellido', 'label' => 'Primer apellido', 'tipo' => 'text', 'max' => 40, 'req' => true, 'lista' => true],
                ['col' => 'otros_apellidos', 'label' => 'Otros apellidos', 'tipo' => 'text', 'max' => 40],
                ['col' => 'primer_nombre', 'label' => 'Primer nombre', 'tipo' => 'text', 'max' => 40, 'req' => true, 'lista' => true],
                ['col' => 'otros_nombres', 'label' => 'Otros nombres', 'tipo' => 'text', 'max' => 40],
                ['col' => 'email', 'label' => 'Email', 'tipo' => 'email', 'max' => 255, 'req' => true, 'lista' => true],
                ['col' => 'password_hash', 'label' => 'Contraseña', 'tipo' => 'password', 'hash' => true,
                    'pista' => 'Dejar vacío para no cambiarla.'],
                ['col' => 'fecha_nacimiento', 'label' => 'Fecha de nacimiento', 'tipo' => 'date', 'lista' => true],
                ['col' => 'sexo', 'label' => 'Sexo', 'tipo' => 'select', 'lista' => true,
                    'opciones' => ['M' => 'Masculino', 'F' => 'Femenino', 'X' => 'Otro / No binario']],
                ['col' => 'estado_civil', 'label' => 'Estado civil', 'tipo' => 'select',
                    'opciones' => ['S' => 'Soltero/a', 'C' => 'Casado/a', 'D' => 'Divorciado/a', 'V' => 'Viudo/a', 'U' => 'Unión de hecho']],
                ['col' => 'id_pais_nacimiento', 'label' => 'País de nacimiento', 'tipo' => 'fk', 'lista' => true,
                    'fk' => ['tabla' => 'paises', 'pk' => 'id_pais', 'texto' => "CONCAT(id_pais, ' · ', nombre)"]],
                ['col' => 'id_localidad_nacimiento', 'label' => 'Localidad de nacimiento', 'tipo' => 'fk', 'lista' => true,
                    'fk' => ['tabla' => 'localidades', 'pk' => 'id_localidad', 'texto' => "CONCAT(id_localidad, ' · ', nombre)"]],
                ['col' => 'lugar_nacimiento_extranjero', 'label' => 'Lugar de nacimiento en el extranjero', 'tipo' => 'text', 'max' => 100, 'ancho' => 'full'],
                ['col' => 'cantidad_hijos', 'label' => 'Cantidad de hijos', 'tipo' => 'number', 'min' => 0],
                ['col' => 'cantidad_familiares_a_cargo', 'label' => 'Familiares a cargo', 'tipo' => 'number', 'min' => 0],
                ['col' => 'alta_registro', 'label' => 'Alta de registro', 'tipo' => 'datetime', 'form' => false, 'auto' => 'alta'],
                ['col' => 'confirmacion_registro', 'label' => 'Confirmación', 'tipo' => 'datetime', 'form' => false],
                ['col' => 'fecha_ultima_actualizacion', 'label' => 'Última actualización', 'tipo' => 'datetime', 'form' => false, 'auto' => 'mod'],
            ],
        ],

        'domicilios_alumno' => [
            'titulo' => 'Domicilios de alumnos', 'titulo_singular' => 'Domicilio', 'grupo' => 'Personas',
            'tabla' => 'domicilios_alumno', 'pk' => ['id_domicilio'], 'autoincrement' => true, 'orden' => 'id_domicilio',
            'campos' => [
                ['col' => 'id_domicilio', 'label' => 'N.º de domicilio', 'tipo' => 'number', 'lista' => true],
                ['col' => 'id_alumno', 'label' => 'Alumno', 'tipo' => 'fk', 'req' => true, 'lista' => true, 'ancho' => 'full',
                    'fk' => ['tabla' => 'alumnos', 'pk' => 'id_alumno', 'texto' => "CONCAT(primer_apellido, ' ', primer_nombre, ' · ', numero_documento)"]],
                ['col' => 'calle', 'label' => 'Calle', 'tipo' => 'text', 'max' => 45, 'lista' => true],
                ['col' => 'numero', 'label' => 'Número', 'tipo' => 'number', 'lista' => true],
                ['col' => 'piso', 'label' => 'Piso', 'tipo' => 'text', 'max' => 3],
                ['col' => 'depto', 'label' => 'Depto.', 'tipo' => 'text', 'max' => 3],
                ['col' => 'id_localidad', 'label' => 'Localidad', 'tipo' => 'fk', 'lista' => true,
                    'fk' => ['tabla' => 'localidades', 'pk' => 'id_localidad', 'texto' => "CONCAT(id_localidad, ' · ', nombre)"]],
                ['col' => 'id_codigo_postal', 'label' => 'N.º de código postal', 'tipo' => 'number'],
                ['col' => 'telefono_principal', 'label' => 'Teléfono principal', 'tipo' => 'tel', 'max' => 45, 'lista' => true],
                ['col' => 'telefono_alternativo', 'label' => 'Teléfono alternativo', 'tipo' => 'tel', 'max' => 45],
                ['col' => 'telefono_alternativo_referencia', 'label' => 'Referencia del alternativo', 'tipo' => 'text', 'max' => 45],
            ],
        ],

        'personal' => [
            'titulo' => 'Personal', 'titulo_singular' => 'Integrante', 'grupo' => 'Personas',
            'tabla' => 'personal', 'pk' => ['id_personal'], 'autoincrement' => true, 'orden' => 'apellidos, nombres',
            'campos' => [
                ['col' => 'id_personal', 'label' => 'N.º de personal', 'tipo' => 'number', 'lista' => true],
                ['col' => 'apellidos', 'label' => 'Apellidos', 'tipo' => 'text', 'max' => 100, 'req' => true, 'lista' => true],
                ['col' => 'nombres', 'label' => 'Nombres', 'tipo' => 'text', 'max' => 100, 'req' => true, 'lista' => true],
                ['col' => 'usuario_sistema', 'label' => 'Usuario', 'tipo' => 'text', 'max' => 50, 'req' => true, 'lista' => true],
                ['col' => 'password_hash', 'label' => 'Contraseña', 'tipo' => 'password', 'hash' => true,
                    'pista' => 'Dejar vacío para no cambiarla.'],
                ['col' => 'id_tipo_personal', 'label' => 'Tipo de personal', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'tipos_personal', 'pk' => 'id_tipo_personal', 'texto' => "CONCAT(id_tipo_personal, ' · ', descripcion)"]],
            ],
        ],

        /* ---------- Académico transaccional ---------- */

        'historial_academico' => [
            'titulo' => 'Historial académico', 'titulo_singular' => 'Registro de historial', 'grupo' => 'Académico',
            'tabla' => 'historial_academico', 'pk' => ['id_alumno', 'id_carrera', 'id_materia'], 'autoincrement' => false,
            'orden' => 'id_alumno',
            'campos' => [
                ['col' => 'id_alumno', 'label' => 'Alumno', 'tipo' => 'fk', 'req' => true, 'lista' => true, 'ancho' => 'full',
                    'fk' => ['tabla' => 'alumnos', 'pk' => 'id_alumno', 'texto' => "CONCAT(primer_apellido, ' ', primer_nombre, ' · ', numero_documento)"]],
                ['col' => 'id_carrera', 'label' => 'Carrera', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'carreras', 'pk' => 'id_carrera', 'texto' => "CONCAT(id_carrera, ' · ', nombre_carrera)"]],
                ['col' => 'id_materia', 'label' => 'Materia', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'materias', 'pk' => 'id_materia', 'texto' => "CONCAT(id_materia, ' · ', nombre_materia)"]],
                ['col' => 'anio_regular', 'label' => 'Año regular', 'tipo' => 'number', 'lista' => true],
                ['col' => 'fecha_aprobacion', 'label' => 'Fecha de aprobación', 'tipo' => 'date', 'lista' => true],
                ['col' => 'tomo_acta', 'label' => 'Tomo de acta', 'tipo' => 'number'],
                ['col' => 'folio_acta', 'label' => 'Folio de acta', 'tipo' => 'number'],
                ['col' => 'nota', 'label' => 'Nota', 'tipo' => 'number', 'min' => 0, 'maxv' => 10, 'lista' => true],
                ['col' => 'tipo_alumno', 'label' => 'Tipo de alumno', 'tipo' => 'text', 'max' => 1],
                ['col' => 'validado_regular', 'label' => 'Validado regular', 'tipo' => 'text', 'max' => 1, 'pista' => 'F = No / T = Sí'],
                ['col' => 'validado_examen', 'label' => 'Validado examen', 'tipo' => 'text', 'max' => 1, 'pista' => 'F = No / T = Sí'],
                ['col' => 'resolucion', 'label' => 'Resolución', 'tipo' => 'text', 'max' => 45],
                ['col' => 'fecha_alta', 'label' => 'Fecha alta', 'tipo' => 'datetime', 'form' => false, 'auto' => 'alta'],
                ['col' => 'fecha_mod', 'label' => 'Fecha mod.', 'tipo' => 'datetime', 'form' => false, 'auto' => 'mod'],
            ],
        ],

        'matriculacion' => [
            'titulo' => 'Matriculación', 'titulo_singular' => 'Matriculación', 'grupo' => 'Académico',
            'tabla' => 'matriculacion', 'pk' => ['id_alumno', 'id_carrera'], 'autoincrement' => false, 'orden' => 'anio_inscripcion',
            'campos' => [
                ['col' => 'id_alumno', 'label' => 'Alumno', 'tipo' => 'fk', 'req' => true, 'lista' => true, 'ancho' => 'full',
                    'fk' => ['tabla' => 'alumnos', 'pk' => 'id_alumno', 'texto' => "CONCAT(primer_apellido, ' ', primer_nombre, ' · ', numero_documento)"]],
                ['col' => 'id_carrera', 'label' => 'Carrera', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'carreras', 'pk' => 'id_carrera', 'texto' => "CONCAT(id_carrera, ' · ', nombre_carrera)"]],
                ['col' => 'anio_inscripcion', 'label' => 'Año de inscripción', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'id_turno', 'label' => 'Turno', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'turnos', 'pk' => 'id_turno', 'texto' => "CONCAT(id_turno, ' · ', turno)"]],
                ['col' => 'id_sede', 'label' => 'Sede', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'sedes', 'pk' => 'id_sede', 'texto' => "CONCAT(id_sede, ' · ', nombre_sede)"]],
                ['col' => 'tomo_matriz', 'label' => 'Tomo matriz', 'tipo' => 'number'],
                ['col' => 'folio_matriz', 'label' => 'Folio matriz', 'tipo' => 'number'],
                ['col' => 'fecha_alta', 'label' => 'Fecha alta', 'tipo' => 'datetime', 'form' => false, 'auto' => 'alta'],
                ['col' => 'fecha_mod', 'label' => 'Fecha mod.', 'tipo' => 'datetime', 'form' => false, 'auto' => 'mod'],
            ],
        ],

        'parametros_mesas' => [
            'titulo' => 'Parámetros de mesas', 'titulo_singular' => 'Parámetro de mesa', 'grupo' => 'Académico',
            'tabla' => 'parametros_mesas', 'pk' => ['id_registro'], 'autoincrement' => false, 'orden' => 'anio_mesas DESC, id_turno',
            'campos' => [
                ['col' => 'id_registro', 'label' => 'N.º de registro', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'anio_mesas', 'label' => 'Año de mesas', 'tipo' => 'number', 'req' => true, 'lista' => true],
                ['col' => 'id_turno', 'label' => 'Turno', 'tipo' => 'fk', 'req' => true, 'lista' => true,
                    'fk' => ['tabla' => 'turnos', 'pk' => 'id_turno', 'texto' => "CONCAT(id_turno, ' · ', turno)"]],
                ['col' => 'fecha_inicio', 'label' => 'Fecha de inicio', 'tipo' => 'date', 'lista' => true],
                ['col' => 'fecha_fin', 'label' => 'Fecha de fin', 'tipo' => 'date', 'lista' => true],
                ['col' => 'tope_mesas', 'label' => 'Tope de mesas', 'tipo' => 'number', 'lista' => true],
            ],
        ],
    ];

    /* ============================================================== */
    /* Acceso a la configuración                                       */
    /* ============================================================== */

    public static function claves()
    {
        return array_keys(self::$ENTIDADES);
    }

    public static function existe($clave)
    {
        return isset(self::$ENTIDADES[$clave]);
    }

    private static function cfg($clave)
    {
        return self::$ENTIDADES[$clave] ?? null;
    }

    /* ============================================================== */
    /* Esquema público (para el cliente)                               */
    /* ============================================================== */

    public function esquema()
    {
        $cache = [];
        $salida = [];

        foreach (self::$ENTIDADES as $clave => $cfg) {
            $campos = [];
            foreach ($cfg['campos'] as $campo) {
                $pub = [
                    'col'     => $campo['col'],
                    'label'   => $campo['label'],
                    'tipo'    => $campo['tipo'],
                    'req'     => !empty($campo['req']),
                    'lista'   => !empty($campo['lista']),
                    'form'    => array_key_exists('form', $campo) ? (bool) $campo['form'] : true,
                    'pk'      => in_array($campo['col'], $cfg['pk'], true),
                    'sensible'=> !empty($campo['hash']),
                    'pista'   => $campo['pista'] ?? null,
                    'ancho'   => $campo['ancho'] ?? null,
                ];
                foreach (['max', 'min', 'step', 'maxv'] as $k) {
                    if (isset($campo[$k])) { $pub[$k] = $campo[$k]; }
                }
                if (isset($campo['opciones'])) {
                    $pub['opciones'] = [];
                    foreach ($campo['opciones'] as $v => $t) {
                        $pub['opciones'][] = ['valor' => (string) $v, 'texto' => $t];
                    }
                }
                if ($campo['tipo'] === 'fk') {
                    $pub['opciones'] = $this->_opcionesFk($campo['fk'], $cache);
                }
                $campos[] = $pub;
            }

            $salida[] = [
                'clave'         => $clave,
                'titulo'        => $cfg['titulo'],
                'titulo_singular' => $cfg['titulo_singular'],
                'grupo'         => $cfg['grupo'],
                'pk'            => $cfg['pk'],
                'autoincrement' => !empty($cfg['autoincrement']),
                'campos'        => $campos,
            ];
        }

        return $salida;
    }

    private function _opcionesFk($fk, &$cache)
    {
        $llave = $fk['tabla'] . '|' . $fk['pk'] . '|' . $fk['texto'];
        if (isset($cache[$llave])) { return $cache[$llave]; }

        $opciones = [];
        try {
            $sql = 'SELECT ' . $fk['pk'] . ' AS valor, ' . $fk['texto'] . ' AS texto FROM ' . $fk['tabla'] . ' ORDER BY texto ASC LIMIT 1000';
            $stmt = $this->conexion->query($sql);
            foreach ($stmt->fetchAll() as $fila) {
                $opciones[] = ['valor' => (string) $fila['valor'], 'texto' => (string) $fila['texto']];
            }
        } catch (PDOException $e) {
            $opciones = [];
        }

        $cache[$llave] = $opciones;
        return $opciones;
    }

    /* ============================================================== */
    /* Operaciones                                                    */
    /* ============================================================== */

    private function _columnasListado($cfg)
    {
        $cols = [];
        foreach ($cfg['campos'] as $campo) {
            $cols[] = $campo['col'];
        }
        return $cols;
    }

    public function listar($clave, $buscar = '')
    {
        $cfg = self::cfg($clave);
        if (!$cfg) { return null; }

        $sql = 'SELECT * FROM ' . $cfg['tabla'];
        $params = [];

        $buscar = trim((string) $buscar);
        if ($buscar !== '') {
            $cond = [];
            foreach ($cfg['campos'] as $campo) {
                if ($campo['tipo'] === 'number' || $campo['tipo'] === 'fk') { continue; }
                if (!empty($campo['hash'])) { continue; }
                $cond[] = $campo['col'] . ' LIKE ?';
                $params[] = '%' . $buscar . '%';
            }
            if ($cond) { $sql .= ' WHERE ' . implode(' OR ', $cond); }
        }

        $sql .= ' ORDER BY ' . $cfg['orden'] . ' LIMIT 500';

        try {
            $stmt = $this->conexion->prepare($sql);
            $stmt->execute($params);
            $filas = $stmt->fetchAll();
        } catch (PDOException $e) {
            return [];
        }

        foreach ($filas as &$fila) {
            $this->_quitarSensibles($cfg, $fila);
        }

        return $filas;
    }

    public function obtener($clave, $pk)
    {
        $cfg = self::cfg($clave);
        if (!$cfg) { return null; }

        $where = [];
        $params = [];
        foreach ($cfg['pk'] as $col) {
            if (!array_key_exists($col, $pk)) { return null; }
            $where[] = $col . ' = ?';
            $params[] = $pk[$col];
        }

        $sql = 'SELECT * FROM ' . $cfg['tabla'] . ' WHERE ' . implode(' AND ', $where) . ' LIMIT 1';
        try {
            $stmt = $this->conexion->prepare($sql);
            $stmt->execute($params);
            $fila = $stmt->fetch();
        } catch (PDOException $e) {
            return null;
        }

        if (!$fila) { return null; }
        $this->_quitarSensibles($cfg, $fila);
        return $fila;
    }

    public function guardar($clave, $datos, $usuarioSesion = null, $pkOriginal = null)
    {
        $cfg = self::cfg($clave);
        if (!$cfg) { return ['ok' => false, 'mensaje' => 'Entidad desconocida.']; }

        // Validación y normalización de cada campo declarado.
        $valores = [];
        foreach ($cfg['campos'] as $campo) {
            $col = $campo['col'];

            if (!empty($campo['hash'])) {
                $bruto = array_key_exists($col, $datos) ? trim((string) $datos[$col]) : '';
                if ($bruto !== '') {
                    $valores[$col] = password_hash($bruto, PASSWORD_DEFAULT);
                }
                continue;
            }

            if (!empty($campo['auto'])) {
                continue; // lo completa el sistema
            }

            if (array_key_exists('form', $campo) && $campo['form'] === false) {
                continue; // columna que no se edita desde el panel
            }

            $valor = array_key_exists($col, $datos) ? $datos[$col] : null;
            if (is_string($valor)) { $valor = trim($valor); }

            if (!empty($campo['req']) && ($valor === null || $valor === '')) {
                return ['ok' => false, 'mensaje' => 'El campo «' . $campo['label'] . '» es obligatorio.'];
            }

            $valores[$col] = $this->_normalizar($campo, $valor);
        }

        if (empty($valores)) {
            return ['ok' => false, 'mensaje' => 'No hay datos para guardar.'];
        }

        // Auto-campos (fechas / usuarios).
        foreach ($cfg['campos'] as $campo) {
            if (empty($campo['auto'])) { continue; }
            $col = $campo['col'];
            if ($col === 'fecha_alta') { $valores[$col] = date('Y-m-d H:i:s'); }
            elseif ($col === 'fecha_mod') { $valores[$col] = date('Y-m-d H:i:s'); }
            elseif ($col === 'usuario_alta' || $col === 'usuario_mod') { $valores[$col] = $usuarioSesion; }
            elseif ($campo['tipo'] === 'datetime') { $valores[$col] = date('Y-m-d H:i:s'); }
        }

        // ¿Insert o update? El cliente manda la PK original cuando edita.
        $autoinc = !empty($cfg['autoincrement']);
        $idCol = $autoinc ? $cfg['pk'][0] : null;

        $usarOriginal = is_array($pkOriginal);
        if ($usarOriginal) {
            foreach ($cfg['pk'] as $col) {
                if (!array_key_exists($col, $pkOriginal) || $pkOriginal[$col] === null || $pkOriginal[$col] === '') {
                    $usarOriginal = false;
                    break;
                }
            }
        }

        $esNuevo = true;
        $where = [];
        if ($autoinc) {
            if ($usarOriginal) {
                $esNuevo = false;
                $where[$idCol] = $pkOriginal[$idCol];
            } else {
                $esNuevo = true;
                unset($valores[$idCol]);
            }
        } else {
            $pkValores = [];
            foreach ($cfg['pk'] as $col) { $pkValores[$col] = $valores[$col] ?? null; }
            $where = $usarOriginal ? $pkOriginal : $pkValores;
            $esNuevo = !$this->_existe($cfg, $where);
        }

        try {
            if ($esNuevo) {
                $cols = array_keys($valores);
                $sql = 'INSERT INTO ' . $cfg['tabla'] . ' (' . implode(', ', $cols) . ') VALUES ('
                     . implode(', ', array_fill(0, count($cols), '?')) . ')';
                $stmt = $this->conexion->prepare($sql);
                $stmt->execute(array_values($valores));
                return ['ok' => true, 'mensaje' => $cfg['titulo_singular'] . ' creado correctamente.', 'accion' => 'crear'];
            }

            $sets = [];
            $params = [];
            foreach ($valores as $col => $valor) {
                if ($autoinc && $col === $idCol) { continue; }
                $sets[] = $col . ' = ?';
                $params[] = $valor;
            }
            if (empty($sets)) {
                return ['ok' => false, 'mensaje' => 'No hay cambios para guardar.'];
            }
            $conds = [];
            foreach ($cfg['pk'] as $col) {
                $conds[] = $col . ' = ?';
                $params[] = $where[$col];
            }
            $sql = 'UPDATE ' . $cfg['tabla'] . ' SET ' . implode(', ', $sets) . ' WHERE ' . implode(' AND ', $conds);
            $stmt = $this->conexion->prepare($sql);
            $stmt->execute($params);
            return ['ok' => true, 'mensaje' => $cfg['titulo_singular'] . ' actualizado correctamente.', 'accion' => 'editar'];
        } catch (PDOException $e) {
            return ['ok' => false, 'mensaje' => $this->_mensajeError($e)];
        }
    }

    public function eliminar($clave, $pk)
    {
        $cfg = self::cfg($clave);
        if (!$cfg) { return ['ok' => false, 'mensaje' => 'Entidad desconocida.']; }

        $where = [];
        $params = [];
        foreach ($cfg['pk'] as $col) {
            if (!array_key_exists($col, $pk)) {
                return ['ok' => false, 'mensaje' => 'Clave incompleta para eliminar.'];
            }
            $where[] = $col . ' = ?';
            $params[] = $pk[$col];
        }

        try {
            $stmt = $this->conexion->prepare('DELETE FROM ' . $cfg['tabla'] . ' WHERE ' . implode(' AND ', $where) . ' LIMIT 1');
            $stmt->execute($params);
            if ($stmt->rowCount() === 0) {
                return ['ok' => false, 'mensaje' => 'No se encontró el registro a eliminar.'];
            }
            return ['ok' => true, 'mensaje' => $cfg['titulo_singular'] . ' eliminado correctamente.'];
        } catch (PDOException $e) {
            return ['ok' => false, 'mensaje' => $this->_mensajeError($e)];
        }
    }

    /* ============================================================== */
    /* Auxiliares                                                     */
    /* ============================================================== */

    private function _existe($cfg, $pk)
    {
        $where = [];
        $params = [];
        foreach ($cfg['pk'] as $col) {
            if (!array_key_exists($col, $pk) || $pk[$col] === null || $pk[$col] === '') { return false; }
            $where[] = $col . ' = ?';
            $params[] = $pk[$col];
        }
        try {
            $stmt = $this->conexion->prepare('SELECT 1 FROM ' . $cfg['tabla'] . ' WHERE ' . implode(' AND ', $where) . ' LIMIT 1');
            $stmt->execute($params);
            return (bool) $stmt->fetchColumn();
        } catch (PDOException $e) {
            return false;
        }
    }

    private function _normalizar($campo, $valor)
    {
        if ($valor === null || $valor === '') {
            return null;
        }

        switch ($campo['tipo']) {
            case 'number':
                return (strpos((string) $valor, '.') !== false) ? (float) $valor : (int) $valor;
            case 'fk':
                return (string) $valor;
            case 'email':
                $email = filter_var($valor, FILTER_VALIDATE_EMAIL);
                return $email === false ? $valor : $email;
            default:
                if (isset($campo['max']) && mb_strlen((string) $valor) > $campo['max']) {
                    $valor = mb_substr((string) $valor, 0, $campo['max']);
                }
                return (string) $valor;
        }
    }

    private function _quitarSensibles($cfg, &$fila)
    {
        foreach ($cfg['campos'] as $campo) {
            if (!empty($campo['hash'])) {
                unset($fila[$campo['col']]);
            }
        }
    }

    private function _mensajeError(PDOException $e)
    {
        $codigo = $e->getCode();
        if ($codigo === '23000') {
            return 'El registro duplica un valor único (documento, email o usuario) o viola una relación existente.';
        }
        return 'No se pudo guardar el registro.';
    }
}
