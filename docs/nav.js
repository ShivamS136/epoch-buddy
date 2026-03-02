(() => {
  const header = document.querySelector(".site-header");
  const toggle = header?.querySelector(".nav-toggle");
  const mobileNav = header?.querySelector(".nav-mobile");

  if (!header || !toggle || !mobileNav) return;

  const setOpen = (isOpen) => {
    header.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  };

  toggle.addEventListener("click", () => {
    const isOpen = !header.classList.contains("is-open");
    setOpen(isOpen);
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
})();

/* ── Theme ──────────────────────────────────────────────────────── */

(() => {
  const STORAGE_KEY = "epochBuddyTheme";
  const SVG_NS = "http://www.w3.org/2000/svg";

  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };

  const buildSvg = (size, children) => {
    const svg = svgEl("svg", {
      xmlns: SVG_NS,
      width: String(size),
      height: String(size),
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    children.forEach((c) => svg.appendChild(c));
    return svg;
  };

  const ICON_BUILDERS = {
    light: (s) => buildSvg(s, [
      svgEl("circle", { cx: "12", cy: "12", r: "5" }),
      svgEl("path", { d: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" }),
    ]),
    dark: (s) => buildSvg(s, [
      svgEl("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }),
    ]),
    system: (s) => buildSvg(s, [
      svgEl("rect", { x: "2", y: "3", width: "20", height: "14", rx: "2", ry: "2" }),
      svgEl("line", { x1: "8", y1: "21", x2: "16", y2: "21" }),
      svgEl("line", { x1: "12", y1: "17", x2: "12", y2: "21" }),
    ]),
  };

  const toggleBtn = document.getElementById("theme-toggle-btn");
  const menu = document.getElementById("theme-menu");
  if (!toggleBtn || !menu) return;

  const apply = (pref) => {
    if (pref === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (pref === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  const updateUI = (pref) => {
    toggleBtn.replaceChildren((ICON_BUILDERS[pref] || ICON_BUILDERS.system)(18));
    menu.querySelectorAll("[data-theme-option]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.themeOption === pref);
    });
  };

  let currentPref = localStorage.getItem(STORAGE_KEY) || "system";
  apply(currentPref);
  updateUI(currentPref);

  const setTheme = (pref) => {
    currentPref = pref;
    localStorage.setItem(STORAGE_KEY, pref);
    apply(pref);
    updateUI(pref);
  };

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });

  menu.addEventListener("click", (e) => {
    const option = e.target.closest("[data-theme-option]");
    if (!option) return;
    setTheme(option.dataset.themeOption);
    menu.hidden = true;
  });

  document.addEventListener("click", (e) => {
    if (!menu.hidden && !e.target.closest(".theme-toggle")) {
      menu.hidden = true;
    }
  });
})();
