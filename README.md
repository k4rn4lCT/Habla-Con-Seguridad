# Habla con seguridad

Entrenador web para practicar cómo explicar un tema con seguridad y honestidad, en español rioplatense.
Recibís un tema, investigás 5 minutos partiendo de un resumen, lo explicás en voz alta 1-2 minutos sin leer,
practicás repreguntas y te autoevaluás.

Es una web estática: no tiene backend, no necesita claves API y funciona en GitHub Pages.
Todo lo que guarda (notas, historial, preferencias) queda **solo en el navegador** (localStorage).

## Estructura

```
habla-con-seguridad/
├── index.html            ← página única con todas las vistas
├── css/
│   └── styles.css        ← estilos (claro/oscuro, responsive)
├── js/
│   ├── temas.js          ← biblioteca de 238 temas (editable)
│   ├── contenido.js      ← audiencias, repreguntas, frases de apoyo, criterios
│   └── app.js            ← lógica de la app
├── sw.js                 ← service worker (uso sin conexión)
├── manifest.webmanifest  ← permite "instalar" la app en el celular
├── icon.svg
├── .nojekyll             ← evita que GitHub Pages procese los archivos con Jekyll
└── README.md
```

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub (por ejemplo `habla-con-seguridad`).
2. Subí **el contenido** de esta carpeta a la raíz del repositorio (que `index.html` quede en la raíz, no dentro de otra carpeta).
   - Desde la web: *Add file → Upload files*, arrastrá todos los archivos y carpetas, y confirmá con *Commit changes*.
   - O con Git:
     ```bash
     git init
     git add .
     git commit -m "Habla con seguridad"
     git branch -M main
     git remote add origin https://github.com/TU_USUARIO/habla-con-seguridad.git
     git push -u origin main
     ```
3. En el repositorio: *Settings → Pages → Build and deployment*. En *Source* elegí **Deploy from a branch**,
   rama **main** y carpeta **/ (root)**. Guardá.
4. En uno o dos minutos la app queda en `https://TU_USUARIO.github.io/habla-con-seguridad/`.

**Al actualizar archivos:** cambiá el número de `VERSION` en `sw.js` (por ejemplo `hcs-v2` → `hcs-v3`).
Así los navegadores que ya la tenían guardada para uso sin conexión descargan la versión nueva.

**Probar en tu computadora:** abrir `index.html` con doble clic funciona, pero el modo sin conexión solo se activa
desde `https://` o `localhost`. Para probarlo localmente: `python3 -m http.server 8000` dentro de la carpeta
y abrir `http://localhost:8000`.

## Qué cambió respecto de la versión anterior

**Se conservó:** el diseño azul marino, los 99 temas originales con sus textos, el temporizador basado en la hora real,
las preguntas guía, la estructura de exposición de 4 pasos, el checklist de autoevaluación (ahora con niveles) y el
buscador con filtro por categoría. Las notas que ya tenías guardadas se **migran solas** al abrir cada tema.

**Errores corregidos:**
- El botón "Empezar los 5 minutos" llamaba a la misma función que "Pausar": si el temporizador ya corría, lo pausaba.
- El desplazamiento al temporizador buscaba un elemento inexistente (`timer-card`), así que no hacía nada.
- Si el navegador bloqueaba el almacenamiento (modo incógnito en algunos navegadores), la app fallaba con error de consola. Ahora avisa y sigue funcionando.
- Las notas solo se guardaban con el botón: si cambiabas de tema antes, se perdían. Ahora se guardan solas.
- Cambiar de tema reiniciaba el temporizador sin avisar. Ahora pide confirmación si está corriendo.
- La biblioteca cortaba en 45 resultados sin decirlo. Ahora muestra el total y un botón "Mostrar más".
- La búsqueda no encontraba palabras escritas sin tildes ("computacion"). Ahora ignora tildes y mayúsculas.
- Al terminar el tiempo con la pestaña en segundo plano, el aviso podía demorarse. Ahora hay un temporizador dedicado al final, sonido opcional, vibración opcional y el título de la pestaña parpadea.
- Textos ajustados: "Cuando estés lista" (asumía género) pasó a "Cuando quieras"; se corrigió una idea clave confusa en "Qué es la probabilidad"; la categoría "Seguridad laboral" (que en realidad trataba comunicación en el trabajo) pasó a "Vida laboral".

**Novedades:**
- Pantalla de inicio con la dinámica, tema del día, "Tema sorpresa" y "Elegir por categoría" (opción de no mostrarla más).
- 238 temas en 19 categorías (139 nuevos), con marcas visibles cuando el tema **depende de la jurisdicción**, **requiere fuentes actualizadas** o **no reemplaza consejo profesional**.
- El aleatorio no repite el tema actual y evita los practicados recientemente.
- Etapas de práctica: Investigar → Exponer → Repreguntas → Autoevaluar.
- Modo exposición que oculta resumen y notas, con cronómetro de 1-2 minutos y simulación de audiencia (superior, compañero con más experiencia, cliente).
- Modo repreguntas con preguntas al azar según la audiencia, pistas para responder sin inventar y la aclaración de que la app no verifica respuestas técnicas.
- Frases de apoyo para cuando no sabés algo.
- Autoevaluación de 6 criterios con 3 niveles ("Todavía no", "En camino", "Lo logré") y devolución en positivo.
- Historial local con fecha, audiencia, tiempo hablando y autoevaluación; gráfico de progreso; borrar historial; descargar e importar una copia.
- Ajustes: sonido, vibración, tema claro/oscuro, letra grande, borrar notas o todos los datos, con aviso claro sobre el almacenamiento local.
- Funciona sin conexión una vez cargada (service worker), incluido el tema del día.

## Editar o agregar temas

Abrí `js/temas.js` y agregá un objeto al arreglo:

```js
{id:"mi-tema-nuevo", c:"Tecnología", t:"Título del tema",
 s:"Resumen accesible de 2 a 4 oraciones.",
 k:["Idea clave 1", "Idea clave 2", "Idea clave 3"],
 a:["jur"]}   // opcional: "jur", "act" y/o "pro"
```

El `id` tiene que ser único y no conviene cambiarlo después: las notas se guardan con ese id.
Si agregás una categoría nueva, aparece sola en el filtro y en el diálogo de categorías.

## Lista de pruebas manuales

Inicio y temas
- [ ] Al abrir por primera vez aparece la pantalla de inicio con la cantidad de temas (238) y el tema del día.
- [ ] "Tema sorpresa" lleva a Practicar con un tema; tocándolo varias veces nunca repite el que está en pantalla.
- [ ] "Elegir por categoría" abre el diálogo; al elegir una categoría, el tema nuevo es de esa categoría. Escape cierra el diálogo.
- [ ] En Temas, buscar "computacion" (sin tilde) encuentra "¿Qué es la computación en la nube?".
- [ ] Filtrar por "Historia" muestra solo temas de Historia; "Mostrar más" carga más resultados sin filtro.
- [ ] Un tema con marca (por ejemplo "Qué es el IVA") muestra los avisos en ámbar.

Temporizador
- [ ] Iniciar, Pausar, Continuar y Reiniciar funcionan y el botón cambia de texto.
- [ ] Iniciar, cambiar a otra pestaña 1 minuto y volver: el tiempo restante es correcto.
- [ ] Dejar terminar los 5 minutos: aparece el aviso verde, suena (si está activado) y el botón dice "Empezar de nuevo".
- [ ] Con la pestaña en segundo plano al terminar, el título de la pestaña parpadea.
- [ ] Recargar la página con el temporizador corriendo: sigue desde donde iba.
- [ ] Cambiar de tema con el temporizador corriendo pide confirmación.

Notas
- [ ] Escribir notas, esperar el mensaje "Guardado", recargar: siguen ahí.
- [ ] Las notas de un tema no aparecen en otro.
- [ ] Si tenías notas de la versión anterior, al abrir ese tema aparecen.

Exposición, repreguntas y autoevaluación
- [ ] En "Exponer" no se ven ni el resumen ni las notas.
- [ ] Cambiar la audiencia cambia los consejos y el tipo de repreguntas.
- [ ] El cronómetro indica cuando estás entre 1 y 2 minutos y cuando te pasás.
- [ ] "Otra pregunta" muestra una repregunta distinta con su pista.
- [ ] Guardar la autoevaluación sin marcar nada pide marcar al menos un criterio.
- [ ] Al guardar aparece una devolución positiva y la práctica figura en Progreso con fecha y criterios.

Progreso y datos
- [ ] "Descargar copia" baja un archivo .json; "Importar copia" en otro navegador recupera el historial.
- [ ] "Quitar" elimina una práctica; "Borrar historial" pide confirmación y deja el historial vacío (las notas siguen).
- [ ] En Ajustes, "Borrar todos mis datos" deja la app como recién instalada.

Preferencias, accesibilidad y dispositivos
- [ ] Tema oscuro, letra grande y "no mostrar inicio" se mantienen al recargar.
- [ ] Se puede usar toda la app solo con teclado (Tab, Enter, Espacio, Escape) y el foco se ve.
- [ ] En un celular no hay scroll horizontal y los botones se tocan cómodamente.
- [ ] Publicada en GitHub Pages: cargarla una vez, activar modo avión y recargar: sigue funcionando.
- [ ] En modo incógnito (o con cookies bloqueadas) aparece el aviso de que no se guardan datos y la práctica funciona igual.
- [ ] La consola del navegador (F12) no muestra errores.

## Privacidad y límites

- No hay cuentas, servidores, analíticas ni dependencias externas: ningún dato sale del navegador.
- Borrar los datos de navegación, usar otro navegador o el modo incógnito hace que no veas tu progreso. Usá "Descargar copia" si querés conservarlo.
- Los resúmenes son puntos de partida escritos para ser accesibles. Los marcados como "depende de la jurisdicción" o
  "requiere fuentes actualizadas" deben verificarse con fuentes oficiales y vigentes antes de usarlos en serio.
- Las repreguntas son genéricas: la app no evalúa si una respuesta técnica es correcta.
