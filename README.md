# Clementina - ISFT 182

Sistema de gestión académica. PHP con PDO, MySQL y vistas en HTML + JS sin frameworks.

## Estructura

```
config/        datos de conexión
modelo/        clases que hablan con la base
controlador/   reciben el pedido, llaman al modelo y devuelven JSON
vista/         pantallas HTML
vista/estilo/  estilo.css y app.js, compartidos por todas las pantallas
vista/js/      JS propio de cada módulo
docs/          análisis de normalización y esquema propuesto
```

## Cambios de esta rama (grupo Inscripción a finales)

Orden del MVC

- `mis_datos.php` y `registro.php` tenían las consultas escritas en el controlador. Las pasamos a `modelo/Alumno.php`, las consultas son las mismas.
- La función `responder()` estaba repetida en todos los controladores. Ahora está una sola vez en `controlador/_base.php`, que también abre la sesión y tiene `requerirMetodo()`, `requerirSesion()` y `requerirAlumno()`. Un controlador nuevo arranca con `require_once __DIR__ . '/_base.php';`.
- El `.sql` y el análisis de normalización se movieron de la raíz a `docs/`.

 Inscripción a finales

- `modelo/InscripcionFinal.php`: período de mesas, materias que puede rendir el alumno, inscribir y cancelar.
- `controlador/inscripcion_finales.php`: por GET devuelve período, materias e inscripciones. Por POST recibe `accion=inscribir` o `accion=cancelar`.
- `vista/inscripcion_finales.html` y `vista/mis_finales.html` ya no son pantallas vacías. Usan las clases de `estilo.css` (tabla, badges, alertas, botones), no se agregó CSS.
- `vista/js/finales.js`: lo que comparten las dos pantallas.

Reglas que aplicamos:

- La inscripción solo funciona entre las fechas cargadas en `parametros`.
- Se listan las materias de las carreras donde el alumno está matriculado y que todavía no aprobó (nota menor a 4).
- No deja inscribirse si falta aprobar alguna correlativa, y muestra cuáles.
- Un llamado por materia por turno.
- Respeta el tope de mesas del turno.
- Se puede cancelar mientras la inscripción esté abierta.

## Pendiente

- Revisar los nombres de columnas de `parametros`, `historialacademico`, `matriculacion` e `inscripciones` contra la base real. Están todos en `modelo/InscripcionFinal.php`.
- El registro inserta con las columnas del esquema normalizado (`email`, `password_hash`) y el login lee las de la base actual (`idemail`, `password`). Hay que definir cuál queda.
- `config/config.php` está subido con la clave de la base. Habría que cambiarla y sacar el archivo del repo.
- Confirmar con el profe si los libres se pueden anotar igual que los regulares. Hoy pueden, solo se muestra la condición.


