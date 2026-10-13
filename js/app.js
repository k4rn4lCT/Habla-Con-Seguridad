/* Habla con seguridad — lógica de la app (sin dependencias externas) */
(function () {
  "use strict";

  var TEMAS = window.TEMAS || [];
  var C = window.CONTENIDO;
  var TOTAL_MS = 5 * 60 * 1000;          // tiempo de investigación
  var BASE_TITLE = document.title;
  var STEPS = ["investigar", "exponer", "repreguntas", "evaluar"];
  var VIEWS = ["inicio", "practicar", "temas", "progreso", "ajustes"];
  var PAGE = 40;                          // temas por página en la biblioteca

  var $ = function (id) { return document.getElementById(id); };
  var qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var norm = function (s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  };
  var randItem = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  /* ---------- Almacenamiento local seguro ---------- */
  var store = (function () {
    var ok = true, mem = {};
    try {
      localStorage.setItem("hcs.__test", "1");
      localStorage.removeItem("hcs.__test");
    } catch (e) { ok = false; }
    function rawGet(k) {
      if (!ok) return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
      try { return localStorage.getItem(k); } catch (e) { return null; }
    }
    function rawSet(k, v) {
      if (!ok) { mem[k] = v; return true; }
      try { localStorage.setItem(k, v); return true; }
      catch (e) { toast("No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado."); return false; }
    }
    function remove(k) {
      if (!ok) { delete mem[k]; return; }
      try { localStorage.removeItem(k); } catch (e) { /* nada que hacer */ }
    }
    function keys() {
      if (!ok) return Object.keys(mem);
      var out = [];
      try { for (var i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) { /* idem */ }
      return out;
    }
    return {
      ok: ok, rawGet: rawGet, rawSet: rawSet, remove: remove, keys: keys,
      get: function (k, def) {
        var v = rawGet(k);
        if (v == null) return def;
        try { return JSON.parse(v); } catch (e) { return def; }
      },
      set: function (k, v) { return rawSet(k, JSON.stringify(v)); }
    };
  })();

  var DEFAULT_PREFS = { sound: true, vibrate: true, showWelcome: true, theme: "auto", textSize: "normal" };
  var prefs = Object.assign({}, DEFAULT_PREFS, store.get("hcs.prefs", {}));
  var practicas = store.get("hcs.history", []);
  if (!Array.isArray(practicas)) practicas = [];

  var saved = store.get("hcs.state", {});
  var state = {
    topicId: saved.topicId || null,
    step: STEPS.indexOf(saved.step) >= 0 ? saved.step : "investigar",
    visited: Array.isArray(saved.visited) ? saved.visited : [],
    audience: C.audiencias[saved.audience] ? saved.audience : "libre",
    timer: {
      remaining: typeof (saved.timer && saved.timer.remaining) === "number" ? saved.timer.remaining : TOTAL_MS,
      endAt: (saved.timer && saved.timer.endAt) || null,
      finished: !!(saved.timer && saved.timer.finished)
    },
    followups: 0,
    lastQuestion: null
  };
  var current = null;

  function saveState() {
    store.set("hcs.state", {
      topicId: state.topicId, step: state.step, visited: state.visited,
      audience: state.audience, timer: state.timer
    });
  }
  function savePrefs() { store.set("hcs.prefs", prefs); }
  function saveHistory() { store.set("hcs.history", practicas); }

  /* ---------- Utilidades de interfaz ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }
  function fmtClock(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function fmtSec(sec) {
    sec = Math.round(sec);
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString("es-UY", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return iso; }
  }
  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ---------- Datos de temas ---------- */
  var byId = {};
  TEMAS.forEach(function (t) { byId[t.id] = t; });
  var categories = [];
  var catCount = {};
  TEMAS.forEach(function (t) {
    if (!catCount[t.c]) { catCount[t.c] = 0; categories.push(t.c); }
    catCount[t.c]++;
  });
  categories.sort(function (a, b) { return a.localeCompare(b, "es"); });
  var searchIndex = TEMAS.map(function (t) { return norm([t.t, t.c, t.s, t.k.join(" ")].join(" ")); });

  function dailyTopic() {
    // Hash simple (FNV-1a) de la fecha local: mismo tema para todo el día
    var key = todayKey(), h = 2166136261;
    for (var i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    return TEMAS[(h >>> 0) % TEMAS.length];
  }

  function recentIds(n) {
    return practicas.slice(0, n).map(function (h) { return h.topicId; });
  }

  // Elige al azar sin repetir el tema actual (si hay alternativas) y evitando los practicados recientemente
  function pickRandom(pool) {
    pool = pool || TEMAS;
    if (!pool.length) return null;
    var cur = current ? current.id : null;
    var recent = recentIds(15);
    var fresh = pool.filter(function (t) { return t.id !== cur && recent.indexOf(t.id) < 0; });
    if (fresh.length) return randItem(fresh);
    var notCurrent = pool.filter(function (t) { return t.id !== cur; });
    if (notCurrent.length) return randItem(notCurrent);
    return pool[0];
  }

  /* ---------- Notas ---------- */
  function notesKey(t) { return "hcs.notes." + t.id; }
  function getNotes(t) {
    var v = store.rawGet(notesKey(t));
    if (v != null) return v;
    // Migración desde la versión anterior (las notas se guardaban por título)
    var legacyKeys = ["speech_notes_" + t.t];
    if (t.o) legacyKeys.push("speech_notes_" + t.o);
    for (var i = 0; i < legacyKeys.length; i++) {
      var old = store.rawGet(legacyKeys[i]);
      if (old) {
        if (store.rawSet(notesKey(t), old)) store.remove(legacyKeys[i]);
        return old;
      }
    }
    return "";
  }
  var notesTimer = null;
  function flushNotes() {
    clearTimeout(notesTimer);
    notesTimer = null;
    if (!current) return;
    var val = $("notes").value;
    if (val.trim()) store.rawSet(notesKey(current), val);
    else store.remove(notesKey(current));
  }
  function onNotesInput() {
    $("saveStatus").textContent = "Guardando…";
    clearTimeout(notesTimer);
    notesTimer = setTimeout(function () {
      flushNotes();
      var d = new Date();
      $("saveStatus").textContent = "Guardado en este dispositivo ✓ " +
        String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }, 500);
  }

  /* ---------- Vistas ---------- */
  var currentView = null;
  function showView(name, opts) {
    opts = opts || {};
    if (VIEWS.indexOf(name) < 0) name = "practicar";
    currentView = name;
    qsa(".view").forEach(function (v) { v.classList.toggle("hide", v.dataset.view !== name); });
    qsa(".tab").forEach(function (b) {
      if (b.dataset.go === name) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    document.body.classList.toggle("expo-mode", name === "practicar" && (state.step === "exponer" || state.step === "repreguntas"));
    if (name === "temas") renderLibrary(true);
    if (name === "progreso") renderProgress();
    if (name === "ajustes") renderPrefs();
    if (location.hash !== "#" + name) {
      try { history_replace("#" + name); } catch (e) { /* file:// u otros contextos */ }
    }
    if (!opts.noScroll) window.scrollTo(0, 0);
    if (opts.focus !== false) {
      var target = name === "practicar" ? $("topicTitle") : $("main");
      if (target) target.focus({ preventScroll: true });
    }
  }
  function history_replace(h) { window.history.replaceState(null, "", h); }

  /* ---------- Tema actual ---------- */
  // Solo las etiquetas (no toca las notas): se usa después de guardar o borrar historial
  function renderTopicMeta() {
    if (!current) return;
    var t = current;
    var practiced = practicas.some(function (h) { return h.topicId === t.id; });
    var meta = '<span class="pill">' + esc(t.c) + "</span>";
    (t.a || []).forEach(function (f) {
      meta += '<span class="pill ' + f + '">' + esc(C.marcas[f].nombre) + "</span>";
    });
    if (practiced) meta += '<span class="pill ok">✓ Ya lo practicaste</span>';
    $("topicMeta").innerHTML = meta;
  }
  function renderTopic() {
    if (!current) return;
    var t = current;
    renderTopicMeta();
    $("topicTitle").textContent = t.t;
    $("topicFlags").innerHTML = (t.a || []).map(function (f) {
      return '<p class="flag ' + f + '"><strong>' + esc(C.marcas[f].nombre) + ":</strong> " + esc(C.marcas[f].texto) + "</p>";
    }).join("");
    $("topicSummary").textContent = t.s;
    $("topicKeys").innerHTML = t.k.map(function (k) { return "<li>" + esc(k) + "</li>"; }).join("");
    $("notes").value = getNotes(t);
    $("saveStatus").textContent = "";
    $("expoTitle").textContent = t.t;
  }

  function setTopic(t, opts) {
    opts = opts || {};
    if (!t) return;
    if (current && t.id !== current.id && timerRunning() && !opts.force) {
      if (!window.confirm("El temporizador está corriendo. ¿Querés cambiar de tema y reiniciarlo?")) return;
    }
    flushNotes();
    var changed = !current || current.id !== t.id;
    current = t;
    state.topicId = t.id;
    if (changed) {
      resetTimer(true);
      resetStopwatch();
      state.visited = [];
      state.followups = 0;
      state.lastQuestion = null;
      $("rqText").textContent = "";
      resetEvalForm();
      setStep("investigar", { silent: true });
    }
    renderTopic();
    saveState();
    if (opts.go !== false) showView("practicar");
  }

  /* ---------- Etapas ---------- */
  function setStep(step, opts) {
    opts = opts || {};
    if (STEPS.indexOf(step) < 0) step = "investigar";
    state.step = step;
    if (state.visited.indexOf(step) < 0) state.visited.push(step);
    qsa(".stage").forEach(function (s) { s.classList.toggle("hide", s.dataset.stage !== step); });
    qsa(".step").forEach(function (b) {
      var s = b.dataset.step;
      if (s === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      b.classList.toggle("visited", s !== step && state.visited.indexOf(s) >= 0);
    });
    document.body.classList.toggle("expo-mode", currentView === "practicar" && (step === "exponer" || step === "repreguntas"));
    if (step === "repreguntas" && !$("rqText").textContent) nextQuestion();
    if (step === "repreguntas") renderAudienceLine();
    if (step !== "investigar") $("timeUpBanner").classList.add("hide");
    saveState();
    if (!opts.silent) {
      var stepper = document.querySelector(".stepper");
      if (stepper) stepper.scrollIntoView({ block: "start", behavior: "auto" });
      var heading = document.querySelector('.stage[data-stage="' + step + '"] h2, .stage[data-stage="' + step + '"] .expo-title');
      if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }
    }
  }

  /* ---------- Temporizador de investigación ---------- */
  var timerInterval = null, finishTimeout = null, titleFlash = null;
  var audioCtx = null;

  function timerRunning() { return !!state.timer.endAt; }
  function remainingMs() {
    return state.timer.endAt ? Math.max(0, state.timer.endAt - Date.now()) : state.timer.remaining;
  }
  function paintTimer() {
    var rem = remainingMs();
    $("timer").textContent = fmtClock(rem);
    $("timerFill").style.width = (rem / TOTAL_MS * 100) + "%";
    var btn = $("timerToggle");
    if (timerRunning()) btn.textContent = "Pausar";
    else if (state.timer.finished) btn.textContent = "Empezar de nuevo";
    else if (state.timer.remaining >= TOTAL_MS) btn.textContent = "Iniciar";
    else btn.textContent = "Continuar";
    $("timerCard").classList.toggle("finished", state.timer.finished);
  }
  function setTimerStatus(msg) { $("timerStatus").textContent = msg; }
  function clearTimerHandles() {
    clearInterval(timerInterval); timerInterval = null;
    clearTimeout(finishTimeout); finishTimeout = null;
  }
  function scheduleTimer() {
    clearTimerHandles();
    // Un único timeout para el final (más preciso que depender del intervalo en pestañas inactivas)
    finishTimeout = setTimeout(tick, Math.max(0, state.timer.endAt - Date.now()) + 30);
    timerInterval = setInterval(tick, 250);
  }
  function tick() {
    if (!timerRunning()) return;
    if (remainingMs() <= 0) finishTimer(); else paintTimer();
  }
  function startTimer() {
    ensureAudio();
    if (state.timer.finished || state.timer.remaining <= 0) {
      state.timer.remaining = TOTAL_MS;
      state.timer.finished = false;
      $("timeUpBanner").classList.add("hide");
    }
    state.timer.endAt = Date.now() + state.timer.remaining;
    scheduleTimer();
    setTimerStatus("Investigá: buscá una definición, dos o tres ideas clave y un ejemplo.");
    paintTimer();
    saveState();
  }
  function pauseTimer() {
    state.timer.remaining = remainingMs();
    state.timer.endAt = null;
    clearTimerHandles();
    setTimerStatus("En pausa. Continuá cuando quieras.");
    paintTimer();
    saveState();
  }
  function resetTimer(quiet) {
    clearTimerHandles();
    state.timer = { remaining: TOTAL_MS, endAt: null, finished: false };
    $("timeUpBanner").classList.add("hide");
    setTimerStatus("Cuando quieras, arrancá.");
    stopTitleFlash();
    paintTimer();
    if (!quiet) saveState();
  }
  function finishTimer(silent) {
    clearTimerHandles();
    state.timer = { remaining: 0, endAt: null, finished: true };
    paintTimer();
    setTimerStatus("¡Tiempo! Dejá de investigar y explicá el tema sin leer.");
    $("timeUpBanner").classList.remove("hide");
    saveState();
    if (!silent) {
      if (prefs.sound) beep();
      if (prefs.vibrate && navigator.vibrate) { try { navigator.vibrate([300, 150, 300]); } catch (e) { /* no soportado */ } }
      if (document.hidden) startTitleFlash();
      toast("⏰ Se terminó el tiempo de investigación.");
    }
  }
  function startTitleFlash() {
    stopTitleFlash();
    var on = false;
    titleFlash = setInterval(function () {
      on = !on;
      document.title = on ? "⏰ ¡Tiempo! Pasá a explicar" : BASE_TITLE;
    }, 1000);
    document.title = "⏰ ¡Tiempo! Pasá a explicar";
  }
  function stopTitleFlash() {
    clearInterval(titleFlash); titleFlash = null;
    document.title = BASE_TITLE;
  }

  function ensureAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    } catch (e) { return null; }
  }
  function beep() {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      [0, 0.35, 0.7].forEach(function (offset, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        var t0 = ctx.currentTime + offset;
        o.type = "sine";
        o.frequency.value = i === 2 ? 880 : 660;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + 0.3);
      });
    } catch (e) { /* sin audio */ }
  }

  function restoreTimer() {
    if (state.timer.endAt) {
      if (state.timer.endAt <= Date.now()) {
        finishTimer(true);
        setTimerStatus("El tiempo terminó mientras no estabas. Pasá a explicar el tema.");
      } else {
        scheduleTimer();
        setTimerStatus("Investigá: buscá una definición, dos o tres ideas clave y un ejemplo.");
      }
    } else if (state.timer.finished) {
      setTimerStatus("¡Tiempo! Dejá de investigar y explicá el tema sin leer.");
      if (state.step === "investigar") $("timeUpBanner").classList.remove("hide");
    } else if (state.timer.remaining < TOTAL_MS) {
      setTimerStatus("En pausa. Continuá cuando quieras.");
    }
    paintTimer();
  }

  /* ---------- Cronómetro de exposición ---------- */
  var sw = { elapsed: 0, startAt: null, interval: null };
  function swElapsed() { return sw.elapsed + (sw.startAt ? Date.now() - sw.startAt : 0); }
  function paintStopwatch() {
    var sec = swElapsed() / 1000;
    $("swTime").textContent = fmtSec(Math.floor(sec));
    $("swFill").style.width = Math.min(100, sec / 180 * 100) + "%";
    var hint = $("swHint");
    hint.classList.remove("good", "over");
    if (!sw.startAt && sec === 0) hint.textContent = "Cuando empieces a hablar, tocá «Empezar».";
    else if (sec < 60) hint.textContent = sw.startAt ? "Vas bien. Tomate tu tiempo." : "En pausa.";
    else if (sec <= 120) { hint.textContent = "Estás en el rango ideal (1 a 2 minutos)."; hint.classList.add("good"); }
    else { hint.textContent = "Pasaste los 2 minutos: buen momento para ir cerrando."; hint.classList.add("over"); }
    $("swToggle").textContent = sw.startAt ? "Pausar" : (sec > 0 ? "Continuar" : "Empezar");
  }
  function toggleStopwatch() {
    if (sw.startAt) {
      sw.elapsed = swElapsed(); sw.startAt = null;
      clearInterval(sw.interval); sw.interval = null;
    } else {
      sw.startAt = Date.now();
      sw.interval = setInterval(paintStopwatch, 250);
    }
    paintStopwatch();
  }
  function resetStopwatch() {
    clearInterval(sw.interval);
    sw = { elapsed: 0, startAt: null, interval: null };
    paintStopwatch();
  }

  /* ---------- Audiencias, frases y repreguntas ---------- */
  function renderAudiences() {
    var set = $("audienceSet");
    var html = "<legend>¿A quién se lo explicás?</legend>";
    Object.keys(C.audiencias).forEach(function (k) {
      html += '<label class="chip"><input type="radio" name="audience" value="' + k + '"' +
        (k === state.audience ? " checked" : "") + "><span>" + esc(C.audiencias[k].nombre) + "</span></label>";
    });
    set.innerHTML = html;
    renderAudienceTips();
  }
  function renderAudienceTips() {
    var a = C.audiencias[state.audience];
    $("audienceTips").innerHTML = "<p><strong>" + esc(a.nombre) + ":</strong> " + esc(a.descripcion) + "</p><ul>" +
      a.consejos.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul>";
  }
  function renderAudienceLine() {
    var a = C.audiencias[state.audience];
    $("rqAudience").textContent = state.audience === "libre"
      ? "Preguntas generales. Podés elegir una audiencia en el modo exposición para que cambien."
      : "Te pregunta: " + a.nombre.replace(/^A /, "").replace(/^a /, "") + ". " + a.descripcion;
  }
  function renderStructure() {
    $("structureList").innerHTML = C.estructura.map(function (e) {
      return "<li><strong>" + esc(e.titulo) + "</strong><span>" + esc(e.ayuda) + "</span></li>";
    }).join("");
    $("guideList").innerHTML = C.guia.map(function (g) {
      return '<div class="prompt"><b>' + esc(g.titulo) + "</b><span>" + esc(g.texto) + "</span></div>";
    }).join("");
  }
  function renderPhrases() {
    var html = C.frases.map(function (g) {
      return "<div><h4>" + esc(g.grupo) + "</h4><ul>" + g.items.map(function (i) {
        return "<li>«" + esc(i) + "»</li>";
      }).join("") + "</ul></div>";
    }).join("");
    qsa("[data-phrases]").forEach(function (el) { el.innerHTML = html; });
  }

  function nextQuestion() {
    var aud = C.audiencias[state.audience];
    var audType = { superior: "decision", senior: "fuente", cliente: "aclaracion" }[state.audience];
    var pool = C.repreguntas.slice();
    aud.preguntas.forEach(function (p) {
      // Las preguntas de la audiencia elegida aparecen con más frecuencia
      pool.push({ tipo: audType, texto: p }, { tipo: audType, texto: p });
    });
    var flags = (current && current.a) || [];
    if (flags.indexOf("jur") >= 0) pool.push({ tipo: "datos", texto: "¿Cómo es esto en Uruguay?" });
    if (flags.indexOf("act") >= 0) pool.push({ tipo: "datos", texto: "¿Eso sigue siendo así hoy?" });
    var options = pool.filter(function (q) { return q.texto !== state.lastQuestion; });
    var q = randItem(options.length ? options : pool);
    state.lastQuestion = q.texto;
    state.followups++;
    $("rqText").textContent = q.texto;
    var hint = C.pistas[q.tipo] || "";
    if (q.tipo === "datos" && flags.indexOf("jur") >= 0) hint += " Este tema depende de la jurisdicción: aclaralo.";
    $("rqHint").textContent = "Pista: " + hint;
    $("rqCount").textContent = "Preguntas practicadas en este tema: " + state.followups;
  }

  /* ---------- Autoevaluación ---------- */
  var TIPS = {
    claridad: "Probá arrancar con una sola frase que defina el tema.",
    orden: "Usá la estructura de cuatro pasos como esqueleto: definición, ideas, ejemplo, duda.",
    ejemplo: "Antes de hablar, elegí un ejemplo concreto de la vida diaria o del trabajo.",
    ritmo: "Respirá entre una idea y la siguiente: una pausa de dos segundos se nota mucho menos de lo que creés.",
    honestidad: "Tené a mano una frase como «No tengo ese dato confirmado; lo voy a revisar».",
    cierre: "Prepará la última frase antes de empezar: «Para resumir…»."
  };
  function renderCriteria() {
    $("criteria").innerHTML = C.criterios.map(function (c) {
      return '<fieldset class="criterion"><legend>' + esc(c.nombre) + "</legend><p>" + esc(c.texto) + '</p><div class="levels">' +
        C.niveles.map(function (n, i) {
          return '<label class="chip"><input type="radio" name="crit-' + c.id + '" value="' + i + '"><span>' + esc(n) + "</span></label>";
        }).join("") + "</div></fieldset>";
    }).join("");
  }
  function resetEvalForm() {
    var f = $("evalForm");
    if (f) f.reset();
    $("evalFeedback").classList.add("hide");
    $("evalFeedback").innerHTML = "";
  }
  function onEvalSubmit(e) {
    e.preventDefault();
    if (!current) return;
    var scores = {}, answered = 0;
    C.criterios.forEach(function (c) {
      var el = document.querySelector('input[name="crit-' + c.id + '"]:checked');
      if (el) { scores[c.id] = Number(el.value); answered++; }
    });
    var fb = $("evalFeedback");
    if (!answered) {
      fb.classList.remove("hide");
      fb.innerHTML = "<p>Marcá al menos un criterio para guardar la práctica.</p>";
      fb.focus();
      return;
    }
    var entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      topicId: current.id, title: current.t, cat: current.c,
      date: new Date().toISOString(),
      audience: state.audience,
      speakSec: Math.round(swElapsed() / 1000),
      followups: state.followups,
      scores: scores,
      next: $("nextTime").value.trim().slice(0, 200)
    };
    practicas.unshift(entry);
    if (practicas.length > 500) practicas.length = 500;
    saveHistory();

    var good = [], mid = [], notYet = [];
    C.criterios.forEach(function (c) {
      if (scores[c.id] === 2) good.push(c); else if (scores[c.id] === 1) mid.push(c); else if (scores[c.id] === 0) notYet.push(c);
    });
    var focus = notYet[0] || mid[0];
    var html = "<h3>¡Práctica guardada!</h3>";
    if (good.length) html += "<p><strong>Lo que te salió bien:</strong> " + esc(good.map(function (c) { return c.nombre.toLowerCase(); }).join(", ")) + ".</p>";
    if (focus) html += "<p><strong>Para la próxima, podés enfocarte en " + esc(focus.nombre.toLowerCase()) + ":</strong> " + esc(TIPS[focus.id]) + "</p>";
    else html += "<p>Marcaste todo como logrado. Para seguir creciendo, probá con una audiencia más exigente o un tema de una categoría que no domines.</p>";
    if (!good.length) html += "<p>Animarte a explicar algo que acabás de aprender ya es práctica. La seguridad se gana repitiendo.</p>";
    var total = practicas.length;
    html += '<p class="muted small-text">Llevás ' + total + (total === 1 ? " práctica guardada" : " prácticas guardadas") + " en este navegador.</p>";
    html += '<div class="actions"><button type="button" class="btn primary" data-action="sorpresa">🎲 Otro tema</button>' +
      '<button type="button" class="btn ghost" data-go="progreso">Ver mi progreso</button></div>';
    fb.innerHTML = html;
    fb.classList.remove("hide");
    fb.focus();
    renderTopicMeta();
  }

  /* ---------- Biblioteca ---------- */
  var libShown = PAGE, libMatches = [];
  function fillCategorySelect() {
    var sel = $("category");
    categories.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c; o.textContent = c + " (" + catCount[c] + ")";
      sel.appendChild(o);
    });
  }
  function filteredTopics() {
    var q = norm($("search").value.trim()), c = $("category").value;
    var words = q ? q.split(/\s+/) : [];
    return TEMAS.filter(function (t, i) {
      if (c && t.c !== c) return false;
      return words.every(function (w) { return searchIndex[i].indexOf(w) >= 0; });
    });
  }
  function renderLibrary(resetPage) {
    if (resetPage) libShown = PAGE;
    libMatches = filteredTopics();
    var practiced = {};
    practicas.forEach(function (h) { practiced[h.topicId] = true; });
    var list = libMatches.slice(0, libShown);
    $("topicLibrary").innerHTML = list.length ? list.map(function (t) {
      var flags = (t.a || []).map(function (f) { return '<span class="pill ' + f + '">' + esc(C.marcas[f].nombre) + "</span>"; }).join("");
      return '<li><button type="button" class="topic-item" data-topic="' + esc(t.id) + '"><strong>' + esc(t.t) +
        '</strong><span class="ti-meta"><span>' + esc(t.c) + "</span>" + flags +
        (practiced[t.id] ? '<span class="done-mark">✓ practicado</span>' : "") + "</span></button></li>";
    }).join("") : '<li class="empty">No encontramos temas con ese filtro. Probá con otra palabra o elegí «Todas las categorías».</li>';
    $("libResults").textContent = libMatches.length === TEMAS.length
      ? "Mostrando " + Math.min(libShown, libMatches.length) + " de " + TEMAS.length + " temas"
      : libMatches.length + (libMatches.length === 1 ? " tema encontrado" : " temas encontrados") +
        (libMatches.length > libShown ? " (mostrando " + libShown + ")" : "");
    $("moreTopics").classList.toggle("hide", libMatches.length <= libShown);
    $("randomInFilter").disabled = !libMatches.length;
  }

  /* ---------- Categorías (diálogo) ---------- */
  function renderCatDialog() {
    $("catGrid").innerHTML = categories.map(function (c) {
      return '<button type="button" class="cat-btn" data-cat="' + esc(c) + '"><span>' + esc(c) + "</span><small>" + catCount[c] + "</small></button>";
    }).join("");
  }
  function openCategories() {
    var d = $("catDialog");
    if (d && typeof d.showModal === "function") {
      d.showModal();
      var first = d.querySelector(".cat-btn");
      if (first) first.focus();
    } else {
      // Navegadores sin <dialog>: usamos la biblioteca con el filtro
      showView("temas");
      $("category").focus();
    }
  }

  /* ---------- Progreso ---------- */
  function renderProgress() {
    var n = practicas.length;
    var distinct = {}, days = {}, speak = 0;
    practicas.forEach(function (h) {
      distinct[h.topicId] = true;
      days[todayKey(new Date(h.date))] = true;
      speak += h.speakSec || 0;
    });
    $("stats").innerHTML = [
      [n, n === 1 ? "práctica guardada" : "prácticas guardadas"],
      [Object.keys(distinct).length, "temas distintos"],
      [Object.keys(days).length, Object.keys(days).length === 1 ? "día con práctica" : "días con práctica"],
      [fmtSec(speak), "min hablando (cronómetro)"]
    ].map(function (s) { return '<div class="stat"><strong>' + esc(s[0]) + "</strong><span>" + esc(s[1]) + "</span></div>"; }).join("");

    if (!n) {
      $("criteriaProgress").innerHTML = '<p class="muted">Todavía no guardaste prácticas. Cuando completes una autoevaluación, acá vas a ver cómo evoluciona cada habilidad.</p>';
      $("historyList").innerHTML = '<li class="empty">Sin prácticas guardadas todavía.</li>';
      return;
    }
    var last = practicas.slice(0, 10);
    var html = "<h2>" + (last.length === 1 ? "Tus habilidades en tu última práctica" : "Tus habilidades en las últimas " + last.length + " prácticas") + "</h2>";
    C.criterios.forEach(function (c) {
      var rated = last.filter(function (h) { return typeof h.scores[c.id] === "number"; });
      var l2 = rated.filter(function (h) { return h.scores[c.id] === 2; }).length;
      var l1 = rated.filter(function (h) { return h.scores[c.id] === 1; }).length;
      var total = rated.length || 1;
      var parts = [];
      if (l2) parts.push("lo lograste en " + l2);
      if (l1) parts.push("en camino en " + l1);
      if (rated.length - l2 - l1) parts.push("todavía no en " + (rated.length - l2 - l1));
      var label = rated.length ? (parts.join(", ") + " (de " + rated.length + ")").replace(/^./, function (c) { return c.toUpperCase(); }) : "Sin marcar todavía";
      html += '<div class="bar-row"><div class="bar-label">' + esc(c.nombre) + "<small>" + esc(label) + '</small></div>' +
        '<div class="bar" role="img" aria-label="' + esc(c.nombre + ": " + label) + '"><span class="b2" style="width:' + (l2 / total * 100) +
        '%"></span><span class="b1" style="width:' + (l1 / total * 100) + '%"></span></div></div>';
    });
    html += '<div class="legend"><span><i style="background:var(--green)"></i>Lo logré</span><span><i style="background:var(--blue);opacity:.6"></i>En camino</span><span><i style="background:var(--line)"></i>Todavía no</span></div>';
    html += '<p class="muted small-text">Es tu propia percepción, no una nota. Lo útil es ver la tendencia.</p>';
    $("criteriaProgress").innerHTML = html;

    $("historyList").innerHTML = practicas.map(function (h) {
      var aud = C.audiencias[h.audience] ? C.audiencias[h.audience].nombre : "Práctica libre";
      var dots = C.criterios.map(function (c) {
        var v = h.scores[c.id];
        if (typeof v !== "number") return "";
        return '<span class="l' + v + '">' + esc(c.nombre) + ": " + esc(C.niveles[v]) + "</span>";
      }).join("");
      var meta = [fmtDate(h.date), h.cat, aud];
      if (h.speakSec) meta.push("habló " + fmtSec(h.speakSec));
      if (h.followups) meta.push(h.followups + (h.followups === 1 ? " repregunta" : " repreguntas"));
      return '<li><div class="h-top"><button type="button" class="h-title" data-topic="' + esc(h.topicId) + '">' + esc(h.title) +
        '</button><button type="button" class="btn ghost small" data-del="' + esc(h.id) + '" aria-label="Quitar del historial: ' + esc(h.title) + '">Quitar</button></div>' +
        '<div class="h-meta">' + esc(meta.join(" · ")) + '</div><div class="dots">' + dots + "</div>" +
        (h.next ? '<div class="h-meta">Para la próxima: ' + esc(h.next) + "</div>" : "") + "</li>";
    }).join("");
  }

  function exportData() {
    var notes = {};
    store.keys().forEach(function (k) {
      if (k && k.indexOf("hcs.notes.") === 0) notes[k.slice(10)] = store.rawGet(k);
    });
    var data = { app: "habla-con-seguridad", version: 1, exportedAt: new Date().toISOString(), prefs: prefs, history: practicas, notes: notes };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "habla-con-seguridad-copia-" + todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("Copia descargada.");
  }
  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || data.app !== "habla-con-seguridad" || !Array.isArray(data.history)) throw new Error("formato");
        var known = {};
        practicas.forEach(function (h) { known[h.id] = true; });
        var added = 0;
        data.history.forEach(function (h) {
          if (h && h.id && h.topicId && h.date && h.scores && typeof h.scores === "object" && !known[h.id]) {
            practicas.push(h); known[h.id] = true; added++;
          }
        });
        practicas.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        if (practicas.length > 500) practicas.length = 500;
        saveHistory();
        var notesAdded = 0;
        flushNotes();
        Object.keys(data.notes || {}).forEach(function (id) {
          var t = byId[id];
          if (t && typeof data.notes[id] === "string" && !getNotes(t)) { store.rawSet(notesKey(t), data.notes[id]); notesAdded++; }
        });
        renderProgress();
        if (current) renderTopic();
        toast("Importado: " + added + " prácticas y " + notesAdded + " notas nuevas.");
      } catch (e) {
        toast("Ese archivo no parece una copia válida de Habla con seguridad.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Ajustes ---------- */
  function applyPrefs() {
    var root = document.documentElement;
    if (prefs.theme === "dark" || prefs.theme === "light") root.dataset.theme = prefs.theme;
    else delete root.dataset.theme;
    if (prefs.textSize === "grande") root.dataset.text = "grande"; else delete root.dataset.text;
    $("skipWelcome").checked = !prefs.showWelcome;
  }
  function renderPrefs() {
    var f = $("prefsForm");
    f.sound.checked = !!prefs.sound;
    f.vibrate.checked = !!prefs.vibrate;
    f.showWelcome.checked = !!prefs.showWelcome;
    qsa('input[name="theme"]', f).forEach(function (r) { r.checked = r.value === prefs.theme; });
    qsa('input[name="textSize"]', f).forEach(function (r) { r.checked = r.value === prefs.textSize; });
    var bytes = 0;
    store.keys().forEach(function (k) {
      if (k && (k.indexOf("hcs.") === 0 || k.indexOf("speech_notes_") === 0)) bytes += (k.length + (store.rawGet(k) || "").length) * 2;
    });
    $("storageUsage").textContent = store.ok
      ? "Espacio usado por la app en este navegador: aproximadamente " + Math.max(1, Math.round(bytes / 1024)) + " KB."
      : "Este navegador no permite guardar datos: nada se conserva al cerrar la página.";
  }
  function onPrefsChange() {
    var f = $("prefsForm");
    prefs.sound = f.sound.checked;
    prefs.vibrate = f.vibrate.checked;
    prefs.showWelcome = f.showWelcome.checked;
    var th = f.querySelector('input[name="theme"]:checked');
    var ts = f.querySelector('input[name="textSize"]:checked');
    prefs.theme = th ? th.value : "auto";
    prefs.textSize = ts ? ts.value : "normal";
    savePrefs();
    applyPrefs();
    $("prefsSaved").textContent = "Preferencias guardadas en este navegador ✓";
  }
  function clearNotesAll() {
    store.keys().forEach(function (k) {
      if (k && (k.indexOf("hcs.notes.") === 0 || k.indexOf("speech_notes_") === 0)) store.remove(k);
    });
    if (current) $("notes").value = "";
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-go],[data-action],[data-step-go],[data-step],[data-topic],[data-cat],[data-del]");
      if (!el) return;
      if (el.dataset.go) { showView(el.dataset.go); return; }
      if (el.dataset.stepGo) { if (currentView !== "practicar") showView("practicar"); setStep(el.dataset.stepGo); return; }
      if (el.dataset.step) { setStep(el.dataset.step); return; }
      if (el.dataset.action === "sorpresa") { setTopic(pickRandom()); return; }
      if (el.dataset.action === "categorias") { openCategories(); return; }
      if (el.dataset.topic) { setTopic(byId[el.dataset.topic]); return; }
      if (el.dataset.cat) {
        var pool = TEMAS.filter(function (t) { return t.c === el.dataset.cat; });
        $("catDialog").close();
        setTopic(pickRandom(pool));
        return;
      }
      if (el.dataset.del) {
        if (!window.confirm("¿Quitar esta práctica del historial?")) return;
        practicas = practicas.filter(function (h) { return h.id !== el.dataset.del; });
        saveHistory();
        renderProgress();
        if (current) renderTopicMeta();
      }
    });

    $("dailyBtn").addEventListener("click", function () { setTopic(dailyTopic()); });
    $("skipWelcome").addEventListener("change", function () {
      prefs.showWelcome = !this.checked;
      savePrefs();
      toast(prefs.showWelcome ? "La pantalla de inicio se va a mostrar al abrir." : "Listo: la próxima vez arrancás directo en Practicar.");
    });

    $("timerToggle").addEventListener("click", function () { timerRunning() ? pauseTimer() : startTimer(); });
    $("timerReset").addEventListener("click", function () { resetTimer(); });

    $("notes").addEventListener("input", onNotesInput);
    $("clearNotes").addEventListener("click", function () {
      if (!$("notes").value || !window.confirm("¿Borrar las notas de este tema?")) return;
      $("notes").value = "";
      flushNotes();
      $("saveStatus").textContent = "Notas borradas.";
    });

    $("audienceSet").addEventListener("change", function (e) {
      if (e.target.name !== "audience") return;
      state.audience = e.target.value;
      renderAudienceTips();
      renderAudienceLine();
      saveState();
    });
    $("swToggle").addEventListener("click", toggleStopwatch);
    $("swReset").addEventListener("click", resetStopwatch);
    $("rqNext").addEventListener("click", nextQuestion);
    $("evalForm").addEventListener("submit", onEvalSubmit);

    var searchTimer = null;
    $("search").addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { renderLibrary(true); }, 120);
    });
    $("category").addEventListener("change", function () { renderLibrary(true); });
    $("moreTopics").addEventListener("click", function () { libShown += PAGE; renderLibrary(false); });
    $("randomInFilter").addEventListener("click", function () { setTopic(pickRandom(libMatches)); });

    $("exportBtn").addEventListener("click", exportData);
    $("importInput").addEventListener("change", function () {
      if (this.files && this.files[0]) importData(this.files[0]);
      this.value = "";
    });
    $("clearHistory").addEventListener("click", function () {
      if (!practicas.length) { toast("El historial ya está vacío."); return; }
      if (!window.confirm("¿Borrar todo el historial de prácticas? Esta acción no se puede deshacer. (Las notas se mantienen.)")) return;
      practicas = [];
      saveHistory();
      renderProgress();
      if (current) renderTopicMeta();
      toast("Historial borrado.");
    });

    $("prefsForm").addEventListener("change", onPrefsChange);
    $("testSound").addEventListener("click", function () { beep(); });
    $("clearAllNotes").addEventListener("click", function () {
      if (!window.confirm("¿Borrar las notas de todos los temas? Esta acción no se puede deshacer.")) return;
      clearNotesAll();
      renderPrefs();
      toast("Notas borradas.");
    });
    $("clearAll").addEventListener("click", function () {
      if (!window.confirm("¿Borrar todos tus datos de esta app (notas, historial, preferencias y práctica en curso)? No se puede deshacer.")) return;
      store.keys().forEach(function (k) {
        if (k && (k.indexOf("hcs.") === 0 || k.indexOf("speech_notes_") === 0)) store.remove(k);
      });
      clearTimerHandles();
      location.reload();
    });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { stopTitleFlash(); tick(); paintStopwatch(); }
    });
    window.addEventListener("focus", stopTitleFlash);
    window.addEventListener("pagehide", flushNotes);
    window.addEventListener("hashchange", function () {
      var v = location.hash.slice(1);
      if (VIEWS.indexOf(v) >= 0 && v !== currentView) showView(v);
    });
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
  }

  function updateOnline() {
    $("offlineBanner").classList.toggle("hide", navigator.onLine !== false);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    var secure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!secure) return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* sin modo offline, la app sigue funcionando */ });
    });
  }

  /* ---------- Inicio ---------- */
  function init() {
    if (!TEMAS.length || !C) {
      document.body.insertAdjacentHTML("afterbegin", '<p class="banner warn">No se pudieron cargar los temas. Revisá que existan js/temas.js y js/contenido.js.</p>');
      return;
    }
    if (!store.ok) $("storageWarning").classList.remove("hide");
    applyPrefs();

    $("navCount").textContent = TEMAS.length;
    $("libCount").textContent = TEMAS.length;
    $("catCount").textContent = categories.length;
    $("libSummary").textContent = TEMAS.length + " temas en " + categories.length + " categorías. Los marcados en ámbar dependen del país o necesitan datos actualizados.";
    var daily = dailyTopic();
    $("dailyTitle").textContent = daily.t;
    $("dailyCat").textContent = daily.c;

    fillCategorySelect();
    renderCatDialog();
    renderStructure();
    renderPhrases();
    renderAudiences();
    renderCriteria();
    bindEvents();

    current = byId[state.topicId] || daily;
    state.topicId = current.id;
    renderTopic();
    setStep(state.step, { silent: true });
    restoreTimer();
    paintStopwatch();
    updateOnline();

    var hashView = location.hash.slice(1);
    var first = VIEWS.indexOf(hashView) >= 0 ? hashView : (prefs.showWelcome ? "inicio" : "practicar");
    showView(first, { focus: false });
    registerServiceWorker();
  }

  init();
})();
