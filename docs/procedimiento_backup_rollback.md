# Procedimiento de Backup y Rollback — Clementina ISFT 182

Fecha: 2026-11-18.

## Backup realizado antes de cualquier cambio

| Tipo | Ubicación | Contenido |
|---|---|---|
| Código | `C:\Users\yuthi\AppData\Local\Temp\opencode\clementina-backup-20261118-023438` | Copia completa del proyecto, 93 archivos |
| Esquema | `C:\Users\yuthi\AppData\Local\Temp\opencode\clementina-schema-backup.sql` | Volcado de esquema de `clementina` |
| Esquema para pruebas | `C:\Users\yuthi\AppData\Local\Temp\opencode\esquema_para_test.sql` | Copia de `docs/esquema_normalizado.sql` sin `CREATE DATABASE` / `USE` |

La base real `clementina` no fue modificada. Antes y después de la auditoría: 29 tablas, 1 alumno, 0 inscripciones.

## Verificación del backup

```powershell
Test-Path "C:\Users\yuthi\AppData\Local\Temp\opencode\clementina-backup-20261118-023438"
Get-ChildItem "C:\Users\yuthi\AppData\Local\Temp\opencode\clementina-backup-20261118-023438" -Recurse -File | Measure-Object
```

 Resultado esperado: `True` y 93 archivos.

## Restaurar código

1. Detener el servidor web que apunta al directorio a restaurar.
2. Mover el directorio actual a un nombre de respaldo, por ejemplo `clementina-main.rollback-YYYYMMDD`.
3. Copiar el contenido del backup al docroot.
4. Reaplicar únicamente las variables de entorno/secretos del entorno; no copiar secretos desde el backup de pruebas.
5. Reiniciar Apache y verificar login en los tres paneles.

## Restaurar esquema o datos

- El volcado disponible es de **esquema**, no de datos institucionales completos. Si la base real contiene datos legítimos, debe tomarse un volcado nuevo (`mysqldump --databases clementina`) antes de cualquier intervención.
- Para un entorno vacío:

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root < "C:\Users\yuthi\AppData\Local\Temp\opencode\clementina-schema-backup.sql"
```

- Si el destino tiene datos, **no** ejecutar el volcado sin antes confirmar que no sobrescribe información. No se ejecutaron `DROP` ni `TRUNCATE` durante esta auditoría.

## Rollback del despliegue

Si se decide revertir una versión desplegada:

1. Detener Apache/PHP-FPM antes de reemplazar archivos.
2. Restaurar el código desde el backup con fecha del despliegue. El backup histórico `clementina-backup-20261118-023438` corresponde al estado anterior a las correcciones P0; úsalo solo como último recurso.
3. No eliminar `clementina_test`: por decisión del usuario se conserva como base local de verificación y no forma parte del paquete de producción.
4. En el servidor de producción, eliminar solo los archivos generados en entornos anteriores que puedan haberse copiado: `config/.hmac_secret`, `config/.token_revocations.json`, `config/.login_attempts.json`, `config/config.local.php` y `.env`. El paquete limpio ya no los contiene.
5. No queda ningún servidor de pruebas iniciado: las instancias usadas durante la auditoría (`24580`, `6124` y `3264`) fueron detenidas.

**Advertencia:** restaurar el backup histórico devuelve los defectos P0 corregidos (IDOR de historial, token falsificable, logout docente roto y fuga de excepciones). No se recomienda salvo que exista una versión posterior corregida.

## Recomendación

Antes de cualquier despliegue real, generar un backup nuevo con fecha del despliegue y ensayar la restauración en un entorno aislado. Al no existir repositorio Git, el backup de código es la única línea de tiempo disponible.
