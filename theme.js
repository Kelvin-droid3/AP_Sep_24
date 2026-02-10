(() => {
  const storageKey = "theme";

  function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
  }

  function initTheme() {
    const saved = localStorage.getItem(storageKey);
    applyTheme(saved || "dark");
  }

  function toggleTheme() {
    const isLight = document.body.classList.contains("light");
    const next = isLight ? "dark" : "light";
    localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  function initNavButtons() {
    document.querySelectorAll("[data-nav='home']").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    });
    document.querySelectorAll("[data-nav='back']").forEach(btn => {
      btn.addEventListener("click", () => {
        history.back();
      });
    });
  }

  function initThemeToggle() {
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", toggleTheme);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNavButtons();
    initThemeToggle();
  });
})();
