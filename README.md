# Clementina - ISFT 182

Sistema de gestión académica. PHP con PDO, MySQL y vistas en HTML + JS sin frameworks.

## Estructura

```
config/        datos de conexión
modelo/        clases que hablan con la base
controlador/   reciben el pedido, llaman al modelo y devuelven JSON
vista/         pantallas HTML
vista/estilo/  estilo.css y app.js (compartidos por todas las pantallas), comprobante.css y el escudo
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
- `vista/inscripcion_finales.html` y `vista/mis_finales.html` ya no son pantallas vacías.
- `vista/js/finales.js`: lo que comparten las dos pantallas.

Reglas que aplicamos:

- La inscripción solo funciona entre las fechas cargadas en `parametros_mesas`.
- Se listan las materias de las carreras donde el alumno está matriculado y que todavía no aprobó (nota menor a 4).
- No deja inscribirse si falta aprobar alguna correlativa, y muestra cuáles.
- Hay un solo llamado por turno (antes eran dos, ver más abajo).
- Respeta el tope de mesas del turno.
- Se puede cancelar mientras la inscripción esté abierta.

## Segunda tanda de cambios (8/10)

No se tocó la base ni los controladores. Del modelo cambió una sola línea (la constante de llamados). El resto es todo vista.

Mis finales

- Se unificó con el comprobante de inscripción, que ya no es un módulo aparte. Hay un botón "Comprobante" que abre el diálogo de impresión del navegador, y desde ahí se imprime o se guarda como PDF. En esta rama no estaba el generador de PDF del sistema viejo, así que se armó de cero. Los estilos de impresión están en `vista/estilo/comprobante.css` y solo se cargan en esta pantalla.
- Las inscripciones se muestran en una tabla con las columnas del sistema viejo: tipo de documento, documento, legajo, carrera, condición y materia. En celular cada fila pasa a ser una tarjeta con la materia arriba.
- El legajo sale de `alumnos.legajo` (ver la tercera tanda).
- Botón "Compartir": en el celular abre el menú de compartir con un resumen en texto de las mesas, en la compu lo copia al portapapeles. Los navegadores solo lo permiten con HTTPS o en localhost.
- Si el alumno llegó al tope de mesas o el turno está cerrado, "Inscribirme a un final" queda apagado y al pasar el mouse dice por qué.

Inscripción a finales

- Las materias se muestran en lista, separadas por año de cursada. Si el alumno está en más de una carrera, el título de cada grupo también dice la carrera.
- Filtros: "Todas", "Puedo rendir" y "Ya me anoté", con la cantidad de cada uno, más un desplegable por año y un buscador por nombre. El buscador aparece con más de 8 materias y el desplegable si hay más de un año.
- Antes de inscribir pide confirmación, y avisa si va como regular o libre y cuántas mesas le quedan.
- Con el tope alcanzado los botones "Inscribirme" quedan deshabilitados.
- Se sacó el segundo llamado. `LLAMADOS` en `modelo/InscripcionFinal.php` quedó con uno solo y la pantalla ya no muestra el selector. Si en algún momento vuelve a haber más de uno, alcanza con agregarlo a esa constante y el selector vuelve a aparecer.

En las dos pantallas

- El aviso del turno dice cuántos días faltan para el cierre. Cuando faltan 3 o menos pasa a amarillo. Si el turno todavía no abrió, dice cuándo abre.
- Si falla la carga aparece un botón "Reintentar", no hace falta recargar la página.

### Cambios que afectan a los otros grupos

Estos tocan archivos compartidos, así que conviene revisarlos antes de mergear.

- Modo noche. Hay un botón con una luna en la barra de arriba. La elección se guarda en el navegador (`localStorage`, clave `clementina-tema`) y por defecto arranca en claro. Los colores están en la sección 20 de `estilo.css`, que solo redefine las variables. Cada HTML tiene una línea en el `<head>` que aplica el tema antes de dibujar, para que la página no parpadee en claro al cargar. Una pantalla nueva tiene que llevar esa misma línea.
- Escudo del instituto en `vista/estilo/logo-isft182.svg`. Está en la barra de arriba (donde antes estaba la "C"), en el inicio y en el comprobante. Se redibujó en SVG a partir de la imagen que teníamos, que era chica y estaba borrosa. El login sigue con la "C" porque tiene su propio encabezado.
- Ajustes para celular en la sección 21 de `estilo.css`: botones más altos, campos de texto a 16px para que el iPhone no haga zoom, y en las tablas que pasan a tarjetas la celda con clase `col-main` va arriba como título.
- Sección 23 de `estilo.css`: la clase `toolbar` para una fila de filtros, y el estilo del botón de filtro elegido (`aria-pressed="true"`).
- `app.js`: el botón del tema, el escudo en la barra y los íconos `moon`, `sun`, `download` y `share-2`.
- Se subió el número de versión (`?v=`) de `estilo.css`, `app.js` y `finales.js` en todas las pantallas. Si alguien cambia esos archivos tiene que subirlo de nuevo, si no el navegador sigue usando la copia vieja.

### Criterio para los botones

Para que todas las pantallas queden iguales:

- Acción principal (una por pantalla o por fila): `btn btn--primary`.
- Acciones secundarias: `btn btn--outline`.
- Acción que borra o da de baja, en el cartel de confirmación: `btn btn--danger`.
- Dentro de una fila de una lista o tabla se agrega `btn--sm`.
- `btn--secondary` queda solo para botones sobre fondo oscuro, como el del cartel de bienvenida.

## Tercera tanda: base normalizada e historial académico (22/10)

Ahora todo el código usa la base de `docs/esquema_normalizado.sql`.

- El alumno se identifica por `alumnos.id_alumno`. En la sesión, `id` pasa a ser ese id, y se agregaron `tipo_documento` y `documento` para mostrarlos sin volver a consultar.
- Login: busca por `email` o `numero_documento` y compara contra `password_hash`.
- `modelo/Alumno.php`: `buscarPorDocumento()` pasó a `buscarPorId()`, que ahora también trae el legajo (con eso se completa la columna en Mis finales) y el teléfono desde `domicilios_alumno`. Se agregó `idPorDocumento()`.
- `modelo/InscripcionFinal.php`: las mismas reglas, con las tablas nuevas (`parametros_mesas`, `carrera_materias`, `historial_academico`). La inscripción ya no copia nombre y email del alumno, guarda solo `id_alumno`. Si hay más de un registro en `parametros_mesas`, se usa el vigente y, si no hay ninguno vigente, el más reciente.
- Historial académico: se trajo lo que subió lore a `main` (modelo, controlador y las dos vistas) y se adaptó a la base nueva. El controlador usa `_base.php` como el resto y, si falla la base, el detalle queda en el log y al alumno le aparece un mensaje común. El personal consulta un alumno pasando `?dni=`.
- `docs/clementina_local_prueba.sql` ahora tiene la estructura del esquema normalizado más datos de prueba. Usuario: `prueba@clementina.test` (o DNI 30111222), clave `prueba123`.

Para avisar al grupo:

- `esquema_normalizado.sql` no se importa entero: `tipos_documento.descripcion` es `VARCHAR(30)` y "Documento Nacional de Identidad" tiene 31 letras, así que el INSERT de ejemplo falla. Hay que agrandar la columna o acortar el texto. En la base de prueba lo acortamos.
- `turnos` la usan las mesas (1 Febrero, 2 Agosto, 3 Diciembre) y también `matriculacion` (que parece ser turno de cursada). Conviene separarlas en dos tablas.

## Pendiente

- Probar todo contra la base normalizada ya cargada con los datos reales. Se probó con la base de prueba (claro, noche y celular), pero todavía no con los datos migrados.
- `config/config.php` está subido con la clave de la base. Habría que cambiarla y sacar el archivo del repo. (importante)
- Confirmar con el profe si los libres se pueden anotar igual que los regulares. Hoy pueden, solo se muestra la condición. Ojo que "Libre" es cualquiera que no tenga año de regularidad cargado, incluso si nunca cursó la materia.
- Fecha, hora y aula de cada mesa. Hoy no hay de dónde sacarlas. Cuando estén en la base van en la lista de inscripciones y en el comprobante.
- La tabla `inscripciones` tiene la columna `verificada`, que se graba en `N` y no se lee en ningún lado. Falta definir quién la cambia para poder mostrar ese estado al alumno.
- El historial en celular: la tabla se corta a la derecha y hay que deslizar. Pasarla a tarjetas como en inscripción.
- Darle una pasada en modo noche a Historial académico, Inscripción a carreras e Inscripción a mesas. Usan los mismos componentes, pero no se revisaron una por una.
