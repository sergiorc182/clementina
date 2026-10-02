# Análisis de normalización — `u714838186_desarrollo` (ISFT 182 "Clementina")

Relevé las 23 tablas del dump. Es un sistema académico: alumnos, aspirantes,
carreras, materias, inscripciones, matriculación, historial académico y
catálogos geográficos. El modelo funciona, pero tiene varios problemas de
diseño que conviene corregir antes de seguir creciendo el programa.

## 1. Problemas detectados

**A. Tablas de staging duplicadas**
`Enfermeria_corr` y `tabla_de_correlatividades_upload` tienen exactamente la
misma estructura que `correlatividades` (idcarrera, idmateria,
idmateriacorrelativa). Son restos de cargas manuales/Excel que nunca se
depuraron. Esto es directamente redundancia de tabla completa.

**B. Claves naturales compuestas repetidas en cascada**
`alumnos` usa como PK `(idtipodocumento, numerodocumento)`. Esa pareja de
columnas se repite tal cual en `historialacademico`, `matriculacion`,
`matriculaciondetalle`, e `inscripciones` (con nombres inconsistentes:
`idtipodedocumento`/`iddocumento` en vez de `idtipodocumento`/
`numerodocumento`). Sin un ID sustituto (surrogate key), cualquier corrección
de un DNI mal cargado obliga a actualizar N tablas a mano, y ya hay datos con
`numerodocumento` que no son DNI reales (contadores, prefijos con puntos,
etc.).

**C. Duplicación de datos del alumno en `inscripciones`**
`inscripciones` guarda `primernombre`, `segundonombre`, `otrosnombres`,
`primerapellido`, `segundoapellido`, `otrosapellidos` e `idemail` propios,
en vez de referenciar a `alumnos`. Esto es una violación clásica de 3FN
(dependencia transitiva de datos que ya existen en otra tabla) y genera
anomalías de actualización: si el alumno corrige su email, las inscripciones
viejas quedan con el dato desactualizado.

**D. Tablas sin clave primaria**
`sedes`, `provinciapostallocalidad` e `interurbanos` no tienen PK definida.
Esto permite filas duplicadas y hace imposible referenciarlas correctamente
desde una FK.

**E. Falta de integridad referencial**
Salvo `alumnos`, casi ninguna tabla transaccional tiene FOREIGN KEY:
`inscripciones`, `historialacademico`, `matriculacion`,
`matriculaciondetalle`, `correlatividades`, `rel_carrera_materias` y
`rel_carreras_sedes_turnos` no fuerzan que `idcarrera`/`idmateria`/`idsede`/
`idturno` existan realmente en sus tablas madre. Es fácil que el programa
inserte un `idmateria` inexistente y quede "flotando".

**F. Domicilio con datos redundantes y una entidad faltante**
`alumnos` guarda a la vez `idlocalidaddomicilio`, `idprovinciadomicilio`,
`codigopostaldomicilio` e `idpartidodomicilio`. El código postal y la
provincia son derivables desde la localidad (para eso existe
`provinciapostallocalidad`), así que guardarlos también en `alumnos` es
redundancia que puede desincronizarse. Además `idpartidodomicilio` se usa
pero no existe una tabla `partidos` en todo el dump.

**G. Catálogos codificados como texto libre en vez de tabla de dominio**
`idtipodocumento` (DNI, etc.) y `tipopersonal` (char(1)) no tienen tabla de
referencia. Son códigos "mágicos" sin descripción ni validación real más
allá de la longitud del campo.

**H. Contraseñas en texto plano**
`alumnos.password` es `varchar(15)` con la clave en claro (se ve en los
datos). No es un problema de normalización estricta, pero es un riesgo de
seguridad que aparece justo al tocar esta tabla y conviene resolver ahora.

**I. Charset mixto**
Hay tablas en `utf8mb3_spanish_ci`, `utf8mb3_general_ci` y `utf8mb3_unicode_ci`
mezcladas. Esto explica los acentos rotos que se ven en varios registros
(nombres, localidades). Conviene unificar todo a `utf8mb4`.

**J. Tablas de parámetros "ancho único"**
`parametros` mezcla en una sola fila configuración de mesas de examen,
inscripción y matriculación (conceptos sin relación funcional entre sí).
No rompe formalmente una forma normal, pero mezclar responsabilidades en una
tabla la vuelve frágil: cualquier cambio de un proceso obliga a tocar una
tabla que "le pertenece" a otros tres procesos.

## 2. Modelo propuesto

- **Catálogos**: `tipos_documento`, `tipos_personal`, `paises`, `provincias`,
  `partidos` (nueva), `localidades`, `codigos_postales` (reemplaza
  `provinciapostallocalidad`, ahora con PK), `turnos`, `sedes` (con PK).
- **Personas**: `alumnos` (con `id_alumno` autoincremental como PK real),
  `domicilios_alumno` (separado del alumno), `personal`, `aspirantes`
  (con FK opcional a `alumnos` cuando el aspirante se inscribe).
- **Académico**: `carreras`, `materias`, `carrera_materias` (antes
  `rel_carrera_materias`), `correlatividades` (consolidada, se eliminan
  las dos copias de staging), `carrera_sede_turno`.
- **Transaccional**: `inscripciones` (sin duplicar datos del alumno),
  `matriculacion`, `matriculacion_detalle`, `historial_academico`.
- **Parámetros**: separados por proceso — `parametros_generales`,
  `parametros_mesas`, `parametros_inscripcion`, `parametros_matriculacion`,
  `aspirantes_parametros`.

Todo queda en 3FN: cada tabla depende solo de su clave, no hay grupos
repetitivos y no hay dependencias transitivas de datos que vivan en otra
tabla.

El script completo está en `esquema_normalizado.sql`.

## 3. Recomendaciones para migrar sin romper el programa

1. Crear primero los catálogos nuevos (`tipos_documento`, `tipos_personal`,
   `partidos`, `codigos_postales`) y poblarlos a partir de los valores
   distintos que ya existen en las tablas actuales.
2. Migrar `alumnos` generando `id_alumno` nuevo y guardando una tabla puente
   temporal `(idtipodocumento, numerodocumento) -> id_alumno` para reescribir
   las FKs de las demás tablas durante la migración.
3. Reescribir `inscripciones` para que traiga los datos de nombre/email
   siempre por `JOIN` con `alumnos`, no por columnas propias.
4. Migrar y luego **eliminar** `Enfermeria_corr` y
   `tabla_de_correlatividades_upload` una vez verificado que su contenido ya
   está (o quedó) en `correlatividades`.
5. Unificar el charset a `utf8mb4` en la migración (`CONVERT TO CHARACTER
   SET utf8mb4`) para evitar perder acentos.
6. Aprovechar la migración para pasar `password` a un hash (bcrypt/argon2)
   en vez de texto plano; esto implica un cambio en el login del programa
   (comparar hash, no el valor crudo).
7. Hacer todo esto sobre una copia de la base primero: hay datos sucios
   (fechas `0000-00-00`, emails inválidos como `@gmail.com` solo, DNIs
   duplicados con distinto tipo de documento) que conviene limpiar antes de
   aplicar las nuevas restricciones `NOT NULL`/`UNIQUE`/`FOREIGN KEY`, porque
   si no, la migración va a fallar por violación de constraints.
