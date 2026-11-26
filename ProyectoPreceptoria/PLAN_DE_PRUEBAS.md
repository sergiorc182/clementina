# Plan de Pruebas Integral (Automatizadas + Aceptación con Datos Reales)

**Proyecto:** Sistema de Gestión Académica y Preceptoría — ISFT Nº 182 (`clementina`)  
**Stack:** Backend Express.js (MVC, puerto `3000`) · Frontend Vanilla JS + Vite (puerto `5173`) · MySQL XAMPP (`clementina`, 39 tablas)

---

## Parte 1 — Batería Automatizada (`npm test`)

Permite verificar en segundos los 4 módulos contra Express + MySQL `clementina` sin ensuciar la base de datos (todos los registros creados o modificados durante la corrida se restauran automáticamente).

### Cómo ejecutarla
1. Asegurarse de que **MySQL** esté iniciado en XAMPP (puerto `3306`).
2. Abrir una terminal en `backend/` y ejecutar:
   ```powershell
   npm test
   ```

### Cobertura automática incluida en [`backend/tests/integration.test.mjs`](file:///c:/MyProjects/ProyectoPreceptoria/backend/tests/integration.test.mjs)
1. **Salud e integridad estructural:** `/api/health`, `/api/v1/health`, presencia de las 39 tablas y las 4 columnas agregadas.
2. **Sistema Académico y de Preceptoría:** consultas de alumnos, listado de finales, validación reglamentaria, inscripción, reasignación, auditoría histórica (`REASIGNACION` / `BAJA_LOGICA`) y baja lógica sin borrado físico.
3. **Inscripción a Materias y Gestión Académica:** catálogos de carreras/materias/alumnos, reportes de inscripciones y CRUD de horarios en `materia_horarios`.
4. **Avance Académico y Certificados:** cálculo matemático de porcentaje (`aprobadas + pendientes === total`), nómina de personal y generación de constancia oficial.
5. **Usuarios, Semáforo, Promoción y Coherencia Cruzada:** login multi-rol JWT, semáforo estricto de 3 colores (`GREEN`, `ORANGE`, `RED`), corrección de `Promoción` (`tipo_alumno = 'P'`), reflejo inmediato en Certificados y trazabilidad en `audit_logs`.
6. **Seguridad RBAC y Aislamiento de Alumno:** bloqueo `401` sin token, aislamiento estricto por `id_alumno` en registros/KPIs/búsquedas y bloqueo `403` en rutas administrativas o de validación.

---

## Parte 2 — Protocolo de Pruebas Manuales desde la App con Datos Reales (UAT)

### Paso 0: Respaldo previo obligatorio (recomendado antes de probar)
Una vez cargados los datos reales del ISFT 182 en `clementina`, **antes** de realizar pruebas de altas, bajas o cambios de notas, exportar un backup limpio desde phpMyAdmin (`http://localhost/phpmyadmin` -> base `clementina` -> pestaña **Exportar** -> formato SQL -> `clementina_real_limpia.sql`). Así podrás restaurar la base impecable en segundos antes de la entrega final.

### Checklist de Pruebas desde el Navegador (`http://localhost:5173`)

| ID | Módulo | Escenario a Probar | Resultado Esperado | Estado |
| :-: | :--- | :--- | :--- | :-: |
| **UAT-01** | **Portal / Home** | Ingresar a `index.html` y abrir los 4 módulos uno por uno. | Acceso únicamente desde Home; barra superior idéntica en una sola fila en todos los módulos y sin textos `Módulo A/B/C/D/E`. | [ ] |
| **UAT-02** | **Preceptoría — Finales** | Inscribir un alumno real a un final (Regular y Libre). Probar una materia exceptuada de Libre (Práctica/Taller). | Bloquea modalidad Libre en materias exceptuadas; permite inscripción regular válida o por excepción documentada. | [ ] |
| **UAT-03** | **Preceptoría — Finales** | Reasignar llamado/modalidad, consultar **Historial**, dar **Baja lógica** y exportar a **Excel (`.xls`)**. | La baja cambia estado a `BAJA` sin borrar el registro; el historial muestra ambos eventos; el Excel descarga con resumen y nómina. | [ ] |
| **UAT-04** | **Preceptoría — Alumnos** | Buscar alumno por carrera/DNI, editar un dato de contacto y guardar. | Actualiza en MySQL y se refleja al recargar (`F5`). | [ ] |
| **UAT-05** | **Inscripción a Materias** | Probar inscripción online con alumno real eligiendo 2 materias con horario superpuesto o correlativa adeudada. | Bloquea o advierte el conflicto horario / correlatividad y controla el tope de 32 hs semanales. | [ ] |
| **UAT-06** | **Gestión Académica** | Editar una carrera, una materia y un horario desde *Gestión Académica*. | El modal siempre aparece centrado en pantalla (aunque haya scroll) y persiste los cambios en MySQL. | [ ] |
| **UAT-07** | **Avance y Certificados** | Seleccionar un alumno real, revisar *Materias Aprobadas* y *Materias Pendientes*, cambiar tipo de examen a **Promoción** y guardar. | Sin bloque de Declaración Jurada; el cambio se guarda en `historial_academico` y se refleja al instante en Validación de Notas. | [ ] |
| **UAT-08** | **Certificado Oficial (PDF)** | Ir a *Certificado Oficial*, elegir preceptor y presionar **Imprimir / Guardar en PDF**. | Sale únicamente el certificado limpio en A4, sin barras superiores, sin URL `localhost` abajo y con las 2 firmas en la misma fila. | [ ] |
| **UAT-09** | **Usuarios y Validación** | Con rol `Preceptor` o `Administrador`, usar botones rápidos (🟢 / 🟠 / 🔴) y modal **Validar / Corregir** cambiando un `Sin definir (X)` a `Promoción (P)`. | Aparece notificación toast abajo a la derecha, actualiza el KPI, cambia etiqueta a `Promoción` y registra el cambio en *Historial*. | [ ] |
| **UAT-10** | **Seguridad / Rol Alumno** | Cambiar el combobox `Rol de prueba` a **Estudiante** en *Usuarios y Validación de Notas*. | Desaparecen las pestañas de administración; solo muestra sus propias materias; el buscador no muestra ningún otro alumno. | [ ] |
| **UAT-11** | **Roles y Permisos** | Como `Administrador`, modificar un permiso de un rol en *Roles y Permisos* y guardar. | Muestra toast de confirmación, persiste en `role_permissions` y aplica al instante al cambiar de rol. | [ ] |
