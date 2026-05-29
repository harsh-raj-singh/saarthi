(function () {
  if (window.__saarthiWidgetLoaded) return;
  window.__saarthiWidgetLoaded = true;

  var currentScript =
    document.currentScript ||
    Array.prototype.slice
      .call(document.scripts)
      .reverse()
      .find(function (script) {
        return script.src && script.src.indexOf("/widget.js") !== -1;
      });

  var globalConfig = window.SaarthiConfig || {};
  var scriptUrl = currentScript && currentScript.src ? new URL(currentScript.src) : new URL(window.location.href);
  var apiBase = ((currentScript && currentScript.dataset.apiBase) || scriptUrl.origin).replace(/\/$/, "");
  var siteId = (currentScript && currentScript.dataset.siteId) || "demo";
  var maxRecordMs = Number((currentScript && currentScript.dataset.maxRecordMs) || 12000);

  function configValue(name, fallback) {
    var dataKey = name.replace(/[A-Z]/g, function (match) {
      return "-" + match.toLowerCase();
    });
    var datasetKey = dataKey.replace(/-([a-z])/g, function (_, letter) {
      return letter.toUpperCase();
    });
    return (
      (currentScript && currentScript.dataset && currentScript.dataset[datasetKey]) ||
      globalConfig[name] ||
      fallback
    );
  }

  function normalizeTheme(value) {
    value = String(value || "auto").toLowerCase();
    return value === "dark" || value === "light" ? value : "auto";
  }

  function normalizePosition(value) {
    value = String(value || "bottom-right").toLowerCase();
    return value === "bottom-left" ? "bottom-left" : "bottom-right";
  }

  function normalizeLang(value) {
    value = String(value || "").toLowerCase();
    if (value === "hi" || value === "hindi") return "hi";
    if (value === "hinglish" || value === "hi-en") return "hinglish";
    return "en";
  }

  function normalizeLangList(value) {
    if (!value || (Array.isArray(value) && !value.length)) return ["en", "hi", "hinglish"];
    var raw = Array.isArray(value) ? value : String(value || "").split(",");
    var result = raw
      .map(function (item) {
        return String(item || "").trim();
      })
      .filter(Boolean)
      .map(function (item) {
        return normalizeLang(item);
      })
      .filter(Boolean);
    return result.length ? Array.from(new Set(result)) : ["en", "hi", "hinglish"];
  }

  var config = {
    color: configValue("color", "#22c55e"),
    theme: normalizeTheme(configValue("theme", "auto")),
    position: normalizePosition(configValue("position", "bottom-right")),
    greeting: configValue("greeting", "Need help with this page?"),
    lang: normalizeLangList(configValue("lang", globalConfig.lang || "")),
  };

  var recorder = null;
  var stream = null;
  var chunks = [];
  var recordTimer = null;
  var answeredTimer = null;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "saarthi_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  var sessionKey = "saarthi:session:" + siteId;
  var sessionId = readStorage(sessionKey) || uuid();
  writeStorage(sessionKey, sessionId);

  var langOptions = [
    { value: "en", label: "EN", name: "English" },
    { value: "hi", label: "हि", name: "Hindi" },
    { value: "hinglish", label: "Hinglish", name: "Hinglish" },
  ].filter(function (item) {
    return config.lang.indexOf(item.value) !== -1;
  });

  if (!langOptions.length) {
    langOptions = [
      { value: "en", label: "EN", name: "English" },
      { value: "hi", label: "हि", name: "Hindi" },
      { value: "hinglish", label: "Hinglish", name: "Hinglish" },
    ];
  }

  var state = {
    open: false,
    busy: false,
    recording: false,
    status: "idle",
    message: config.greeting,
    transcript: "",
    reply: "",
    language: langOptions[0].value,
    langTouched: false,
    cursor: {
      x: Math.round(window.innerWidth / 2),
      y: Math.round(window.innerHeight / 2),
      t: Date.now(),
    },
  };

  var host = document.createElement("div");
  host.id = "saarthi-widget-root";
  host.setAttribute("data-saarthi-private", "true");
  host.setAttribute("data-theme", config.theme);
  var shadow = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  var css = document.createElement("style");
  css.textContent = [
    ":host{all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:0}",
    "*{box-sizing:border-box}",
    "button{font:inherit;letter-spacing:0}",
    ".wrap{position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;align-items:flex-end;gap:12px;pointer-events:none;--accent:#22c55e;--accent-soft:color-mix(in srgb,var(--accent) 14%,transparent);--accent-line:color-mix(in srgb,var(--accent) 42%,transparent);--panel-bg:rgba(18,18,18,.94);--panel-line:rgba(255,255,255,.1);--panel-text:#f8fafc;--panel-muted:#94a3b8;--panel-soft:rgba(255,255,255,.06);--panel-strong:#ffffff;--fab-bg:#1a1a1a;--fab-color:#ffffff;--fab-shadow:0 2px 12px rgba(0,0,0,.25);color:var(--panel-text)}",
    ".wrap.pos-left{right:auto;left:24px;align-items:flex-start}",
    ".wrap.theme-light{--panel-bg:rgba(255,255,255,.96);--panel-line:rgba(17,24,39,.11);--panel-text:#171717;--panel-muted:#687385;--panel-soft:#f3f3f0;--panel-strong:#111827;--fab-bg:#ffffff;--fab-color:#1a1a1a;--fab-shadow:0 2px 12px rgba(15,23,42,.15)}",
    ".cursor{position:fixed;left:0;top:0;width:28px;height:28px;margin:-14px 0 0 -14px;border:1px solid var(--accent);border-radius:999px;box-shadow:0 0 0 7px var(--accent-soft);pointer-events:none;opacity:0;transform:translate3d(var(--x),var(--y),0);transition:opacity .18s ease}",
    ".cursor.on{opacity:.85}",
    ".panel{width:min(320px,calc(100vw - 32px));max-height:min(580px,calc(100svh - 104px));overflow:hidden;border:1px solid var(--panel-line);border-radius:20px;background:var(--panel-bg);box-shadow:0 18px 60px rgba(0,0,0,.28);backdrop-filter:blur(18px);pointer-events:auto;transform-origin:bottom right;animation:saarthi-panel-in .2s ease-out}",
    ".pos-left .panel{transform-origin:bottom left}",
    ".hidden{display:none!important}",
    "@keyframes saarthi-panel-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}",
    ".header{display:flex;align-items:center;gap:10px;padding:12px 12px 10px;border-bottom:1px solid var(--panel-line)}",
    ".avatar{display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#1a8a5e,#0f5a3c);color:#fff;font-size:13px;font-weight:900;line-height:1}",
    ".identity{min-width:0;flex:1}.name{color:var(--panel-strong);font-size:14px;font-weight:850;line-height:1}.status{display:flex;align-items:center;gap:6px;margin-top:3px;color:var(--panel-muted);font-size:11px;font-weight:650;line-height:1.2}",
    ".status-dot{width:6px;height:6px;border-radius:50%;background:var(--panel-muted);transition:background .18s ease,box-shadow .18s ease}.status.is-listening .status-dot,.status.is-answered .status-dot{background:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}.status.is-processing .status-dot{background:var(--accent);animation:saarthi-dot-breathe .8s ease-in-out infinite}.status.is-error .status-dot{background:#f97316;box-shadow:0 0 0 4px rgba(249,115,22,.14)}",
    "@keyframes saarthi-dot-breathe{50%{transform:scale(.72);opacity:.58}}",
    ".close{display:grid;place-items:center;width:28px;height:28px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--panel-muted);cursor:pointer;transition:background .16s ease,color .16s ease,border-color .16s ease}.close:hover{border-color:var(--panel-line);background:var(--panel-soft);color:var(--panel-strong)}",
    ".context{display:flex;align-items:center;gap:6px;min-height:34px;padding:8px 12px;border-bottom:1px solid var(--panel-line);color:var(--panel-muted);font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:10.5px;line-height:1.25;white-space:nowrap;overflow:hidden}",
    ".context-main{min-width:0;overflow:hidden;text-overflow:ellipsis}.lang-badge{flex:0 0 auto;margin-left:auto;padding:3px 6px;border:1px solid var(--accent-line);border-radius:999px;background:var(--accent-soft);color:var(--accent);font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:800}",
    ".body{display:grid;gap:12px;padding:12px}",
    ".thread{display:grid;gap:8px;max-height:184px;overflow:auto;padding-right:2px;scrollbar-width:thin}",
    ".bubble{max-width:86%;padding:9px 10px;color:var(--panel-text);font-size:12.5px;font-weight:550;line-height:1.42;border:1px solid var(--panel-line)}",
    ".bubble.assistant{justify-self:start;border-radius:4px 14px 14px 14px;background:var(--panel-soft)}",
    ".bubble.user{justify-self:end;border-radius:14px 14px 4px 14px;background:var(--accent-soft);border-color:var(--accent-line);color:var(--panel-strong)}",
    ".bubble.error{border-color:rgba(249,115,22,.28);background:rgba(249,115,22,.1)}",
    ".voice{display:flex;align-items:center;justify-content:center;min-height:48px;border:1px solid var(--panel-line);border-radius:14px;background:linear-gradient(180deg,var(--panel-soft),transparent);color:var(--panel-muted)}",
    ".voice-cta{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;min-height:48px;border:1px solid var(--panel-line);border-radius:14px;background:var(--panel-soft);color:var(--panel-strong);cursor:pointer;font-size:13px;font-weight:850;transition:border-color .16s ease,background .16s ease,transform .16s ease}.voice-cta:hover{border-color:var(--accent-line);background:var(--accent-soft);transform:translateY(-1px)}.voice-cta svg{width:17px;height:17px;color:var(--accent)}",
    ".visualizer{gap:3px}.bar{display:block;width:3px;height:24px;border-radius:999px;background:var(--accent);transform-origin:center;animation:saarthi-bars .78s ease-in-out infinite}.bar:nth-child(2){animation-delay:.06s}.bar:nth-child(3){animation-delay:.12s}.bar:nth-child(4){animation-delay:.18s}.bar:nth-child(5){animation-delay:.24s}.bar:nth-child(6){animation-delay:.3s}.bar:nth-child(7){animation-delay:.36s}.bar:nth-child(8){animation-delay:.42s}.bar:nth-child(9){animation-delay:.48s}",
    "@keyframes saarthi-bars{0%,100%{transform:scaleY(.32);opacity:.55}50%{transform:scaleY(1);opacity:1}}",
    ".processing{gap:8px}.dots{display:inline-flex;align-items:center;gap:4px}.dots span{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:saarthi-loader .82s ease-in-out infinite}.dots span:nth-child(2){animation-delay:.12s}.dots span:nth-child(3){animation-delay:.24s}",
    "@keyframes saarthi-loader{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-4px);opacity:1}}",
    ".voice-text{font-size:11px;font-weight:750;color:var(--panel-muted)}",
    ".chips{display:flex;gap:6px}.chip{flex:1;min-width:0;height:30px;border:1px solid var(--panel-line);border-radius:999px;background:transparent;color:var(--panel-muted);cursor:pointer;font-size:11px;font-weight:850;transition:background .16s ease,border-color .16s ease,color .16s ease}.chip[data-lang='hi']{font-family:'Noto Sans Devanagari','Devanagari Sangam MN','Kohinoor Devanagari',ui-sans-serif,system-ui,sans-serif;font-size:12px}.chip:hover,.chip.active{border-color:var(--accent-line);background:var(--accent-soft);color:var(--accent)}",
    ".actions{display:flex;gap:8px}.action{flex:1;min-height:38px;border:1px solid var(--panel-line);border-radius:10px;cursor:pointer;font-size:12px;font-weight:900;transition:transform .16s ease,background .16s ease,border-color .16s ease}.action:hover{transform:translateY(-1px)}.action.primary{border-color:var(--accent);background:var(--accent);color:#07130d}.action.ghost{background:transparent;color:var(--panel-muted)}.action.ghost:hover{border-color:var(--panel-line);background:var(--panel-soft);color:var(--panel-strong)}",
    ".footer{padding-top:2px;color:var(--panel-muted);font-size:10px;font-weight:700;text-align:center}",
    ".fab{position:relative;display:grid;place-items:center;width:52px;height:52px;border:0;border-radius:50%;background:var(--fab-bg);box-shadow:var(--fab-shadow);color:var(--fab-color);cursor:pointer;pointer-events:auto;transition:transform .15s ease,background .15s ease,color .15s ease}.fab:hover{transform:scale(1.05)}.fab:disabled{cursor:not-allowed;opacity:.72}.fab::before{position:absolute;inset:-1px;border:1px solid rgba(255,255,255,.1);border-radius:inherit;content:'';pointer-events:none}.theme-light .fab::before{border-color:rgba(15,23,42,.08)}",
    ".fab svg{width:22px;height:22px}.fab.is-listening svg{color:var(--accent)}.fab .loader{display:none}.fab.is-processing .loader{display:inline-flex}.fab.is-processing .icon{display:none}.ring{position:absolute;inset:0;border:1.5px solid var(--accent);border-radius:inherit;opacity:0;pointer-events:none}.fab.is-listening .ring.one{animation:ring-pulse 1.15s ease-out infinite}.fab.is-listening .ring.two{animation:ring-pulse 1.15s ease-out .36s infinite}",
    "@keyframes ring-pulse{0%{opacity:.7;transform:scale(1)}100%{opacity:0;transform:scale(1.7)}}",
    ".tooltip{position:absolute;right:62px;top:50%;transform:translateY(-50%) translateX(4px);padding:6px 9px;border:1px solid var(--panel-line);border-radius:999px;background:var(--panel-bg);box-shadow:0 10px 30px rgba(0,0,0,.16);color:var(--panel-strong);font-size:11px;font-weight:850;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s ease,transform .15s ease}.pos-left .tooltip{right:auto;left:62px;transform:translateY(-50%) translateX(-4px)}.fab:not(.is-open):not(.is-listening):not(.is-processing):hover .tooltip{opacity:1;transform:translateY(-50%) translateX(0)}",
    "@media (max-width:420px){.wrap{right:16px;bottom:16px}.wrap.pos-left{left:16px}.panel{width:min(320px,calc(100vw - 32px));max-height:calc(100svh - 92px)}}",
    "@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}",
  ].join("");

  var root = document.createElement("div");
  shadow.appendChild(css);
  shadow.appendChild(root);

  function micSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  function loaderDots() {
    return '<span class="dots" aria-hidden="true"><span></span><span></span><span></span></span>';
  }

  function visualizerBars() {
    return Array.from({ length: 9 })
      .map(function () {
        return '<span class="bar"></span>';
      })
      .join("");
  }

  function currentLang() {
    return (
      langOptions.find(function (item) {
        return item.value === state.language;
      }) || langOptions[0]
    );
  }

  function statusText() {
    if (state.recording) return "listening...";
    if (state.status === "processing") return "thinking...";
    if (state.status === "answered") return "answered";
    if (state.status === "error") return "needs attention";
    return "ready";
  }

  function statusClass() {
    if (state.recording) return "is-listening";
    if (state.status === "processing") return "is-processing";
    if (state.status === "answered") return "is-answered";
    if (state.status === "error") return "is-error";
    return "is-ready";
  }

  function fabClass() {
    var classes = ["fab"];
    if (state.open) classes.push("is-open");
    if (state.recording) classes.push("is-listening");
    if (state.status === "processing") classes.push("is-processing");
    return classes.join(" ");
  }

  function renderFabIcon() {
    return micSvg();
  }

  function renderMessages() {
    var messages = [];

    if (state.transcript) {
      messages.push({ role: "user", text: state.transcript });
    }

    if (state.reply) {
      messages.push({ role: "assistant", text: state.reply });
    } else if (state.status === "error") {
      messages.push({ role: "assistant error", text: state.message });
    } else if (state.status === "processing") {
      messages.push({ role: "assistant", text: "Reading your voice note and checking this page context." });
    } else if (state.recording) {
      messages.push({ role: "assistant", text: "Listening. Ask what this is or what to do next." });
    } else {
      messages.push({ role: "assistant", text: state.message || config.greeting });
    }

    return messages
      .slice(-4)
      .map(function (item) {
        return '<div class="bubble ' + item.role + '">' + escapeHtml(item.text) + "</div>";
      })
      .join("");
  }

  function renderVoiceSurface() {
    if (state.recording) {
      return '<button class="voice visualizer" type="button" data-action="stop" aria-label="Stop recording">' + visualizerBars() + "</button>";
    }

    if (state.status === "processing") {
      return '<div class="voice processing">' + loaderDots() + '<span class="voice-text">Transcribing and thinking</span></div>';
    }

    if (state.reply) {
      return "";
    }

    return '<button class="voice-cta" type="button" data-action="record">' + micSvg() + "<span>Ask with voice</span></button>";
  }

  function renderLanguageChips() {
    return langOptions
      .map(function (item) {
        return (
          '<button class="chip ' +
          (item.value === state.language ? "active" : "") +
          '" type="button" data-action="lang" data-lang="' +
          escapeHtml(item.value) +
          '" aria-label="Use ' +
          escapeHtml(item.name) +
          '">' +
          escapeHtml(item.label) +
          "</button>"
        );
      })
      .join("");
  }

  function renderActions() {
    if (!state.reply) return "";
    return (
      '<div class="actions">' +
      '<button class="action primary" type="button" data-action="record">Ask again</button>' +
      '<button class="action ghost" type="button" data-action="done">Done</button>' +
      "</div>"
    );
  }

  function renderContextBar() {
    var context = contextPreview();
    var langBadge = state.langTouched
      ? '<span class="lang-badge">lang detected: ' + escapeHtml(currentLang().name) + "</span>"
      : "";
    return (
      '<div class="context"><span aria-hidden="true">📍</span><span class="context-main" data-role="context-main">' +
      escapeHtml(context) +
      "</span>" +
      langBadge +
      "</div>"
    );
  }

  function render() {
    var theme = resolveTheme();
    var positionClass = config.position === "bottom-left" ? "pos-left" : "pos-right";

    root.innerHTML =
      '<div class="wrap theme-' +
      theme +
      " " +
      positionClass +
      '" style="--accent:' +
      escapeHtml(config.color) +
      '">' +
      '<div class="cursor ' +
      (state.open ? "on" : "") +
      '" style="--x:' +
      state.cursor.x +
      "px;--y:" +
      state.cursor.y +
      'px"></div>' +
      '<section class="panel ' +
      (state.open ? "" : "hidden") +
      '" aria-live="polite">' +
      '<div class="header"><div class="avatar">S</div><div class="identity"><div class="name">Saarthi</div><div class="status ' +
      statusClass() +
      '"><span class="status-dot"></span><span>' +
      escapeHtml(statusText()) +
      '</span></div></div><button class="close" type="button" data-action="close" aria-label="Close Saarthi">✕</button></div>' +
      renderContextBar() +
      '<div class="body"><div class="thread">' +
      renderMessages() +
      "</div>" +
      renderVoiceSurface() +
      '<div class="chips" aria-label="Language preference">' +
      renderLanguageChips() +
      "</div>" +
      renderActions() +
      '<div class="footer">⚡ powered by Saarthi</div>' +
      "</div></section>" +
      '<button class="' +
      fabClass() +
      '" type="button" data-action="toggle" aria-label="' +
      (state.recording ? "Stop recording" : state.open ? "Ask Saarthi" : "Open Saarthi") +
      '" ' +
      (state.busy && !state.recording ? "disabled" : "") +
      '><span class="ring one"></span><span class="ring two"></span><span class="tooltip">Need help?</span><span class="loader">' +
      loaderDots() +
      '</span><span class="icon">' +
      renderFabIcon() +
      "</span></button></div>";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readStorage(key) {
    try {
      return window.localStorage ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      if (window.localStorage) localStorage.setItem(key, value);
    } catch {
      // Some embedded contexts block storage. Saarthi still works with a one-tab session.
    }
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function setState(next) {
    Object.assign(state, next);
    render();
  }

  function resolveTheme() {
    if (config.theme === "dark" || config.theme === "light") return config.theme;

    var nodes = [document.body, document.documentElement].filter(Boolean);
    for (var i = 0; i < nodes.length; i += 1) {
      var color = window.getComputedStyle(nodes[i]).backgroundColor;
      var rgb = parseRgb(color);
      if (rgb && rgb.alpha > 0.05) {
        return luminance(rgb) > 0.62 ? "light" : "dark";
      }
    }

    return "dark";
  }

  function parseRgb(color) {
    var match = String(color || "").match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    var parts = match[1].split(",").map(function (part) {
      return Number(part.trim());
    });
    if (parts.length < 3 || parts.some(function (part, index) { return index < 3 && Number.isNaN(part); })) {
      return null;
    }
    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      alpha: parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1,
    };
  }

  function luminance(rgb) {
    function channel(value) {
      value = value / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }

    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function updateCursor(event) {
    var path = event.composedPath ? event.composedPath() : [];
    if (path.indexOf(host) !== -1) return;

    state.cursor = {
      x: Math.max(0, Math.min(window.innerWidth, Math.round(event.clientX))),
      y: Math.max(0, Math.min(window.innerHeight, Math.round(event.clientY))),
      t: Date.now(),
    };

    var cursor = shadow.querySelector(".cursor");
    if (cursor) {
      cursor.style.setProperty("--x", state.cursor.x + "px");
      cursor.style.setProperty("--y", state.cursor.y + "px");
    }

    if (state.open) updateContextDom();
  }

  function updateContextDom() {
    var context = shadow.querySelector('[data-role="context-main"]');
    if (context) context.textContent = contextPreview();
  }

  function safeUrl(value) {
    if (!value) return null;
    try {
      var url = new URL(value, window.location.href);
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return String(value).split("?")[0].split("#")[0].slice(0, 220);
    }
  }

  function pageUrl() {
    return safeUrl(window.location.href);
  }

  function buildSelector(el) {
    if (!el || !el.tagName) return null;
    if (el.id) return "#" + cssEscape(el.id);
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1 && parts.length < 4 && node !== document.documentElement) {
      var part = node.tagName.toLowerCase();
      var testId = node.getAttribute("data-testid") || node.getAttribute("data-test");
      if (testId) part += '[data-testid="' + testId.replace(/"/g, '\\"') + '"]';
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function describeElement(el) {
    if (!el) return {};
    if (el.closest && el.closest("[data-saarthi-private]")) {
      return {
        private: true,
        tagName: el.tagName ? el.tagName.toLowerCase() : undefined,
      };
    }

    var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    var labelText = "";
    var id = el.getAttribute && el.getAttribute("id");
    if (id) {
      var label = document.querySelector('label[for="' + cssEscape(id) + '"]');
      labelText = label ? label.innerText : "";
    }
    var labelledBy = el.getAttribute && el.getAttribute("aria-labelledby");
    if (labelledBy) {
      labelText = labelledBy
        .split(/\s+/)
        .map(function (item) {
          var node = document.getElementById(item);
          return node ? node.innerText : "";
        })
        .join(" ");
    }

    var text = labelText || el.innerText || el.textContent || "";
    text = text.replace(/\s+/g, " ").trim().slice(0, 700);

    return {
      tagName: el.tagName ? el.tagName.toLowerCase() : undefined,
      type: el.getAttribute && (el.getAttribute("type") || null),
      role: el.getAttribute && (el.getAttribute("role") || null),
      id: id || null,
      className: typeof el.className === "string" ? el.className.slice(0, 180) : null,
      name: el.getAttribute && (el.getAttribute("name") || null),
      innerText: text || null,
      ariaLabel: el.getAttribute && (el.getAttribute("aria-label") || null),
      title: el.getAttribute && (el.getAttribute("title") || null),
      placeholder: el.getAttribute && (el.getAttribute("placeholder") || null),
      href: el.getAttribute && safeUrl(el.getAttribute("href")),
      value: null,
      selector: buildSelector(el),
      rect: rect
        ? {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        : null,
    };
  }

  function contextPreview() {
    var title = (document.title || new URL(window.location.href).hostname || "Current page")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 46);
    var target = document.elementFromPoint(state.cursor.x, state.cursor.y);
    var element = describeElement(target);
    var label = elementLabel(element);
    return title + "  ·  " + label;
  }

  function elementLabel(element) {
    if (!element || element.private) return "cursor on page";
    var tag = element.tagName || "";
    if (tag === "html" || tag === "body" || tag === "main" || tag === "section") {
      return "cursor on page";
    }

    var text = element.ariaLabel || element.innerText || element.placeholder || element.title || element.name || tag;
    text = String(text || "page element").replace(/\s+/g, " ").trim();
    if (text.length > 34) text = text.slice(0, 31) + "...";
    return 'cursor near "' + text + '"';
  }

  function pageContext() {
    var cursor = state.cursor;
    var target = document.elementFromPoint(cursor.x, cursor.y);
    return {
      siteId: siteId,
      sessionId: sessionId,
      preferredLanguage: currentLang().value,
      capturedAt: new Date().toISOString(),
      page: {
        url: pageUrl(),
        title: document.title,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scroll: { x: window.scrollX, y: window.scrollY },
        cursor: { x: cursor.x, y: cursor.y },
      },
      element: describeElement(target),
      visibleControls: visibleControls(),
    };
  }

  function visibleControls() {
    var selector = [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "summary",
      "[role='button']",
      "[role='link']",
      "[role='menuitem']",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));
    var controls = [];

    for (var i = 0; i < nodes.length && controls.length < 24; i += 1) {
      var node = nodes[i];
      if (!node || node === host || (node.closest && node.closest("[data-saarthi-private]"))) continue;
      var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
      if (!rect || rect.width < 2 || rect.height < 2) continue;
      if (rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) continue;

      var summary = describeElement(node);
      if (summary.innerText || summary.ariaLabel || summary.placeholder || summary.title || summary.value) {
        controls.push(summary);
      }
    }

    return controls;
  }

  function filenameForMime(type) {
    if (/mp4|m4a/i.test(type)) return "saarthi-voice.m4a";
    if (/wav/i.test(type)) return "saarthi-voice.wav";
    if (/ogg/i.test(type)) return "saarthi-voice.ogg";
    return "saarthi-voice.webm";
  }

  function chooseMimeType() {
    var candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];
    for (var i = 0; i < candidates.length; i += 1) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(candidates[i])) {
        return candidates[i];
      }
    }
    return "";
  }

  function stopTracks() {
    if (stream) {
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
    }
    stream = null;
  }

  function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setState({
        open: true,
        status: "error",
        message: "This browser does not support in-page voice recording.",
      });
      return;
    }

    if (answeredTimer) window.clearTimeout(answeredTimer);

    setState({
      open: true,
      busy: false,
      recording: true,
      status: "recording",
      message: "Listening. Ask what this is or what to do next.",
      transcript: "",
      reply: "",
    });

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then(function (mediaStream) {
        stream = mediaStream;
        chunks = [];
        var mimeType = chooseMimeType();
        recorder = new MediaRecorder(stream, mimeType ? { mimeType: mimeType } : undefined);
        recorder.ondataavailable = function (event) {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };
        recorder.onstop = finishRecording;
        recorder.start();
        recordTimer = window.setTimeout(stopRecording, Math.max(4000, maxRecordMs));
      })
      .catch(function (error) {
        stopTracks();
        setState({
          busy: false,
          recording: false,
          status: "error",
          message: error && error.message ? error.message : "Microphone permission was not granted.",
        });
      });
  }

  function stopRecording() {
    if (recordTimer) window.clearTimeout(recordTimer);
    recordTimer = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function finishRecording() {
    stopTracks();
    setState({
      busy: true,
      recording: false,
      status: "processing",
      message: "Transcribing and thinking...",
    });

    var type = chunks[0] && chunks[0].type ? chunks[0].type : "audio/webm";
    var audioBlob = new Blob(chunks, { type: type });
    chunks = [];

    if (!audioBlob.size) {
      setState({
        busy: false,
        status: "error",
        message: "I could not capture audio. Please try once more.",
      });
      return;
    }

    var context;
    try {
      context = pageContext();
    } catch {
      setState({
        busy: false,
        status: "error",
        message: "I could not read the page context. Please move your cursor and try again.",
      });
      return;
    }

    var form = new FormData();
    form.append("audio", audioBlob, filenameForMime(type));
    form.append("context", JSON.stringify(context));

    var controller = new AbortController();
    var timeout = window.setTimeout(function () {
      controller.abort();
    }, 120000);

    fetch(apiBase + "/api/voice/turn", {
      method: "POST",
      headers: { "X-Saarthi-Session": sessionId },
      body: form,
      signal: controller.signal,
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || data.ok === false) throw new Error(data.error || "Voice turn failed.");
          return data;
        });
      })
      .then(function (data) {
        setState({
          busy: false,
          status: "answered",
          message: "Saarthi answered out loud.",
          transcript: data.transcript || "",
          reply: data.reply || "",
        });
        answeredTimer = window.setTimeout(function () {
          if (state.status === "answered") setState({ status: "ready" });
        }, 1100);
        playAudio(data.audio);
      })
      .catch(function (error) {
        setState({
          busy: false,
          status: "error",
          message:
            error && error.name === "AbortError"
              ? "That took too long. Please try a shorter question."
              : error.message || "Saarthi could not process that voice turn.",
        });
      })
      .finally(function () {
        window.clearTimeout(timeout);
      });
  }

  function playAudio(audio) {
    if (!audio || !audio.base64) return;
    var byteString = atob(audio.base64);
    var bytes = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i += 1) {
      bytes[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([bytes], { type: audio.contentType || "audio/wav" });
    var url = URL.createObjectURL(blob);
    var player = new Audio(url);
    player.onended = function () {
      URL.revokeObjectURL(url);
    };
    player.play().catch(function () {
      URL.revokeObjectURL(url);
      setState({
        status: "ready",
        message: "Saarthi has an answer, but the browser blocked autoplay. Press the mic again to continue.",
      });
    });
  }

  shadow.addEventListener("click", function (event) {
    var actionTarget =
      event.target && event.target.closest ? event.target.closest("[data-action]") : null;
    var action = actionTarget && actionTarget.getAttribute("data-action");
    if (!action) return;

    if (action === "toggle") {
      if (!state.open) {
        setState({ open: true });
      } else if (state.recording) {
        stopRecording();
      } else if (!state.busy) {
        startRecording();
      }
    }

    if (action === "close") setState({ open: false });
    if (action === "done") setState({ open: false });
    if (action === "record") startRecording();
    if (action === "stop") stopRecording();
    if (action === "lang") {
      var selectedLanguage = normalizeLang(actionTarget.getAttribute("data-lang"));
      var selectedOption =
        langOptions.find(function (item) {
          return item.value === selectedLanguage;
        }) || langOptions[0];
      setState({
        language: selectedLanguage,
        langTouched: true,
        message: "Language set to " + selectedOption.name + ".",
      });
    }
  });

  window.addEventListener("pointermove", updateCursor, { passive: true });
  window.addEventListener("mousemove", updateCursor, { passive: true });
  window.addEventListener("resize", function () {
    if (state.open) render();
  });
  window.addEventListener("beforeunload", function () {
    window.__saarthiWidgetLoaded = false;
    stopRecording();
    stopTracks();
  });

  render();
})();
