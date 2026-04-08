class AccordionTab extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.tabHeader = this.querySelector("[data-header]");
    this.tabContent = this.querySelector("[data-content]");
    this.tabHeader.addEventListener("click", this.handleToggle.bind(this));
  }
  disconnectedCallback() {
    this.tabHeader.removeEventListener("click", this.handleToggle.bind(this));
  }
  handleToggle() {
    this.toggleAttribute("open");
  }
}
customElements.define("accordion-tab", AccordionTab);

/* ---- Active Filters Manager ---- */
const activeFiltersEl = document.getElementById("sv-active-filters");

function renderChips() {
  if (!activeFiltersEl) return;
  activeFiltersEl.innerHTML = "";

  document.querySelectorAll('.sv-checkbox-list input[type="checkbox"]:checked').forEach(function (cb) {
    let label = cb.closest("label");
    let text = label ? label.textContent.trim() : cb.value.trim();
    let chip = document.createElement("span");
    chip.className = "sv-filter-chip";
    chip.innerHTML = `${text} <button aria-label="Remove filter">✕</button>`;
    chip.querySelector("button").addEventListener("click", function () {
      cb.checked = false;
      renderChips();
    });
    activeFiltersEl.appendChild(chip);
  });
}

document.querySelectorAll('.sv-checkbox-list input[type="checkbox"]').forEach(function (cb) {
  cb.addEventListener("change", renderChips);
});

/* ---- Show More (category list) ---- */
document.querySelectorAll("[data-sv-show-more]").forEach(function (btn) {
  let cls = btn.getAttribute("data-sv-show-more");
  let items = document.querySelectorAll("." + cls);
  let expanded = false;
  btn.addEventListener("click", function () {
    expanded = !expanded;
    items.forEach(function (el) {
      el.classList.toggle("sv-hidden", !expanded);
    });
    btn.textContent = expanded ? "− Show Less" : `+ ${items.length} More`;
  });
  // Set initial text with count
  btn.textContent = `+ ${items.length} More`;
});

/* ---- Category search filter ---- */
let searchInput = document.querySelector(".sv-category-search");
if (searchInput) {
  searchInput.addEventListener("input", function () {
    let q = this.value.toLowerCase().trim();
    document.querySelectorAll(".sv-category-list li").forEach(function (li) {
      li.style.display = !q || li.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
}

/* ---- Grid view switcher ---- */
let grid = document.getElementById("sv-product-grid");
let viewBtns = document.querySelectorAll("[data-sv-grid]");
let allGridClasses = ["sv-grid-list", "sv-grid-2", "sv-grid-3", "sv-grid-4"];
viewBtns.forEach(function (btn) {
  btn.addEventListener("click", function () {
    let targetClass = btn.getAttribute("data-sv-grid");
    viewBtns.forEach(function (b) {
      b.classList.remove("sv-active");
    });
    btn.classList.add("sv-active");
    allGridClasses.forEach(function (c) {
      grid.classList.remove(c);
    });
    grid.classList.add(targetClass);
  });
});

/* ---- Price Range Slider (dynamic max) ---- */
(function () {
  let track = document.querySelector(".sv-price-track");
  let fill = document.getElementById("sv-price-fill");
  let thumbMin = document.getElementById("sv-thumb-min");
  let thumbMax = document.getElementById("sv-thumb-max");
  let inputMin = document.getElementById("sv-price-min");
  let inputMax = document.getElementById("sv-price-max");

  if (!track) return;

  // Dynamically compute max price from rendered product cards
  let MAX_PRICE = 3000;
  let computed = 0;
  document.querySelectorAll(".sv-product-card").forEach(function (card) {
    let priceEl = card.querySelector(".sv-card-price");
    if (!priceEl) return;
    // grab only the first text node (the current price, not strikethrough)
    let raw = 0;
    priceEl.childNodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        let val = parseFloat(node.textContent.replace(/[^0-9.]/g, ""));
        if (!isNaN(val)) raw = Math.max(raw, val);
      }
    });
    computed = Math.max(computed, raw);
  });
  if (computed > 0) MAX_PRICE = Math.ceil(computed / 100) * 100; // round up to nearest 100

  if (inputMax) inputMax.value = MAX_PRICE;

  let dragging = null;
  let pctMin = 0,
    pctMax = 1;

  function updateSlider() {
    let left = pctMin * 100;
    let right = (1 - pctMax) * 100;
    fill.style.left = left + "%";
    fill.style.right = right + "%";
    thumbMin.style.left = left + "%";
    thumbMax.style.right = right + "%";
    if (inputMin) inputMin.value = Math.round(pctMin * MAX_PRICE);
    if (inputMax) inputMax.value = Math.round(pctMax * MAX_PRICE);
  }

  function getPct(e) {
    let rect = track.getBoundingClientRect();
    let x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    return Math.min(1, Math.max(0, x / rect.width));
  }

  [thumbMin, thumbMax].forEach(function (thumb) {
    ["mousedown", "touchstart"].forEach(function (ev) {
      thumb.addEventListener(ev, function (e) {
        e.preventDefault();
        dragging = thumb === thumbMin ? "min" : "max";
      });
    });
  });

  ["mousemove", "touchmove"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (!dragging) return;
      let p = getPct(e);
      if (dragging === "min") pctMin = Math.min(p, pctMax - 0.02);
      else pctMax = Math.max(p, pctMin + 0.02);
      updateSlider();
    });
  });

  ["mouseup", "touchend"].forEach(function (ev) {
    document.addEventListener(ev, function () {
      dragging = null;
    });
  });

  if (inputMin)
    inputMin.addEventListener("change", function () {
      pctMin = Math.min((parseInt(this.value) || 0) / MAX_PRICE, pctMax - 0.02);
      updateSlider();
    });
  if (inputMax)
    inputMax.addEventListener("change", function () {
      pctMax = Math.max((parseInt(this.value) || MAX_PRICE) / MAX_PRICE, pctMin + 0.02);
      updateSlider();
    });

  updateSlider();

  /* ---- Reset Filters ---- */
  let resetBtn = document.getElementById("sv-reset-filters");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      // Uncheck all checkboxes
      document.querySelectorAll('.sv-checkbox-list input[type="checkbox"]').forEach(function (cb) {
        cb.checked = false;
      });
      // Reset price slider
      pctMin = 0;
      pctMax = 1;
      updateSlider();
      // Clear chips
      renderChips();
      // Reset sort select
      let sortSel = document.querySelector(".sv-sort-select");
      if (sortSel) sortSel.selectedIndex = 0;
    });
  }
})();
