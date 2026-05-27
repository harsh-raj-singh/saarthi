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

  var scriptUrl = currentScript && currentScript.src ? new URL(currentScript.src) : new URL(window.location.href);
  var apiBase = ((currentScript && currentScript.dataset.apiBase) || scriptUrl.origin).replace(/\/$/, "");
  var siteId = (currentScript && currentScript.dataset.siteId) || "demo";
  var maxRecordMs = Number((currentScript && currentScript.dataset.maxRecordMs) || 12000);
  var recorder = null;
  var stream = null;
  var chunks = [];
  var recordTimer = null;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "saarthi_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  var sessionKey = "saarthi:session:" + siteId;
  var sessionId = readStorage(sessionKey) || uuid();
  writeStorage(sessionKey, sessionId);

  var state = {
    open: false,
    busy: false,
    recording: false,
    status: "idle",
    message: "Press the mic and ask for help.",
    transcript: "",
    reply: "",
    cursor: {
      x: Math.round(window.innerWidth / 2),
      y: Math.round(window.innerHeight / 2),
      t: Date.now(),
    },
  };

  var host = document.createElement("div");
  host.id = "saarthi-widget-root";
  host.setAttribute("data-saarthi-private", "true");
  var shadow = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  var css = document.createElement("style");
  css.textContent = [
    ":host{all:initial;position:fixed;z-index:2147483647;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172033}",
    "*{box-sizing:border-box}",
    ".wrap{position:fixed;right:22px;bottom:22px;display:flex;flex-direction:column;align-items:flex-end;gap:12px}",
    ".cursor{position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border:2px solid rgba(34,197,94,.85);border-radius:999px;box-shadow:0 0 0 9px rgba(34,197,94,.14);pointer-events:none;opacity:0;transform:translate3d(var(--x),var(--y),0);transition:opacity .2s ease}",
    ".cursor.on{opacity:1}",
    ".panel{width:min(370px,calc(100vw - 32px));border:1px solid rgba(20,28,45,.12);border-radius:20px;background:rgba(255,255,255,.95);box-shadow:0 24px 80px rgba(17,24,39,.22);backdrop-filter:blur(18px);overflow:hidden;transform-origin:bottom right;animation:saarthi-in .22s ease}",
    "@keyframes saarthi-in{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}",
    ".top{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid rgba(20,28,45,.09);background:linear-gradient(135deg,rgba(240,253,244,.92),rgba(255,247,237,.9))}",
    ".mark{display:grid;place-items:center;width:42px;height:42px;border-radius:16px;background:#10231a;color:#dcfce7;font-weight:900;box-shadow:inset 0 -12px 24px rgba(34,197,94,.16)}",
    ".title{font-size:15px;font-weight:900;letter-spacing:0}.sub{font-size:12px;color:#5f6b7a;margin-top:2px;line-height:1.35}",
    ".body{padding:16px;display:grid;gap:12px}",
    "button{font:800 14px/1 inherit;border:0;cursor:pointer;letter-spacing:0}",
    ".mic{display:grid;place-items:center;width:86px;height:86px;margin:2px auto;border-radius:999px;background:#172033;color:#fff;box-shadow:0 18px 46px rgba(23,32,51,.24)}",
    ".mic:disabled{cursor:not-allowed;opacity:.58}.mic.recording{background:#dc2626;box-shadow:0 0 0 10px rgba(220,38,38,.13),0 18px 46px rgba(220,38,38,.18)}",
    ".mic svg{width:32px;height:32px}",
    ".actions{display:flex;gap:10px}.actions>*{flex:1;min-width:0}",
    ".secondary{height:42px;border-radius:13px;padding:0 13px;background:#eefdf3;color:#17613a;border:1px solid rgba(22,163,74,.18)}",
    ".secondary.stop{background:#fff1f2;color:#9f1239;border-color:rgba(225,29,72,.18)}",
    ".note{padding:11px 12px;border-radius:14px;background:#f8fafc;color:#3d4656;font-size:13px;line-height:1.45;border:1px solid rgba(20,28,45,.08)}",
    ".note.good{background:#f0fdf4;color:#14532d;border-color:rgba(22,163,74,.18)}",
    ".note.warn{background:#fff7ed;color:#7c2d12;border-color:rgba(249,115,22,.18)}",
    ".pulse{display:inline-flex;width:7px;height:7px;border-radius:999px;background:#22c55e;margin-right:7px;box-shadow:0 0 0 5px rgba(34,197,94,.13);vertical-align:middle}",
    ".pulse.recording{background:#ef4444;box-shadow:0 0 0 5px rgba(239,68,68,.14)}",
    ".fab{display:flex;align-items:center;justify-content:center;gap:10px;height:58px;border-radius:999px;padding:0 18px 0 13px;background:#172033;color:#fff;box-shadow:0 18px 48px rgba(17,24,39,.28);border:1px solid rgba(255,255,255,.14)}",
    ".orb{display:grid;place-items:center;width:36px;height:36px;border-radius:999px;background:#dcfce7;color:#14532d;font-weight:900}",
    ".fabText{font-size:14px;font-weight:900}.hidden{display:none!important}",
    ".close{margin-left:auto;width:32px;height:32px;border-radius:12px;background:rgba(255,255,255,.62);color:#172033}",
    ".mini{font-size:11px;color:#6b7280;line-height:1.35}.mono{font-family:'SFMono-Regular',Consolas,monospace}",
    ".label{font-size:11px;font-weight:900;text-transform:uppercase;color:#6b7280;letter-spacing:.12em;margin-bottom:6px}",
  ].join("");

  var root = document.createElement("div");
  shadow.appendChild(css);
  shadow.appendChild(root);

  function micSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  function render() {
    root.innerHTML =
      '<div class="cursor ' +
      (state.open ? "on" : "") +
      '" style="--x:' +
      state.cursor.x +
      "px;--y:" +
      state.cursor.y +
      'px"></div>' +
      '<div class="wrap">' +
      '<section class="panel ' +
      (state.open ? "" : "hidden") +
      '" aria-live="polite">' +
      '<div class="top"><div class="mark">S</div><div><div class="title">Saarthi</div><div class="sub"><span class="pulse ' +
      (state.recording ? "recording" : "") +
      '"></span>' +
      (state.recording ? "Listening on this page" : "OpenAI voice guide") +
      '</div></div><button class="close" type="button" data-action="close" aria-label="Close Saarthi">x</button></div>' +
      '<div class="body">' +
      '<button class="mic ' +
      (state.recording ? "recording" : "") +
      '" type="button" data-action="' +
      (state.recording ? "stop" : "record") +
      '" ' +
      (state.busy && !state.recording ? "disabled" : "") +
      ' aria-label="' +
      (state.recording ? "Stop recording" : "Ask Saarthi") +
      '">' +
      micSvg() +
      "</button>" +
      '<div class="actions"><button class="secondary ' +
      (state.recording ? "stop" : "") +
      '" type="button" data-action="' +
      (state.recording ? "stop" : "record") +
      '" ' +
      (state.busy && !state.recording ? "disabled" : "") +
      ">" +
      (state.recording ? "Stop" : state.busy ? "Thinking..." : "Hold a voice turn") +
      "</button></div>" +
      '<div class="note ' +
      (state.status === "ready" ? "good" : state.status === "error" ? "warn" : "") +
      '">' +
      escapeHtml(state.message) +
      "</div>" +
      (state.transcript
        ? '<div class="note"><div class="label">You said</div>' + escapeHtml(state.transcript) + "</div>"
        : "") +
      (state.reply
        ? '<div class="note good"><div class="label">Saarthi said</div>' + escapeHtml(state.reply) + "</div>"
        : "") +
      '<div class="mini">Session <span class="mono">' +
      escapeHtml(sessionId.slice(0, 8)) +
      '</span>. Hover over anything, then ask what it is or what to do next.</div>' +
      "</div></section>" +
      '<button class="fab" type="button" data-action="toggle" aria-label="Open Saarthi"><span class="orb">S</span><span class="fabText">Ask Saarthi</span></button>' +
      "</div>";
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

  function pageContext() {
    var cursor = state.cursor;
    var target = document.elementFromPoint(cursor.x, cursor.y);
    return {
      siteId: siteId,
      sessionId: sessionId,
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
        status: "error",
        message: "This browser does not support in-page voice recording.",
      });
      return;
    }

    setState({
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
          status: "ready",
          message: "Saarthi answered out loud.",
          transcript: data.transcript || "",
          reply: data.reply || "",
        });
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
    if (action === "toggle") setState({ open: !state.open });
    if (action === "close") setState({ open: false });
    if (action === "record") startRecording();
    if (action === "stop") stopRecording();
  });

  window.addEventListener("pointermove", updateCursor, { passive: true });
  window.addEventListener("mousemove", updateCursor, { passive: true });
  window.addEventListener("beforeunload", function () {
    window.__saarthiWidgetLoaded = false;
    stopRecording();
    stopTracks();
  });

  render();
})();
