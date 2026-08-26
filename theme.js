(() => {
  "use strict";

  const root = document.documentElement;
  const storageKey = "todas-os-cursos-theme";

  function readTheme() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      // Storage can be unavailable without preventing the page from loading.
    }

    try {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch {
      return "dark";
    }
  }

  function updateControls() {
    const button = document.getElementById("themeToggle");
    const icon = document.getElementById("themeIcon");
    const label = document.getElementById("themeLabel");
    if (!button || !icon || !label) return;

    const darkActive = root.dataset.theme === "dark";
    button.setAttribute("aria-pressed", String(darkActive));
    button.setAttribute("aria-label", darkActive ? "Ativar tema claro" : "Ativar tema escuro");
    icon.textContent = darkActive ? "☀" : "☾";
    label.textContent = darkActive ? "Tema claro" : "Tema escuro";
  }

  function applyTheme(theme) {
    root.dataset.theme = theme === "light" ? "light" : "dark";
    try {
      localStorage.setItem(storageKey, root.dataset.theme);
    } catch {
      // The visual preference still applies for the current page.
    }
    updateControls();
  }

  root.dataset.theme = readTheme();

  document.addEventListener("DOMContentLoaded", () => {
    updateControls();
    const button = document.getElementById("themeToggle");
    button?.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  });
})();
