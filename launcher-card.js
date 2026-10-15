
const CARD_VERSION = "0.2.1";

const PRESETS = {
  blue: ["#4facfe", "#1d5fe0"],
  purple: ["#b57bff", "#6a2fd6"],
  pink: ["#ff8ac0", "#e0286f"],
  red: ["#ff7a7a", "#d62828"],
  orange: ["#ffb347", "#f0620a"],
  yellow: ["#ffe259", "#f2a900"],
  green: ["#6fe08c", "#119a4a"],
  teal: ["#5eead4", "#0d8f8f"],
  graphite: ["#7b8794", "#2b3139"],
  light: ["#ffffff", "#d5dbe3"],
};
const PRESET_NAMES = Object.keys(PRESETS);

const BADGE_STYLES = {
  gradient: "Gradient",
  aurora: "Aurora (mesh gradient)",
  glass: "Glass",
  clay: "Clay (soft 3D)",
  tinted: "Tinted",
  dark: "Dark",
  neon: "Neon",
  flat: "Flat",
  minimal: "Minimal (icon only)",
};

const ICON_SHADOWS = {
  none: "drop-shadow(0 0 0 transparent)",
  soft: "drop-shadow(0 1px 2px rgba(0,0,0,.25))",
  medium: "drop-shadow(0 2px 3px rgba(0,0,0,.4))",
  strong: "drop-shadow(0 3px 5px rgba(0,0,0,.55)) drop-shadow(0 0 2px rgba(0,0,0,.35))",
};

const DEFAULTS = {
  columns: "auto",
  badge_size: 60,
  gap: 18,
  align: "center",
  border_radius: "theme",
  badge_style: "gradient",
  gradient_angle: 145,
  icon_shadow: "soft",
  shine: true,
  shadow: true,
  show_names: true,
  name_size: 12,
  name_overflow: "scroll",
  dock_names: false,
  active_indicator: true,
  dim_unavailable: true,
  press_animation: true,
  haptic: true,
  card_background: true,
};

const INACTIVE_STATES = ["off", "unavailable", "unknown", "idle", "closed", "not_home", "standby", "none", "0", ""];

const isUrl = (s) => typeof s === "string" && /^(https?:)?\/\//.test(s);
const isImage = (s) =>
  typeof s === "string" &&
  (isUrl(s) || s.startsWith("/") || s.startsWith("data:") || /\.(png|jpe?g|svg|webp|gif|ico)(\?.*)?$/i.test(s));
const imageOf = (app) => app.image || (isImage(app.icon) ? app.icon : null);

const colorCache = new Map();

function extractColors(src) {
  if (colorCache.has(src)) return colorCache.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const s = 32;
        const c = document.createElement("canvas");
        c.width = c.height = s;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, s, s);
        const d = ctx.getImageData(0, 0, s, s).data;
        const buckets = new Map();
        for (let i = 0; i < d.length; i += 4) {
          const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
          if (a < 128) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max - min < 30 && (max > 225 || max < 40)) continue;
          const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
          const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0, sat: max - min };
          e.n++; e.r += r; e.g += g; e.b += b;
          buckets.set(key, e);
        }
        const list = [...buckets.values()].sort((x, y) => y.n * (1 + y.sat / 255) - x.n * (1 + x.sat / 255));
        if (!list.length) return resolve(null);
        const rgb = (e) => [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)];
        const a = rgb(list[0]);
        let b = list.length > 1 ? rgb(list[1]) : null;
        const shade = (c, f) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
        const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
        const dist = b ? Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) : 0;
        if (!b || dist < 60) resolve([hex(shade(a, 1.15)), hex(shade(a, 0.65))]);
        else resolve([hex(a), hex(b)]);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  colorCache.set(src, p);
  return p;
}

function appColors(app) {
  const preset = PRESETS[app.badge_color] || PRESETS[app.color];
  if (preset) return preset;
  const c1 = app.color || app.badge_color;
  if (c1) return [c1, app.color2 || c1];
  return null;
}

class LauncherCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:launcher-card",
      columns: "auto",
      apps: [
        { name: "Lights", icon: "mdi:lightbulb", path: "/lovelace/lights", color: "yellow" },
        { name: "Climate", icon: "mdi:thermostat", path: "/lovelace/climate", color: "orange" },
        { name: "Cameras", icon: "mdi:cctv", path: "/lovelace/cameras", color: "graphite" },
        { name: "Energy", icon: "mdi:lightning-bolt", path: "/energy", color: "green" },
      ],
    };
  }

  static getConfigElement() {
    return document.createElement("launcher-card-editor");
  }

  setConfig(config) {
    if (!config || !Array.isArray(config.apps)) throw new Error("launcher-card: 'apps' list is required");
    const c = { ...DEFAULTS, ...config };
    if (config.badge_size === undefined && config.icon_size !== undefined) {
      c.badge_size = config.icon_size;
      delete c.icon_size;
    }
    this._config = c;
    this._render();
  }

  connectedCallback() {
    if (!this._ro) this._ro = new ResizeObserver(() => this._layout());
    this._ro.observe(this);
  }

  disconnectedCallback() {
    if (this._ro) this._ro.disconnect();
  }

  _metrics() {
    const c = this._config;
    const badge = Number(c.badge_size) || 60;
    const nameSize = Number(c.name_size) || 12;
    const lineH = Math.ceil(nameSize * 1.25);
    const nameLines = c.show_names ? (c.name_overflow === "wrap" ? 2 : 1) : 0;
    const labelGap = nameLines ? 7 : 0;
    const cellH = badge + labelGap + nameLines * lineH;
    const scaled = (f) => Math.round(badge * (Number(c.icon_scale) || f));
    const icon = Number(c.icon_size) || (c.badge_style === "minimal" ? scaled(0.8) : scaled(0.55));
    const image = Number(c.icon_size) || Math.round(badge * (Number(c.image_scale) || 0.62));
    return { badge, lineH, labelGap, cellH, icon, image, gap: Math.max(0, Number(c.gap) || 0) };
  }

  _layout() {
    if (!this.shadowRoot || !this._config) return;
    const grid = this.shadowRoot.querySelector(".grid");
    if (!grid) return;
    const m = this._metrics();
    const cols = this._fixedCols();
    if (cols) {
      const pitch = grid.clientWidth / cols;
      grid.style.rowGap = `${Math.max(4, Math.round(pitch - m.cellH))}px`;
    }
    if (this._config.name_overflow !== "scroll") return;
    this.shadowRoot.querySelectorAll(".name").forEach((n) => {
      const track = n.firstElementChild;
      const text = track.firstElementChild;
      n.classList.remove("marquee");
      const over = text.scrollWidth - n.clientWidth;
      if (over > 1) {
        n.classList.add("marquee");
        const dist = text.offsetWidth + 24;
        track.style.setProperty("--dist", `${dist}px`);
        track.style.setProperty("--dur", `${Math.max(4, dist / 30 + 2)}s`);
      }
    });
  }

  _fixedCols() {
    const c = this._config.columns;
    return c === "auto" || !c ? null : Math.max(1, Number(c) || 4);
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first && this._config && this._config.apps.some((a) => a.users)) this._render();
    else this._update();
  }

  getCardSize() {
    const c = this._config;
    const cols = c.columns === "auto" || !c.columns ? 4 : Number(c.columns);
    return Math.max(1, Math.ceil(c.apps.length / cols) * 2);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 3 };
  }

  _radius() {
    const r = this._config.border_radius;
    if (r === "theme" || r === undefined || r === null || r === "") return "var(--ha-card-border-radius, 12px)";
    if (r === "circle") return "50%";
    if (typeof r === "number") return `${r}px`;
    return /^\d+(\.\d+)?$/.test(String(r)) ? `${r}px` : String(r);
  }

  _visible(app) {
    if (app.hidden) return false;
    if (Array.isArray(app.users) && app.users.length) {
      const u = this._hass && this._hass.user;
      if (!u) return false;
      return app.users.some((x) => x === u.id || String(x).toLowerCase() === String(u.name).toLowerCase());
    }
    return true;
  }

  _styles() {
    const c = this._config;
    const m = this._metrics();
    const size = m.badge;
    const cols = this._fixedCols();
    const grid = cols
      ? `grid-template-columns:repeat(${cols}, minmax(0, 1fr)); column-gap:0; row-gap:${m.gap}px;`
      : `grid-template-columns:repeat(auto-fit, ${m.cellH}px); gap:${m.gap}px;`;
    const justify = { start: "start", end: "end", center: "center" }[c.align] || "center";
    const dockCell = c.dock_names ? m.cellH : size;
    const outer = c.shadow
      ? "0 6px 14px -5px color-mix(in srgb, var(--c2) 65%, rgba(0,0,0,.55)), 0 2px 4px rgba(0,0,0,.18)"
      : "0 0 #0000";

    return `
      :host { display:block; }
      ha-card { ${c.card_background ? "" : "background:none;box-shadow:none;border:none;"} overflow:hidden; }
      .title { padding:16px 16px 0; font-size:var(--ha-card-header-font-size, 20px); font-weight:500; color:var(--primary-text-color); }
      .grid { display:grid; ${grid} margin:16px; justify-items:center; justify-content:${justify};
              ${c.icon_color ? `--glob-ic:${c.icon_color};` : ""} }
      .dock { margin:0 12px 12px; padding:12px; border-radius:calc(${this._radius()} + 10px);
              display:grid; grid-auto-flow:column; grid-auto-columns:${dockCell}px; gap:${m.gap}px; justify-content:center;
              background:color-mix(in srgb, var(--primary-text-color) 7%, transparent);
              backdrop-filter:blur(18px) saturate(160%); -webkit-backdrop-filter:blur(18px) saturate(160%);
              box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--primary-text-color) 8%, transparent);
              ${c.icon_color ? `--glob-ic:${c.icon_color};` : ""} }
      .dock[hidden] { display:none; }
      .app { display:flex; flex-direction:column; align-items:center; gap:${m.labelGap}px; width:100%; min-width:0;
             cursor:pointer; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;
             -webkit-tap-highlight-color:transparent; outline:none; touch-action:manipulation; }
      .wrap { position:relative; flex:none; }
      .badge { --ang:${Number(c.gradient_angle)}deg; --ic:#fff; --outer:${outer}; --ish:${ICON_SHADOWS[c.icon_shadow] || ICON_SHADOWS.soft};
               position:relative; width:${size}px; height:${size}px; border-radius:${this._radius()};
               display:flex; align-items:center; justify-content:center; overflow:hidden;
               transition:transform .18s cubic-bezier(.3,.7,.4,1.4), filter .18s ease, opacity .2s ease;
               box-shadow:var(--outer); }
      .badge::after { content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit; }

      /* ---- badge styles ---- */
      .s-gradient { background:linear-gradient(var(--ang), var(--c1), var(--c2));
                    box-shadow:var(--outer), inset 0 0 0 1px rgba(255,255,255,.12); }
      .s-aurora { background:
                    radial-gradient(120% 90% at 12% 8%, color-mix(in srgb, var(--c1) 55%, #fff) 0%, transparent 55%),
                    radial-gradient(90% 90% at 92% 95%, color-mix(in srgb, var(--c2) 80%, #000) 0%, transparent 65%),
                    radial-gradient(70% 70% at 85% 15%, color-mix(in srgb, var(--c2) 60%, var(--c1)) 0%, transparent 70%),
                    linear-gradient(var(--ang), var(--c1), var(--c2));
                  box-shadow:var(--outer), inset 0 0 0 1px rgba(255,255,255,.14); }
      .s-glass { background:linear-gradient(var(--ang), color-mix(in srgb, var(--c1) 60%, transparent), color-mix(in srgb, var(--c2) 28%, transparent));
                 backdrop-filter:blur(14px) saturate(170%); -webkit-backdrop-filter:blur(14px) saturate(170%);
                 box-shadow:var(--outer), inset 0 0 0 1px rgba(255,255,255,.32), inset 0 1px 1px rgba(255,255,255,.55); }
      .s-clay { background:linear-gradient(var(--ang), color-mix(in srgb, var(--c1) 85%, #fff), var(--c2));
                box-shadow:var(--outer), inset 0 -5px 9px color-mix(in srgb, var(--c2) 60%, rgba(0,0,0,.45)),
                           inset 0 5px 8px rgba(255,255,255,.45); }
      .s-tinted { --ic:var(--c1); background:color-mix(in srgb, var(--c1) 17%, var(--card-background-color, #fff));
                  box-shadow:${c.shadow ? "0 3px 8px -4px rgba(0,0,0,.25)," : ""} inset 0 0 0 1px color-mix(in srgb, var(--c1) 28%, transparent); }
      .s-dark { --ic:color-mix(in srgb, var(--c1) 85%, #fff);
                background:radial-gradient(120% 100% at 30% 0%, #3b3f47 0%, #1b1d22 60%, #121317 100%);
                box-shadow:var(--outer), inset 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.1); }
      .s-neon { --ic:var(--c1); background:radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--c1) 22%, #0d0f14) 0%, #0a0b0f 75%);
                box-shadow:inset 0 0 0 1.5px var(--c1), inset 0 0 14px color-mix(in srgb, var(--c1) 40%, transparent),
                           0 0 16px -3px color-mix(in srgb, var(--c1) 75%, transparent); }
      .s-neon ha-icon { filter:var(--ish) drop-shadow(0 0 6px var(--c1)); }
      .s-flat { background:var(--c1); }
      .s-minimal { --ic:var(--c1); background:none; box-shadow:none; overflow:visible; }

      ${c.shine ? `.s-gradient::after, .s-aurora::after, .s-flat::after, .s-glass::after, .s-clay::after {
                     background:linear-gradient(180deg, rgba(255,255,255,.3), rgba(255,255,255,0) 52%); }` : ""}

      .app:focus-visible .badge { outline:2px solid var(--primary-color); outline-offset:3px; }
      ${c.press_animation ? ".app.pressed .badge, .app:active .badge { transform:scale(.88); filter:brightness(.88); }" : ""}
      @media (hover:hover) { .app:hover .badge { transform:translateY(-2px); }
        ${c.press_animation ? ".app:active:hover .badge { transform:scale(.88); }" : ""} }

      ha-icon { --mdc-icon-size:${m.icon}px; display:flex; position:relative; z-index:1;
                color:var(--app-ic, var(--glob-ic, var(--ic))); filter:var(--ish); }
      img { width:${m.image}px; height:${m.image}px; max-width:100%; max-height:100%;
            object-fit:contain; position:relative; z-index:1; filter:var(--ish); }
      img.cover { width:100%; height:100%; object-fit:cover; filter:none; }

      .notify { position:absolute; top:-6px; right:-6px; z-index:2; min-width:20px; height:20px; padding:0 6px; box-sizing:border-box;
                border-radius:10px; background:var(--notify-color, #ff3b30); color:#fff; font-size:11px; font-weight:600;
                display:none; align-items:center; justify-content:center; line-height:1;
                box-shadow:0 0 0 2px var(--card-background-color, #fff), 0 2px 4px rgba(0,0,0,.3); }
      .notify.dot { min-width:12px; width:12px; height:12px; padding:0; top:-3px; right:-3px; }
      .notify.show { display:flex; animation:pop .25s cubic-bezier(.3,.7,.4,1.6); }
      @keyframes pop { from { transform:scale(0); } to { transform:scale(1); } }

      .indicator { position:absolute; left:50%; bottom:-6px; width:4px; height:4px; margin-left:-2px; border-radius:50%;
                   background:var(--primary-text-color); opacity:0; transition:opacity .2s ease; }
      .app.active .indicator { opacity:.7; }
      .app.unavail .badge { filter:grayscale(1); opacity:.45; }

      .name { font-size:${Number(c.name_size) || 12}px; line-height:${m.lineH}px; height:${m.lineH * (c.name_overflow === "wrap" ? 2 : 1)}px;
              width:100%; text-align:center; overflow:hidden; color:${c.name_color || "var(--primary-text-color)"}; }
      .track { display:inline-block; max-width:100%; white-space:nowrap; }
      .t { display:inline-block; white-space:nowrap; }
      .t.clone { display:none; padding-left:24px; }
      ${c.name_overflow === "wrap" ? `
      .track, .t { display:block; white-space:normal; }
      .t { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; }` : ""}
      ${c.name_overflow === "ellipsis" ? `.track, .t { display:block; overflow:hidden; text-overflow:ellipsis; }` : ""}
      .marquee { text-align:left;
                 -webkit-mask-image:linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
                 mask-image:linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
      .marquee .track { max-width:none; animation:marquee var(--dur, 8s) linear infinite; }
      .marquee .t.clone { display:inline-block; }
      @keyframes marquee { 0%, 18% { transform:translateX(0); } 100% { transform:translateX(calc(-1 * var(--dist))); } }
      @media (prefers-reduced-motion: reduce) {
        .marquee { -webkit-mask-image:none; mask-image:none; text-align:center; }
        .marquee .track { animation:none; max-width:100%; overflow:hidden; text-overflow:ellipsis; }
        .marquee .t.clone { display:none; }
      }
    `;
  }

  _render() {
    const c = this._config;
    if (!c) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <ha-card>
        ${c.title ? `<div class="title"></div>` : ""}
        <div class="grid"></div>
        <div class="dock" hidden></div>
      </ha-card>`;
    if (c.title) this.shadowRoot.querySelector(".title").textContent = c.title;

    const gridEl = this.shadowRoot.querySelector(".grid");
    const dockEl = this.shadowRoot.querySelector(".dock");
    const style = BADGE_STYLES[c.badge_style] ? c.badge_style : "gradient";
    this._els = [];

    c.apps.forEach((app) => {
      if (!this._visible(app)) return;
      const inDock = !!app.dock;
      const el = document.createElement("div");
      el.className = "app";
      el.tabIndex = 0;
      el.title = app.name || "";
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", app.name || "app");

      const wrap = document.createElement("div");
      wrap.className = "wrap";
      const badge = document.createElement("div");
      badge.className = `badge s-${style}`;
      const colors = appColors(app);
      const setColors = (cc) => {
        badge.style.setProperty("--c1", cc[0]);
        badge.style.setProperty("--c2", cc[1]);
      };
      setColors(colors || PRESETS.blue);

      const src = imageOf(app);
      if (src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.draggable = false;
        if (app.fill === true || app.image_fill === true) {
          img.className = "cover";
          badge.style.background = "none";
        }
        if (!colors && app.auto_color !== false) extractColors(src).then((cc) => cc && setColors(cc));
        badge.appendChild(img);
      } else if (app.icon) {
        const ic = document.createElement("ha-icon");
        ic.setAttribute("icon", app.icon);
        if (app.icon_color) ic.style.setProperty("--app-ic", app.icon_color);
        badge.appendChild(ic);
      }
      wrap.appendChild(badge);

      const notify = document.createElement("div");
      notify.className = "notify";
      if (app.notify_color) notify.style.setProperty("--notify-color", app.notify_color);
      wrap.appendChild(notify);

      if (c.active_indicator && app.entity) {
        const ind = document.createElement("div");
        ind.className = "indicator";
        wrap.appendChild(ind);
      }
      el.appendChild(wrap);

      const showName = inDock ? c.dock_names : c.show_names;
      if (showName) {
        const n = document.createElement("div");
        n.className = "name";
        const track = document.createElement("span");
        track.className = "track";
        const t = document.createElement("span");
        t.className = "t";
        t.textContent = app.name || "";
        const clone = t.cloneNode(true);
        clone.classList.add("clone");
        clone.setAttribute("aria-hidden", "true");
        track.append(t, clone);
        n.appendChild(track);
        el.appendChild(n);
      }

      this._bindActions(el, app);
      (inDock ? dockEl : gridEl).appendChild(el);
      this._els.push({ app, el, notify });
    });

    dockEl.hidden = !dockEl.children.length;
    this._update();
    requestAnimationFrame(() => this._layout());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this._layout());
  }

  _update() {
    if (!this._hass || !this._els) return;
    const states = this._hass.states;
    for (const { app, el, notify } of this._els) {
      if (app.notify_entity) {
        const st = states[app.notify_entity];
        const s = st ? String(st.state) : "";
        const n = Number(s);
        let text = null;
        if (s !== "" && !isNaN(n)) text = n > 0 ? (n > 99 ? "99+" : String(Math.round(n))) : null;
        else if (["on", "true", "problem", "home", "open", "unlocked"].includes(s.toLowerCase())) text = "";
        notify.classList.toggle("show", text !== null);
        notify.classList.toggle("dot", text === "");
        notify.textContent = text || "";
      }
      if (app.entity) {
        const st = states[app.entity];
        const s = st ? String(st.state) : "unavailable";
        el.classList.toggle("active", !INACTIVE_STATES.includes(s) && !(Number(s) === 0 && s.trim() !== "" && !isNaN(Number(s))));
        el.classList.toggle("unavail", this._config.dim_unavailable && (s === "unavailable" || !st));
      }
    }
  }

  _bindActions(el, app) {
    const has = (k) => app[k] && app[k].action && app[k].action !== "none";
    let timer = null, held = false, tapTimer = null;

    el.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      held = false;
      el.classList.add("pressed");
      if (has("hold_action")) {
        timer = setTimeout(() => {
          held = true;
          el.classList.remove("pressed");
          this._act(app, "hold");
        }, 500);
      }
    });
    const cancel = () => {
      clearTimeout(timer);
      el.classList.remove("pressed");
    };
    ["pointerup", "pointerleave", "pointercancel"].forEach((t) => el.addEventListener(t, cancel));
    el.addEventListener("contextmenu", (e) => has("hold_action") && e.preventDefault());

    el.addEventListener("click", () => {
      if (held) {
        held = false;
        return;
      }
      if (has("double_tap_action")) {
        if (tapTimer) {
          clearTimeout(tapTimer);
          tapTimer = null;
          this._act(app, "double_tap");
        } else {
          tapTimer = setTimeout(() => {
            tapTimer = null;
            this._act(app, "tap");
          }, 250);
        }
      } else this._act(app, "tap");
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._act(app, "tap");
      }
    });
  }

  _resolve(app, kind) {
    if (kind !== "tap") return app[`${kind}_action`];
    if (app.tap_action) return app.tap_action;
    const path = app.path || app.navigation_path;
    if (path) {
      return isUrl(path)
        ? { action: "url", url_path: path, new_tab: !!app.new_tab }
        : { action: "navigate", navigation_path: path, new_tab: !!app.new_tab };
    }
    if (app.entity) return { action: "more-info" };
    return null;
  }

  _act(app, kind) {
    const a = this._resolve(app, kind);
    if (!a || !a.action || a.action === "none") return;
    if (a.confirmation) {
      const text = a.confirmation.text || `Are you sure you want to run "${app.name || a.action}"?`;
      if (!window.confirm(text)) return;
    }
    if (this._config.haptic) this._fire("haptic", kind === "hold" ? "medium" : "light");
    const entity = a.entity || app.entity;

    switch (a.action) {
      case "navigate": {
        const path = a.navigation_path;
        if (!path) return;
        if (a.new_tab) {
          window.open(path, "_blank", "noopener");
          return;
        }
        if (a.navigation_replace) window.history.replaceState(null, "", path);
        else window.history.pushState(null, "", path);
        this._fire("location-changed", { replace: !!a.navigation_replace }, window);
        return;
      }
      case "url":
        if (!a.url_path) return;
        if (a.new_tab === false) window.location.href = a.url_path;
        else window.open(a.url_path, "_blank", "noopener");
        return;
      case "more-info":
        if (entity) this._fire("hass-more-info", { entityId: entity });
        return;
      case "toggle":
        if (entity && this._hass) this._hass.callService("homeassistant", "toggle", { entity_id: entity });
        return;
      case "perform-action":
      case "call-service": {
        const svc = a.perform_action || a.service;
        if (!svc || !this._hass) return;
        const [domain, service] = svc.split(".", 2);
        this._hass.callService(domain, service, a.data || a.service_data || {}, a.target);
        return;
      }
      default:
        this._fire("hass-action", { config: { entity, tap_action: a }, action: "tap" });
    }
  }

  _fire(type, detail, target = this) {
    target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}


const HELPER_KEYS = ["columns_mode", "columns_count", "radius_mode", "radius_value"];

class LauncherCardEditor extends HTMLElement {
  constructor() {
    super();
    this._open = new Set();
  }

  setConfig(config) {
    this._config = config;
    const count = (config.apps || []).length;
    if (!this._built || count !== this._rows.length) this._build();
    else this._sync();
  }

  set hass(h) {
    this._hass = h;
    this.querySelectorAll("ha-form").forEach((f) => (f.hass = h));
  }

  _emit(config) {
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  _generalSchema() {
    const opt = (o) => Object.entries(o).map(([value, label]) => ({ value, label }));
    return [
      { name: "title", selector: { text: {} } },
      {
        type: "expandable",
        name: "",
        flatten: true,
        title: "Layout",
        icon: "mdi:view-grid-outline",
        schema: [
          {
            type: "grid",
            name: "",
            schema: [
              { name: "columns_mode", label: "Columns", selector: { select: { mode: "dropdown", options: opt({ auto: "Auto-fit", fixed: "Fixed" }) } } },
              { name: "columns_count", label: "Apps per row", selector: { number: { min: 1, max: 12, mode: "box" } } },
              { name: "badge_size", label: "Badge size (px)", selector: { number: { min: 24, max: 160, mode: "box" } } },
              { name: "icon_size", label: "Icon size (px, empty = auto)", selector: { number: { min: 8, max: 160, mode: "box" } } },
              { name: "gap", label: "Row gap (px)", selector: { number: { min: 0, max: 60, mode: "box" } } },
              { name: "align", label: "Alignment", selector: { select: { mode: "dropdown", options: opt({ start: "Left", center: "Center", end: "Right" }) } } },
              { name: "card_background", label: "Card background", selector: { boolean: {} } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "",
        flatten: true,
        title: "Badges",
        icon: "mdi:palette-outline",
        schema: [
          { name: "badge_style", label: "Badge style", selector: { select: { mode: "dropdown", options: opt(BADGE_STYLES) } } },
          {
            type: "grid",
            name: "",
            schema: [
              { name: "radius_mode", label: "Rounding", selector: { select: { mode: "dropdown", options: opt({ theme: "Follow theme", fixed: "Fixed value", circle: "Circle" }) } } },
              { name: "radius_value", label: "Rounding (px)", selector: { number: { min: 0, max: 64, mode: "box" } } },
              { name: "gradient_angle", label: "Gradient angle", selector: { number: { min: 0, max: 360, mode: "box" } } },
              { name: "icon_color", label: "Icon color (all apps)", selector: { text: {} } },
              { name: "icon_shadow", label: "Icon shadow", selector: { select: { mode: "dropdown", options: opt({ none: "None", soft: "Soft", medium: "Medium", strong: "Strong" }) } } },
              { name: "shine", label: "Glossy highlight", selector: { boolean: {} } },
              { name: "shadow", label: "Badge shadow", selector: { boolean: {} } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "",
        flatten: true,
        title: "Names",
        icon: "mdi:format-text",
        schema: [
          {
            type: "grid",
            name: "",
            schema: [
              { name: "show_names", label: "Show names", selector: { boolean: {} } },
              { name: "dock_names", label: "Show names in dock", selector: { boolean: {} } },
              { name: "name_size", label: "Name size (px)", selector: { number: { min: 8, max: 24, mode: "box" } } },
              {
                name: "name_overflow",
                label: "Long names",
                selector: { select: { mode: "dropdown", options: opt({ scroll: "Scroll (marquee)", ellipsis: "Cut off (…)", wrap: "Wrap to 2 lines" }) } },
              },
              { name: "name_color", label: "Name color", selector: { text: {} } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "",
        flatten: true,
        title: "Behaviour",
        icon: "mdi:gesture-tap",
        schema: [
          {
            type: "grid",
            name: "",
            schema: [
              { name: "press_animation", label: "Press animation", selector: { boolean: {} } },
              { name: "haptic", label: "Haptic feedback", selector: { boolean: {} } },
              { name: "active_indicator", label: "Active entity dot", selector: { boolean: {} } },
              { name: "dim_unavailable", label: "Dim unavailable", selector: { boolean: {} } },
            ],
          },
        ],
      },
    ];
  }

  _appSchema() {
    return [
      { name: "name", label: "Name", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "icon", label: "Icon", selector: { icon: {} } },
          { name: "image", label: "Image URL (replaces icon)", selector: { text: {} } },
        ],
      },
      { name: "path", label: "Navigation path or URL", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          {
            name: "color",
            label: "Badge color",
            selector: {
              select: {
                mode: "dropdown",
                custom_value: true,
                options: [{ value: "", label: "Auto (from logo)" }, ...PRESET_NAMES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))],
              },
            },
          },
          { name: "color2", label: "Second color", selector: { text: {} } },
          { name: "icon_color", label: "Icon color", selector: { text: {} } },
          { name: "notify_color", label: "Notification color", selector: { text: {} } },
        ],
      },
      {
        type: "expandable",
        name: "",
        flatten: true,
        title: "Entity & notifications",
        icon: "mdi:bell-badge-outline",
        schema: [
          { name: "entity", label: "Entity (state dot, more-info, toggle)", selector: { entity: {} } },
          { name: "notify_entity", label: "Notification badge entity (count or on/off)", selector: { entity: {} } },
        ],
      },
      {
        type: "expandable",
        name: "",
        flatten: true,
        title: "Actions",
        icon: "mdi:gesture-tap-hold",
        schema: [
          { name: "tap_action", label: "Tap (overrides path)", selector: { ui_action: {} } },
          { name: "hold_action", label: "Hold", selector: { ui_action: {} } },
          { name: "double_tap_action", label: "Double tap", selector: { ui_action: {} } },
        ],
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "new_tab", label: "Open in new tab", selector: { boolean: {} } },
          { name: "dock", label: "Place in dock", selector: { boolean: {} } },
          { name: "fill", label: "Image fills badge", selector: { boolean: {} } },
          { name: "hidden", label: "Hidden", selector: { boolean: {} } },
        ],
      },
    ];
  }

  _flat() {
    const c = { ...this._config };
    if (c.badge_size === undefined && c.icon_size !== undefined) {
      c.badge_size = c.icon_size;
      delete c.icon_size;
    }
    const r = c.border_radius;
    return {
      ...DEFAULTS,
      ...c,
      columns_mode: c.columns === undefined || c.columns === "auto" ? "auto" : "fixed",
      columns_count: typeof c.columns === "number" ? c.columns : Number(c.columns) || 4,
      radius_mode: r === undefined || r === "theme" ? "theme" : r === "circle" ? "circle" : "fixed",
      radius_value: typeof r === "number" ? r : Number(r) || 16,
    };
  }

  _appData(app) {
    const d = { ...app };
    if (!d.image && isImage(d.icon)) {
      d.image = d.icon;
      delete d.icon;
    }
    return d;
  }

  _onGeneral(v) {
    const next = { ...this._config };
    for (const [k, val] of Object.entries(v)) {
      if (HELPER_KEYS.includes(k) || k === "apps" || k === "type") continue;
      if (val === undefined || val === "") delete next[k];
      else if (!(k in this._config) && DEFAULTS[k] === val) continue;
      else next[k] = val;
    }
    next.badge_size = Number(v.badge_size) || DEFAULTS.badge_size;
    if (v.icon_size === undefined || v.icon_size === "") delete next.icon_size;
    next.columns = v.columns_mode === "auto" ? "auto" : Number(v.columns_count) || 4;
    next.border_radius = v.radius_mode === "fixed" ? Number(v.radius_value) || 0 : v.radius_mode;
    this._emit(next);
  }

  _setApps(apps, structural) {
    const next = { ...this._config, apps };
    this._emit(next);
    if (structural) this.setConfig(next);
  }

  _build() {
    this._built = true;
    this.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = `
      .ver { text-align:right; line-height:1.25; margin-bottom:8px; }
      .ver .n { font-weight:500; color:var(--primary-text-color); }
      .ver .v { font-size:12px; color:var(--secondary-text-color); }
      .hint { font-size:12px; color:var(--secondary-text-color); margin:12px 0 4px; }
      .apps-title { font-weight:500; margin:16px 0 4px; color:var(--primary-text-color); }
      details.app-box { border:1px solid var(--divider-color); border-radius:var(--ha-card-border-radius, 12px); margin:8px 0; overflow:hidden; }
      details.app-box[open] > summary { border-bottom:1px solid var(--divider-color); }
      summary { list-style:none; display:flex; align-items:center; gap:10px; padding:8px 10px; cursor:pointer; user-select:none; }
      summary::-webkit-details-marker { display:none; }
      .chev { transition:transform .2s ease; color:var(--secondary-text-color); --mdc-icon-size:20px; display:flex; }
      details[open] .chev { transform:rotate(90deg); }
      .chip { width:28px; height:28px; border-radius:8px; flex:none; display:flex; align-items:center; justify-content:center;
              background:linear-gradient(145deg, var(--c1, #4facfe), var(--c2, #1d5fe0)); color:#fff; --mdc-icon-size:18px; overflow:hidden; }
      .chip img { width:70%; height:70%; object-fit:contain; }
      .label { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500; }
      .label small { display:block; font-weight:400; font-size:11px; color:var(--secondary-text-color); overflow:hidden; text-overflow:ellipsis; }
      .btns { display:flex; gap:2px; }
      .btns button { cursor:pointer; border:none; background:none; border-radius:50%; width:32px; height:32px; padding:0;
                     color:var(--secondary-text-color); display:flex; align-items:center; justify-content:center; --mdc-icon-size:20px; }
      .btns button:hover:not(:disabled) { background:var(--secondary-background-color); color:var(--primary-text-color); }
      .btns button:disabled { opacity:.3; cursor:default; }
      .body { padding:8px 12px 12px; }
      .add { cursor:pointer; border:none; border-radius:var(--ha-card-border-radius, 12px); padding:10px 14px; margin-top:8px; width:100%;
             background:var(--primary-color); color:var(--text-primary-color, #fff); font-weight:500; font-size:14px; }`;
    this.appendChild(style);

    const ver = document.createElement("div");
    ver.className = "ver";
    ver.innerHTML = `<div class="n">Launcher-Card</div><div class="v">v${CARD_VERSION}</div>`;
    this.appendChild(ver);

    this._general = document.createElement("ha-form");
    this._general.hass = this._hass;
    this._general.data = this._flat();
    this._general.schema = this._generalSchema();
    this._general.computeLabel = (s) => s.label || s.name.replace(/_/g, " ");
    this._general.addEventListener("value-changed", (e) => this._onGeneral(e.detail.value));
    this.appendChild(this._general);

    const appsTitle = document.createElement("div");
    appsTitle.className = "apps-title";
    appsTitle.textContent = "Apps";
    this.appendChild(appsTitle);

    this._rows = (this._config.apps || []).map((_, i) => this._buildRow(i));

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Colors: " + PRESET_NAMES.join(", ") + ", or any CSS color. Leave empty to derive from the logo.";
    this.appendChild(hint);

    const add = document.createElement("button");
    add.className = "add";
    add.textContent = "+ Add app";
    add.addEventListener("click", () => {
      const apps = [...(this._config.apps || []), { name: "New app", icon: "mdi:apps", path: "/", color: "blue" }];
      this._open.add(apps.length - 1);
      this._setApps(apps, true);
    });
    this.appendChild(add);

    this._sync();
  }

  _buildRow(i) {
    const details = document.createElement("details");
    details.className = "app-box";
    details.addEventListener("toggle", () => (details.open ? this._open.add(i) : this._open.delete(i)));

    const summary = document.createElement("summary");
    summary.innerHTML = `<ha-icon class="chev" icon="mdi:chevron-right"></ha-icon><div class="chip"></div>
      <div class="label"><span></span><small></small></div><div class="btns"></div>`;
    const btns = summary.querySelector(".btns");
    const mk = (icon, title, fn) => {
      const b = document.createElement("button");
      b.title = title;
      b.innerHTML = `<ha-icon icon="${icon}"></ha-icon>`;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
      });
      btns.appendChild(b);
      return b;
    };
    const move = (d) => {
      const apps = [...this._config.apps];
      [apps[i], apps[i + d]] = [apps[i + d], apps[i]];
      const a = this._open.has(i), b = this._open.has(i + d);
      this._open.delete(i); this._open.delete(i + d);
      if (a) this._open.add(i + d);
      if (b) this._open.add(i);
      this._setApps(apps, true);
    };
    const up = mk("mdi:arrow-up", "Move up", () => move(-1));
    const down = mk("mdi:arrow-down", "Move down", () => move(1));
    mk("mdi:content-copy", "Duplicate", () => {
      const apps = [...this._config.apps];
      apps.splice(i + 1, 0, { ...apps[i] });
      this._open = new Set([...this._open].map((x) => (x > i ? x + 1 : x)));
      this._setApps(apps, true);
    });
    mk("mdi:delete-outline", "Remove", () => {
      const apps = this._config.apps.filter((_, j) => j !== i);
      this._open = new Set([...this._open].filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
      this._setApps(apps, true);
    });
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "body";
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.schema = this._appSchema();
    form.computeLabel = (s) => s.label || s.name;
    form.addEventListener("value-changed", (e) => {
      const apps = [...this._config.apps];
      apps[i] = Object.fromEntries(Object.entries(e.detail.value).filter(([, v]) => v !== "" && v !== undefined && v !== false));
      this._setApps(apps, false);
      this._syncRow(i);
    });
    body.appendChild(form);
    details.appendChild(body);
    this.insertBefore(details, null);

    return {
      details,
      form,
      up,
      down,
      chip: summary.querySelector(".chip"),
      title: summary.querySelector(".label span"),
      sub: summary.querySelector(".label small"),
    };
  }

  _sync() {
    if (this._general) this._general.data = this._flat();
    this._rows.forEach((_, i) => this._syncRow(i, true));
  }

  _syncRow(i, withForm) {
    const r = this._rows[i];
    const app = (this._config.apps || [])[i];
    if (!r || !app) return;
    if (withForm) r.form.data = this._appData(app);
    r.details.open = this._open.has(i);
    r.up.disabled = i === 0;
    r.down.disabled = i === this._rows.length - 1;
    r.title.textContent = app.name || `App ${i + 1}`;
    r.sub.textContent = (app.tap_action && app.tap_action.action) || app.path || app.navigation_path || "";

    const cc = appColors(app) || PRESETS.blue;
    r.chip.style.setProperty("--c1", cc[0]);
    r.chip.style.setProperty("--c2", cc[1]);
    const src = imageOf(app);
    const key = src || app.icon || "";
    if (r.chip.dataset.key !== key) {
      r.chip.dataset.key = key;
      r.chip.innerHTML = "";
      if (src) {
        const img = document.createElement("img");
        img.src = src;
        r.chip.appendChild(img);
      } else if (app.icon) {
        const ic = document.createElement("ha-icon");
        ic.setAttribute("icon", app.icon);
        r.chip.appendChild(ic);
      }
    }
  }
}

customElements.define("launcher-card", LauncherCard);
customElements.define("launcher-card-editor", LauncherCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "launcher-card",
  name: "Launcher-Card",
  description: "Phone home screen style grid of app badges that navigate to dashboards.",
  preview: true,
});

console.info(`%c LAUNCHER-CARD %c v${CARD_VERSION} `, "color:#fff;background:#4facfe;font-weight:700", "color:#4facfe;background:#222");
