
const CARD_VERSION = "0.2.4";

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
  liquid: "Liquid glass (clear)",
  liquid_tint: "Liquid glass (tinted)",
  liquid_dark: "Liquid glass (smoked)",
  bubble: "Glass bubble",
  clay: "Clay (soft 3D)",
  inflated: "Inflated (puffy 3D)",
  bevel: "Bevel (raised 3D button)",
  orb: "Orb (glossy 3D)",
  chrome: "Chrome (metal 3D)",
  soft: "Soft UI (neumorphic)",
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
  search: false,
  search_type_anywhere: true,
  active_indicator: true,
  dim_unavailable: true,
  hover_animation: "lift",
  press_animation: "shrink",
  name_shadow: false,
  name_shadow_blur: 3,
  name_gap: 7,
  marquee_speed: 30,
  gradient_type: "linear",
  badge_border: 0,
  card_padding: 16,
  sort: "none",
  appear_animation: "rise",
  appear_order: "sequence",
  appear_trigger: "load",
  appear_duration: 450,
  appear_stagger: 35,
  haptic: true,
  card_background: true,
};

const APPEAR_ANIMATIONS = {
  none: "None",
  fade: "Fade",
  rise: "Rise",
  drop: "Drop in",
  slide: "Slide in",
  pop: "Pop",
  zoom: "Zoom out",
  bounce: "Bounce",
  flip: "Flip (3D)",
  swirl: "Swirl",
  blur: "Blur in",
};
const APPEAR_ORDERS = { sequence: "One by one", reverse: "Reverse", rows: "Row by row", diagonal: "Diagonal wave", center: "From center", random: "Random" };

const APPEAR_FROM = {
  fade: "opacity:0;",
  rise: "opacity:0; transform:translateY(18px);",
  drop: "opacity:0; transform:translateY(-18px);",
  slide: "opacity:0; transform:translateX(-24px);",
  pop: "opacity:0; transform:scale(.3);",
  zoom: "opacity:0; transform:scale(1.5);",
  flip: "opacity:0; transform:perspective(500px) rotateX(-80deg);",
  swirl: "opacity:0; transform:rotate(-120deg) scale(.2);",
  blur: "opacity:0; filter:blur(10px); transform:scale(1.08);",
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

const safe = (v) => String(v).replace(/[;{}<>\\]/g, "");
const css = (v) => (Array.isArray(v) ? `rgb(${v.slice(0, 3).map(Number).join(",")})` : v ? safe(v) : v);

function appColors(app) {
  const preset = PRESETS[app.badge_color] || PRESETS[app.color];
  if (preset) return app.color2 ? [preset[0], css(app.color2)] : preset;
  const c1 = css(app.color || app.badge_color);
  if (c1) return [c1, css(app.color2) || c1];
  return null;
}

function hexToRgb(h) {
  let s = String(h || "").trim().replace(/^#/, "");
  if (s.length === 3) s = s.split("").map((x) => x + x).join("");
  if (!/^[0-9a-f]{6}$/i.test(s)) {
    const m = String(h || "").match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}
const rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
function rgbToHsv([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
}
function hsvToRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return [f(5), f(3), f(1)];
}

const normalize = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const num = (v, d) => (v === undefined || v === null || v === "" || isNaN(Number(v)) ? d : Number(v));

const SEARCH_CARDS = (window.__launcherCardSearch = window.__launcherCardSearch || new Set());
if (!window.__launcherCardKeys) {
  window.__launcherCardKeys = true;
  window.addEventListener(
    "keydown",
    (e) => {
      if (!SEARCH_CARDS.size || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (e.key.length !== 1 || e.key === " ") return;
      const busy = e.composedPath().some(
        (n) => n.nodeType === 1 && (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable || n.tagName.includes("DIALOG"))
      );
      if (busy) return;
      for (const card of SEARCH_CARDS) if (card._captureKey(e)) return;
    },
    true
  );
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
    if (c.press_animation === true) c.press_animation = "shrink";
    if (c.press_animation === false) c.press_animation = "none";
    this._config = c;
    const appearKey = ["appear_animation", "appear_order", "appear_trigger", "appear_duration", "appear_stagger"].map((k) => c[k]).join("|");
    if (appearKey !== this._appearKey) {
      this._appearKey = appearKey;
      this._played = false;
    }
    this._render();
  }

  connectedCallback() {
    if (!this._ro) {
      this._ro = new ResizeObserver((entries) => {
        const w = Math.round(entries[entries.length - 1].contentRect.width);
        if (w === this._lastWidth) return;
        this._lastWidth = w;
        this._layout();
      });
    }
    this._ro.observe(this);
    this._registerTyping();
    if (!this._onReplay) {
      this._onReplay = () => {
        this._played = false;
        this._maybeAppear();
      };
    }
    window.addEventListener("launcher-card-replay", this._onReplay);
    this._played = false;
    this._maybeAppear();
  }

  disconnectedCallback() {
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    this._io = null;
    clearTimeout(this._appearTimer);
    window.removeEventListener("launcher-card-replay", this._onReplay);
    SEARCH_CARDS.delete(this);
  }


  _maybeAppear() {
    const c = this._config;
    const card = this.shadowRoot && this.shadowRoot.querySelector("ha-card");
    if (!c || !card || this._played || !this.isConnected) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!this._appearType() || reduced) {
      this._played = true;
      return;
    }
    clearTimeout(this._appearTimer);
    card.classList.remove("appear");
    card.classList.add("pre");
    if (this._io) this._io.disconnect();
    if (c.appear_trigger === "visible" && "IntersectionObserver" in window) {
      this._io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          this._io.disconnect();
          this._io = null;
          this._startAppear();
        },
        { threshold: 0.15 }
      );
      this._io.observe(this);
    } else {
      requestAnimationFrame(() => this._startAppear());
    }
  }

  _startAppear() {
    const card = this.shadowRoot && this.shadowRoot.querySelector("ha-card");
    if (!card || !this._els) return;
    this._played = true;
    const c = this._config;
    const ranks = this._appearRanks(this._els.map((x) => x.el));
    this._els.forEach((x, i) => x.el.style.setProperty("--i", ranks[i]));
    card.classList.remove("pre");
    void card.offsetWidth;
    card.classList.add("appear");
    const total = num(c.appear_duration, 450) + num(c.appear_stagger, 35) * Math.max(0, ...ranks) + 100;
    this._appearTimer = setTimeout(() => card.classList.remove("appear"), total);
  }

  _appearType() {
    const t = this._config.appear_animation;
    return t && t !== "none" && APPEAR_ANIMATIONS[t] ? t : null;
  }

  _appearStyles() {
    const c = this._config;
    const t = this._appearType();
    if (!t) return "";
    const dur = num(c.appear_duration, 450), stagger = num(c.appear_stagger, 35);
    const ease = t === "pop" ? "cubic-bezier(.2,1.5,.4,1)" : "cubic-bezier(.2,.8,.2,1)";
    const frames = t === "bounce"
      ? `0% { opacity:0; transform:translateY(32px); } 55% { opacity:1; transform:translateY(-7px); }
         75% { transform:translateY(3px); } 100% { transform:none; }`
      : `from { ${APPEAR_FROM[t]} }`;
    return `
      .pre .app, .pre .title, .pre .search { opacity:0; }
      .appear .app { animation:lc-in ${dur}ms ${ease} both; animation-delay:calc(var(--i, 0) * ${stagger}ms); }
      .appear .title, .appear .search { animation:lc-in-fade ${dur}ms ease both; }
      @keyframes lc-in { ${frames} }
      @keyframes lc-in-fade { from { opacity:0; transform:translateY(-6px); } }`;
  }

  _appearRanks(els) {
    const order = this._config.appear_order;
    const n = els.length;
    if (order === "reverse") return els.map((_, i) => n - 1 - i);
    if (order === "random") {
      const r = els.map((_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    }
    if (order === "rows" || order === "diagonal" || order === "center") {
      const tops = [...new Set(els.map((e) => e.offsetTop))].sort((a, b) => a - b);
      const lefts = [...new Set(els.map((e) => e.offsetLeft))].sort((a, b) => a - b);
      const pos = els.map((e) => [lefts.indexOf(e.offsetLeft), tops.indexOf(e.offsetTop)]);
      if (order === "rows") return pos.map(([, y]) => y);
      if (order === "diagonal") return pos.map(([x, y]) => x + y);
      const cx = (lefts.length - 1) / 2, cy = (tops.length - 1) / 2;
      return pos.map(([x, y]) => Math.round(Math.hypot(x - cx, y - cy)));
    }
    return els.map((_, i) => i);
  }

  _registerTyping() {
    const c = this._config;
    if (this.isConnected && c && c.search && c.search_type_anywhere) SEARCH_CARDS.add(this);
    else SEARCH_CARDS.delete(this);
  }

  _setupSearch() {
    this._registerTyping();
    const input = this.shadowRoot.querySelector(".search input");
    this._searchInput = input;
    if (!input) {
      this._query = "";
      return;
    }
    const bar = input.parentElement;
    input.placeholder = this._config.search_placeholder || (this._config.search_type_anywhere ? "Type to search apps" : "Search apps");
    input.value = this._query || "";
    input.addEventListener("input", () => this._filter(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        input.value = "";
        this._filter("");
        input.blur();
      } else if (e.key === "Enter") {
        const first = this._els.find((x) => !x.el.classList.contains("filtered"));
        if (first && this._query) this._act(first.app, "tap");
      } else if (e.key === "ArrowDown") {
        const first = this._els.find((x) => !x.el.classList.contains("filtered"));
        if (first) {
          e.preventDefault();
          first.el.focus();
        }
      }
    });
    bar.querySelector(".clear").addEventListener("click", (e) => {
      e.preventDefault();
      input.value = "";
      this._filter("");
      input.focus();
    });
    this._filter(input.value);
  }

  _filter(q) {
    this._query = q;
    const words = normalize(q).split(/\s+/).filter(Boolean);
    let first = true, shown = 0;
    for (const { el, haystack } of this._els) {
      const hit = words.every((w) => haystack.includes(w));
      el.classList.toggle("filtered", !hit);
      el.classList.toggle("first", hit && first);
      if (hit) {
        first = false;
        shown++;
      }
    }
    const root = this.shadowRoot;
    root.querySelector("ha-card").classList.toggle("searching", words.length > 0);
    const bar = root.querySelector(".search");
    if (bar) bar.classList.toggle("has", q.length > 0);
    root.querySelector(".empty").hidden = shown > 0 || !this._els.length;
    if (words.length) requestAnimationFrame(() => this._layout());
  }

  _captureKey(e) {
    const input = this._searchInput;
    if (!input || !this.isConnected) return false;
    const r = this.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > window.innerHeight) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    input.focus({ preventScroll: true });
    input.value += e.key;
    this._filter(input.value);
    return true;
  }

  _metrics() {
    const c = this._config;
    const badge = Number(c.badge_size) || 60;
    const nameSize = Number(c.name_size) || 12;
    const lineH = Math.ceil(nameSize * 1.25);
    const nameLines = c.show_names ? (c.name_overflow === "wrap" ? 2 : 1) : 0;
    const labelGap = nameLines ? Math.max(0, num(c.name_gap, 7)) : 0;
    const cellH = badge + labelGap + nameLines * lineH;
    const scaled = (f) => Math.round(badge * (Number(c.icon_scale) || f));
    const icon = Number(c.icon_size) || scaled(0.55);
    const minimalIcon = Number(c.icon_size) || scaled(0.8);
    const image = Number(c.icon_size) || Math.round(badge * (Number(c.image_scale) || 0.62));
    const pad = Math.max(0, num(c.card_padding, 16));
    return { badge, lineH, labelGap, cellH, icon, minimalIcon, image, pad, gap: Math.max(0, num(c.gap, 18)) };
  }

  _layout() {
    if (!this.shadowRoot || !this._config) return;
    const grid = this.shadowRoot.querySelector(".grid");
    if (!grid) return;
    const m = this._metrics();
    const cols = this._fixedCols();
    if (cols) {
      const pitch = grid.clientWidth / cols;
      const gap = `${Math.max(4, Math.round(pitch - m.cellH))}px`;
      if (grid.style.rowGap !== gap) grid.style.rowGap = gap;
    }
    if (this._config.name_overflow !== "scroll") return;
    const speed = Math.max(5, num(this._config.marquee_speed, 30));
    const names = [...this.shadowRoot.querySelectorAll(".app:not(.filtered) .name")];
    const measured = names.map((n) => {
      const text = n.firstElementChild.firstElementChild;
      return [n, text.offsetWidth, n.clientWidth];
    });
    for (const [n, textW, boxW] of measured) {
      const over = textW - boxW > 1;
      const track = n.firstElementChild;
      const dist = `${textW + 24}px`;
      if (over && (!n.classList.contains("marquee") || track.style.getPropertyValue("--dist") !== dist)) {
        track.style.setProperty("--dist", dist);
        track.style.setProperty("--dur", `${Math.max(4, (textW + 24) / speed + 2).toFixed(2)}s`);
        n.classList.add("marquee");
      } else if (!over && n.classList.contains("marquee")) {
        n.classList.remove("marquee");
      }
    }
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
    return /^\d+(\.\d+)?$/.test(String(r)) ? `${r}px` : safe(r);
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
    const outer = c.shadow
      ? "0 6px 14px -5px color-mix(in srgb, var(--c2) 65%, rgba(0,0,0,.55)), 0 2px 4px rgba(0,0,0,.18)"
      : "0 0 #0000";
    const pad = m.pad;
    const grad = {
      radial: "radial-gradient(circle at 30% 22%, var(--c1), var(--c2) 85%)",
      conic: "conic-gradient(from var(--ang) at 50% 50%, var(--c1), var(--c2), var(--c1))",
      diamond: "linear-gradient(var(--ang), var(--c1) 0%, var(--c2) 50%, var(--c1) 100%)",
    }[c.gradient_type] || "linear-gradient(var(--ang), var(--c1), var(--c2))";
    const border = Math.max(0, num(c.badge_border, 0));

    return `
      :host { display:block; }
      ha-card { ${c.card_background ? "" : "background:none;box-shadow:none;border:none;"} overflow:hidden; }
      .title { padding:${pad}px ${pad}px 0; font-size:${c.title_size ? `${num(c.title_size, 20)}px` : "var(--ha-card-header-font-size, 20px)"};
               font-weight:500; text-align:${{ start: "left", center: "center", end: "right" }[c.title_align] || "left"};
               color:${css(c.title_color) || "var(--primary-text-color)"}; }
      .grid { display:grid; ${grid} margin:${pad}px; justify-items:center; justify-content:${justify};
              ${c.icon_color ? `--glob-ic:${css(c.icon_color)};` : ""} }
      .search { margin:${pad}px ${pad}px 0; display:flex; align-items:center; gap:8px; height:40px; padding:0 8px 0 12px; box-sizing:border-box;
                border-radius:20px; color:var(--secondary-text-color); --mdc-icon-size:20px; cursor:text;
                background:color-mix(in srgb, var(--primary-text-color) 7%, transparent);
                box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--primary-text-color) 8%, transparent);
                transition:box-shadow .2s ease, background .2s ease; }
      .search:focus-within { box-shadow:inset 0 0 0 2px var(--primary-color); background:color-mix(in srgb, var(--primary-text-color) 4%, transparent); }
      /* The app icon rule below also matches ha-icon here, so the bar's icons must be sized explicitly. */
      .search ha-icon { --mdc-icon-size:20px; width:20px; height:20px; color:inherit; filter:none; flex:none; }
      .search .clear ha-icon { --mdc-icon-size:18px; width:18px; height:18px; }
      .search input { flex:1; min-width:0; height:100%; border:none; outline:none; background:none; padding:0;
                      font:inherit; font-size:15px; color:var(--primary-text-color); }
      .search input::placeholder { color:var(--secondary-text-color); opacity:1; }
      .search input::-webkit-search-cancel-button { display:none; }
      .search .clear { display:none; align-items:center; justify-content:center; width:28px; height:28px; padding:0; border:none;
                       border-radius:50%; background:none; color:inherit; cursor:pointer; --mdc-icon-size:18px; }
      .search .clear:hover { background:color-mix(in srgb, var(--primary-text-color) 10%, transparent); }
      .search.has .clear { display:flex; }
      .app.filtered { display:none; }
      .searching .app.first .badge { outline:2px solid color-mix(in srgb, var(--primary-color) 70%, transparent); outline-offset:3px; }
      .empty { text-align:center; color:var(--secondary-text-color); font-size:14px; margin:-4px ${pad}px ${pad}px; }
      .empty[hidden] { display:none; }
      .app { display:flex; flex-direction:column; align-items:center; gap:${m.labelGap}px; width:100%; min-width:0;
             cursor:pointer; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none;
             -webkit-tap-highlight-color:transparent; outline:none; touch-action:manipulation; }
      .wrap { position:relative; flex:none; }
      .badge { --ang:${Number(c.gradient_angle)}deg; --ic:#fff; --outer:${outer}; --ish:${ICON_SHADOWS[c.icon_shadow] || ICON_SHADOWS.soft};
               position:relative; width:${size}px; height:${size}px; border-radius:${this._radius()};
               display:flex; align-items:center; justify-content:center; overflow:hidden; box-sizing:border-box;
               --grad:${grad}; box-shadow:var(--outer);
               ${border ? `border:${border}px solid ${css(c.badge_border_color) || "rgba(255,255,255,.35)"};` : ""} }
      .badge::after { content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit; }

      /* ---- badge styles ---- */
      .s-gradient { background:var(--grad);
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
      .s-neon ha-icon { filter:var(--ish) drop-shadow(0 0 2px color-mix(in srgb, currentColor 45%, #000))
                                         drop-shadow(0 0 7px color-mix(in srgb, currentColor 55%, #000)); }
      .s-flat { background:var(--c1); }
      .s-minimal { --ic:var(--c1); background:none; box-shadow:none; overflow:visible; border-color:transparent; }
      .s-minimal ha-icon { --mdc-icon-size:${m.minimalIcon}px; }

      /* ---- liquid glass ---- */
      .badge::before { position:absolute; inset:0; pointer-events:none; border-radius:inherit; }
      .s-liquid, .s-liquid_tint, .s-liquid_dark, .s-bubble {
        --rim:inset 1.5px 1.5px 1px rgba(255,255,255,.7), inset -1px -1px 1px rgba(255,255,255,.3),
              inset 0 0 0 1px rgba(255,255,255,.16), inset 0 0 0 .5px color-mix(in srgb, var(--primary-text-color) 18%, transparent),
              inset 0 0 14px rgba(255,255,255,.14);
        --glass-outer:${c.shadow ? "0 10px 22px -10px rgba(0,0,0,.45), 0 2px 5px -2px rgba(0,0,0,.2)" : "0 0 #0000"};
        backdrop-filter:blur(10px) saturate(190%) brightness(1.08); -webkit-backdrop-filter:blur(10px) saturate(190%) brightness(1.08);
        box-shadow:var(--glass-outer), var(--rim); }
      .s-liquid { --ic:var(--c1);
        background:radial-gradient(95% 60% at 50% 112%, color-mix(in srgb, var(--c1) 50%, transparent) 0%, transparent 72%),
                   linear-gradient(var(--ang), rgba(255,255,255,.26), rgba(255,255,255,.05) 60%, rgba(255,255,255,.12)); }
      .s-liquid_tint {
        background:radial-gradient(80% 55% at 22% 10%, rgba(255,255,255,.38) 0%, transparent 60%),
                   radial-gradient(90% 60% at 60% 115%, color-mix(in srgb, var(--c1) 70%, #fff) 0%, transparent 70%),
                   linear-gradient(var(--ang), color-mix(in srgb, var(--c1) 72%, transparent), color-mix(in srgb, var(--c2) 58%, transparent)); }
      .s-liquid_dark { --ic:color-mix(in srgb, var(--c1) 82%, #fff);
        background:radial-gradient(95% 60% at 50% 115%, color-mix(in srgb, var(--c1) 42%, transparent) 0%, transparent 70%),
                   linear-gradient(180deg, rgba(48,50,58,.55), rgba(14,15,19,.72)); }
      .s-bubble { --ic:var(--c1);
        background:radial-gradient(circle at 50% 125%, color-mix(in srgb, var(--c1) 75%, transparent) 0%, transparent 62%),
                   radial-gradient(circle at 50% 50%, transparent 55%, color-mix(in srgb, var(--c2) 22%, transparent) 100%),
                   color-mix(in srgb, var(--c1) 10%, transparent); }
      .s-liquid::before, .s-liquid_tint::before, .s-liquid_dark::before {
        content:""; inset:2px 3px 48% 3px; border-radius:inherit; opacity:.9;
        background:linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0)); }
      .s-bubble::before { content:""; inset:7% 22% 58% 16%; border-radius:50%; transform:rotate(-12deg);
        background:linear-gradient(180deg, rgba(255,255,255,.8), rgba(255,255,255,0)); }

      /* ---- 3D ---- */
      .s-inflated { background:linear-gradient(var(--ang), color-mix(in srgb, var(--c1) 80%, #fff), var(--c2));
        box-shadow:var(--outer), inset 0 9px 12px -5px rgba(255,255,255,.65),
                   inset 0 -11px 14px -5px color-mix(in srgb, var(--c2) 50%, #000),
                   inset 7px 0 10px -7px rgba(255,255,255,.4), inset -7px 0 10px -7px rgba(0,0,0,.3); }
      .s-bevel { background:linear-gradient(180deg, color-mix(in srgb, var(--c1) 80%, #fff), var(--c1) 45%, var(--c2));
        box-shadow:inset 0 1.5px 0 rgba(255,255,255,.6), inset 0 -3px 0 color-mix(in srgb, var(--c2) 70%, #000),
                   0 4px 0 color-mix(in srgb, var(--c2) 55%, #000), ${c.shadow ? "0 8px 10px -2px rgba(0,0,0,.35)" : "0 0 #0000"}; }
      .s-orb { background:radial-gradient(circle at 32% 26%, color-mix(in srgb, var(--c1) 40%, #fff) 0%, var(--c1) 28%,
                                          var(--c2) 70%, color-mix(in srgb, var(--c2) 55%, #000) 100%);
        box-shadow:var(--outer), inset 0 -6px 12px color-mix(in srgb, var(--c2) 50%, rgba(0,0,0,.5)), inset 0 2px 3px rgba(255,255,255,.35); }
      .s-orb::before { content:""; inset:5% 20% 55% 20%; border-radius:50%;
        background:linear-gradient(180deg, rgba(255,255,255,.75), rgba(255,255,255,0)); }
      .s-chrome { --ic:var(--c2);
        background:linear-gradient(180deg, #f6f8fa 0%, #d2d7de 44%, #a3aab4 50%, #c8cdd4 62%, #eef1f4 100%);
        box-shadow:var(--outer), inset 0 1px 0 #fff, inset 0 -1px 1px rgba(0,0,0,.3), inset 0 0 0 1px rgba(0,0,0,.14); }
      .s-chrome ha-icon { filter:var(--ish) drop-shadow(0 1px 0 rgba(255,255,255,.8)); }
      .s-soft { --ic:var(--c1); --bg:var(--card-background-color, #fff); overflow:visible;
        background:linear-gradient(145deg, color-mix(in srgb, var(--bg) 92%, #fff), color-mix(in srgb, var(--bg) 92%, #000));
        box-shadow:5px 5px 11px color-mix(in srgb, var(--bg) 72%, #000), -5px -5px 11px color-mix(in srgb, var(--bg) 82%, #fff); }

      ${c.shine ? `.s-gradient::after, .s-aurora::after, .s-flat::after, .s-glass::after, .s-clay::after, .s-inflated::after, .s-bevel::after {
                     background:linear-gradient(180deg, rgba(255,255,255,.3), rgba(255,255,255,0) 52%); }` : ""}

      .app:focus-visible .badge { outline:2px solid var(--primary-color); outline-offset:3px; }
      ${this._animStyles()}
      ${this._appearStyles()}

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
                   background:${css(c.indicator_color) || "var(--primary-text-color)"}; opacity:0; transition:opacity .2s ease; }
      .app.active .indicator { opacity:${c.indicator_color ? 1 : 0.7}; }
      .app.unavail .badge { filter:grayscale(1); opacity:.45; }

      .name { font-size:${Number(c.name_size) || 12}px; line-height:${m.lineH}px; height:${m.lineH * (c.name_overflow === "wrap" ? 2 : 1)}px;
              width:100%; text-align:center; overflow:hidden; color:${css(c.name_color) || "var(--primary-text-color)"};
              ${c.name_weight ? `font-weight:${num(c.name_weight, 400)};` : ""}
              ${["uppercase", "lowercase", "capitalize"].includes(c.name_transform) ? `text-transform:${c.name_transform}; letter-spacing:.02em;` : ""} }
      ${c.name_shadow ? `.name { text-shadow:0 1px ${Math.max(0, Number(c.name_shadow_blur) || 0)}px ${css(c.name_shadow_color) || "rgba(0,0,0,.65)"}; }` : ""}
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

  _animStyles() {
    const c = this._config;
    const spring = "cubic-bezier(.3,.7,.4,1.4)";
    const hover = {
      lift: ".app:hover .badge { translate:0 -3px; }",
      grow: ".app:hover .badge { scale:1.08; }",
      tilt: `.app:hover .badge { transform:perspective(${(Number(c.badge_size) || 60) * 4}px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
               scale:1.05; transition-duration:.08s, .25s, .25s, .25s, .2s, .2s, .2s; }`,
      glow: ".app:hover .badge { translate:0 -1px; filter:drop-shadow(0 0 10px color-mix(in srgb, var(--c1) 75%, transparent)); }",
      wiggle: ".app:hover .badge { animation:lc-wiggle .45s ease; }",
      float: ".app:hover .badge { animation:lc-float 1.8s ease-in-out infinite; }",
    }[c.hover_animation] || "";
    const press = {
      shrink: ".app.pressed .badge { scale:.88; filter:brightness(.9); }",
      push: ".app.pressed .badge { translate:0 3px; scale:.95; filter:brightness(.92); }",
      spring: `.badge { transition-timing-function:${spring}, cubic-bezier(.2,.9,.3,1.9), cubic-bezier(.2,.9,.3,1.9), ease, ease, ease, ease;
                        transition-duration:.18s, .45s, .45s, .25s, .2s, .2s, .2s; }
               .app.pressed .badge { scale:.8; translate:0 0; transition-duration:.1s; }`,
      jelly: ".app.tapped .badge { animation:lc-jelly .5s ease; }",
      ripple: `.app.pressed .badge { scale:.94; }
               .app.tapped .wrap::after { animation:lc-ripple .6s ease-out; }`,
    }[c.press_animation] || "";
    const physical = c.press_animation && c.press_animation !== "none"
      ? `.app.pressed .s-bevel { translate:0 3px; scale:1;
           box-shadow:inset 0 1.5px 0 rgba(255,255,255,.6), inset 0 -2px 0 color-mix(in srgb, var(--c2) 70%, #000),
                      0 1px 0 color-mix(in srgb, var(--c2) 55%, #000); }
         .app.pressed .s-soft { translate:0 0; scale:1;
           box-shadow:inset 4px 4px 8px color-mix(in srgb, var(--bg) 72%, #000), inset -4px -4px 8px color-mix(in srgb, var(--bg) 82%, #fff); }`
      : "";
    return `
      .badge { transition-property:transform, translate, scale, rotate, filter, opacity, box-shadow;
               transition-duration:.18s, .25s, .25s, .25s, .2s, .2s, .2s;
               transition-timing-function:${spring}, ${spring}, ${spring}, ease, ease, ease, ease; }
      .wrap::after { content:""; position:absolute; inset:0; border-radius:${this._radius()}; pointer-events:none; opacity:0; }
      @media (hover:hover) { ${hover} }
      ${press}
      ${physical}
      @keyframes lc-wiggle { 0%, 100% { rotate:0deg; } 25% { rotate:-7deg; } 50% { rotate:5deg; } 75% { rotate:-3deg; } }
      @keyframes lc-float { 0%, 100% { translate:0 0; } 50% { translate:0 -5px; } }
      @keyframes lc-jelly { 0% { scale:1; } 30% { scale:1.16 .84; } 50% { scale:.9 1.1; } 70% { scale:1.05 .95; } 100% { scale:1; } }
      @keyframes lc-ripple { 0% { opacity:1; box-shadow:0 0 0 0 color-mix(in srgb, var(--c1) 70%, transparent); }
                             100% { opacity:0; box-shadow:0 0 0 16px color-mix(in srgb, var(--c1) 0%, transparent); } }
      @media (prefers-reduced-motion: reduce) { .badge { animation:none !important; } }`;
  }

  _render() {
    const c = this._config;
    if (!c) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <ha-card>
        ${c.title ? `<div class="title"></div>` : ""}
        ${c.search ? `<label class="search"><ha-icon icon="mdi:magnify"></ha-icon>
          <input type="search" autocomplete="off" spellcheck="false" enterkeyhint="go">
          <button class="clear" title="Clear"><ha-icon icon="mdi:close"></ha-icon></button></label>` : ""}
        <div class="grid"></div>
        <div class="empty" hidden>No apps found</div>
      </ha-card>`;
    if (c.title) this.shadowRoot.querySelector(".title").textContent = c.title;

    const gridEl = this.shadowRoot.querySelector(".grid");
    const style = BADGE_STYLES[c.badge_style] ? c.badge_style : "gradient";
    this._els = [];

    const apps = c.sort === "name"
      ? [...c.apps].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base", numeric: true }))
      : c.apps;
    apps.forEach((app) => {
      if (!this._visible(app)) return;
      const el = document.createElement("div");
      el.className = "app";
      el.tabIndex = 0;
      el.title = app.name || "";
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", app.name || "app");

      const wrap = document.createElement("div");
      wrap.className = "wrap";
      const badge = document.createElement("div");
      badge.className = `badge s-${BADGE_STYLES[app.badge_style] ? app.badge_style : style}`;
      const colors = appColors(app);
      const setColors = (cc) => {
        el.style.setProperty("--c1", cc[0]);
        el.style.setProperty("--c2", cc[1]);
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
        if (app.icon_color) ic.style.setProperty("--app-ic", css(app.icon_color));
        badge.appendChild(ic);
      }
      wrap.appendChild(badge);

      const notify = document.createElement("div");
      notify.className = "notify";
      if (app.notify_color) notify.style.setProperty("--notify-color", css(app.notify_color));
      if (app.notify_text !== undefined && app.notify_text !== "" && !app.notify_entity) {
        notify.textContent = String(app.notify_text);
        notify.classList.add("show");
      }
      wrap.appendChild(notify);

      if (c.active_indicator && app.entity) {
        const ind = document.createElement("div");
        ind.className = "indicator";
        wrap.appendChild(ind);
      }
      el.appendChild(wrap);

      if (c.show_names) {
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
      gridEl.appendChild(el);
      this._els.push({ app, el, notify, haystack: normalize(`${app.name || ""} ${app.keywords || ""}`) });
    });

    this._setupSearch();
    this._update(true);
    this._maybeAppear();
    requestAnimationFrame(() => this._layout());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this._layout());
  }

  _update(force) {
    if (!this._hass || !this._els) return;
    const states = this._hass.states;
    for (const item of this._els) {
      const { app, el, notify } = item;
      const nst = app.notify_entity ? states[app.notify_entity] : undefined;
      const est = app.entity ? states[app.entity] : undefined;
      if (!force && item.nst === nst && item.est === est) continue;
      item.nst = nst;
      item.est = est;
      if (app.notify_entity) {
        const st = nst;
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
        const st = est;
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

    if (this._config.hover_animation === "tilt") {
      const badge = el.querySelector(".badge");
      el.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = badge.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        badge.style.setProperty("--ry", `${(x * 22).toFixed(1)}deg`);
        badge.style.setProperty("--rx", `${(-y * 22).toFixed(1)}deg`);
      });
      el.addEventListener("pointerleave", () => {
        badge.style.removeProperty("--rx");
        badge.style.removeProperty("--ry");
      });
    }

    const tapped = () => {
      el.classList.remove("tapped");
      void el.offsetWidth;
      el.classList.add("tapped");
    };
    el.addEventListener("animationend", () => el.classList.remove("tapped"));

    el.addEventListener("click", () => {
      if (held) {
        held = false;
        return;
      }
      tapped();
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
        tapped();
        this._act(app, "tap");
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        this._moveFocus(el, e.key);
      }
    });
  }

  _moveFocus(el, key) {
    const list = this._els.map((x) => x.el).filter((e) => !e.classList.contains("filtered"));
    const i = list.indexOf(el);
    if (i < 0) return;
    const top = list[0].offsetTop;
    let cols = list.findIndex((e) => e.offsetTop !== top);
    if (cols < 0) cols = list.length;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols, Home: -i, End: list.length - 1 - i }[key];
    const j = i + step;
    if (j < 0 && key === "ArrowUp" && this._searchInput) return this._searchInput.focus();
    const target = list[Math.max(0, Math.min(list.length - 1, j))];
    if (target) target.focus();
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
        if (entity && this._hass) this._call("homeassistant", "toggle", { entity_id: entity });
        return;
      case "perform-action":
      case "call-service": {
        const svc = a.perform_action || a.service;
        if (!svc || !this._hass) return;
        const [domain, service] = svc.split(".", 2);
        this._call(domain, service, a.data || a.service_data || {}, a.target);
        return;
      }
      default:
        this._fire("hass-action", { config: { entity, tap_action: a }, action: "tap" });
    }
  }

  _call(domain, service, data, target) {
    Promise.resolve(this._hass.callService(domain, service, data, target)).catch((err) =>
      this._fire("hass-notification", { message: `Launcher-Card: ${(err && err.message) || err}` })
    );
  }

  _fire(type, detail, target = this) {
    target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}


class LauncherColorPicker extends HTMLElement {
  constructor() {
    super();
    this._value = "";
    this._hsv = [0, 0, 1];
    this._drawnV = null;
    this.attachShadow({ mode: "open" }).innerHTML = `
      <style>
        :host { display:block; }
        .row { display:flex; align-items:center; gap:10px; min-height:40px; }
        .sw { width:32px; height:32px; border-radius:50%; flex:none; cursor:pointer; padding:0; position:relative;
              border:2px solid var(--card-background-color, #fff); box-shadow:0 0 0 1px var(--divider-color);
              background:repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0/10px 10px; }
        .sw::after { content:""; position:absolute; inset:0; border-radius:50%; background:var(--sw, transparent); }
        .lbl { flex:1; min-width:0; font-size:14px; color:var(--primary-text-color); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .hex { width:96px; box-sizing:border-box; padding:6px 8px; font:13px monospace; border-radius:6px;
               border:1px solid var(--divider-color); background:var(--card-background-color, #fff); color:var(--primary-text-color); }
        .clr { border:none; background:none; cursor:pointer; color:var(--secondary-text-color); font-size:18px; width:28px; height:28px;
               border-radius:50%; padding:0; line-height:1; }
        .clr:hover { background:var(--secondary-background-color); }
        .panel { display:flex; align-items:center; gap:16px; padding:10px 0 6px 4px; }
        .panel[hidden] { display:none; }
        .wheel { position:relative; width:160px; height:160px; flex:none; touch-action:none; cursor:crosshair; }
        canvas { width:160px; height:160px; border-radius:50%; display:block; }
        .mk { position:absolute; width:16px; height:16px; margin:-8px 0 0 -8px; border-radius:50%; pointer-events:none;
              border:2px solid #fff; box-shadow:0 0 0 1px rgba(0,0,0,.4), 0 1px 3px rgba(0,0,0,.4); }
        .side { display:flex; flex-direction:column; gap:8px; flex:1; min-width:0; font-size:12px; color:var(--secondary-text-color); }
        input[type=range] { width:100%; accent-color:var(--primary-color); }
      </style>
      <div class="row">
        <button class="sw" title="Open color wheel"></button>
        <div class="lbl"></div>
        <input class="hex" spellcheck="false" placeholder="auto">
        <button class="clr" title="Clear">×</button>
      </div>
      <div class="panel" hidden>
        <div class="wheel"><canvas width="320" height="320"></canvas><div class="mk"></div></div>
        <div class="side">Brightness<input class="val" type="range" min="0" max="100"></div>
      </div>`;

    const $ = (s) => this.shadowRoot.querySelector(s);
    this._sw = $(".sw");
    this._hex = $(".hex");
    this._panel = $(".panel");
    this._canvas = $("canvas");
    this._mk = $(".mk");
    this._val = $(".val");

    this._sw.addEventListener("click", () => {
      this._panel.hidden = !this._panel.hidden;
      if (!this._panel.hidden) this._drawWheel();
    });
    $(".clr").addEventListener("click", () => this._emit(""));
    this._hex.addEventListener("input", () => {
      const v = this._hex.value.trim();
      if (v === "" || hexToRgb(v)) this._emit(v, true);
    });
    this._hex.addEventListener("change", () => this._emit(this._hex.value.trim(), true));
    this._val.addEventListener("input", () => {
      this._hsv[2] = this._val.value / 100;
      this._drawWheel();
      this._emit(rgbToHex(hsvToRgb(...this._hsv)));
    });

    const wheel = $(".wheel");
    const pick = (e) => {
      const r = wheel.getBoundingClientRect();
      const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
      let h = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (h < 0) h += 360;
      const s = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
      if (this._hsv[2] < 0.05) this._hsv[2] = 1;
      this._hsv = [h, s, this._hsv[2]];
      this._val.value = Math.round(this._hsv[2] * 100);
      this._drawWheel();
      this._emit(rgbToHex(hsvToRgb(...this._hsv)));
    };
    wheel.addEventListener("pointerdown", (e) => {
      this._dragging = true;
      wheel.setPointerCapture(e.pointerId);
      pick(e);
    });
    wheel.addEventListener("pointermove", (e) => this._dragging && pick(e));
    const end = () => {
      this._dragging = false;
      this._flush();
    };
    wheel.addEventListener("pointerup", end);
    wheel.addEventListener("pointercancel", end);
  }

  set label(t) {
    this.shadowRoot.querySelector(".lbl").textContent = t;
  }

  set placeholder(t) {
    this._hex.placeholder = t;
  }

  get value() {
    return this._value;
  }

  set value(v) {
    v = css(v) || "";
    if (this._dragging || v === this._value) return;
    this._value = v;
    const rgb = hexToRgb(v);
    if (rgb) this._hsv = rgbToHsv(rgb);
    this._paint(this.shadowRoot.activeElement !== this._hex);
  }

  _paint(updateText) {
    if (updateText) this._hex.value = this._value;
    this._sw.style.setProperty("--sw", this._value || "transparent");
    this._val.value = Math.round(this._hsv[2] * 100);
    const [h, s] = this._hsv;
    const a = (h * Math.PI) / 180;
    this._mk.style.left = `${80 + Math.cos(a) * s * 80}px`;
    this._mk.style.top = `${80 + Math.sin(a) * s * 80}px`;
    this._mk.style.background = hexToRgb(this._value) ? this._value : "transparent";
    if (!this._panel.hidden) this._drawWheel();
  }

  _drawWheel() {
    if (this._drawRaf) return;
    this._drawRaf = requestAnimationFrame(() => {
      this._drawRaf = null;
      this._renderWheel();
    });
  }

  _renderWheel() {
    const v = this._hsv[2];
    if (this._drawnV === v) return;
    this._drawnV = v;
    const size = this._canvas.width, R = size / 2;
    const ctx = this._canvas.getContext("2d");
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - R + 0.5, dy = y - R + 0.5, d = Math.hypot(dx, dy);
        if (d > R) continue;
        let h = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (h < 0) h += 360;
        const [r, g, b] = hsvToRgb(h, d / R, v);
        const i = (y * size + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b;
        img.data[i + 3] = Math.min(1, R - d) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  _emit(v, fromText) {
    this._value = v;
    const rgb = fromText && hexToRgb(v);
    if (rgb) this._hsv = rgbToHsv(rgb);
    this._paint(!fromText);
    this._pending = v;
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => this._flush());
  }

  _flush() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._pending === undefined) return;
    const value = this._pending;
    this._pending = undefined;
    this.dispatchEvent(new CustomEvent("color-changed", { detail: { value } }));
  }
}


const HELPER_KEYS = ["columns_mode", "columns_count", "radius_mode", "radius_value"];
const COLOR_KEYS = ["color", "color2", "badge_color", "icon_color", "notify_color"];

const opt = (o) => Object.entries(o).map(([value, label]) => ({ value, label }));
const grid = (...schema) => ({ type: "grid", name: "", schema });
const schemaKeys = (schema) => schema.flatMap((s) => (s.schema ? schemaKeys(s.schema) : [s.name]));

const HOVER_ANIMATIONS = { none: "None", lift: "Lift", grow: "Grow", tilt: "3D tilt (follows pointer)", glow: "Glow", wiggle: "Wiggle", float: "Float" };
const NAME_WEIGHTS = [["", "Theme"], ["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"]].map(([value, label]) => ({ value, label }));
const PRESS_ANIMATIONS = { none: "None", shrink: "Shrink", push: "Push down", spring: "Spring", jelly: "Jelly", ripple: "Ripple" };

const EDITOR_TABS = [
  { id: "apps", label: "Apps", icon: "mdi:apps" },
  { id: "layout", label: "Layout", icon: "mdi:view-grid-outline" },
  { id: "badges", label: "Badges", icon: "mdi:palette-outline" },
  { id: "names", label: "Names", icon: "mdi:format-text" },
  { id: "effects", label: "Effects", icon: "mdi:creation-outline" },
];

const APP_TABS = [
  { id: "general", label: "General" },
  { id: "colors", label: "Colors" },
  { id: "entity", label: "Entity" },
  { id: "actions", label: "Actions" },
];

const GENERAL_SCHEMAS = {
  layout: [
    grid(
      { name: "title", label: "Title", selector: { text: {} } },
      { name: "title_align", label: "Title alignment", selector: { select: { mode: "dropdown", options: opt({ start: "Left", center: "Center", end: "Right" }) } } },
      { name: "title_size", label: "Title size (px, empty = theme)", selector: { number: { min: 10, max: 40, mode: "box" } } },
      { name: "sort", label: "Sort apps", selector: { select: { mode: "dropdown", options: opt({ none: "As configured", name: "By name (A–Z)" }) } } }
    ),
    grid(
      { name: "columns_mode", label: "Columns", selector: { select: { mode: "dropdown", options: opt({ auto: "Auto-fit", fixed: "Fixed" }) } } },
      { name: "columns_count", label: "Apps per row", selector: { number: { min: 1, max: 12, mode: "box" } } },
      { name: "badge_size", label: "Badge size (px)", selector: { number: { min: 24, max: 160, mode: "box" } } },
      { name: "icon_size", label: "Icon size (px, empty = auto)", selector: { number: { min: 8, max: 160, mode: "box" } } },
      { name: "gap", label: "Spacing (px)", selector: { number: { min: 0, max: 60, mode: "box" } } },
      { name: "align", label: "Grid alignment", selector: { select: { mode: "dropdown", options: opt({ start: "Left", center: "Center", end: "Right" }) } } },
      { name: "card_padding", label: "Card padding (px)", selector: { number: { min: 0, max: 48, mode: "box" } } }
    ),
    { name: "card_background", label: "Card background", selector: { boolean: {} } },
    grid(
      { name: "search", label: "Search bar", selector: { boolean: {} } },
      { name: "search_type_anywhere", label: "Type anywhere to search", selector: { boolean: {} } }
    ),
    { name: "search_placeholder", label: "Search placeholder text", selector: { text: {} } },
  ],
  badges: [
    { name: "badge_style", label: "Badge style", selector: { select: { mode: "dropdown", options: opt(BADGE_STYLES) } } },
    grid(
      { name: "radius_mode", label: "Rounding", selector: { select: { mode: "dropdown", options: opt({ theme: "Follow theme", fixed: "Fixed value", circle: "Circle" }) } } },
      { name: "radius_value", label: "Rounding (px)", selector: { number: { min: 0, max: 64, mode: "box" } } },
      { name: "gradient_type", label: "Gradient type", selector: { select: { mode: "dropdown", options: opt({ linear: "Linear", radial: "Radial", conic: "Conic", diamond: "Mirrored" }) } } },
      { name: "gradient_angle", label: "Gradient angle", selector: { number: { min: 0, max: 360, mode: "box" } } },
      { name: "badge_border", label: "Border width (px)", selector: { number: { min: 0, max: 8, mode: "box" } } },
      { name: "icon_shadow", label: "Icon shadow", selector: { select: { mode: "dropdown", options: opt({ none: "None", soft: "Soft", medium: "Medium", strong: "Strong" }) } } },
      { name: "shine", label: "Glossy highlight", selector: { boolean: {} } },
      { name: "shadow", label: "Badge shadow", selector: { boolean: {} } }
    ),
  ],
  names: [
    grid(
      { name: "show_names", label: "Show names", selector: { boolean: {} } },
      { name: "name_size", label: "Text size (px)", selector: { number: { min: 8, max: 24, mode: "box" } } },
      { name: "name_weight", label: "Font weight", selector: { select: { mode: "dropdown", options: NAME_WEIGHTS } } },
      { name: "name_transform", label: "Letter case", selector: { select: { mode: "dropdown", options: opt({ none: "As typed", uppercase: "UPPERCASE", lowercase: "lowercase", capitalize: "Capitalize" }) } } },
      { name: "name_gap", label: "Gap to badge (px)", selector: { number: { min: 0, max: 24, mode: "box" } } },
      { name: "marquee_speed", label: "Scroll speed (px/s)", selector: { number: { min: 5, max: 120, mode: "box" } } },
      { name: "name_overflow", label: "Long names", selector: { select: { mode: "dropdown", options: opt({ scroll: "Scroll (marquee)", ellipsis: "Cut off (…)", wrap: "Wrap to 2 lines" }) } } },
      { name: "name_shadow", label: "Text shadow", selector: { boolean: {} } },
      { name: "name_shadow_blur", label: "Shadow blur (px)", selector: { number: { min: 0, max: 12, mode: "box" } } }
    ),
  ],
  effects: [
    grid(
      { name: "appear_animation", label: "Appear animation", selector: { select: { mode: "dropdown", options: opt(APPEAR_ANIMATIONS) } } },
      { name: "appear_order", label: "Appear order", selector: { select: { mode: "dropdown", options: opt(APPEAR_ORDERS) } } },
      { name: "appear_trigger", label: "Play when", selector: { select: { mode: "dropdown", options: opt({ load: "Card is shown", visible: "Scrolled into view" }) } } },
      { name: "appear_duration", label: "Duration (ms)", selector: { number: { min: 100, max: 2000, step: 50, mode: "box" } } },
      { name: "appear_stagger", label: "Delay between apps (ms)", selector: { number: { min: 0, max: 300, step: 5, mode: "box" } } }
    ),
    grid(
      { name: "hover_animation", label: "Hover animation", selector: { select: { mode: "dropdown", options: opt(HOVER_ANIMATIONS) } } },
      { name: "press_animation", label: "Press animation", selector: { select: { mode: "dropdown", options: opt(PRESS_ANIMATIONS) } } },
      { name: "haptic", label: "Haptic feedback", selector: { boolean: {} } },
      { name: "active_indicator", label: "Active entity dot", selector: { boolean: {} } },
      { name: "dim_unavailable", label: "Dim unavailable", selector: { boolean: {} } }
    ),
  ],
};

const APP_SCHEMAS = {
  general: [
    { name: "name", label: "Name", selector: { text: {} } },
    grid(
      { name: "icon", label: "Icon", selector: { icon: {} } },
      { name: "image", label: "Image URL (replaces icon)", selector: { text: {} } }
    ),
    { name: "path", label: "Navigation path or URL", selector: { text: {} } },
    { name: "keywords", label: "Search keywords (optional)", selector: { text: {} } },
    grid(
      { name: "new_tab", label: "Open in new tab", selector: { boolean: {} } },
      { name: "fill", label: "Image fills badge", selector: { boolean: {} } },
      { name: "hidden", label: "Hidden", selector: { boolean: {} } }
    ),
  ],
  entity: [
    { name: "entity", label: "Entity (state dot, more-info, toggle)", selector: { entity: {} } },
    { name: "notify_entity", label: "Notification badge entity (count or on/off)", selector: { entity: {} } },
    { name: "notify_text", label: "Static badge text (used when no entity is set)", selector: { text: {} } },
  ],
  style: [
    { name: "badge_style", label: "Badge style (overrides the card style)", selector: { select: { mode: "dropdown", options: [{ value: "", label: "Card default" }, ...opt(BADGE_STYLES)] } } },
  ],
  actions: [
    { name: "tap_action", label: "Tap (overrides path)", selector: { ui_action: {} } },
    { name: "hold_action", label: "Hold", selector: { ui_action: {} } },
    { name: "double_tap_action", label: "Double tap", selector: { ui_action: {} } },
  ],
};

const EDITOR_CSS = `
  .ver { text-align:right; line-height:1.25; margin-bottom:8px; }
  .ver .n { font-weight:500; color:var(--primary-text-color); }
  .ver .v { font-size:12px; color:var(--secondary-text-color); }
  .tabs { display:flex; gap:2px; border-bottom:1px solid var(--divider-color); margin-bottom:14px; overflow-x:auto; scrollbar-width:none; }
  .tabs::-webkit-scrollbar { display:none; }
  .tab { flex:1 0 auto; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 12px; cursor:pointer;
         border:none; background:none; color:var(--secondary-text-color); font:inherit; font-size:14px; font-weight:500;
         border-bottom:2px solid transparent; margin-bottom:-1px; --mdc-icon-size:18px; white-space:nowrap; }
  .tab:hover { color:var(--primary-text-color); }
  .tab.active { color:var(--primary-color); border-bottom-color:var(--primary-color); }
  .subtabs { display:flex; gap:6px; margin:0 0 12px; flex-wrap:wrap; }
  .subtab { border:1px solid var(--divider-color); background:none; color:var(--secondary-text-color); border-radius:16px;
            padding:5px 12px; font:inherit; font-size:13px; cursor:pointer; }
  .subtab.active { background:var(--primary-color); border-color:var(--primary-color); color:var(--text-primary-color, #fff); }
  [hidden] { display:none !important; }
  .section { margin:16px 0 4px; }
  .sub-title { font-weight:500; font-size:14px; margin:4px 0 6px; color:var(--primary-text-color); }
  .hint { font-size:12px; color:var(--secondary-text-color); margin:12px 0 4px; }
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
  .body { padding:10px 12px 12px; }
  .presets { display:flex; flex-wrap:wrap; gap:8px; margin:4px 0 10px; }
  .preset { width:30px; height:30px; border-radius:9px; border:none; padding:0; cursor:pointer; flex:none;
            background:linear-gradient(145deg, var(--c1), var(--c2)); box-shadow:0 1px 3px rgba(0,0,0,.25);
            outline-offset:2px; transition:transform .15s ease; }
  .preset:hover { transform:scale(1.1); }
  .preset.active { outline:2px solid var(--primary-color); }
  .preset.auto { background:var(--secondary-background-color); color:var(--secondary-text-color); font-size:10px; font-weight:600; }
  .add.replay { margin:0 0 14px; background:var(--secondary-background-color); color:var(--primary-text-color); }
  .add { cursor:pointer; border:none; border-radius:var(--ha-card-border-radius, 12px); padding:10px 14px; margin-top:8px; width:100%;
         background:var(--primary-color); color:var(--text-primary-color, #fff); font-weight:500; font-size:14px; }`;

class LauncherCardEditor extends HTMLElement {
  constructor() {
    super();
    this._open = new Set();
    this._tab = "apps";
    this._appTab = new Map();
    this._root = this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = config;
    const count = (config.apps || []).length;
    if (!this._built || count !== this._rows.length) this._build();
    else this._sync();
  }

  set hass(h) {
    this._hass = h;
    this._root.querySelectorAll("ha-form").forEach((f) => (f.hass = h));
  }

  _emit(config) {
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  _flat() {
    const c = { ...this._config };
    if (c.badge_size === undefined && c.icon_size !== undefined) {
      c.badge_size = c.icon_size;
      delete c.icon_size;
    }
    if (c.press_animation === true) c.press_animation = "shrink";
    if (c.press_animation === false) c.press_animation = "none";
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

  _onGeneral(v, keys) {
    const next = { ...this._config };
    for (const k of keys) {
      if (HELPER_KEYS.includes(k)) continue;
      const val = v[k];
      if (val === undefined || val === "") delete next[k];
      else if (!(k in this._config) && DEFAULTS[k] === val) continue;
      else next[k] = val;
    }
    if (keys.includes("badge_size")) {
      next.badge_size = Number(v.badge_size) || DEFAULTS.badge_size;
      if (v.icon_size === undefined || v.icon_size === "") delete next.icon_size;
    }
    if (keys.includes("columns_mode")) next.columns = v.columns_mode === "auto" ? "auto" : Number(v.columns_count) || 4;
    if (keys.includes("radius_mode")) next.border_radius = v.radius_mode === "fixed" ? Number(v.radius_value) || 0 : v.radius_mode;
    this._emit(next);
    this._syncVisibility();
  }

  _setApps(apps, structural) {
    const next = { ...this._config, apps };
    this._emit(next);
    if (structural) this.setConfig(next);
  }

  _setApp(i, app) {
    const apps = [...this._config.apps];
    apps[i] = app;
    this._setApps(apps, false);
    this._syncRow(i, true);
  }

  _form(schema, onChange) {
    const f = document.createElement("ha-form");
    f.hass = this._hass;
    f.schema = schema;
    f.computeLabel = (s) => s.label || s.name.replace(/_/g, " ");
    const keys = schemaKeys(schema);
    f.addEventListener("value-changed", (e) => onChange(e.detail.value, keys));
    return f;
  }

  _picker(label, placeholder, onChange) {
    const p = document.createElement("launcher-color-picker");
    p.label = label;
    p.placeholder = placeholder;
    p.addEventListener("color-changed", (e) => onChange(e.detail.value));
    return p;
  }

  _globalPicker(key, label, placeholder) {
    const p = this._picker(label, placeholder, (v) => {
      const next = { ...this._config };
      if (v) next[key] = v;
      else delete next[key];
      this._emit(next);
    });
    this._globalPickers[key] = p;
    return p;
  }

  _section(title, ...children) {
    const s = document.createElement("div");
    s.className = "section";
    s.innerHTML = `<div class="sub-title"></div>`;
    s.firstChild.textContent = title;
    s.append(...children);
    return s;
  }

  _tabs(tabs, className, current, onSelect) {
    const bar = document.createElement("div");
    bar.className = className === "tab" ? "tabs" : "subtabs";
    const panels = {};
    const buttons = {};
    const select = (id) => {
      for (const t of tabs) {
        buttons[t.id].classList.toggle("active", t.id === id);
        panels[t.id].hidden = t.id !== id;
      }
      onSelect(id);
    };
    for (const t of tabs) {
      const b = document.createElement("button");
      b.className = className;
      b.innerHTML = t.icon ? `<ha-icon icon="${t.icon}"></ha-icon><span></span>` : "<span></span>";
      b.querySelector("span").textContent = t.label;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        select(t.id);
      });
      bar.appendChild(b);
      buttons[t.id] = b;
      panels[t.id] = document.createElement("div");
    }
    queueMicrotask(() => select(tabs.some((t) => t.id === current) ? current : tabs[0].id));
    return { bar, panels };
  }

  _build() {
    this._built = true;
    this._root.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = EDITOR_CSS;
    this._root.appendChild(style);

    const ver = document.createElement("div");
    ver.className = "ver";
    ver.innerHTML = `<div class="n">Launcher-Card</div><div class="v">v${CARD_VERSION}</div>`;
    this._root.appendChild(ver);

    const { bar, panels } = this._tabs(EDITOR_TABS, "tab", this._tab, (id) => (this._tab = id));
    this._root.appendChild(bar);
    Object.values(panels).forEach((p) => this._root.appendChild(p));

    this._generalForms = [];
    this._globalPickers = {};
    for (const [id, schema] of Object.entries(GENERAL_SCHEMAS)) {
      const f = this._form(schema, (v, keys) => this._onGeneral(v, keys));
      this._generalForms.push(f);
      panels[id].appendChild(f);
    }
    panels.badges.appendChild(
      this._section(
        "Colors",
        this._globalPicker("icon_color", "Icon color (all apps)", "per style"),
        this._globalPicker("badge_border_color", "Border color", "rgba(255,255,255,.35)"),
        this._globalPicker("indicator_color", "Active dot color", "theme text")
      )
    );
    panels.layout.appendChild(this._section("Colors", this._globalPicker("title_color", "Title color", "theme text")));
    const replay = document.createElement("button");
    replay.className = "add replay";
    replay.textContent = "▶ Replay appear animation";
    replay.addEventListener("click", () => window.dispatchEvent(new CustomEvent("launcher-card-replay")));
    panels.effects.prepend(replay);
    this._shadowColor = this._globalPicker("name_shadow_color", "Text shadow color", "rgba(0,0,0,.65)");
    panels.names.appendChild(this._section("Colors", this._globalPicker("name_color", "Name color", "theme text"), this._shadowColor));

    this._appsPanel = panels.apps;
    this._rows = (this._config.apps || []).map((_, i) => this._buildRow(i));
    const add = document.createElement("button");
    add.className = "add";
    add.textContent = "+ Add app";
    add.addEventListener("click", () => {
      const apps = [...(this._config.apps || []), { name: "New app", icon: "mdi:apps", path: "/", color: "blue" }];
      this._open.add(apps.length - 1);
      this._setApps(apps, true);
    });
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Tap a color swatch to open the color wheel. Hex, rgb() and CSS variables can also be typed. Leave the badge color on Auto to derive it from the logo.";
    panels.apps.append(add, hint);

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
      const ta = this._appTab.get(i), tb = this._appTab.get(i + d);
      this._appTab.set(i, tb);
      this._appTab.set(i + d, ta);
      this._setApps(apps, true);
    };
    const up = mk("mdi:arrow-up", "Move up", () => move(-1));
    const down = mk("mdi:arrow-down", "Move down", () => move(1));
    mk("mdi:content-copy", "Duplicate", () => {
      const apps = [...this._config.apps];
      apps.splice(i + 1, 0, { ...apps[i] });
      this._open = new Set([...this._open].map((x) => (x > i ? x + 1 : x)));
      this._appTab = new Map([...this._appTab].map(([k, v]) => [k > i ? k + 1 : k, v]));
      this._setApps(apps, true);
    });
    mk("mdi:delete-outline", "Remove", () => {
      const apps = this._config.apps.filter((_, j) => j !== i);
      this._open = new Set([...this._open].filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
      this._appTab = new Map([...this._appTab].filter(([k]) => k !== i).map(([k, v]) => [k > i ? k - 1 : k, v]));
      this._setApps(apps, true);
    });
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "body";
    const { bar, panels } = this._tabs(APP_TABS, "subtab", this._appTab.get(i), (id) => this._appTab.set(i, id));
    body.appendChild(bar);
    Object.values(panels).forEach((p) => body.appendChild(p));

    const colorsTop = document.createElement("div");
    panels.colors.appendChild(colorsTop);
    const forms = Object.entries(APP_SCHEMAS).map(([id, schema]) => {
      const f = this._form(schema, (v, keys) => {
        const app = { ...this._config.apps[i] };
        for (const k of keys) {
          const x = v[k];
          if (x === "" || x === undefined || x === false) delete app[k];
          else app[k] = x;
        }
        if (keys.includes("image") && app.image && isImage(app.icon)) delete app.icon;
        const apps = [...this._config.apps];
        apps[i] = app;
        this._setApps(apps, false);
        this._syncRow(i);
      });
      (id === "style" ? colorsTop : panels[id]).appendChild(f);
      return f;
    });

    const presetsEl = document.createElement("div");
    presetsEl.className = "presets";
    const presetBtns = {};
    ["", ...PRESET_NAMES].forEach((name) => {
      const b = document.createElement("button");
      b.className = "preset" + (name ? "" : " auto");
      b.title = name ? name[0].toUpperCase() + name.slice(1) : "Auto (from logo)";
      if (name) {
        b.style.setProperty("--c1", PRESETS[name][0]);
        b.style.setProperty("--c2", PRESETS[name][1]);
      } else b.textContent = "AUTO";
      b.addEventListener("click", () => {
        const app = { ...this._config.apps[i] };
        delete app.color2;
        delete app.badge_color;
        if (name) app.color = name;
        else delete app.color;
        this._setApp(i, app);
      });
      presetsEl.appendChild(b);
      presetBtns[name] = b;
    });
    const pickers = {};
    const pickerEls = [
      ["color", "Badge color", "auto"],
      ["color2", "Second color (gradient)", "auto"],
      ["icon_color", "Icon color", "per style"],
      ["notify_color", "Notification color", "#ff3b30"],
    ].map(([key, label, ph]) => {
      pickers[key] = this._picker(label, ph, (v) => {
        const app = { ...this._config.apps[i] };
        const was = PRESETS[app.color];
        if (v) app[key] = v;
        else delete app[key];
        if (key === "color" && v && was && !app.color2) app.color2 = was[1];
        this._setApp(i, app);
      });
      return pickers[key];
    });
    panels.colors.append(this._section("Presets", presetsEl), this._section("Custom", ...pickerEls));

    details.appendChild(body);
    this._appsPanel.insertBefore(details, this._appsPanel.querySelector(".add"));

    return {
      details,
      forms,
      pickers,
      presetBtns,
      up,
      down,
      chip: summary.querySelector(".chip"),
      title: summary.querySelector(".label span"),
      sub: summary.querySelector(".label small"),
    };
  }

  _syncVisibility() {
    if (this._shadowColor) this._shadowColor.hidden = !this._config.name_shadow;
  }

  _sync() {
    const flat = this._flat();
    (this._generalForms || []).forEach((f) => (f.data = flat));
    for (const [k, p] of Object.entries(this._globalPickers || {})) p.value = this._config[k] || "";
    this._syncVisibility();
    this._rows.forEach((_, i) => this._syncRow(i, true));
  }

  _syncRow(i, withForm) {
    const r = this._rows[i];
    const app = (this._config.apps || [])[i];
    if (!r || !app) return;
    if (withForm) {
      const data = this._appData(app);
      r.forms.forEach((f) => (f.data = data));
    }
    r.details.open = this._open.has(i);
    r.up.disabled = i === 0;
    r.down.disabled = i === this._rows.length - 1;
    r.title.textContent = app.name || `App ${i + 1}`;
    r.sub.textContent = (app.tap_action && app.tap_action.action) || app.path || app.navigation_path || "";

    const cc = appColors(app) || PRESETS.blue;
    r.chip.style.setProperty("--c1", cc[0]);
    r.chip.style.setProperty("--c2", cc[1]);

    const preset = PRESETS[app.color] ? app.color : PRESETS[app.badge_color] ? app.badge_color : null;
    for (const [name, b] of Object.entries(r.presetBtns)) b.classList.toggle("active", name === "" ? !app.color && !app.badge_color : name === preset);
    r.pickers.color.value = preset ? PRESETS[preset][0] : app.color || app.badge_color || "";
    r.pickers.color2.value = app.color2 || "";
    r.pickers.color2.placeholder = preset ? PRESETS[preset][1] : "same";
    r.pickers.icon_color.value = app.icon_color || "";
    r.pickers.notify_color.value = app.notify_color || "";

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

const define = (name, cls) => customElements.get(name) || customElements.define(name, cls);
define("launcher-card", LauncherCard);
define("launcher-card-editor", LauncherCardEditor);
define("launcher-color-picker", LauncherColorPicker);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "launcher-card")) window.customCards.push({
  type: "launcher-card",
  name: "Launcher-Card",
  description: "Phone home screen style grid of app badges that navigate to dashboards.",
  preview: true,
});

console.info(`%c LAUNCHER-CARD %c v${CARD_VERSION} `, "color:#fff;background:#4facfe;font-weight:700", "color:#4facfe;background:#222");
