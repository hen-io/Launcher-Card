(() => { "use strict";
const CARD_VERSION = "0.2.21";

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
  flat: "Flat",
  glossy: "Glossy (3D)",
  depth: "Depth (3D slab)",
  pillow: "Pillow (3D inflated)",
  sphere: "Sphere (3D, round)",
  key: "Key (3D raised cap)",
  stack: "Stack (3D layered)",
  inset: "Inset (3D recessed)",
  glass: "Frosted glass",
  liquid: "Liquid glass",
  liquid_tint: "Liquid glass (tinted)",
  tinted: "Tinted",
  light: "Light",
  dark: "Dark",
  minimal: "Minimal (icon only)",
};

const LEGACY_STYLES = {
  aurora: "gradient", clay: "pillow", inflated: "pillow", bevel: "key", orb: "sphere", chrome: "depth",
  soft: "inset", neon: "dark", bubble: "glass", liquid_dark: "liquid_tint",
};
const styleName = (n, fallback = "gradient") => (BADGE_STYLES[n] ? n : LEGACY_STYLES[n] || fallback);

const ICON_SHADOWS = {
  none: "none",
  soft: "drop-shadow(0 1px 2px rgba(0,0,0,.25))",
  medium: "drop-shadow(0 2px 3px rgba(0,0,0,.4))",
  strong: "drop-shadow(0 3px 5px rgba(0,0,0,.55)) drop-shadow(0 0 2px rgba(0,0,0,.35))",
};
const ICON_SHADOWS_3D = {
  none: "none",
  soft: "drop-shadow(0 -.5px 0 rgba(var(--hi),.45)) drop-shadow(0 1.5px 1.5px rgba(var(--dp),.45))",
  medium: "drop-shadow(0 -.5px 0 rgba(var(--hi),.5)) drop-shadow(0 2px 2.5px rgba(var(--dp),.55))",
  strong: "drop-shadow(0 -1px 0 rgba(var(--hi),.55)) drop-shadow(0 3px 4px rgba(var(--dp),.65))",
};

const DEFAULTS = {
  columns: "auto",
  badge_size: 60,
  gap: 18,
  align: "spread",
  side_padding: 0,
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
  pages: false,
  rows_per_page: "auto",
  page_gap: 32,
  appear_animation: "rise",
  appear_order: "sequence",
  appear_trigger: "load",
  appear_duration: 450,
  appear_stagger: 35,
  haptic: true,
  card_background: true,
  entity_states: true,
  notifications: true,
  logo_colors: true,
  gestures: true,
  lite_mode: false,
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
const hasScheme = (s) => /^[a-z][a-z0-9+.-]*:/i.test(s) || String(s).startsWith("//");
const safeUrl = (u) => {
  const s = String(u || "").trim();
  if (!s) return null;
  if (hasScheme(s) && !/^(https?:|mailto:|tel:|homeassistant:|\/\/)/i.test(s)) return null;
  return s;
};
const safePath = (p) => {
  const s = String(p || "").trim();
  if (!s) return null;
  if (hasScheme(s)) {
    try {
      const u = new URL(s, window.location.href);
      return u.origin === window.location.origin ? u.pathname + u.search + u.hash : null;
    } catch (e) {
      return null;
    }
  }
  return s.startsWith("/") ? s : "/" + s;
};
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
  if (colorCache.size > 200) colorCache.delete(colorCache.keys().next().value);
  colorCache.set(src, p);
  return p;
}

const safe = (v) => String(v).replace(/\/\*|\*\//g, "").replace(/[;{}<>\\]/g, "");
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
function parseRgba(v) {
  const t = String(v || "").trim();
  const h = t.replace(/^#/, "");
  if (t[0] === "#" && /^[0-9a-f]{8}$/i.test(h)) return [0, 2, 4, 6].map((i, k) => parseInt(h.slice(i, i + 2), 16) / (k === 3 ? 255 : 1));
  const m = t.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+%?)\s*)?\)$/i);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1], +m[2], +m[3], clampAlpha(a)];
  }
  const rgb = hexToRgb(t);
  return rgb ? [...rgb, 1] : null;
}
const clampAlpha = (a) => (isNaN(a) ? 1 : Math.min(1, Math.max(0, a)));
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

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h < 0 ? h + 360 : h, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };
  return [f(0), f(8), f(4)];
}
let colorCtx;
function parseColor(v) {
  if (!v) return null;
  const direct = hexToRgb(v);
  if (direct) return direct;
  if (/^(var|color-mix|currentcolor|inherit)/i.test(String(v).trim())) return null;
  try {
    colorCtx = colorCtx || document.createElement("canvas").getContext("2d");
    colorCtx.fillStyle = "#010203";
    colorCtx.fillStyle = String(v);
    const out = colorCtx.fillStyle;
    if (out === "#010203") return null;
    return hexToRgb(out);
  } catch (e) {
    return null;
  }
}
const trip = (rgb) => rgb.map((x) => Math.round(clamp(x, 0, 255))).join(",");
const PALETTES = new Map();
function palette(a, b) {
  const key = `${a}|${b || ""}`;
  if (PALETTES.has(key)) return PALETTES.get(key);
  const ra = parseColor(a);
  let p;
  if (!ra) {
    p = { c1: a, c2: b || a, main: a, t1: "128,128,128", t2: "100,100,100", tint: "#eeeeee", tint2: "#dddddd",
          hi: "255,255,255", mid: "128,128,128", lo: "45,45,50", dp: "0,0,0" };
  } else {
    const rb = b && b !== a ? parseColor(b) : null;
    let top, bot;
    if (rb) {
      top = ra;
      bot = rb;
    } else {
      const [h, s, l] = rgbToHsl(ra);
      top = hslToRgb(h - 6, clamp(s * 1.02), clamp(l + (1 - l) * 0.24, 0, Math.max(l, 0.95)));
      bot = hslToRgb(h + 8, clamp(s * 1.05), clamp(l * 0.74, 0.05, 1));
    }
    const [ht, st] = rgbToHsl(top);
    const [hb, sb, lb] = rgbToHsl(bot);
    const mid = top.map((x, i) => (x + bot[i]) / 2);
    const main = rb ? mid : ra;
    const [hm, sm] = rgbToHsl(main);
    p = {
      c1: rgbToHex(top),
      c2: rgbToHex(bot),
      main: rgbToHex(main),
      t1: trip(top),
      t2: trip(bot),
      tint: rgbToHex(hslToRgb(hm, clamp(sm * 0.75), 0.9)),
      tint2: rgbToHex(hslToRgb(hm + 6, clamp(sm * 0.8), 0.82)),
      hi: trip(hslToRgb(ht, clamp(st * 0.55), 0.94)),
      mid: trip(mid),
      lo: trip(hslToRgb(hb + 4, clamp(sb), clamp(lb * 0.62, 0.06, 0.5))),
      dp: trip(hslToRgb(hb + 6, clamp(sb * 0.8), 0.12)),
    };
  }
  if (PALETTES.size > 300) PALETTES.clear();
  PALETTES.set(key, p);
  return p;
}
function applyPalette(el, colors) {
  const p = palette(colors[0], colors[1]);
  const st = el.style;
  st.setProperty("--c1", p.c1);
  st.setProperty("--c2", p.c2);
  st.setProperty("--main", p.main);
  st.setProperty("--t1", p.t1);
  st.setProperty("--t2", p.t2);
  st.setProperty("--tint", p.tint);
  st.setProperty("--tint2", p.tint2);
  st.setProperty("--hi", p.hi);
  st.setProperty("--mid", p.mid);
  st.setProperty("--lo", p.lo);
  st.setProperty("--dp", p.dp);
}

const SHEETS = new Map();
function adoptStyles(root, text) {
  if (root.adoptedStyleSheets !== undefined && typeof CSSStyleSheet === "function" && CSSStyleSheet.prototype.replaceSync) {
    let sheet = SHEETS.get(text);
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      if (SHEETS.size > 30) SHEETS.delete(SHEETS.keys().next().value);
      SHEETS.set(text, sheet);
    }
    root.adoptedStyleSheets = [sheet];
    return "";
  }
  return `<style>${text}</style>`;
}

const normalize = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const keywordList = (k) =>
  (Array.isArray(k) ? k : String(k === undefined || k === null ? "" : k).split(","))
    .map((x) => String(x).trim())
    .filter(Boolean);
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

function stateMatches(state, spec) {
  const items = keywordList(spec).map((x) => x.toLowerCase());
  const s = String(state).toLowerCase();
  const pos = items.filter((x) => !x.startsWith("!"));
  const neg = items.filter((x) => x.startsWith("!")).map((x) => x.slice(1));
  if (!items.length) return !INACTIVE_STATES.includes(s);
  return (!pos.length || pos.includes(s)) && !neg.includes(s);
}

const hasNotifyConfig = (a) => a.notify_entity || (a.notify_text !== undefined && a.notify_text !== "");

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
    const cfgKey = JSON.stringify(config);
    if (this._els && cfgKey === this._cfgKey) return;
    this._cfgKey = cfgKey;
    const c = { ...DEFAULTS, ...config };
    c.apps = config.apps.filter((a) => a && typeof a === "object" && !Array.isArray(a));
    if (config.badge_size === undefined && config.icon_size !== undefined) {
      c.badge_size = config.icon_size;
      delete c.icon_size;
    }
    if (c.press_animation === true) c.press_animation = "shrink";
    if (c.press_animation === false) c.press_animation = "none";
    if (c.lite_mode) {
      c.appear_animation = "none";
      c.hover_animation = "none";
      if (c.press_animation !== "none") c.press_animation = "shrink";
      if (c.name_overflow === "scroll") c.name_overflow = "ellipsis";
      c.shadow = false;
    }
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
        const own = this._ownLayout;
        this._lastWidth = w;
        if (own) return;
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
    if (!this._onResize) {
      this._onResize = () => {
        cancelAnimationFrame(this._resizeRaf);
        this._resizeRaf = requestAnimationFrame(() => this._layout());
      };
    }
    window.addEventListener("resize", this._onResize);
    if (!this._vis && "IntersectionObserver" in window) {
      this._vis = new IntersectionObserver((entries) => {
        const on = entries[entries.length - 1].isIntersecting;
        this._offscreen = !on;
        const card = this.shadowRoot && this.shadowRoot.querySelector("ha-card");
        if (card) card.classList.toggle("offscreen", !on);
      });
    }
    if (this._vis) this._vis.observe(this);
    this._played = false;
    this._maybeAppear();
  }

  disconnectedCallback() {
    if (this._ro) this._ro.disconnect();
    if (this._vis) this._vis.disconnect();
    if (this._io) this._io.disconnect();
    this._io = null;
    clearTimeout(this._appearTimer);
    window.removeEventListener("launcher-card-replay", this._onReplay);
    window.removeEventListener("resize", this._onResize);
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
        { threshold: 0 }
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

  _scheduleLayout() {
    if (this._layoutQueued) return;
    this._layoutQueued = true;
    requestAnimationFrame(() => {
      this._layoutQueued = false;
      this._layout();
    });
  }

  _hookFonts() {
    if (this._fontsHooked || !(document.fonts && document.fonts.ready)) return;
    this._fontsHooked = true;
    document.fonts.ready.then(() => this._scheduleLayout());
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
    for (const { el, haystack, condHidden } of this._els) {
      const hit = !condHidden && words.every((w) => haystack.includes(w));
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
    root.querySelector(".empty").hidden = shown > 0 || !this._els.length || !words.length;
    this._paginate();
    this._scheduleLayout();
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
    const badge = clamp(Number(c.badge_size) || 60, 16, 400);
    const nameSize = clamp(Number(c.name_size) || 12, 6, 48);
    const lineH = Math.ceil(nameSize * 1.25);
    const nameLines = c.show_names ? (c.name_overflow === "wrap" ? 2 : 1) : 0;
    const labelGap = nameLines ? Math.max(0, num(c.name_gap, 7)) : 0;
    const cellH = badge + labelGap + nameLines * lineH;
    const scaled = (f) => Math.round(badge * (Number(c.icon_scale) || f));
    const pct = num(c.icon_percent, 0);
    const fixedIcon = pct > 0 ? Math.round((badge * pct) / 100) : Number(c.icon_size) || 0;
    const icon = fixedIcon || scaled(0.55);
    const minimalIcon = fixedIcon || scaled(0.8);
    const image = fixedIcon || Math.round(badge * (Number(c.image_scale) || 0.62));
    const pad = Math.max(0, num(c.card_padding, 16));
    const side = Math.max(0, num(c.side_padding, 0));
    return { badge, lineH, labelGap, cellH, cellW: badge, icon, minimalIcon, image, pad, side, gap: Math.max(0, num(c.gap, 18)) };
  }

  _layout() {
    if (!this.shadowRoot || !this._config) return;
    this._ownLayout = true;
    this._laidWidth = Math.round(this.clientWidth);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this._ownLayout = false;
        if (Math.abs(Math.round(this.clientWidth) - this._laidWidth) > 20) this._layout();
      })
    );
    this._paginate();
    const grids = this.shadowRoot.querySelectorAll(".grid");
    if (!grids.length) return;
    const m = this._metrics();
    const cols = this._fixedCols();
    if (cols) {
      for (const grid of grids) {
        const w = grid.clientWidth;
        const pitch = this._spread() && cols > 1 ? (w - m.cellW) / (cols - 1) : w / cols;
        if (!pitch) continue;
        const gap = `${Math.max(4, Math.round(pitch - m.cellH))}px`;
        if (grid.style.rowGap !== gap) grid.style.rowGap = gap;
      }
    }
    if (this._config.show_names) {
      const edges = [];
      for (const grid of grids) {
        const gl = grid.offsetLeft, gw = grid.clientWidth;
        for (const a of grid.children) {
          if (a.classList.contains("filtered")) continue;
          const x = a.offsetLeft - gl;
          edges.push([a, x <= 1, x + a.offsetWidth >= gw - 1]);
        }
      }
      for (const [a, l, r] of edges) {
        if (a.classList.contains("edge-l") !== l) a.classList.toggle("edge-l", l);
        if (a.classList.contains("edge-r") !== r) a.classList.toggle("edge-r", r);
      }
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
        track.style.setProperty("--dur", `${Math.max(1, (textW + 24) / speed).toFixed(2)}s`);
        n.classList.add("marquee");
      } else if (!over && n.classList.contains("marquee")) {
        n.classList.remove("marquee");
      }
    }
  }

  _paginate() {
    const root = this.shadowRoot;
    const pagesEl = root && root.querySelector(".pages");
    if (!pagesEl || !this._els) return;
    const c = this._config;
    const live = this._els.filter((x) => !x.el.classList.contains("filtered"));
    const hidden = this._els.filter((x) => x.el.classList.contains("filtered"));
    let chunks = [live];
    const width = pagesEl.clientWidth;
    if (c.pages && width === 0 && this._pageCount) return;
    if (c.pages && width > 0) {
      const m = this._metrics();
      const W = Math.max(1, width - 2 * m.side);
      const fixed = this._fixedCols();
      const cols = fixed || Math.max(1, Math.min(this._maxCols() || Infinity, Math.floor((W + m.gap) / (m.cellW + m.gap))));
      const rowPitch = fixed
        ? Math.max(m.cellH + 4, this._spread() && cols > 1 ? (W - m.cellW) / (cols - 1) : W / cols)
        : m.cellH + m.gap;
      let rows;
      if (c.rows_per_page === "auto" || c.rows_per_page === undefined || c.rows_per_page === "") {
        const top = Math.min(Math.max(this._stableTop(pagesEl), 0), window.innerHeight * 0.5);
        const avail = window.innerHeight - top - 2 * m.pad - 28;
        rows = Math.max(1, Math.floor((avail + (rowPitch - m.cellH)) / rowPitch));
      } else rows = Math.max(1, Math.round(num(c.rows_per_page, 3)));
      const per = cols * rows;
      chunks = [];
      for (let i = 0; i < live.length; i += per) chunks.push(live.slice(i, i + per));
      if (!chunks.length) chunks = [[]];
    }

    let pages = [...pagesEl.children];
    while (pages.length < chunks.length) {
      const page = document.createElement("div");
      page.className = "page";
      const grid = document.createElement("div");
      grid.className = "grid";
      const first = pages[0].firstElementChild;
      if (first.style.rowGap) grid.style.rowGap = first.style.rowGap;
      page.appendChild(grid);
      pagesEl.appendChild(page);
      pages.push(page);
    }
    while (pages.length > chunks.length) pages.pop().remove();

    chunks.forEach((chunk, p) => {
      const grid = pages[p].firstElementChild;
      chunk.forEach(({ el }, k) => {
        if (grid.children[k] !== el) grid.insertBefore(el, grid.children[k] || null);
      });
    });
    const lastGrid = pages[pages.length - 1].firstElementChild;
    for (const { el } of hidden) if (el.parentElement !== lastGrid) lastGrid.appendChild(el);

    this._pageCount = chunks.length;
    this._buildDots(pagesEl);
  }

  _stableTop(el) {
    let top = el.getBoundingClientRect().top + (window.scrollY || 0);
    for (let n = el, guard = 0; n && guard < 80; guard++) {
      if (n.scrollTop) top += n.scrollTop;
      const root = n.getRootNode && n.getRootNode();
      n = n.assignedSlot || n.parentElement || (root && root.host) || null;
    }
    return top;
  }

  _buildDots(pagesEl) {
    const dots = this.shadowRoot.querySelector(".dots");
    const n = this._pageCount;
    if (!dots) return;
    const show = this._config.pages && n > 1;
    dots.hidden = !show;
    if (!pagesEl._scrollBound) {
      pagesEl._scrollBound = true;
      this._bindDrag(pagesEl);
      pagesEl.addEventListener(
        "scroll",
        () => {
          const w = this._pageStep(pagesEl);
          if (!w) return;
          const idx = Math.max(0, Math.min(this._pageCount - 1, Math.round(pagesEl.scrollLeft / w)));
          if (idx !== this._page) {
            this._page = idx;
            this._markDots();
          }
        },
        { passive: true }
      );
    }
    if (!show) {
      this._page = 0;
      this._markDots();
      return;
    }
    if (dots.children.length !== n) {
      dots.textContent = "";
      for (let i = 0; i < n; i++) {
        const b = document.createElement("button");
        b.className = "dot";
        b.setAttribute("aria-label", `Page ${i + 1}`);
        b.addEventListener("click", () => pagesEl.scrollTo({ left: this._pageLeft(i), behavior: "smooth" }));
        dots.appendChild(b);
      }
    }
    this._page = Math.min(this._page || 0, n - 1);
    const left = this._pageLeft(this._page);
    if (Math.abs(pagesEl.scrollLeft - left) > 1) pagesEl.scrollLeft = left;
    this._markDots();
  }

  _bindDrag(pagesEl) {
    let down = null, dragging = false, suppress = false;
    pagesEl.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || !this._config.pages || this._pageCount < 2) return;
      const app = e.composedPath().find((n) => n.classList && n.classList.contains("app"));
      down = { x: e.clientX, left: pagesEl.scrollLeft, id: e.pointerId, app };
      dragging = false;
    });
    pagesEl.addEventListener("pointermove", (e) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x;
      if (!dragging) {
        if (Math.abs(dx) < 6) return;
        dragging = true;
        pagesEl.setPointerCapture(e.pointerId);
        pagesEl.classList.add("dragging");
        if (down.app) this._cancelPress(down.app);
      }
      pagesEl.scrollLeft = down.left - dx;
    });
    const end = (e) => {
      if (!down) return;
      if (dragging) {
        const w = pagesEl.clientWidth || 1;
        const dx = e.clientX - down.x;
        const start = Math.round(down.left / (this._pageStep(pagesEl) || w));
        const target = Math.max(0, Math.min(this._pageCount - 1, start + (dx < -w * 0.15 ? 1 : dx > w * 0.15 ? -1 : 0)));
        pagesEl.classList.remove("dragging");
        pagesEl.scrollTo({ left: this._pageLeft(target), behavior: "smooth" });
        suppress = true;
        setTimeout(() => (suppress = false), 0);
      }
      down = null;
      dragging = false;
    };
    pagesEl.addEventListener("pointerup", end);
    pagesEl.addEventListener("pointercancel", end);

    let acc = 0, lockUntil = 0;
    pagesEl.addEventListener(
      "wheel",
      (e) => {
        if (!this._config.pages || this._pageCount < 2 || e.ctrlKey) return;
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        const now = performance.now();
        if (now < lockUntil) {
          e.preventDefault();
          return;
        }
        const dir = e.deltaY > 0 ? 1 : -1;
        const target = (this._page || 0) + dir;
        if (target < 0 || target >= this._pageCount) return;
        e.preventDefault();
        acc += e.deltaMode ? dir * 100 : e.deltaY;
        if (Math.abs(acc) < 40) return;
        acc = 0;
        lockUntil = now + 450;
        this._page = target;
        this._markDots();
        pagesEl.scrollTo({ left: this._pageLeft(target), behavior: "smooth" });
      },
      { passive: false }
    );
    pagesEl.addEventListener(
      "click",
      (e) => {
        if (!suppress) return;
        e.stopPropagation();
        e.preventDefault();
      },
      true
    );
  }

  _pageLeft(i) {
    const pagesEl = this.shadowRoot && this.shadowRoot.querySelector(".pages");
    const page = pagesEl && pagesEl.children[i];
    return page ? page.offsetLeft : 0;
  }

  _pageStep(pagesEl) {
    const pages = pagesEl.children;
    if (pages.length > 1) return pages[1].offsetLeft - pages[0].offsetLeft || pagesEl.clientWidth;
    return pagesEl.clientWidth;
  }

  _markDots() {
    const root = this.shadowRoot;
    const cur = this._page || 0;
    const dots = root.querySelector(".dots");
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle("active", i === cur));
    const pagesEl = root.querySelector(".pages");
    if (pagesEl) [...pagesEl.children].forEach((p, i) => p.classList.toggle("current", i === cur));
  }

  _spread() {
    return this._config.align !== "start" && this._config.align !== "end";
  }

  _maxCols() {
    return this._fixedCols() ? 0 : Math.max(0, Math.round(num(this._config.max_columns, 0)));
  }

  _fixedCols() {
    const c = this._config.columns;
    return c === "auto" || !c ? null : Math.max(1, Number(c) || 4);
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first && this._config && this._config.apps.some((a) => keywordList(a.users).length)) this._render();
    else this._update();
  }

  getCardSize() {
    const c = this._config;
    if (!c) return 3;
    const cols = this._fixedCols() || 4;
    return Math.max(1, Math.ceil(c.apps.length / cols) * 2 + (c.title ? 1 : 0) + (c.search ? 1 : 0));
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
    const users = keywordList(app.users);
    if (users.length) {
      const u = this._hass && this._hass.user;
      if (!u) return false;
      return users.some((x) => x === u.id || x.toLowerCase() === String(u.name).toLowerCase());
    }
    return true;
  }

  _styles() {
    const c = this._config;
    const m = this._metrics();
    const apps = c.apps;
    const cols = this._fixedCols();
    const pad = m.pad;
    const sh = (v) => (c.shadow ? v : "0 0 #0000");
    const base = styleName(c.badge_style);
    const used = new Set([base]);
    for (const a of apps) if (a.badge_style) used.add(styleName(a.badge_style, base));
    const hasNotify = c.notifications && apps.some(hasNotifyConfig);
    const hasEntity = c.entity_states && apps.some((a) => a.entity);
    const overflow = c.name_overflow;
    const justify = { start: "start", end: "end" }[c.align] || "space-between";
    const radius = this._radius();
    const border = Math.max(0, num(c.badge_border, 0));
    const ang = num(c.gradient_angle, 145);
    const rad = (ang * Math.PI) / 180;
    const spot = `${Math.round(50 - 32 * Math.sin(rad))}% ${Math.round(50 + 32 * Math.cos(rad))}%`;
    const g = (a, b) =>
      ({
        radial: `radial-gradient(circle at ${spot}, ${a}, ${b} 88%)`,
        conic: `conic-gradient(from ${ang}deg at 50% 50%, ${a}, ${b}, ${a})`,
        diamond: `linear-gradient(${ang}deg, ${a} 0%, ${b} 50%, ${a} 100%)`,
      })[c.gradient_type] || `linear-gradient(${ang}deg, ${a}, ${b})`;
    const grad = g("var(--c1)", "var(--c2)");
    const gridCols = cols
      ? this._spread() && cols > 1
        ? `grid-template-columns:repeat(${cols}, ${m.cellW}px); column-gap:0; row-gap:${m.gap}px;`
        : `grid-template-columns:repeat(${cols}, minmax(0, 1fr)); column-gap:0; row-gap:${m.gap}px;`
      : this._spread() || c.pages
        ? `grid-template-columns:repeat(auto-fill, ${m.cellW}px); gap:${m.gap}px;`
        : `grid-template-columns:repeat(auto-fit, ${m.cellW}px); gap:${m.gap}px;`;
    const maxCols = this._maxCols();
    const sd = m.side;
    const side = { start: `${pad}px auto ${pad}px ${sd}px`, end: `${pad}px ${sd}px ${pad}px auto` }[c.align] || `${pad}px auto`;
    const gridBox = maxCols
      ? `width:min(calc(100% - ${2 * sd}px), ${maxCols * m.cellW + (maxCols - 1) * m.gap}px);margin:${side};`
      : `margin:${pad}px ${sd}px;`;

    const press = c.press_animation;
    const scaleT = press === "spring" ? ".4s cubic-bezier(.2,1.7,.4,1)" : ".18s cubic-bezier(.3,.7,.4,1.4)";
    const T = `translate .25s cubic-bezier(.3,.7,.4,1.4), scale ${scaleT}, rotate .25s ease, filter .2s ease, opacity .2s ease`;

    const STYLE = {
      gradient: `.s-gradient{background:var(--grad);
        box-shadow:inset 0 1px 0 rgba(var(--hi),.5),inset 0 -1px 0 rgba(var(--lo),.25),${sh("0 1px 2px rgba(var(--dp),.25),0 7px 12px -6px rgba(var(--dp),.55)")}}`,
      flat: `.s-flat{background:var(--c1);box-shadow:inset 0 0 0 1px rgba(var(--lo),.18),${sh("0 1px 2px rgba(var(--dp),.3)")}}`,

      glossy: `.s-glossy{--ish:var(--ish3d);background:var(--grad);
        box-shadow:inset 0 1px 0 rgba(var(--hi),.9),inset 0 -3px 5px -2px rgba(var(--lo),.75),inset 0 0 0 1px rgba(var(--lo),.35),
                   ${sh("0 1px 1px rgba(var(--dp),.4),0 5px 8px -3px rgba(var(--dp),.45),0 13px 16px -9px rgba(var(--dp),.55)")}}
        .s-glossy::before{content:"";position:absolute;left:0;right:0;top:0;height:52%;pointer-events:none;
        border-radius:0 0 50% 50%/0 0 24% 24%;background:linear-gradient(180deg,rgba(255,255,255,.62),rgba(255,255,255,.1))}`,

      depth: `.s-depth{--ish:var(--ish3d);background:var(--grad);
        box-shadow:inset 0 1px 0 rgba(var(--hi),.85),inset 0 -2px 2px rgba(var(--lo),.5),inset 0 0 0 1px rgba(var(--lo),.22),
                   ${sh("0 1px 1px rgba(var(--dp),.35),0 4px 7px -2px rgba(var(--dp),.4),0 12px 16px -9px rgba(var(--dp),.5)")}}`,

      pillow: `.s-pillow{--ish:var(--ish3d);background:radial-gradient(120% 110% at 30% 14%,rgb(var(--hi)) 0%,var(--c1) 30%,var(--c2) 88%);
        box-shadow:inset 2px 3px 3px rgba(var(--hi),.9),inset -2px -8px 10px -3px rgba(var(--lo),.8),inset 0 0 0 1px rgba(var(--lo),.3),
                   ${sh("0 2px 3px rgba(var(--dp),.35),0 11px 14px -6px rgba(var(--dp),.55)")}}
        .s-pillow::before{content:"";position:absolute;left:14%;top:8%;width:40%;height:22%;border-radius:50%;pointer-events:none;
        transform:rotate(-20deg);background:radial-gradient(ellipse,rgba(255,255,255,.95),rgba(255,255,255,0) 72%)}`,

      sphere: `.s-sphere{--ish:var(--ish3d);border-radius:50%;
        background:radial-gradient(circle at 34% 26%,rgb(var(--hi)) 0%,var(--c1) 24%,var(--c2) 66%,rgb(var(--lo)) 100%);
        box-shadow:inset -3px -6px 10px rgba(var(--dp),.45),inset 2px 3px 4px rgba(var(--hi),.5),
                   ${sh("0 3px 4px rgba(var(--dp),.3),0 12px 14px -6px rgba(var(--dp),.55)")}}
        .s-sphere::before{content:"";position:absolute;left:18%;top:9%;width:36%;height:20%;border-radius:50%;pointer-events:none;
        transform:rotate(-24deg);background:radial-gradient(ellipse,rgba(255,255,255,.9),rgba(255,255,255,0) 70%)}`,

      key: `.s-key{--ish:var(--ish3d);background:var(--grad);
        transition:${T},box-shadow .12s ease;
        box-shadow:inset 0 0 0 1.5px rgba(var(--hi),.4),inset 0 -3px 4px -1px rgba(var(--lo),.35),0 4px 0 rgb(var(--lo)),
                   ${sh("0 11px 10px -3px rgba(var(--dp),.5)")}}`,

      stack: `.s-stack{--ish:var(--ish3d);background:var(--grad);
        box-shadow:inset 0 1px 0 rgba(var(--hi),.7),inset 0 0 0 1px rgba(var(--lo),.25),0 4px 0 -1px rgb(var(--mid)),0 9px 0 -3px rgb(var(--lo)),
                   ${sh("0 15px 12px -9px rgba(var(--dp),.55)")}}`,

      inset: `.s-inset{--ic:var(--c2);--ish:var(--ish3d);
        background:linear-gradient(180deg,rgba(var(--lo),.3),rgba(var(--mid),.12)),var(--card-background-color,#fff);
        box-shadow:inset 0 3px 7px rgba(var(--dp),.45),inset 0 0 0 1px rgba(var(--lo),.3),${sh("0 1px 0 rgba(255,255,255,.6)")}}`,

      glass: `.s-glass{
        background:linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,255,255,0) 55%),
                   ${g("rgba(var(--t1),.86)", "rgba(var(--t2),.8)")};
        backdrop-filter:blur(12px) saturate(170%);-webkit-backdrop-filter:blur(12px) saturate(170%);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 0 0 1px rgba(255,255,255,.3),
                   ${sh("0 1px 2px rgba(var(--dp),.2),0 8px 14px -7px rgba(var(--dp),.5)")}}`,
      liquid: `.s-liquid{
        background:radial-gradient(120% 70% at 50% -12%,rgba(255,255,255,.5),rgba(255,255,255,0) 62%),
                   radial-gradient(90% 60% at 50% 115%,rgba(var(--hi),.6) 0%,transparent 70%),
                   ${g("rgba(var(--t1),.78)", "rgba(var(--t2),.7)")};
        backdrop-filter:blur(10px) saturate(190%) brightness(1.1);-webkit-backdrop-filter:blur(10px) saturate(190%) brightness(1.1);
        box-shadow:inset 1.5px 1.5px 1px rgba(255,255,255,.75),inset -1px -1px 1px rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.18),
                   inset 0 0 14px rgba(255,255,255,.18),${sh("0 10px 20px -10px rgba(var(--dp),.5),0 2px 4px -2px rgba(var(--dp),.25)")}}`,
      liquid_tint: `.s-liquid_tint{
        background:radial-gradient(120% 70% at 50% -12%,rgba(255,255,255,.42),rgba(255,255,255,0) 60%),
                   radial-gradient(90% 60% at 60% 115%,rgba(var(--hi),.7) 0%,transparent 70%),
                   ${g("rgba(var(--t1),.92)", "rgba(var(--t2),.86)")};
        backdrop-filter:blur(10px) saturate(190%) brightness(1.08);-webkit-backdrop-filter:blur(10px) saturate(190%) brightness(1.08);
        box-shadow:inset 1.5px 1.5px 1px rgba(255,255,255,.65),inset -1px -1px 1px rgba(255,255,255,.3),inset 0 0 14px rgba(255,255,255,.14),
                   ${sh("0 10px 20px -10px rgba(var(--dp),.5),0 2px 4px -2px rgba(var(--dp),.25)")}}`,
      tinted: `.s-tinted{--ic:var(--c2);background:${g("var(--tint)", "var(--tint2)")};
        box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 0 0 1px rgba(var(--mid),.22),
                   ${sh("0 1px 2px rgba(var(--dp),.15),0 6px 10px -6px rgba(var(--dp),.35)")}}`,
      light: `.s-light{background:linear-gradient(180deg,#fff,#eceef2);
        box-shadow:inset 0 1px 0 #fff,inset 0 0 0 1px rgba(0,0,0,.06),${sh("0 1px 2px rgba(0,0,0,.12),0 6px 12px -6px rgba(var(--dp),.35)")}}
        .s-light ha-icon{color:var(--app-ic,var(--main))}`,
      dark: `.s-dark{background:linear-gradient(180deg,#2d3037,#181a1f);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 0 0 1px rgba(255,255,255,.07),${sh("0 7px 12px -6px rgba(0,0,0,.6)")}}
        .s-dark ha-icon{color:var(--app-ic,var(--main))}`,
      minimal: `.s-minimal{--ic:var(--c1);background:none;box-shadow:none;overflow:visible;border-color:transparent}
        .s-minimal ha-icon{--mdc-icon-size:${m.minimalIcon}px}`,
    };

    const parts = [];
    const add = (s) => s && parts.push(s);

    add(`:host{display:block}
      ha-card{${c.card_background ? "" : "background:none;box-shadow:none;border:none;"}overflow:hidden}
      .pages{display:flex;position:relative}
      .page{flex:0 0 100%;min-width:0;box-sizing:border-box}
      .grid{display:grid;${gridCols}${gridBox}justify-items:center;justify-content:${justify};${c.icon_color ? `--glob-ic:${css(c.icon_color)};` : ""}}
      .empty{text-align:center;color:var(--secondary-text-color);font-size:14px;margin:-4px ${m.side}px ${pad}px}
      .empty[hidden],.dots[hidden]{display:none}`);

    if (c.title) {
      add(`.title{padding:${pad}px ${pad}px 0;font-size:${c.title_size ? `${num(c.title_size, 20)}px` : "var(--ha-card-header-font-size,20px)"};
        font-weight:500;text-align:${{ start: "left", center: "center", end: "right" }[c.title_align] || "left"};
        color:${css(c.title_color) || "var(--primary-text-color)"}}`);
    }

    if (c.pages) {
      add(`.pages.paged{gap:${Math.max(0, num(c.page_gap, 32))}px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;cursor:grab}
        .pages.paged::-webkit-scrollbar{display:none}
        .pages.paged.dragging{scroll-snap-type:none;cursor:grabbing;user-select:none;-webkit-user-select:none}
        .pages.paged.dragging .app{pointer-events:none}
        .page{scroll-snap-align:start;scroll-snap-stop:always;overflow:clip;contain:paint;-webkit-clip-path:inset(0);clip-path:inset(0)}
        .dots{display:flex;justify-content:center;align-items:center;gap:8px;padding:0 0 ${Math.max(10, pad)}px}
        .dot{width:8px;height:8px;padding:0;border:none;border-radius:4px;cursor:pointer;flex:none;
          background:var(--divider-color,rgba(127,127,127,.4));transition:width .25s ease,background-color .25s ease}
        .dot.active{width:20px;background:${css(c.dots_color) || "var(--primary-color)"}}`);
    }

    if (c.search) {
      add(`.search{margin:${pad}px ${m.side}px 0;display:flex;align-items:center;gap:8px;height:40px;padding:0 8px 0 12px;box-sizing:border-box;
          border-radius:20px;color:var(--secondary-text-color);cursor:text;background:rgba(127,127,127,.12);
          box-shadow:inset 0 0 0 1px rgba(127,127,127,.15);transition:box-shadow .2s ease}
        .search:focus-within{box-shadow:inset 0 0 0 2px var(--primary-color)}
        .search ha-icon{--mdc-icon-size:20px;width:20px;height:20px;color:inherit;flex:none}
        .search .clear ha-icon{--mdc-icon-size:18px;width:18px;height:18px}
        .search input{flex:1;min-width:0;height:100%;border:none;outline:none;background:none;padding:0;font:inherit;font-size:15px;color:var(--primary-text-color)}
        .search input::placeholder{color:var(--secondary-text-color);opacity:1}
        .search input::-webkit-search-cancel-button{display:none}
        .search .clear{display:none;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:none;
          border-radius:50%;background:none;color:inherit;cursor:pointer}
        .search .clear:hover{background:rgba(127,127,127,.2)}
        .search.has .clear{display:flex}
        .searching .app.first .badge{outline:2px solid var(--primary-color);outline-offset:3px}`);
    }
    add(`.app.filtered{display:none}`);

    add(`.app{display:flex;flex-direction:column;align-items:center;gap:${m.labelGap}px;width:100%;min-width:0;contain:layout style;
        cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
        -webkit-tap-highlight-color:transparent;outline:none;touch-action:manipulation}
      .wrap{position:relative;flex:none}
      .badge{--ic:#fff;--grad:${grad};
        --ish:${ICON_SHADOWS[c.icon_shadow] || ICON_SHADOWS.soft};--ish3d:${ICON_SHADOWS_3D[c.icon_shadow] || ICON_SHADOWS_3D.soft};
        position:relative;width:${m.badge}px;height:${m.badge}px;border-radius:${radius};
        display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box;
        ${border ? `border:${border}px solid ${css(c.badge_border_color) || "rgba(255,255,255,.35)"};` : ""}
        transition:${T}}
      .app:focus-visible .badge{outline:2px solid var(--primary-color);outline-offset:3px}`);

    for (const name of used) add(STYLE[name]);
    if (c.shine && ["gradient", "flat"].some((n) => used.has(n))) {
      add(`.s-gradient::after,.s-flat::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;
        background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,0) 48%)}`);
    }

    add(this._animStyles(T));
    add(this._appearStyles());

    add(`ha-icon{--mdc-icon-size:${m.icon}px;display:flex;position:relative;z-index:1;color:var(--app-ic,var(--glob-ic,var(--ic)));
        ${c.icon_shadow === "none" ? "" : "filter:var(--ish);"}}
      img{width:${m.image}px;height:${m.image}px;max-width:100%;max-height:100%;object-fit:contain;position:relative;z-index:1;
        ${c.icon_shadow === "none" ? "" : "filter:var(--ish);"}}
      img.cover{width:100%;height:100%;object-fit:cover;filter:none}`);
    if (hasNotify) {
      const out = Math.min(6, m.side), outDot = Math.min(3, m.side);
      add(`.notify{position:absolute;top:-6px;right:-${out}px;z-index:2;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;
          border-radius:10px;background:var(--notify-color,#ff3b30);color:#fff;font-size:11px;font-weight:600;
          display:none;align-items:center;justify-content:center;line-height:1;
          box-shadow:0 0 0 2px var(--card-background-color,#fff),0 2px 4px rgba(0,0,0,.3)}
        .notify.dot{min-width:12px;width:12px;height:12px;padding:0;top:-3px;right:-${outDot}px}
        .notify.show{display:flex;animation:lc-pop .25s cubic-bezier(.3,.7,.4,1.6)}
        @keyframes lc-pop{from{transform:scale(0)}to{transform:scale(1)}}`);
    }
    if (hasEntity) {
      add(`.indicator{position:absolute;left:50%;bottom:-6px;width:4px;height:4px;margin-left:-2px;border-radius:50%;
          background:${css(c.indicator_color) || "var(--primary-text-color)"};opacity:0;transition:opacity .2s ease}
        .app.active .indicator{opacity:${c.indicator_color ? 1 : 0.7}}
        .app.unavail .badge{filter:grayscale(1);opacity:.45}`);
    }

    if (c.show_names) {
      const lines = overflow === "wrap" ? 2 : 1;
      add(`.name{font-size:${clamp(num(c.name_size, 12), 6, 48)}px;line-height:${m.lineH}px;height:${m.lineH * lines}px;width:calc(100% + 16px);margin:0 -8px;text-align:center;
          overflow:hidden;contain:paint;color:${css(c.name_color) || "var(--primary-text-color)"};
          ${c.name_weight ? `font-weight:${num(c.name_weight, 400)};` : ""}
          ${["uppercase", "lowercase", "capitalize"].includes(c.name_transform) ? `text-transform:${c.name_transform};letter-spacing:.02em;` : ""}
          ${c.name_shadow ? `text-shadow:0 1px ${Math.max(0, num(c.name_shadow_blur, 3))}px ${css(c.name_shadow_color) || "rgba(0,0,0,.65)"};` : ""}}
        .track,.t{display:inline-block;white-space:nowrap}
        .track{max-width:100%}
        .edge-l .name{width:calc(100% + 8px);margin:0 -8px 0 0}
        .edge-r .name{width:calc(100% + 8px);margin:0 0 0 -8px}
        .edge-l.edge-r .name{width:100%;margin:0}`);
      if (overflow === "wrap") {
        add(`.track,.t{display:block;white-space:normal}
          .t{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}`);
      } else if (overflow === "ellipsis") {
        add(`.track,.t{display:block;overflow:hidden;text-overflow:ellipsis}`);
      } else {
        add(`.t.clone{display:none;padding-left:24px}
          .marquee{text-align:left;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);
            mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
          .marquee .track{max-width:none;animation:lc-marquee var(--dur,8s) linear infinite;will-change:transform}
          .marquee .t.clone{display:inline-block}
          .offscreen .marquee .track{animation-play-state:paused}
          .paged .page:not(.current) .marquee .track{animation:none;transform:none}
          @keyframes lc-marquee{from{transform:translateX(0)}to{transform:translateX(calc(-1 * var(--dist)))}}
          @media (prefers-reduced-motion:reduce){
            .marquee{-webkit-mask-image:none;mask-image:none;text-align:center}
            .marquee .track{animation:none;max-width:100%;overflow:hidden;text-overflow:ellipsis}
            .marquee .t.clone{display:none}}`);
      }
    }

    let out = parts.join("\n").replace(/\n\s+/g, "\n");
    if (c.lite_mode) out = out.replace(/(-webkit-)?backdrop-filter:[^;}]*;?/g, "");
    return out;
  }

  _animStyles() {
    const c = this._config;
    const out = [];
    const h = c.hover_animation, p = c.press_animation;
    const hover = {
      lift: ".app:hover .badge{translate:0 -3px}",
      grow: ".app:hover .badge{scale:1.08}",
      tilt: `.app:hover .badge{transform:perspective(${num(c.badge_size, 60) * 4}px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));scale:1.05}`,
      glow: ".app:hover .badge{translate:0 -1px;filter:drop-shadow(0 0 10px rgba(var(--mid),.85))}",
      wiggle: ".app:hover .badge{animation:lc-wiggle .45s ease}@keyframes lc-wiggle{0%,100%{rotate:0deg}25%{rotate:-7deg}50%{rotate:5deg}75%{rotate:-3deg}}",
      float: ".app:hover .badge{animation:lc-float 1.8s ease-in-out infinite}.offscreen .badge{animation-play-state:paused}@keyframes lc-float{0%,100%{translate:0 0}50%{translate:0 -5px}}",
    }[h];
    if (hover) out.push(`@media (hover:hover){${hover}}`);
    const press = {
      shrink: ".app.pressed .badge{scale:.88;filter:brightness(.92)}",
      push: ".app.pressed .badge{translate:0 3px;scale:.95;filter:brightness(.94)}",
      spring: ".app.pressed .badge{scale:.8}",
      jelly: ".app.tapped .badge{animation:lc-jelly .5s ease}@keyframes lc-jelly{0%{scale:1}30%{scale:1.16 .84}50%{scale:.9 1.1}70%{scale:1.05 .95}100%{scale:1}}",
      ripple: `.app.pressed .badge{scale:.94}
        .app.tapped .wrap::after{content:"";position:absolute;inset:0;border-radius:${this._radius()};pointer-events:none;animation:lc-ripple .6s ease-out}
        @keyframes lc-ripple{0%{box-shadow:0 0 0 0 rgba(var(--mid),.7)}100%{box-shadow:0 0 0 16px rgba(var(--mid),0)}}`,
    }[p];
    if (press) {
      out.push(press);
      out.push(`.app.pressed .s-key{translate:0 3px;scale:1;
          box-shadow:inset 0 0 0 1.5px rgba(var(--hi),.4),0 1px 0 rgb(var(--lo))}
        .app.pressed .s-stack{translate:0 3px;scale:1}
        .app.pressed .s-inset{scale:.97}`);
    }
    out.push("@media (prefers-reduced-motion:reduce){.badge{animation:none!important}}");
    return out.join("\n");
  }

  _render() {
    const c = this._config;
    if (!c) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    const styleTag = adoptStyles(this.shadowRoot, this._styles());
    this.shadowRoot.innerHTML = `${styleTag}
      <ha-card>
        ${c.title ? `<div class="title"></div>` : ""}
        ${c.search ? `<label class="search"><ha-icon icon="mdi:magnify"></ha-icon>
          <input type="search" autocomplete="off" spellcheck="false" enterkeyhint="go">
          <button class="clear" title="Clear"><ha-icon icon="mdi:close"></ha-icon></button></label>` : ""}
        <div class="pages${c.pages ? " paged" : ""}"><div class="page"><div class="grid"></div></div></div>
        <div class="dots" hidden></div>
        <div class="empty" hidden>No apps found</div>
      </ha-card>`;
    if (this._offscreen) this.shadowRoot.querySelector("ha-card").classList.add("offscreen");
    if (c.title) this.shadowRoot.querySelector(".title").textContent = c.title;

    const gridEl = this.shadowRoot.querySelector(".grid");
    const style = styleName(c.badge_style);
    const frag = document.createDocumentFragment();
    this._els = [];
    this._byEl = new WeakMap();
    this._bindGrid(this.shadowRoot.querySelector(".pages"));

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
      badge.className = `badge s-${styleName(app.badge_style, style)}`;
      const colors = appColors(app);
      const setColors = (cc) => applyPalette(el, cc);
      setColors(colors || PRESETS.blue);

      const src = imageOf(app);
      if (src) {
        const img = document.createElement("img");
        img.alt = "";
        img.draggable = false;
        img.decoding = "async";
        img.loading = "lazy";
        img.src = src;
        if (app.fill === true || app.image_fill === true) {
          img.className = "cover";
          badge.style.background = "none";
        }
        if (!colors && c.logo_colors && app.auto_color !== false) extractColors(src).then((cc) => cc && setColors(cc));
        badge.appendChild(img);
      } else if (app.icon) {
        const ic = document.createElement("ha-icon");
        ic.setAttribute("icon", app.icon);
        if (app.icon_color) ic.style.setProperty("--app-ic", css(app.icon_color));
        badge.appendChild(ic);
      }
      wrap.appendChild(badge);

      const notify = c.notifications && hasNotifyConfig(app) ? document.createElement("div") : null;
      if (notify) {
      notify.className = "notify";
      if (app.notify_color) notify.style.setProperty("--notify-color", css(app.notify_color));
      if (app.notify_text !== undefined && app.notify_text !== "" && !app.notify_entity) {
        notify.textContent = String(app.notify_text);
        notify.classList.add("show");
      }
      wrap.appendChild(notify);
      }

      if (c.entity_states && c.active_indicator && app.entity) {
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

      frag.appendChild(el);
      const item = { app, el, notify, haystack: normalize([app.name, ...keywordList(app.keywords)].filter(Boolean).join(" ")), timer: 0, held: false, tapTimer: 0 };
      this._byEl.set(el, item);
      this._els.push(item);
    });

    gridEl.appendChild(frag);
    this._dynamic = this._els.some((x) => (c.entity_states && x.app.entity) || (c.notifications && x.app.notify_entity) || x.app.show_entity);
    this._page = Math.min(this._page || 0, 999);
    this._setupSearch();
    this._paginate();
    this._update(true);
    this._maybeAppear();
    this._scheduleLayout();
    this._hookFonts();
  }

  _update(force) {
    if (!this._hass || !this._els || !this._dynamic) return;
    const states = this._hass.states;
    let visibilityChanged = false;
    for (const item of this._els) {
      const { app, el, notify } = item;
      const nst = notify && app.notify_entity ? states[app.notify_entity] : undefined;
      const est = this._config.entity_states && app.entity ? states[app.entity] : undefined;
      const sst = app.show_entity ? states[app.show_entity] : undefined;
      if (!force && item.nst === nst && item.est === est && item.sst === sst) continue;
      item.nst = nst;
      item.est = est;
      item.sst = sst;
      if (app.show_entity) {
        const hide = !stateMatches(sst ? sst.state : "unavailable", app.show_state);
        if (hide !== !!item.condHidden) {
          item.condHidden = hide;
          visibilityChanged = true;
        }
      }
      if (notify && app.notify_entity) {
        const st = nst;
        const raw = st && app.notify_attribute ? st.attributes && st.attributes[app.notify_attribute] : st && st.state;
        const s = raw === undefined || raw === null ? "" : String(raw);
        const n = Number(s);
        let text = null;
        if (s !== "" && !isNaN(n)) text = n > 0 ? (n > 99 ? "99+" : String(Math.round(n))) : null;
        else if (["on", "true", "problem", "home", "open", "unlocked"].includes(s.toLowerCase())) text = "";
        notify.classList.toggle("show", text !== null);
        notify.classList.toggle("dot", text === "");
        notify.textContent = text || "";
      }
      if (this._config.entity_states && app.entity) {
        const st = est;
        const s = st ? String(st.state) : "unavailable";
        const active = app.active_states
          ? stateMatches(s, app.active_states)
          : !INACTIVE_STATES.includes(s) && !(Number(s) === 0 && s.trim() !== "" && !isNaN(Number(s)));
        el.classList.toggle("active", active);
        el.classList.toggle("unavail", this._config.dim_unavailable && (s === "unavailable" || !st));
      }
    }
    if (visibilityChanged) this._filter(this._query || "");
  }

  _cancelPress(el) {
    const item = this._byEl && this._byEl.get(el);
    if (!item) return;
    clearTimeout(item.timer);
    el.classList.remove("pressed");
  }

  _bindGrid(root) {
    const itemOf = (e) => {
      const el = e.target && e.target.closest ? e.target.closest(".app") : null;
      return el ? this._byEl.get(el) : null;
    };
    const has = (item, k) => this._config.gestures && item.app[k] && item.app[k].action && item.app[k].action !== "none";
    const tapped = (el) => {
      el.classList.remove("tapped");
      void el.offsetWidth;
      el.classList.add("tapped");
    };

    root.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      const item = itemOf(e);
      if (!item) return;
      item.held = false;
      item.el.classList.add("pressed");
      if (has(item, "hold_action")) {
        item.timer = setTimeout(() => {
          item.held = true;
          item.el.classList.remove("pressed");
          this._act(item.app, "hold");
        }, 500);
      }
    });
    for (const type of ["pointerup", "pointercancel"]) {
      root.addEventListener(type, (e) => {
        const item = itemOf(e);
        if (item) this._cancelPress(item.el);
      });
    }
    root.addEventListener("pointerout", (e) => {
      const item = itemOf(e);
      if (item && !item.el.contains(e.relatedTarget)) {
        this._cancelPress(item.el);
        if (this._config.hover_animation === "tilt") {
          const badge = item.el.querySelector(".badge");
          badge.style.removeProperty("--rx");
          badge.style.removeProperty("--ry");
        }
      }
    });
    root.addEventListener("contextmenu", (e) => {
      const item = itemOf(e);
      if (item && has(item, "hold_action")) e.preventDefault();
    });

    if (this._config.hover_animation === "tilt") {
      root.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const item = itemOf(e);
        if (!item) return;
        const badge = item.badge || (item.badge = item.el.querySelector(".badge"));
        const r = badge.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        badge.style.setProperty("--ry", `${(x * 22).toFixed(1)}deg`);
        badge.style.setProperty("--rx", `${(-y * 22).toFixed(1)}deg`);
      });
    }

    root.addEventListener("animationend", (e) => {
      const item = itemOf(e);
      if (item) item.el.classList.remove("tapped");
    });

    root.addEventListener("click", (e) => {
      const item = itemOf(e);
      if (!item) return;
      if (item.held) {
        item.held = false;
        return;
      }
      tapped(item.el);
      if (has(item, "double_tap_action")) {
        if (item.tapTimer) {
          clearTimeout(item.tapTimer);
          item.tapTimer = 0;
          this._act(item.app, "double_tap");
        } else {
          item.tapTimer = setTimeout(() => {
            item.tapTimer = 0;
            this._act(item.app, "tap");
          }, 250);
        }
      } else this._act(item.app, "tap");
    });

    root.addEventListener("keydown", (e) => {
      const item = itemOf(e);
      if (!item) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tapped(item.el);
        this._act(item.app, "tap");
      } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        this._moveFocus(item.el, e.key);
      }
    });
  }

  _moveFocus(el, key) {
    const list = this._els.map((x) => x.el).filter((e) => e.parentElement === el.parentElement && !e.classList.contains("filtered"));
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
      return hasScheme(path)
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
        const path = safePath(a.navigation_path);
        if (!path) return this._warn(`navigation to "${a.navigation_path}" was blocked`);
        if (a.new_tab) {
          window.open(path, "_blank", "noopener");
          return;
        }
        if (a.navigation_replace) window.history.replaceState(null, "", path);
        else window.history.pushState(null, "", path);
        this._fire("location-changed", { replace: !!a.navigation_replace }, window);
        return;
      }
      case "url": {
        const url = safeUrl(a.url_path);
        if (!url) return a.url_path && this._warn(`opening "${a.url_path}" was blocked`);
        if (a.new_tab === false) window.location.href = url;
        else window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
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
        const [domain, service] = String(svc).split(".", 2);
        if (!domain || !service) return this._warn(`"${svc}" is not a valid action`);
        this._call(domain, service, a.data || a.service_data || {}, a.target);
        return;
      }
      default:
        this._fire("hass-action", { config: { entity, tap_action: a }, action: "tap" });
    }
  }

  _call(domain, service, data, target) {
    try {
      Promise.resolve(this._hass.callService(domain, service, data, target)).catch((err) => this._warn((err && err.message) || err));
    } catch (err) {
      this._warn((err && err.message) || err);
    }
  }

  _warn(message) {
    this._fire("hass-notification", { message: `Launcher-Card: ${message}` });
  }

  _fire(type, detail, target = this) {
    target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}


const WHEEL = 192;
let wheelPolar = null;
const wheelImages = new Map();
function wheelImage(brightness) {
  const key = Math.round(brightness * 100);
  let img = wheelImages.get(key);
  if (img) return img;
  const n = WHEEL, R = n / 2;
  if (!wheelPolar) {
    const hue = new Float32Array(n * n), sat = new Float32Array(n * n), alpha = new Uint8ClampedArray(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = x - R + 0.5, dy = y - R + 0.5, d = Math.hypot(dx, dy), i = y * n + x;
        if (d > R) continue;
        let a = Math.atan2(dy, dx);
        if (a < 0) a += 2 * Math.PI;
        hue[i] = (a / (2 * Math.PI)) * 6;
        sat[i] = d / R;
        alpha[i] = Math.min(1, R - d) * 255;
      }
    }
    wheelPolar = { hue, sat, alpha };
  }
  const { hue, sat, alpha } = wheelPolar;
  const v = key / 100;
  img = new ImageData(n, n);
  const d = img.data;
  for (let i = 0, j = 0; i < n * n; i++, j += 4) {
    if (!alpha[i]) continue;
    const h = hue[i], s = sat[i], k = h | 0, fr = h - k;
    const p = v * (1 - s), q = v * (1 - s * fr), t = v * (1 - s * (1 - fr));
    let r, g, b;
    switch (k % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q;
    }
    d[j] = r * 255; d[j + 1] = g * 255; d[j + 2] = b * 255; d[j + 3] = alpha[i];
  }
  if (wheelImages.size >= 12) wheelImages.delete(wheelImages.keys().next().value);
  wheelImages.set(key, img);
  return img;
}

class LauncherColorPicker extends HTMLElement {
  connectedCallback() {
    if (!this._io && typeof IntersectionObserver === "function") {
      this._io = new IntersectionObserver((entries) => {
        this._visible = entries[entries.length - 1].isIntersecting;
        if (this._visible && this._dirty) {
          this._dirty = false;
          this._drawWheel();
        }
      });
    }
    if (this._io) this._io.observe(this);
    else this._visible = true;
  }

  disconnectedCallback() {
    if (this._io) this._io.disconnect();
    this._visible = false;
  }

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
        .alpha-row { display:flex; flex-direction:column; gap:8px; }
        .alpha-row[hidden] { display:none; }
        :host([alpha]) .hex { width:150px; }
      </style>
      <div class="row">
        <button class="sw" title="Open color wheel"></button>
        <div class="lbl"></div>
        <input class="hex" spellcheck="false" placeholder="auto">
        <button class="clr" title="Clear">×</button>
      </div>
      <div class="panel" hidden>
        <div class="wheel"><canvas width="192" height="192"></canvas><div class="mk"></div></div>
        <div class="side">Brightness<input class="val" type="range" min="0" max="100">
          <div class="alpha-row" hidden>Opacity<input class="alp" type="range" min="0" max="100"></div></div>
      </div>`;

    const $ = (s) => this.shadowRoot.querySelector(s);
    this._sw = $(".sw");
    this._hex = $(".hex");
    this._panel = $(".panel");
    this._canvas = $("canvas");
    this._mk = $(".mk");
    this._val = $(".val");
    this._alp = $(".alp");
    this._alpha = 1;
    this._alp.addEventListener("input", () => {
      this._alpha = this._alp.value / 100;
      this._emit(this._out());
    });

    this._sw.addEventListener("click", () => {
      this._panel.hidden = !this._panel.hidden;
      if (!this._panel.hidden) this._drawWheel();
    });
    $(".clr").addEventListener("click", () => this._emit(""));
    this._hex.addEventListener("input", () => {
      const v = this._hex.value.trim();
      if (v === "" || parseRgba(v)) this._emit(v, true);
    });
    this._hex.addEventListener("change", () => this._emit(this._hex.value.trim(), true));
    this._val.addEventListener("input", () => {
      this._hsv[2] = this._val.value / 100;
      this._drawWheel();
      this._emit(this._out());
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
      this._emit(this._out());
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

  set alpha(on) {
    this._alphaOn = !!on;
    this.toggleAttribute("alpha", this._alphaOn);
    this.shadowRoot.querySelector(".alpha-row").hidden = !this._alphaOn;
  }

  _out() {
    const rgb = hsvToRgb(...this._hsv).map((x) => Math.round(x));
    const a = this._alphaOn ? Math.round(this._alpha * 100) / 100 : 1;
    return a < 1 ? `rgba(${rgb.join(", ")}, ${a})` : rgbToHex(rgb);
  }

  set open(v) {
    this._panel.hidden = !v;
    if (v) this._drawWheel();
  }

  get value() {
    return this._value;
  }

  set value(v) {
    v = css(v) || "";
    if (this._dragging || v === this._value) return;
    this._value = v;
    this._fromValue(v);
    this._paint(this.shadowRoot.activeElement !== this._hex);
  }

  _fromValue(v) {
    const c = parseRgba(v);
    if (!c) return;
    this._hsv = rgbToHsv(c.slice(0, 3));
    this._alpha = c[3];
  }

  _paint(updateText) {
    if (updateText) this._hex.value = this._value;
    this._sw.style.setProperty("--sw", this._value || "transparent");
    this._val.value = Math.round(this._hsv[2] * 100);
    this._alp.value = Math.round(this._alpha * 100);
    const [h, s] = this._hsv;
    const a = (h * Math.PI) / 180;
    this._mk.style.left = `${80 + Math.cos(a) * s * 80}px`;
    this._mk.style.top = `${80 + Math.sin(a) * s * 80}px`;
    this._mk.style.background = parseRgba(this._value) ? this._value : "transparent";
    if (!this._panel.hidden) this._drawWheel();
  }

  _drawWheel() {
    if (typeof IntersectionObserver === "function" && this._visible !== true) {
      this._dirty = true;
      return;
    }
    if (this._drawRaf) return;
    this._drawRaf = requestAnimationFrame(() => {
      this._drawRaf = null;
      this._renderWheel();
    });
  }

  _renderWheel() {
    const key = Math.round(this._hsv[2] * 100);
    if (this._drawnV === key) return;
    this._drawnV = key;
    this._canvas.getContext("2d").putImageData(wheelImage(this._hsv[2]), 0, 0);
  }

  _emit(v, fromText) {
    this._value = v;
    if (fromText) this._fromValue(v);
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


const HELPER_KEYS = ["columns_mode", "columns_count", "radius_mode", "radius_value", "rows_mode", "rows_count"];
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
      { name: "columns_count", label: "Apps per row (fixed)", selector: { number: { min: 1, max: 12, mode: "box" } } },
      { name: "max_columns", label: "Max apps per row (auto-fit, empty = no limit)", selector: { number: { min: 1, max: 24, mode: "box" } } },
      { name: "badge_size", label: "Badge size (px)", selector: { number: { min: 24, max: 160, mode: "box" } } },
      { name: "icon_percent", label: "Icon size (% of badge, empty = auto)", selector: { number: { min: 10, max: 100, step: 1, mode: "box", unit_of_measurement: "%" } } },
      { name: "gap", label: "Spacing (px)", selector: { number: { min: 0, max: 60, mode: "box" } } },
      { name: "align", label: "Grid alignment", selector: { select: { mode: "dropdown", options: opt({ spread: "Full width (spread to the edges)", start: "Left (packed)", end: "Right (packed)" }) } } },
      { name: "side_padding", label: "Side padding (px)", selector: { number: { min: 0, max: 48, mode: "box" } } },
      { name: "card_padding", label: "Card padding (px)", selector: { number: { min: 0, max: 48, mode: "box" } } }
    ),
    grid(
      { name: "pages", label: "Split into pages", selector: { boolean: {} } },
      { name: "rows_mode", label: "Rows per page", selector: { select: { mode: "dropdown", options: opt({ auto: "Auto-fit to screen", fixed: "Fixed" }) } } },
      { name: "rows_count", label: "Rows", selector: { number: { min: 1, max: 12, mode: "box" } } },
      { name: "page_gap", label: "Gap between pages (px)", selector: { number: { min: 0, max: 120, mode: "box" } } }
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
      { name: "radius_mode", label: "Rounding", selector: { select: { mode: "dropdown", options: opt({ theme: "Follow theme", fixed: "Fixed value" }) } } },
      { name: "radius_value", label: "Rounding (px)", selector: { number: { min: 0, max: 64, mode: "box" } } },
      { name: "gradient_type", label: "Gradient type (all two-colour styles)", selector: { select: { mode: "dropdown", options: opt({ linear: "Linear", radial: "Radial", conic: "Conic", diamond: "Mirrored" }) } } },
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
  features: [
    grid(
      { name: "entity_states", label: "Entity states (active dot, dimming)", selector: { boolean: {} } },
      { name: "notifications", label: "Notification badges", selector: { boolean: {} } },
      { name: "logo_colors", label: "Badge colors from logos", selector: { boolean: {} } },
      { name: "gestures", label: "Hold & double-tap actions", selector: { boolean: {} } },
      { name: "lite_mode", label: "Lite mode (fewer effects, for slow devices)", selector: { boolean: {} } }
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
    { name: "keywords", label: "Search keywords (comma separated, e.g. lamp, living room, ceiling)", selector: { text: { multiline: true } } },
    { name: "users", label: "Only for these users (comma separated names, empty = everyone)", selector: { text: {} } },
    grid(
      { name: "new_tab", label: "Open in new tab", selector: { boolean: {} } },
      { name: "fill", label: "Image fills badge", selector: { boolean: {} } },
      { name: "hidden", label: "Hidden", selector: { boolean: {} } }
    ),
  ],
  entity: [
    { name: "entity", label: "Entity (state dot, more-info, toggle)", selector: { entity: {} } },
    { name: "notify_entity", label: "Notification badge entity (count or on/off)", selector: { entity: {} } },
    { name: "notify_attribute", label: "Read the count from this attribute (optional)", selector: { text: {} } },
    { name: "notify_text", label: "Static badge text (used when no entity is set)", selector: { text: {} } },
    { name: "active_states", label: "States that count as active (comma separated, e.g. on, playing; empty = default)", selector: { text: {} } },
    { name: "show_entity", label: "Only show this app while this entity…", selector: { entity: {} } },
    { name: "show_state", label: "…is in state (comma separated; !off = any state except off; empty = active)", selector: { text: {} } },
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
    const echo = this._built && this._lastEmit !== undefined && (config === this._lastEmit || JSON.stringify(config) === this._lastEmitJson);
    this._config = config;
    if (echo) return;
    const count = (config.apps || []).length;
    if (!this._built || count !== this._rows.length) this._build();
    else this._sync();
  }

  set hass(h) {
    this._hass = h;
    if (!this._hassSeen) {
      this._hassSeen = true;
      this._pushHass();
      return;
    }
    if (this._hassTimer) return;
    this._hassTimer = setTimeout(() => {
      this._hassTimer = null;
      this._pushHass();
    }, 400);
  }

  _pushHass() {
    if (!this._hass) return;
    for (const form of this._root.querySelectorAll("ha-form")) {
      if (form.hass !== this._hass && form.offsetParent !== null) form.hass = this._hass;
    }
  }

  _emit(config) {
    this._config = config;
    this._lastEmit = config;
    this._lastEmitJson = JSON.stringify(config);
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
    if (c.icon_percent === undefined && Number(c.icon_size) > 0) c.icon_percent = Math.round((Number(c.icon_size) / num(c.badge_size, 60)) * 100);
    const r = c.border_radius;
    return {
      ...DEFAULTS,
      ...c,
      align: c.align === "center" || c.align === undefined ? "spread" : c.align,
      columns_mode: c.columns === undefined || c.columns === "auto" ? "auto" : "fixed",
      columns_count: typeof c.columns === "number" ? c.columns : Number(c.columns) || 4,
      rows_mode: c.rows_per_page === undefined || c.rows_per_page === "auto" ? "auto" : "fixed",
      rows_count: typeof c.rows_per_page === "number" ? c.rows_per_page : Number(c.rows_per_page) || 3,
      radius_mode: r === undefined || r === "theme" ? "theme" : "fixed",
      radius_value: typeof r === "number" ? r : r === "circle" ? Math.round(num(c.badge_size, 60) / 2) : Number(r) || 16,
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
      if (v.icon_percent !== undefined && v.icon_percent !== "") delete next.icon_size;
    }
    if (keys.includes("columns_mode")) next.columns = v.columns_mode === "auto" ? "auto" : Number(v.columns_count) || 4;
    if (keys.includes("rows_mode")) next.rows_per_page = v.rows_mode === "auto" ? "auto" : Number(v.rows_count) || 3;
    if (keys.includes("radius_mode")) next.border_radius = v.radius_mode === "fixed" ? Number(v.radius_value) || 0 : v.radius_mode;
    this._emit(next);
    this._syncVisibility();
  }

  _setApps(apps, structural) {
    const next = { ...this._config, apps };
    this._emit(next);
    if (structural) {
      this._lastEmit = undefined;
      this.setConfig(next);
    }
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
    p.alpha = true;
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
      this._pushHass();
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
      if (id === "features") panels.effects.appendChild(this._section("Features (turn off what you don't use for better performance)", f));
      else panels[id].appendChild(f);
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
    details.addEventListener("toggle", () => {
      if (details.open) {
        this._open.add(i);
        this._pushHass();
      } else this._open.delete(i);
    });

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
      if (key === "color" || key === "color2") pickers[key].open = true;
      else pickers[key].alpha = true;
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
})();
