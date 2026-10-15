
const CARD_VERSION = "0.1.0";

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

const DEFAULTS = {
  columns: "auto",
  icon_size: 60,
  gap: 18,
  border_radius: "theme",
  show_names: true,
  name_size: 12,
  gradient_angle: 145,
  shine: true,
  shadow: true,
  press_animation: true,
  haptic: true,
  align: "center",
  card_background: true,
};

const isImage = (s) =>
  typeof s === "string" &&
  (/^(https?:)?\/\//.test(s) || s.startsWith("/") || s.startsWith("data:") || /\.(png|jpe?g|svg|webp|gif|ico)(\?.*)?$/i.test(s));

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
    this._config = { ...DEFAULTS, ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
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
    if (typeof r === "number") return `${r}px`;
    return /^\d+(\.\d+)?$/.test(String(r)) ? `${r}px` : String(r);
  }

  _colors(app) {
    const named = (v) => (PRESETS[v] ? PRESETS[v] : null);
    const preset = named(app.badge_color) || named(app.color);
    if (preset) return preset;
    const c1 = app.color && !PRESETS[app.color] ? app.color : app.badge_color && !PRESETS[app.badge_color] ? app.badge_color : null;
    if (c1) return [c1, app.color2 || c1];
    return null;
  }

  _render() {
    const c = this._config;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const cols = c.columns === "auto" || !c.columns ? null : Math.max(1, Number(c.columns));
    const size = Number(c.icon_size) || 60;
    const grid = cols
      ? `repeat(${cols}, minmax(0, 1fr))`
      : `repeat(auto-fit, minmax(${size + 16}px, 1fr))`;
    const justify = { start: "flex-start", end: "flex-end", center: "center" }[c.align] || "center";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card { ${c.card_background ? "" : "background:none;box-shadow:none;border:none;"} padding:${c.title ? "0" : "0"}; overflow:hidden; }
        .title { padding:16px 16px 0; font-size:var(--ha-card-header-font-size, 20px); font-weight:500; color:var(--primary-text-color); }
        .grid { display:grid; grid-template-columns:${grid}; gap:${Number(c.gap)}px ${Math.max(6, Number(c.gap) / 2)}px; padding:16px; justify-items:center; }
        .app { display:flex; flex-direction:column; align-items:center; gap:7px; width:100%; max-width:${size + 40}px;
               cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent; outline:none; }
        .badge { position:relative; width:${size}px; height:${size}px; border-radius:${this._radius()};
                 display:flex; align-items:center; justify-content:center; overflow:hidden;
                 transition:transform .15s ease, filter .15s ease;
                 ${c.shadow ? "box-shadow:0 4px 10px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.12);" : ""} }
        .badge.plain { background:linear-gradient(${c.gradient_angle}deg, var(--c1), var(--c2)); }
        .badge::after { content:""; position:absolute; inset:0; pointer-events:none;
                 ${c.shine ? "background:linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0) 55%);" : ""} }
        .app:focus-visible .badge { outline:2px solid var(--primary-color); outline-offset:2px; }
        ${c.press_animation ? ".app:active .badge { transform:scale(.88); filter:brightness(.88); }" : ""}
        @media (hover:hover) { .app:hover .badge { transform:translateY(-2px); } ${c.press_animation ? ".app:active:hover .badge{transform:scale(.88);}" : ""} }
        ha-icon { --mdc-icon-size:${Math.round(size * (Number(c.icon_scale) || 0.55))}px; color:var(--icon-color,#fff); display:flex;
                  filter:drop-shadow(0 1px 2px rgba(0,0,0,.25)); position:relative; z-index:1; }
        img { width:${Math.round(size * (Number(c.image_scale) || 0.62))}px; height:${Math.round(size * (Number(c.image_scale) || 0.62))}px;
              object-fit:contain; position:relative; z-index:1; filter:drop-shadow(0 1px 2px rgba(0,0,0,.25)); }
        img.cover { width:100%; height:100%; object-fit:cover; filter:none; }
        .name { font-size:${Number(c.name_size)}px; line-height:1.15; text-align:center; max-width:100%;
                overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
                color:${c.name_color || "var(--primary-text-color)"}; }
        .grid { justify-content:${justify}; }
      </style>
      <ha-card>
        ${c.title ? `<div class="title"></div>` : ""}
        <div class="grid"></div>
      </ha-card>`;

    if (c.title) this.shadowRoot.querySelector(".title").textContent = c.title;
    const gridEl = this.shadowRoot.querySelector(".grid");

    c.apps.forEach((app, idx) => {
      const el = document.createElement("div");
      el.className = "app";
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", app.name || "app");

      const badge = document.createElement("div");
      badge.className = "badge plain";
      const colors = this._colors(app);
      const setColors = (cc) => {
        badge.style.setProperty("--c1", cc[0]);
        badge.style.setProperty("--c2", cc[1]);
      };
      setColors(colors || PRESETS.blue);

      const icon = app.icon;
      if (isImage(icon)) {
        const img = document.createElement("img");
        img.src = icon;
        img.alt = "";
        img.draggable = false;
        if (app.fill === true || app.image_fill === true) {
          img.className = "cover";
          badge.classList.remove("plain");
        } else if (!colors && app.auto_color !== false) {
          extractColors(icon).then((cc) => cc && setColors(cc));
        }
        badge.appendChild(img);
      } else if (icon) {
        const ic = document.createElement("ha-icon");
        ic.setAttribute("icon", icon);
        if (app.icon_color) ic.style.setProperty("--icon-color", app.icon_color);
        badge.appendChild(ic);
      }
      el.appendChild(badge);

      if (c.show_names && app.name !== undefined && app.name !== "") {
        const n = document.createElement("div");
        n.className = "name";
        n.textContent = app.name;
        el.appendChild(n);
      }

      const go = () => this._launch(app);
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
      gridEl.appendChild(el);
    });
  }

  _launch(app) {
    if (this._config.haptic) this._fire("haptic", "light");
    const path = app.path || app.navigation_path;
    if (!path) return;
    if (/^(https?:)?\/\//.test(path)) {
      if (app.new_tab) window.open(path, "_blank", "noopener");
      else window.location.href = path;
      return;
    }
    if (app.new_tab) {
      window.open(path, "_blank", "noopener");
      return;
    }
    window.history.pushState(null, "", path);
    this._fire("location-changed", { replace: false }, window);
  }

  _fire(type, detail, target = this) {
    target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}


class LauncherCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._build();
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
    return [
      { name: "title", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "columns_mode", label: "Columns", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Auto-fit" }, { value: "fixed", label: "Fixed" }] } } },
          { name: "columns_count", label: "Apps per row", selector: { number: { min: 1, max: 12, mode: "box" } } },
          { name: "icon_size", label: "Icon size (px)", selector: { number: { min: 32, max: 128, mode: "box" } } },
          { name: "gap", label: "Row gap (px)", selector: { number: { min: 0, max: 60, mode: "box" } } },
          { name: "radius_mode", label: "Badge rounding", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Follow theme" }, { value: "fixed", label: "Fixed value" }] } } },
          { name: "radius_value", label: "Rounding (px)", selector: { number: { min: 0, max: 64, mode: "box" } } },
          { name: "name_size", label: "Name size (px)", selector: { number: { min: 8, max: 24, mode: "box" } } },
          { name: "gradient_angle", label: "Gradient angle", selector: { number: { min: 0, max: 360, mode: "box" } } },
        ],
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "show_names", label: "Show names", selector: { boolean: {} } },
          { name: "shine", label: "Glossy highlight", selector: { boolean: {} } },
          { name: "shadow", label: "Badge shadow", selector: { boolean: {} } },
          { name: "press_animation", label: "Press animation", selector: { boolean: {} } },
          { name: "haptic", label: "Haptic feedback", selector: { boolean: {} } },
          { name: "card_background", label: "Card background", selector: { boolean: {} } },
        ],
      },
    ];
  }

  _appSchema() {
    return [
      { name: "name", selector: { text: {} } },
      { name: "icon", label: "Icon (mdi:… or image URL)", selector: { text: {} } },
      { name: "path", label: "Navigation path", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "color", label: "Color preset / hex", selector: { text: {} } },
          { name: "color2", label: "Second color (hex)", selector: { text: {} } },
        ],
      },
      { name: "new_tab", label: "Open in new tab", selector: { boolean: {} } },
    ];
  }

  _flat() {
    const c = this._config;
    return {
      ...DEFAULTS,
      ...c,
      columns_mode: c.columns === undefined || c.columns === "auto" ? "auto" : "fixed",
      columns_count: typeof c.columns === "number" ? c.columns : 4,
      radius_mode: c.border_radius === undefined || c.border_radius === "theme" ? "theme" : "fixed",
      radius_value: typeof c.border_radius === "number" ? c.border_radius : 16,
    };
  }

  _build() {
    this.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = `
      .app-box { border:1px solid var(--divider-color); border-radius:8px; padding:8px 12px 12px; margin:12px 0; }
      .app-head { display:flex; align-items:center; justify-content:space-between; font-weight:500; margin-bottom:4px; }
      .app-head button, .add { cursor:pointer; border:none; border-radius:6px; padding:6px 10px;
        background:var(--secondary-background-color); color:var(--primary-text-color); margin-left:4px; }
      .add { background:var(--primary-color); color:var(--text-primary-color,#fff); }
      .hint { font-size:12px; color:var(--secondary-text-color); margin:4px 0; }`;
    this.appendChild(style);

    const general = document.createElement("ha-form");
    general.hass = this._hass;
    general.data = this._flat();
    general.schema = this._generalSchema();
    general.computeLabel = (s) => s.label || s.name.replace(/_/g, " ");
    general.addEventListener("value-changed", (e) => {
      const v = e.detail.value;
      const next = { ...this._config };
      ["title", "icon_size", "gap", "name_size", "gradient_angle", "show_names", "shine", "shadow", "press_animation", "haptic", "card_background"].forEach((k) => {
        if (v[k] !== undefined) next[k] = v[k];
      });
      next.columns = v.columns_mode === "auto" ? "auto" : Number(v.columns_count) || 4;
      next.border_radius = v.radius_mode === "theme" ? "theme" : Number(v.radius_value) || 0;
      this._emit(next);
    });
    this.appendChild(general);

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Colors: " + PRESET_NAMES.join(", ") + " – or any CSS color. Leave empty to derive from the logo.";
    this.appendChild(hint);

    (this._config.apps || []).forEach((app, i) => {
      const box = document.createElement("div");
      box.className = "app-box";
      const head = document.createElement("div");
      head.className = "app-head";
      head.innerHTML = `<span></span><span></span>`;
      head.firstChild.textContent = app.name || `App ${i + 1}`;
      const btns = head.lastChild;
      const mk = (label, fn, disabled) => {
        const b = document.createElement("button");
        b.textContent = label;
        b.disabled = !!disabled;
        b.addEventListener("click", fn);
        btns.appendChild(b);
      };
      const move = (d) => {
        const apps = [...this._config.apps];
        [apps[i], apps[i + d]] = [apps[i + d], apps[i]];
        this._emit({ ...this._config, apps });
        this._build();
      };
      mk("↑", () => move(-1), i === 0);
      mk("↓", () => move(1), i === this._config.apps.length - 1);
      mk("Remove", () => {
        const apps = this._config.apps.filter((_, j) => j !== i);
        this._emit({ ...this._config, apps });
        this._build();
      });
      box.appendChild(head);

      const form = document.createElement("ha-form");
      form.hass = this._hass;
      form.data = app;
      form.schema = this._appSchema();
      form.computeLabel = (s) => s.label || s.name;
      form.addEventListener("value-changed", (e) => {
        const apps = [...this._config.apps];
        apps[i] = Object.fromEntries(Object.entries(e.detail.value).filter(([, v]) => v !== "" && v !== undefined));
        this._emit({ ...this._config, apps });
      });
      box.appendChild(form);
      this.appendChild(box);
    });

    const add = document.createElement("button");
    add.className = "add";
    add.textContent = "+ Add app";
    add.addEventListener("click", () => {
      const apps = [...(this._config.apps || []), { name: "New app", icon: "mdi:apps", path: "/", color: "blue" }];
      this._emit({ ...this._config, apps });
      this._build();
    });
    this.appendChild(add);
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
