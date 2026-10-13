/* Textos de práctica: audiencias, repreguntas, frases de apoyo y autoevaluación.
 * Se pueden editar libremente; no dependen de ningún servidor. */
window.CONTENIDO = {
  // Estructura sugerida para el modo exposición
  estructura: [
    { titulo: "Definición", ayuda: "Arrancá con una frase: «Este tema trata de…»." },
    { titulo: "Ideas principales", ayuda: "Dos o tres ideas, en orden: «Hay tres cosas importantes…»." },
    { titulo: "Ejemplo", ayuda: "Bajalo a tierra: «Un ejemplo cotidiano sería…»." },
    { titulo: "Duda pendiente", ayuda: "Cerrá con honestidad: «Lo que me queda por verificar es…»." }
  ],

  // Preguntas guía durante la investigación
  guia: [
    { titulo: "¿Qué es?", texto: "Definilo con palabras simples, como si hablaras con alguien que nunca escuchó el término." },
    { titulo: "¿Cómo funciona?", texto: "Explicá el proceso, sus partes o sus pasos principales." },
    { titulo: "¿Para qué sirve?", texto: "Buscá un uso práctico, un ejemplo o una situación en la que sea útil." },
    { titulo: "¿Qué no tenés claro?", texto: "Identificá una duda y cómo la verificarías. No inventes una respuesta." }
  ],

  audiencias: {
    libre: {
      nombre: "Práctica libre",
      descripcion: "Explicás el tema a alguien interesado, sin un rol particular.",
      consejos: [
        "Empezá por la idea central y después agregá detalles.",
        "Hablá como si se lo contaras a un amigo curioso.",
        "Si te trabás, hacé una pausa: no pasa nada."
      ],
      preguntas: []
    },
    superior: {
      nombre: "A un superior",
      descripcion: "Tu jefa o jefe tiene poco tiempo y quiere saber qué importa y qué hacer.",
      consejos: [
        "Arrancá por la conclusión o el impacto, después el detalle.",
        "Máximo tres ideas. Si quiere más, te va a preguntar.",
        "Si te pide una decisión y no tenés todo, decí qué te falta y para cuándo lo tenés."
      ],
      preguntas: [
        "¿Qué impacto tiene esto para nosotros?",
        "En una frase, ¿qué me recomendás?",
        "¿Qué necesitás de mí para avanzar?",
        "¿Para cuándo podemos tener esto claro?",
        "¿Cuál es el mayor riesgo que ves?",
        "¿Esto es urgente o puede esperar?"
      ]
    },
    senior: {
      nombre: "A un compañero con más experiencia",
      descripcion: "Alguien que sabe más que vos del tema y va a notar si algo no cierra.",
      consejos: [
        "Usá términos precisos y decí cuándo estás simplificando.",
        "No intentes impresionar: mostrá cómo razonaste.",
        "Aprovechá su experiencia: preguntar también es parte de la charla."
      ],
      preguntas: [
        "¿Por qué lo explicás así y no de otra manera?",
        "¿Qué pasa en el caso límite o la excepción?",
        "¿De dónde sale esa afirmación?",
        "¿Cómo lo comprobarías en la práctica?",
        "¿Qué parte de lo que dijiste es una simplificación?",
        "¿Conocés alguna crítica a ese enfoque?"
      ]
    },
    cliente: {
      nombre: "A un cliente",
      descripcion: "Una persona que no es del rubro y quiere entender qué gana y qué riesgos tiene.",
      consejos: [
        "Evitá la jerga o explicala en el momento.",
        "Hablá del beneficio o del problema que le resuelve.",
        "No prometas plazos ni resultados que no podés confirmar."
      ],
      preguntas: [
        "¿Me lo podés explicar más simple?",
        "¿En qué me beneficia esto a mí?",
        "¿Qué pasa si sale mal?",
        "¿Cuánto tiempo lleva?",
        "¿Qué garantías tengo?",
        "¿Hay alguna alternativa más barata o más simple?"
      ]
    }
  },

  // Repreguntas generales. "tipo" orienta la pista de respuesta.
  repreguntas: [
    { tipo: "aclaracion", texto: "¿Podés resumirlo en una sola frase?" },
    { tipo: "aclaracion", texto: "¿Cuál es la diferencia entre esto y algo parecido?" },
    { tipo: "aclaracion", texto: "¿Qué querés decir exactamente con eso?" },
    { tipo: "ejemplo", texto: "¿Me das un ejemplo concreto?" },
    { tipo: "ejemplo", texto: "¿Dónde se ve esto en la vida diaria o en el trabajo?" },
    { tipo: "datos", texto: "¿Tenés algún número o dato que lo respalde?" },
    { tipo: "datos", texto: "¿Eso sigue siendo así hoy?" },
    { tipo: "datos", texto: "¿Cómo es esto en Uruguay?" },
    { tipo: "fuente", texto: "¿De dónde sacaste esa información?" },
    { tipo: "fuente", texto: "¿Es una fuente confiable? ¿Cómo lo sabés?" },
    { tipo: "limites", texto: "¿En qué casos no aplica esto?" },
    { tipo: "limites", texto: "¿Cuál es la principal limitación o crítica?" },
    { tipo: "decision", texto: "Entonces, ¿qué harías vos en mi lugar?" },
    { tipo: "decision", texto: "¿Qué sería lo primero que habría que hacer?" },
    { tipo: "opinion", texto: "¿Vos qué opinás de esto?" },
    { tipo: "sorpresa", texto: "¿Y cómo se relaciona esto con la inteligencia artificial?" },
    { tipo: "sorpresa", texto: "¿Qué es lo que más te sorprendió de este tema?" }
  ],

  // Pista de cómo encarar cada tipo de repregunta, sin inventar.
  pistas: {
    aclaracion: "Volvé a la idea central. Si la pregunta usa un término que no conocés, pedí que te lo aclaren.",
    ejemplo: "Usá el ejemplo que preparaste. Si no tenés uno seguro, decí que es un ejemplo hipotético.",
    datos: "Si no tenés el número confirmado, no lo inventes: decí qué sabés en términos generales y dónde lo verificarías.",
    fuente: "Nombrá de dónde salió (el resumen de la app, un sitio, un libro) y aclarale su nivel de confianza.",
    limites: "Está bien no saber todas las excepciones. Contá la que conozcas y ofrecé investigar el resto.",
    decision: "Distinguí lo que recomendarías con lo que sabés de lo que necesitarías confirmar antes.",
    opinion: "Separá tu opinión de los hechos: «Lo que se sabe es…; mi opinión es…».",
    sorpresa: "Pregunta abierta: tomate un segundo, conectá con lo que sabés y no fuerces una relación que no ves."
  },

  // Frases de apoyo para no fingir conocimiento
  frases: [
    { grupo: "Cuando no sabés algo", items: [
      "No tengo ese dato confirmado; lo voy a revisar y te aviso.",
      "Lo que entiendo hasta ahora es…",
      "No quiero darte un número inventado; lo busco en una fuente confiable.",
      "Eso no lo sé todavía. Lo que sí sé es…"
    ]},
    { grupo: "Para ganar un segundo", items: [
      "Buena pregunta; dejame pensarlo un momento.",
      "Dejame ordenar la idea antes de responder.",
      "A ver si entendí bien la pregunta: ¿te referís a…?"
    ]},
    { grupo: "Para pedir aclaración", items: [
      "¿Podés aclararme este punto?",
      "¿Te referís a … o a …?",
      "Cuando decís …, ¿qué querés decir exactamente?"
    ]},
    { grupo: "Para delimitar lo que sabés", items: [
      "Hasta donde sé…, pero lo quiero verificar.",
      "Esto depende de la normativa de cada país; habría que chequear la vigente acá.",
      "Lo que sí puedo decirte con seguridad es…"
    ]},
    { grupo: "Para cerrar", items: [
      "Para resumir: …",
      "Me queda pendiente averiguar …; te lo confirmo para …",
      "Si te sirve, te paso después la fuente que encontré."
    ]}
  ],

  criterios: [
    { id: "claridad", nombre: "Claridad", texto: "Se entendió la idea principal." },
    { id: "orden", nombre: "Orden", texto: "Seguí una estructura: definición, ideas, ejemplo, duda." },
    { id: "ejemplo", nombre: "Ejemplo", texto: "Di al menos un ejemplo concreto." },
    { id: "ritmo", nombre: "Ritmo y pausas", texto: "Hablé a un ritmo cómodo y me animé a hacer pausas." },
    { id: "honestidad", nombre: "Honestidad ante lo desconocido", texto: "Si no sabía algo, lo dije y propuse cómo verificarlo." },
    { id: "cierre", nombre: "Cierre", texto: "Terminé con una idea final, sin cortar de golpe ni disculparme de más." }
  ],
  niveles: ["Todavía no", "En camino", "Lo logré"],

  marcas: {
    jur: { nombre: "Depende de la jurisdicción", texto: "Las reglas cambian según el país. Si lo explicás, aclaralo y verificá la normativa uruguaya vigente." },
    act: { nombre: "Requiere fuentes actualizadas", texto: "Datos, cifras o tecnologías pueden haber cambiado. No des números como seguros sin chequearlos." },
    pro: { nombre: "Información general", texto: "No reemplaza el consejo de un profesional para un caso concreto." }
  }
};
