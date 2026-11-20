# Procedimiento de Despliegue — Clementina ISFT 182

Fecha: 2026-11-18. Aplica a un servidor con Apache + PHP 8.2 + MariaDB 10.4.

## Precondiciones

- Haber completado los tres ítems de la sección “Provisión acordada con el usuario”.
- Backup reciente y verificable (ver `procedimiento_backup_rollback.md`).
- Base de datos de producción creada con el esquema del repositorio. **No** importar datos de prueba.
- Variables de entorno provistas por el administrador en Apache/FPM, nunca versionadas (método acordado).

## Provisión acordada con el usuario

- **Secretos:** variables de entorno en Apache/FPM. No enviar valores por chat. Variables requeridas: `APP_ENV`, `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `CLEMENTINA_HMAC_SECRET`; opcionales `LOGIN_RATE_MAX`, `LOGIN_RATE_WINDOW`.
- **Reglas académicas aplicadas:** `tope_mesas` es el máximo de inscripciones activas por alumno y período (`NULL` = sin límite, `0` = sin cupo); el derecho a evaluación exige matrícula cabecera y detalle de la materia para ese año académico; las combinaciones carrera/sede/turno con matrículas no se pueden borrar ni modificar. Correlatividades, segundo llamado y fecha/hora/aula siguen pendientes de resolución institucional.
- **PDF institucionales:** pendiente de carga por el usuario en `documentos/cronogramas_finales`.

Mientras esos tres ítems no estén disponibles, el dictamen permanece **NO APTO PARA PRODUCCIÓN**.

## 1. Preparar archivos

1. Copiar el árbol del proyecto al docroot. La raíz del paquete limpio es este directorio.
2. Confirmar que no se incluyen `docs/testing/`, `docs/datos_prueba_finales.sql`, backups, secretos ni archivos de estado generados en local. Esos artefactos ya fueron retirados del paquete.
3. Confirmar que `.gitignore` cubre `config/config.local.php`, `config/.hmac_secret`, `config/.token_revocations.json`, `config/.login_attempts.json` y `.env`. `config/config.php` sí debe versionarse.

## 2. Configurar entorno

En Apache, definir variables del pool (ejemplo conceptual, sin valores reales):

```apache
SetEnv APP_ENV "production"
SetEnv DB_HOST "localhost"
SetEnv DB_NAME "clementina"
SetEnv DB_USER "<usuario_produccion>"
SetEnv DB_PASS "<clave_produccion>"
SetEnv CLEMENTINA_HMAC_SECRET "<secreto_largo_y_aleatorio>"
SetEnv LOGIN_RATE_MAX "5"
SetEnv LOGIN_RATE_WINDOW "900"
```

 El método acordado para este despliegue es variables de entorno; no crear `config.local.php` ni pegar secretos en el repositorio. El código también admite ese archivo como fallback, pero no debe usarse aquí. Con `APP_ENV=production`, la aplicación se detiene con un error explícito si faltan credenciales o el secreto HMAC.

El paquete no contiene `config.local.php`, `.hmac_secret`, `.token_revocations.json` ni `.login_attempts.json`: se generarán en el servidor de producción.

## 3. Permisos

- `config/`, `docs/` y `documentos/`: sin acceso HTTP directo (`.htaccess` con `Require all denied`). El servidor embebido de PHP ignora `.htaccess`, por lo que esa verificación debe hacerse sobre Apache.
- `documentos/cronogramas_finales/.htaccess` debe denegar acceso directo; el PDF se sirve por `controlador/cronograma_finales.php`.
- El proceso de PHP necesita poder crear/actualizar `config/.token_revocations.json` y `config/.login_attempts.json` en producción. Si no puede, los tokens revocados seguirían válidos hasta su expiración natural (12 horas) y el rate limiting no persistiría.

## 4. Base de datos

- Si la base está vacía: importar `docs/esquema_normalizado.sql`.
- **Precaución:** ese archivo contiene `CREATE DATABASE IF NOT EXISTS clementina` y `USE clementina`. Si el nombre de la base de producción es distinto, importar una copia sin esas dos líneas.
- Importar `docs/datos_ubicaciones.sql` para los catálogos de “Mis datos”. El paquete ya no incluye `docs/datos_prueba_finales.sql`; cargar los catálogos académicos y las cuentas institucionales reales por separado.
- Si la base ya estaba en uso, aplicar `docs/migracion_qa014_qa015.sql` manualmente. Antes: hacer backup, revisar las cuentas con `confirmacion_registro IS NULL` y decidir cuáles requieren reenvío; no copiar estados desde `config/.registro_verificaciones.json`. La migración no activa cuentas automáticamente.
- Aplicar también `docs/migracion_qa017_qa018_qa021.sql` manualmente. Antes de ejecutarla, revisar el `INSERT IGNORE` de `matriculacion_detalle`: reconstruye el detalle faltante como asistencia presencial (`1`). Si preceptoría documentó situaciones especiales, ajustar esas filas antes de habilitar el panel docente. La restricción agregada sobre `matriculacion` es `RESTRICT`: no elimina ni desactiva matrículas.
- No ejecutar `DROP`, `TRUNCATE` ni `DELETE` masivos sobre datos reales.

## 5. Verificación posterior

```powershell
# Lint de PHP
Get-ChildItem -Recurse -Filter *.php | ForEach-Object { & "C:\xampp\php\php.exe" -l $_.FullName }
```

 Comprobar en el navegador:

 1. `index.html` → login con usuario institucional.
 2. `clementina-preceptores/` → dashboard con datos reales.
 3. `clementina-docentes/index.html` → dashboard del docente.
 4. Cerrar sesión en cada panel y confirmar que el botón Atrás no permite reingresar.
 5. Repetir como mínimo los flujos E2E ya verificados: XSS como texto, copiar materia en configuración, imprimir comprobante, portapapeles y filtros sin resultados.
 6. Verificar que las respuestas HTTP no incluyen mensajes de excepción ni rutas del servidor.

 La línea base auditada fue 9/9 PASS en Edge; el script y las evidencias se retiraron del paquete de producción. Cualquier desviación debe registrarse antes de aprobar.

## 6. Registro del despliegue

Documentar fecha, responsable, versión/copia desplegada, variables aplicadas (sin valores de secretos), resultados de verificación y número de backup utilizado.
