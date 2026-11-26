# Nota Técnica de Agregados sobre la Base de Datos Original (`clementina`)

**Para:** Equipo de Estructura de Datos / Base de Datos  
**Referencia base:** [`esquema_normalizado_original.sql`](file:///c:/MyProjects/ProyectoPreceptoria/esquema_normalizado_original.sql) (28 tablas originales)  
**Esquema integrado actual:** [`esquema_normalizado (2).sql`](file:///c:/MyProjects/ProyectoPreceptoria/esquema_normalizado%20(2).sql) (39 tablas totales)  
**Motor / Charset:** MySQL / MariaDB — `InnoDB` — `utf8mb4`

---

## 1. Resumen Ejecutivo de Compatibilidad

Se verificó tabla por tabla y columna por columna la estructura actual contra `esquema_normalizado_original.sql`:

* **Tablas originales eliminadas o renombradas:** **0** (las **28 tablas** originales se conservan íntegras).
* **Columnas originales modificadas o eliminadas:** **0** (todos los tipos de datos, longitudes, PK, UK y FK originales se mantuvieron sin cambios).
* **Agregados realizados (100% compatibles hacia atrás):**
  * **4 columnas nuevas** agregadas en **2 tablas originales** (todas con `DEFAULT` seguro o `NULL`, sin romper consultas ni cargas existentes).
  * **11 tablas nuevas** vinculadas por claves foráneas (`FOREIGN KEY`) a las tablas originales.

---

## 2. Columnas Agregadas a Tablas Originales (4 columnas)

### 2.1 Tabla `carrera_materias` (+3 columnas)

| Columna agregada | Tipo y Restricción | Motivo Funcional |
| :--- | :--- | :--- |
| `carga_horaria_semanal` | `TINYINT NOT NULL DEFAULT 4` | Permite calcular y validar el tope institucional de carga horaria semanal (32 hs) durante la inscripción a cursada y la gestión académica. |
| `exceptuada_libre` | `TINYINT(1) NOT NULL DEFAULT 0` | Indica si el espacio curricular está exceptuado de rendirse en condición *Libre* según normativa (Prácticas Profesionalizantes, Talleres, Seminarios). |
| `tipo_espacio` | `VARCHAR(45) NOT NULL DEFAULT 'Asignatura'` | Clasifica el espacio curricular (`Asignatura`, `Práctica Profesionalizante`, `Taller`, `Seminario`, `Laboratorio`) para reglas de finales y listados. |

### 2.2 Tabla `historial_academico` (+1 columna)

| Columna agregada | Tipo y Restricción | Motivo Funcional |
| :--- | :--- | :--- |
| `observaciones` | `VARCHAR(255) DEFAULT NULL` | Permite a preceptoría dejar una nota breve al validar una calificación en el semáforo o corregir el tipo de examen (por ejemplo, referencia al Libro Matriz o Acta). |

---

## 3. Tablas Nuevas Agregadas (11 tablas)

Todas las tablas nuevas usan `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` y respetan la integridad referencial con las tablas originales.

### 3.1 Horarios de Cursada (Inscripción a Materias y Gestión Académica)

| # | Tabla | Columnas | FK hacia tablas originales | Propósito |
| :-: | :--- | :-: | :--- | :--- |
| 1 | **`materia_horarios`** | 10 | `carrera_materias (id_carrera, id_materia)`, `sedes (id_sede)`, `turnos (id_turno)` | Almacena días (`ENUM` Lunes–Sábado), `hora_inicio`, `hora_fin`, `aula` y `comision` por materia para detectar superposiciones horarias al inscribir alumnos y administrar horarios desde Gestión Académica. |

### 3.2 Control de Exámenes Finales y Trazabilidad (Sistema Académico y Preceptoría)

| # | Tabla | Columnas | FK hacia tablas originales | Propósito |
| :-: | :--- | :-: | :--- | :--- |
| 2 | **`rendiciones_finales`** | 17 | `alumnos (id_alumno)`, `carrera_materias (id_carrera, id_materia)` | Registra inscripciones e intentos de examen final (`anio_turno`, `turno_instancia`, `id_llamado`, `fecha_examen`, `nota`, `estado` [`INSCRIPTO`, `APROBADO`, `DESAPROBADO`, `AUSENTE`, `BAJA`], `modalidad` [`REGULAR`, `LIBRE`], `es_ausente`, `es_excepcion`, `motivo_excepcion`, `reasignada`, `fecha_baja`, `fecha_registro`). Soporta el control de 8 turnos de regularidad, tope de 3 aplazos (sin computar ausentes), modalidad libre, excepciones, reasignación y baja lógica. |
| 3 | **`auditoria_inscripciones_finales`** | 7 | `rendiciones_finales (id_rendicion)` | Bitácora histórica inmutable de cada `ALTA`, `REASIGNACION` y `BAJA_LOGICA` realizada sobre una inscripción a final, guardando `detalle_anterior`, `detalle_nuevo`, `fecha_cambio` y `modificado_por`. |

### 3.3 Seguridad, Autenticación Compartida (RBAC) y Auditoría General

| # | Tabla | Columnas | FK hacia tablas originales | Propósito |
| :-: | :--- | :-: | :--- | :--- |
| 4 | **`roles`** | 5 | — | Catálogo de roles del sistema (`ADMINISTRADOR`, `ADMINISTRATIVO`, `DOCENTE`, `PRECEPTOR`, `ALUMNO`, `CONSULTA`). |
| 5 | **`permissions`** | 5 | — | Catálogo de permisos granulares (`AUTH_LOGIN`, `USERS_VIEW`, `USERS_CREATE`, `USERS_EDIT`, `USERS_DEACTIVATE`, `ROLES_VIEW`, `ROLES_MANAGE`, `AUDIT_VIEW`, `GRADES_VIEW`, `GRADES_RECALCULATE`, `EXAMS_CREATE`, `EXAMS_EDIT`). |
| 6 | **`role_permissions`** | 2 | `roles (id)`, `permissions (id)` | Matriz relacional N:M que asigna permisos a cada rol. |
| 7 | **`users`** | 11 | `roles (id)`, `personal (id_personal)`, `alumnos (id_alumno)` | Cuentas autenticables con `email`, `password_hash` (bcrypt), `first_name`, `last_name`, `role_id`, estado `is_active` y vínculo opcional con `personal` o `alumnos` (clave para restringir en servidor que un alumno solo vea sus propias notas). |
| 8 | **`audit_logs`** | 11 | `users (id)` | Historial de modificaciones por usuario (`action_type`, `entity`, `entity_id`, `previous_values` JSON, `new_values` JSON, `ip_address`, `created_at`). Registra logins, cambios en usuarios/roles y cada validación de semáforo o corrección de tipo de examen. |

### 3.4 Soporte de Validación de Notas y Extensibilidad Académica

| # | Tabla | Columnas | FK hacia tablas originales | Estado de Uso / Propósito |
| :-: | :--- | :-: | :--- | :--- |
| 9 | **`student_subject_records`** | 13 | `alumnos (id_alumno)`, `carrera_materias (id_carrera, id_materia)` | **Activa (sincronización):** almacena el estado calculado del semáforo (`traffic_light_color`, `traffic_light_label`, `traffic_light_reason`) sincronizado cuando se valida una fila de `historial_academico`. |
| 10 | **`exam_results`** | 9 | `student_subject_records (id)`, `users (id)` | **Opcional / Extensible:** preparada para registrar notas de parciales y recuperatorios (`PARCIAL_1`, `PARCIAL_2`, `RECUPERATORIO_1`, `RECUPERATORIO_2`, `FINAL`) si se integra la carga de cursada RAM en esta misma base. |
| 11 | **`official_sheets`** | 19 | `users (id)`, `carrera_materias (id_carrera, id_materia)` | **Opcional / Extensible:** preparada para almacenar planillas digitales de actas volantes y mesas de examen en JSON (`rows_data`). Actualmente no la consume la vista principal de Validación de Notas. |

---

## 4. Script Incremental de Referencia (Solo Agregados sobre el Esquema Original)

Si el equipo de base de datos parte de `esquema_normalizado_original.sql`, los únicos cambios necesarios sobre las 28 tablas existentes son estos `ALTER TABLE` (sumados a los `CREATE TABLE` de las tablas nuevas de la Sección 3):

```sql
-- 1. Agregados en carrera_materias
ALTER TABLE carrera_materias
  ADD COLUMN carga_horaria_semanal TINYINT NOT NULL DEFAULT 4 COMMENT 'Carga horaria semanal (tope institucional 32 hs)',
  ADD COLUMN exceptuada_libre      TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 si está exceptuada de condición Libre por normativa',
  ADD COLUMN tipo_espacio          VARCHAR(45) NOT NULL DEFAULT 'Asignatura' COMMENT 'Asignatura, Práctica Profesionalizante, Taller, Seminario, Laboratorio';

-- 2. Agregado en historial_academico
ALTER TABLE historial_academico
  ADD COLUMN observaciones VARCHAR(255) DEFAULT NULL COMMENT 'Observaciones de preceptoría al validar nota o corregir tipo de examen';
```

> Los `CREATE TABLE` completos de las 11 tablas nuevas se encuentran listos para copiar o ejecutar en [`esquema_normalizado (2).sql`](file:///c:/MyProjects/ProyectoPreceptoria/esquema_normalizado%20(2).sql) (líneas 247–268, 393–418 y 475–645).
