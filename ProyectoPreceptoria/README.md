# Sistema Integral de Gestión Académica y Preceptoría — ISFT Nº 182 (Clementina)

Plataforma web integral del **Instituto Superior de Formación Técnica Nº 182** que unifica los 4 módulos del sistema académico sobre una **única base de datos MySQL (`clementina`)**, con **autenticación centralizada por roles (JWT)** y **pruebas automatizadas end-to-end**.

Este documento está redactado para que tanto **desarrolladores / equipo de Base de Datos** como un **agente de IA** puedan instalar, configurar, ejecutar y verificar el proyecto paso a paso en una máquina nueva sin ambigüedades.

---

## 1. Arquitectura General

- **Base de datos única:** MySQL / MariaDB (XAMPP), esquema **`clementina`** (39 tablas: las 28 tablas originales sin modificar + 11 tablas y 4 columnas agregadas para los módulos nuevos).
- **Backend:** Node.js + Express.js (`backend/`, puerto `3000`).
- **Frontend:** HTML/CSS/JavaScript Vanilla servido con Vite (`frontend/`, puerto `5173`).
- **Autenticación compartida:** `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` con control de acceso por roles y permisos (RBAC).
- **Sin SQLite ni datos ficticios en memoria:** todos los módulos leen y escriben directamente sobre MySQL `clementina`.

### Módulos del Portal (acceso centralizado desde `http://localhost:5173/`)

| Módulo | Ruta Frontend | Endpoints Principales |
|---|---|---|
| **Login y Home del Portal** | `frontend/index.html` | `/api/v1/auth/*` |
| **Sistema Académico y de Preceptoría** (Exámenes Finales + Gestión de Alumnos) | `frontend/sistema.html` | `/api/alumnos/*`, `/api/finales/*` |
| **Inscripción a Materias y Gestión Académica** (Form A5a, Carreras, Materias, Horarios, Reportes) | `frontend/modulo-e/index.html` | `/api/catalogos/*`, `/api/inscripciones-materias`, `/api/reportes/*` |
| **Avance Académico y Certificados Oficiales** | `frontend/certificados/index.html` | `/api/marta/alumnos`, `/api/certificados/*`, `/api/personal/*` |
| **Usuarios y Validación de Notas** (Semáforo 🟢/🟠/🔴, Usuarios, Roles, Auditoría) | `frontend/usuarios-notas/index.html` | `/api/v1/academic/*`, `/api/v1/resultados/*`, `/api/v1/users/*`, `/api/v1/roles/*`, `/api/v1/audit/*` |

---

## 2. Mapa de Archivos de Base de Datos y Documentación

Antes de tocar o importar archivos SQL, respetar esta referencia exacta:

| Archivo | Propósito |
|---|---|
| `esquema_normalizado_original.sql` | Esquema original de referencia (28 tablas). **Ninguna de sus tablas ni columnas fue modificada o eliminada.** |
| `esquema_normalizado (2).sql` | **Esquema vigente completo** (39 tablas: 28 originales + 11 tablas nuevas + 4 columnas agregadas). Solo estructura (`CREATE TABLE`), sin datos. |
| `backend/seed_clementina.sql` | Datos de prueba iniciales compatibles con `esquema_normalizado (2).sql` (carreras, materias, correlatividades, alumnos, historial académico, horarios). |
| `backup_clementina_completo.sql` | **Respaldo completo en 1 solo archivo** (estructura + datos actuales + usuarios/roles/permisos listos para usar). |
| `NOTA_AGREGADOS_BD.md` | Informe técnico para el **Equipo de Estructura de Datos** detallando exactamente las 11 tablas nuevas y 4 columnas agregadas respecto del esquema original. |
| `DOCUMENTACION_INTEGRACION_BD.md` | Documentación detallada de integración entre los módulos y las tablas de `clementina`. |
| `PLAN_DE_PRUEBAS.md` | Guía paso a paso de pruebas manuales (UAT) por rol y por módulo. |
| `recursos/credenciales.txt` | Usuarios y contraseñas de prueba por rol. |

---

## 3. Requisitos Previos

1. **Node.js** v20 o superior (incluye `npm` y el runner nativo `node --test`).
2. **MySQL 8 / MariaDB 10.4+** (recomendado: **XAMPP** con el servicio MySQL activo en puerto `3306`).

Verificar en terminal:

```powershell
node -v
npm -v
```

---

## 4. Procedimiento de Instalación Paso a Paso (para Humanos y Agentes)

### Paso 1 — Iniciar MySQL y cargar la base de datos `clementina`

Asegurarse de que el servicio **MySQL** (por ejemplo desde el Panel de Control de XAMPP) esté corriendo en `localhost:3306`.

Elegir **una** de las dos opciones siguientes:

#### Opción A — Restauración rápida en 1 paso (Recomendada para replicar el entorno exacto)

Importar `backup_clementina_completo.sql` (incluye estructura de 39 tablas + datos actuales + usuarios):

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS clementina CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Get-Content -Raw -Encoding UTF8 ".\backup_clementina_completo.sql" | & "C:\xampp\mysql\bin\mysql.exe" -u root clementina
```

*(En Linux/macOS o Git Bash: `mysql -u root clementina < backup_clementina_completo.sql`.)*

#### Opción B — Instalación limpia desde esquema + seed

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS clementina CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Get-Content -Raw -Encoding UTF8 ".\esquema_normalizado (2).sql" | & "C:\xampp\mysql\bin\mysql.exe" -u root clementina
Get-Content -Raw -Encoding UTF8 ".\backend\seed_clementina.sql" | & "C:\xampp\mysql\bin\mysql.exe" -u root clementina
```

*(Alternativa visual: abrir `http://localhost/phpmyadmin`, crear la base `clementina` con cotejamiento `utf8mb4_unicode_ci` e importar los archivos en la pestaña **Importar**.)*

> **Nota sobre usuarios y roles:** Al iniciar el backend por primera vez, `backend/src/usuarios-notas/database/initDb.js` verifica las tablas `roles`, `permissions`, `role_permissions`, `users` y `audit_logs`, y si `users` está vacía crea automáticamente los 6 usuarios de prueba de `recursos/credenciales.txt`.

---

### Paso 2 — Configurar variables de entorno del Backend

Copiar `backend/.env.example` a `backend/.env`:

```powershell
Copy-Item ".\backend\.env.example" ".\backend\.env"
```

Contenido por defecto de `backend/.env` (ajustar `DB_USER`, `DB_PASSWORD` o `DB_PORT` si la instalación local de MySQL difiere de XAMPP por defecto):

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=clementina
DB_PORT=3306
```

---

### Paso 3 — Instalar dependencias de Backend y Frontend

Ejecutar desde la raíz del proyecto:

```powershell
npm --prefix backend install
npm --prefix frontend install
```

---

### Paso 4 — Ejecutar pruebas automatizadas de verificación (antes de abrir el navegador)

Ejecutar la suite E2E contra MySQL `clementina` (usa un puerto efímero y limpia automáticamente cualquier registro de prueba creado):

```powershell
npm --prefix backend test
```

Resultado esperado: **10/10 pruebas en verde (6 suites)** cubriendo:
1. Salud del sistema e integridad de las 39 tablas y 4 columnas agregadas en `clementina`.
2. Alumnos y ciclo completo de Exámenes Finales (validación, inscripción, reasignación, auditoría, baja lógica).
3. Inscripción a Materias, correlatividades, carga horaria, reportes y CRUD de horarios.
4. Avance Académico y cálculo matemático de Certificados Oficiales.
5. Usuarios, Semáforo Oficial (🟢 Verde / 🟠 Naranja / 🔴 Rojo), corrección Promoción y Auditoría.
6. Seguridad RBAC y aislamiento estricto del rol `ALUMNO`.

---

### Paso 5 — Levantar la aplicación

Abrir **dos terminales** desde la raíz del proyecto:

- **Terminal 1 — Backend (puerto 3000):**
  ```powershell
  cd backend
  npm run dev
  ```
  *(Para producción sin recarga automática: `npm start`.)*

- **Terminal 2 — Frontend (puerto 5173):**
  ```powershell
  cd frontend
  npm run dev
  ```

Abrir en el navegador: **`http://localhost:5173/`**

---

## 5. Credenciales de Acceso por Rol

Todas las cuentas iniciales están documentadas en `recursos/credenciales.txt`:

| Rol | Email | Contraseña | Alcance Principal |
|---|---|---|---|
| `ADMINISTRADOR` | `admin@institucion.edu` | `Admin123!` | Acceso total a los 4 módulos, usuarios, roles y auditoría |
| `PRECEPTOR` | `preceptor@institucion.edu` | `Preceptor123!` | Gestión académica, alumnos, finales, cursadas, certificados y validación |
| `ADMINISTRATIVO` | `secretaria@institucion.edu` | `Admin123!` | Gestión académica, certificados y validación de notas |
| `DOCENTE` | `docente.perez@institucion.edu` | `Docente123!` | Validación de notas y consultas asignadas |
| `ALUMNO` | `alumno@institucion.edu` | `Alumno123!` | Vista restringida exclusivamente a sus propios datos, finales, cursada, certificado y notas |
| `CONSULTA` | `consulta@institucion.edu` | `Consulta123!` | Consulta y auditoría en solo lectura |

> **Alta automática de alumnos:** Al registrar un estudiante nuevo desde *Sistema Académico y de Preceptoría → Gestión de Alumnos* con la casilla *"Crear cuenta de acceso al portal (rol Alumno)"* activada, se crea automáticamente su cuenta en `users` vinculada por `id_alumno` usando su **email** y su **DNI como contraseña inicial**.

---

## 6. Guía Rápida para el Equipo de Estructura de Datos (y su Agente)

Si el equipo va a revisar, normalizar o ajustar el esquema de `clementina`:

1. **Leer primero `NOTA_AGREGADOS_BD.md`** y **`DOCUMENTACION_INTEGRACION_BD.md`** para ver exactamente qué tablas/columnas consume cada módulo del backend.
2. **Archivos clave donde el backend ejecuta consultas SQL:**
   - `backend/src/models/alumnoModel.js` y `backend/src/models/finalModel.js` (Sistema Académico y Finales).
   - `backend/src/modulo-e/models/*.js` (Inscripción a Materias, Horarios, Reportes).
   - `backend/src/certificados/repositories/*.js` (Avance Académico y Certificados).
   - `backend/src/usuarios-notas/database/initDb.js` y `backend/src/usuarios-notas/services/*.js` (Autenticación, Roles, Semáforo sobre `historial_academico` y Auditoría).
3. **Flujo recomendado tras cualquier cambio en MySQL:**
   - Actualizar `esquema_normalizado (2).sql` (o el script de migración que definan).
   - Correr `npm --prefix backend test` para detectar inmediatamente cualquier query afectada.
   - Ejecutar una recorrida rápida por `PLAN_DE_PRUEBAS.md`.
