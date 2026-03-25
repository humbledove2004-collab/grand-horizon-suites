// Grand Horizon Suites - View Switching Logic
(function() {
  window.GH = window.GH || {};

  const initViews = () => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");

    const sections = [
      { selector: ".dining-details .features-grid[data-view]", type: "dining" },
      { selector: ".spa-details .features-grid[data-view]", type: "spa" },
      { selector: ".offers-details .features-grid[data-view]", type: "offers" }
    ];

    sections.forEach(sec => {
      const grids = document.querySelectorAll(sec.selector);
      if (grids.length === 0) return;

      let targetView = null;
      if (viewParam) {
        grids.forEach(grid => { if (grid.dataset.view === viewParam) targetView = grid; });
      }
      if (!targetView) {
        grids.forEach(grid => { if (grid.dataset.view === "default") targetView = grid; });
      }
      if (!targetView) targetView = grids[0];

      grids.forEach(grid => {
        grid.style.display = grid === targetView ? "grid" : "none";
      });
    });
  };

  // --- External Feature Card Triggers ---
  document.addEventListener('click', (e) => {
    const card = e.target.closest(".feature-card");
    if (card) {
      if (!e.target.closest('.explore-btn')) {
        if (window.GH.openFeatureModal) window.GH.openFeatureModal(card);
      }
    }

    const img = e.target.closest(".dining-details .feature-card .feature-image");
    if (img) {
      e.stopPropagation();
      const card = img.closest(".feature-card");
      if (card && window.GH.openMenuModal) window.GH.openMenuModal(card);
    }
  });

  document.addEventListener("DOMContentLoaded", initViews);
  console.log("[GH] View Logic loaded");
})();
