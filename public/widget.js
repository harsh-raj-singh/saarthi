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
  var demoMode = Boolean(currentScript && currentScript.dataset.demo);
  var pollMs = Number((currentScript && currentScript.dataset.pollMs) || 900);
  var handledActions = Object.create(null);

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "saarthi_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  var sessionKey = "saarthi:session:" + siteId;
  var sessionId = localStorage.getItem(sessionKey) || uuid();
  localStorage.setItem(sessionKey, sessionId);

  var state = {
    open: false,
    busy: false,
    phone: "",
    message: "Ready when you are.",
    status: "idle",
    latestExplanation: "",
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
    ":host{all:initial;position:fixed;z-index:2147483647;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1f2e}",
    "*{box-sizing:border-box}",
    ".wrap{position:fixed;right:22px;bottom:22px;display:flex;flex-direction:column;align-items:flex-end;gap:12px}",
    ".cursor{position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border:2px solid rgba(34,197,94,.85);border-radius:999px;box-shadow:0 0 0 9px rgba(34,197,94,.14);pointer-events:none;opacity:0;transform:translate3d(var(--x),var(--y),0);transition:opacity .2s ease}",
    ".cursor.on{opacity:1}",
    ".panel{width:min(360px,calc(100vw - 32px));border:1px solid rgba(20,28,45,.12);border-radius:20px;background:rgba(255,255,255,.94);box-shadow:0 24px 80px rgba(17,24,39,.22);backdrop-filter:blur(18px);overflow:hidden;transform-origin:bottom right;animation:saarthi-in .22s ease}",
    "@keyframes saarthi-in{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}",
    ".top{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid rgba(20,28,45,.09);background:linear-gradient(135deg,rgba(240,253,244,.92),rgba(255,247,237,.9))}",
    ".mark{display:grid;place-items:center;width:42px;height:42px;border-radius:16px;background:#10231a;color:#dcfce7;font-weight:800;box-shadow:inset 0 -12px 24px rgba(34,197,94,.16)}",
    ".title{font-size:15px;font-weight:800;letter-spacing:0}.sub{font-size:12px;color:#5f6b7a;margin-top:2px;line-height:1.35}",
    ".body{padding:16px;display:grid;gap:12px}",
    ".label{font-size:12px;font-weight:750;color:#4b5563}",
    ".input{width:100%;height:44px;border:1px solid rgba(20,28,45,.18);border-radius:14px;padding:0 13px;font:500 15px/1 inherit;color:#172033;outline:none;background:#fff}",
    ".input:focus{border-color:#16a34a;box-shadow:0 0 0 4px rgba(34,197,94,.16)}",
    ".row{display:flex;gap:10px}.row>*{min-width:0}",
    "button{font:750 14px/1 inherit;border:0;cursor:pointer}",
    ".primary{height:44px;min-width:126px;border-radius:14px;background:#172033;color:#fff;padding:0 16px;box-shadow:0 10px 26px rgba(23,32,51,.2)}",
    ".primary:disabled{cursor:not-allowed;opacity:.58}",
    ".secondary{height:40px;border-radius:13px;padding:0 13px;background:#eefdf3;color:#17613a;border:1px solid rgba(22,163,74,.18)}",
    ".note{padding:11px 12px;border-radius:14px;background:#f8fafc;color:#3d4656;font-size:13px;line-height:1.45;border:1px solid rgba(20,28,45,.08)}",
    ".note.good{background:#f0fdf4;color:#14532d;border-color:rgba(22,163,74,.18)}",
    ".note.warn{background:#fff7ed;color:#7c2d12;border-color:rgba(249,115,22,.18)}",
    ".pulse{display:inline-flex;width:7px;height:7px;border-radius:999px;background:#22c55e;margin-right:7px;box-shadow:0 0 0 5px rgba(34,197,94,.13);vertical-align:middle}",
    ".fab{display:flex;align-items:center;justify-content:center;gap:10px;height:58px;border-radius:999px;padding:0 18px 0 13px;background:#172033;color:#fff;box-shadow:0 18px 48px rgba(17,24,39,.28);border:1px solid rgba(255,255,255,.14)}",
    ".orb{display:grid;place-items:center;width:36px;height:36px;border-radius:999px;background:#dcfce7;color:#14532d;font-weight:900}",
    ".fabText{font-size:14px;font-weight:800;letter-spacing:0}.hidden{display:none!important}",
    ".close{margin-left:auto;width:32px;height:32px;border-radius:12px;background:rgba(255,255,255,.62);color:#172033}",
    ".mini{font-size:11px;color:#6b7280;line-height:1.35}.mono{font-family:'SFMono-Regular',Consolas,monospace}",
  ].join("");

  var root = document.createElement("div");
  shadow.appendChild(css);
  shadow.appendChild(root);

  function render() {
    root.innerHTML =
      '<div class="cursor ' +
      (state.status === "active" || state.status === "capturing" ? "on" : "") +
      '" style="--x:' +
      state.cursor.x +
      "px;--y:" +
      state.cursor.y +
      'px"></div>' +
      '<div class="wrap">' +
      '<section class="panel ' +
      (state.open ? "" : "hidden") +
      '" aria-live="polite">' +
      '<div class="top"><div class="mark">S</div><div><div class="title">Saarthi</div><div class="sub"><span class="pulse"></span>Voice help for this page</div></div><button class="close" type="button" data-action="close" aria-label="Close Saarthi">x</button></div>' +
      '<form class="body" data-action="form">' +
      '<label><div class="label">Phone number</div><input class="input" name="phone" inputmode="tel" autocomplete="tel" placeholder="+1 555 012 3456" value="' +
      escapeHtml(state.phone) +
      '"></label>' +
      '<div class="row"><button class="primary" type="submit" ' +
      (state.busy ? "disabled" : "") +
      ">" +
      (state.busy && state.status === "capturing" ? "Capturing..." : state.busy ? "Calling..." : "Call me") +
      '</button><button class="secondary ' +
      (demoMode ? "" : "hidden") +
      '" type="button" data-action="simulate">Try "what is this?"</button></div>' +
      '<div class="note ' +
      (state.status === "active" ? "good" : state.status === "error" ? "warn" : "") +
      '">' +
      escapeHtml(state.message) +
      "</div>" +
      (state.latestExplanation
        ? '<div class="note"><strong>Latest explanation</strong><br>' + escapeHtml(state.latestExplanation) + "</div>"
        : "") +
      '<div class="mini">Session <span class="mono">' +
      escapeHtml(sessionId.slice(0, 8)) +
      '</span>. Hover over the page during the call and ask, "What is this?"</div>' +
      "</form></section>" +
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

  function setState(next) {
    Object.assign(state, next);
    render();
  }

  function postJson(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Saarthi-Session": sessionId },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || data.ok === false) throw new Error(data.error || "Request failed.");
        return data;
      });
    });
  }

  function startCall(phone) {
    setState({
      busy: true,
      phone: phone,
      message: "Starting an ElevenLabs callback...",
      status: "calling",
    });

    return postJson(apiBase + "/api/call", {
      phone: phone,
      sessionId: sessionId,
      siteId: siteId,
      pageUrl: window.location.href,
      pageTitle: document.title,
    })
      .then(function (data) {
        setState({
          busy: false,
          status: "active",
          message:
            "Your call is starting. During the call, hover over anything and ask, “What is this?”",
        });
        if (data.sessionId && data.sessionId !== sessionId) {
          sessionId = data.sessionId;
          localStorage.setItem(sessionKey, sessionId);
        }
      })
      .catch(function (error) {
        setState({
          busy: false,
          status: "error",
          message: error.message || "Could not start the callback.",
        });
      });
  }

  function simulateWhatIsThis() {
    setState({
      busy: true,
      status: "capturing",
      message: 'Simulating the spoken phrase "What is this?"...',
    });

    fetch(apiBase + "/api/elevenlabs/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        question: "What is this?",
        dynamic_variables: { saarthi_session_id: sessionId },
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setState({
          busy: false,
          status: "active",
          message: "Saarthi answered the simulated tool call.",
          latestExplanation: data.explanation || data.response || "",
        });
      })
      .catch(function (error) {
        setState({
          busy: false,
          status: "error",
          message: error.message || "The simulated explanation failed.",
        });
      });
  }

  function updateCursor(event) {
    var path = event.composedPath ? event.composedPath() : [];
    if (path.indexOf(host) !== -1) {
      return;
    }

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

  function describeElement(el) {
    if (!el) return {};
    var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    var labelText = "";
    var id = el.getAttribute && el.getAttribute("id");
    if (id) {
      var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
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
      href: el.getAttribute && (el.getAttribute("href") || null),
      value:
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
          ? safeFormValue(el)
          : null,
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

  function safeFormValue(el) {
    var type = (el.getAttribute("type") || "").toLowerCase();
    if (type === "password" || type === "hidden" || /card|cc|cvv|token|secret/i.test(el.name || "")) {
      return "[redacted]";
    }
    return String(el.value || "").slice(0, 80);
  }

  function buildSelector(el) {
    if (!el || !el.tagName) return null;
    if (el.id) return "#" + CSS.escape(el.id);
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

  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (window.__saarthiHtml2CanvasPromise) return window.__saarthiHtml2CanvasPromise;

    window.__saarthiHtml2CanvasPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.async = true;
      script.onload = function () {
        resolve(window.html2canvas);
      };
      script.onerror = function () {
        reject(new Error("Could not load html2canvas."));
      };
      document.head.appendChild(script);
    });
    return window.__saarthiHtml2CanvasPromise;
  }

  function shouldIgnoreElement(el) {
    if (!el || !el.closest) return false;
    return Boolean(
      el.closest("#saarthi-widget-root") ||
        el.closest("[data-saarthi-private]") ||
        el.closest("[aria-hidden='true'][data-saarthi-ignore]")
    );
  }

  function redactClone(clonedDocument) {
    var safeStyle = clonedDocument.createElement("style");
    safeStyle.textContent = [
      ":root,html,body{background:#ffffff!important;color:#172033!important}",
      "*,*::before,*::after{background-image:none!important;border-color:rgba(23,32,51,.16)!important;box-shadow:none!important;color:#172033!important;outline-color:#22c55e!important;text-shadow:none!important}",
      "button,a,[role='button']{background:#172033!important;color:#ffffff!important}",
      "input,textarea,select{background:#ffffff!important;color:#172033!important}",
      "[data-saarthi-redacted]{background:#fee2e2!important;color:#7f1d1d!important}",
    ].join("");
    clonedDocument.head.appendChild(safeStyle);

    var selectors = [
      "input[type='password']",
      "input[name*='card' i]",
      "input[name*='cc' i]",
      "input[name*='cvv' i]",
      "input[autocomplete='cc-number']",
      "input[autocomplete='one-time-code']",
      "[data-saarthi-private]",
    ];
    clonedDocument.querySelectorAll(selectors.join(",")).forEach(function (node) {
      if ("value" in node) node.value = "[redacted]";
      node.textContent = "[redacted]";
      node.setAttribute("data-saarthi-redacted", "true");
    });
  }

  function cropCanvas(canvas, centerX, centerY, size) {
    var scaleX = canvas.width / Math.max(1, window.innerWidth);
    var scaleY = canvas.height / Math.max(1, window.innerHeight);
    var cropSizeX = Math.min(canvas.width, Math.round(size * scaleX));
    var cropSizeY = Math.min(canvas.height, Math.round(size * scaleY));
    var sx = Math.max(0, Math.min(canvas.width - cropSizeX, Math.round(centerX * scaleX - cropSizeX / 2)));
    var sy = Math.max(0, Math.min(canvas.height - cropSizeY, Math.round(centerY * scaleY - cropSizeY / 2)));
    var out = document.createElement("canvas");
    out.width = cropSizeX;
    out.height = cropSizeY;
    var ctx = out.getContext("2d");
    ctx.drawImage(canvas, sx, sy, cropSizeX, cropSizeY, 0, 0, cropSizeX, cropSizeY);
    return out;
  }

  function compressCanvas(canvas, quality, maxWidth) {
    var source = canvas;
    if (canvas.width > maxWidth) {
      var resized = document.createElement("canvas");
      var ratio = maxWidth / canvas.width;
      resized.width = maxWidth;
      resized.height = Math.round(canvas.height * ratio);
      resized.getContext("2d").drawImage(canvas, 0, 0, resized.width, resized.height);
      source = resized;
    }
    return source.toDataURL("image/jpeg", quality);
  }

  function fallbackImage() {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lJVr9QAAAABJRU5ErkJggg==";
  }

  function postFallbackContext(action, error) {
    var cursor = state.cursor;
    var target = document.elementFromPoint(cursor.x, cursor.y);
    return postJson(apiBase + "/api/sessions/" + encodeURIComponent(sessionId) + "/context", {
      actionId: action.id,
      sessionId: sessionId,
      capturedAt: new Date().toISOString(),
      page: {
        url: window.location.href,
        title: document.title,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scroll: { x: window.scrollX, y: window.scrollY },
        cursor: { x: cursor.x, y: cursor.y },
      },
      element: Object.assign(describeElement(target), {
        captureError: error && error.message ? error.message : "html2canvas capture failed",
      }),
      screenshots: {
        viewport: fallbackImage(),
        crop400: fallbackImage(),
        crop100: fallbackImage(),
      },
    });
  }

  function captureContext(action) {
    setState({ status: "capturing", message: "Looking at the item under your cursor..." });
    var cursor = state.cursor;
    var target = document.elementFromPoint(cursor.x, cursor.y);
    var element = describeElement(target);

    return loadHtml2Canvas()
      .then(function (html2canvas) {
        return html2canvas(document.documentElement, {
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          scale: Math.min(window.devicePixelRatio || 1, 2),
          x: window.scrollX,
          y: window.scrollY,
          width: window.innerWidth,
          height: window.innerHeight,
          windowWidth: document.documentElement.scrollWidth,
          windowHeight: document.documentElement.scrollHeight,
          ignoreElements: shouldIgnoreElement,
          onclone: redactClone,
        });
      })
      .then(function (canvas) {
        var payload = {
          actionId: action.id,
          sessionId: sessionId,
          capturedAt: new Date().toISOString(),
          page: {
            url: window.location.href,
            title: document.title,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            scroll: { x: window.scrollX, y: window.scrollY },
            cursor: { x: cursor.x, y: cursor.y },
          },
          element: element,
          screenshots: {
            viewport: compressCanvas(canvas, 0.68, 1280),
            crop400: compressCanvas(cropCanvas(canvas, cursor.x, cursor.y, 400), 0.78, 900),
            crop100: compressCanvas(cropCanvas(canvas, cursor.x, cursor.y, 100), 0.86, 420),
          },
        };

        return postJson(apiBase + "/api/sessions/" + encodeURIComponent(sessionId) + "/context", payload);
      })
      .then(function () {
        setState({
          status: "active",
          message: "I sent Saarthi a fresh look at the page.",
        });
      })
      .catch(function (error) {
        return postFallbackContext(action, error).finally(function () {
          setState({
            status: "active",
            message:
              "The page resisted screenshot capture, so I sent Saarthi the element details instead.",
          });
        });
      });
  }

  function poll() {
    fetch(apiBase + "/api/sessions/" + encodeURIComponent(sessionId) + "/actions", {
      headers: { "X-Saarthi-Session": sessionId },
    })
      .then(function (res) {
        return res.ok ? res.json() : { actions: [] };
      })
      .then(function (data) {
        (data.actions || []).forEach(function (action) {
          if (handledActions[action.id]) return;
          handledActions[action.id] = true;
          captureContext(action);
        });
      })
      .catch(function () {});
  }

  shadow.addEventListener("click", function (event) {
    var actionTarget =
      event.target && event.target.closest ? event.target.closest("[data-action]") : null;
    var action = actionTarget && actionTarget.getAttribute("data-action");
    if (action === "toggle") setState({ open: !state.open });
    if (action === "close") setState({ open: false });
    if (action === "simulate") simulateWhatIsThis();
  });

  shadow.addEventListener("submit", function (event) {
    event.preventDefault();
    var form = event.target;
    var input = form.querySelector("input[name='phone']");
    startCall(input.value);
  });

  shadow.addEventListener("input", function (event) {
    if (event.target && event.target.name === "phone") {
      state.phone = event.target.value;
    }
  });

  window.addEventListener("pointermove", updateCursor, { passive: true });
  window.addEventListener("mousemove", updateCursor, { passive: true });
  window.addEventListener("beforeunload", function () {
    window.__saarthiWidgetLoaded = false;
  });

  render();
  setInterval(poll, Math.max(450, pollMs));
  setTimeout(poll, 300);
})();
