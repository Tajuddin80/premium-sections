(function () {
  "use strict";

  /* ── Accordion Web Component ── */
  class AccordionTab extends HTMLElement {
    connectedCallback() {
      this.tabHeader = this.querySelector("[data-header]");
      if (this.tabHeader) {
        this.tabHeader.addEventListener("click", () => this.toggleAttribute("open"));
      }
    }
  }
  if (!customElements.get("accordion-tab")) {
    customElements.define("accordion-tab", AccordionTab);
  }

  /* ── Load product data ── */
  let ALL_PRODUCTS = [];
  const dataEl = document.getElementById("sv-all-products-data");
  if (dataEl) {
    try {
      ALL_PRODUCTS = JSON.parse(dataEl.textContent);
    } catch (e) {
      console.warn("sv-collection: could not parse product data", e);
    }
  }

  const MAX_PRICE = ALL_PRODUCTS.reduce((m, p) => Math.max(m, p.price), 0) || 3000;

  /* ── Application state ── */
  const state = {
    searchQuery: "", // live search (search page only)
    categories: [],
    sizes: [],
    colors: [],
    status: [],
    priceMin: 0,
    priceMax: MAX_PRICE,
    sort: "",
    perPage: 12,
    loadedCount: 12,
  };

  /* ── DOM refs ── */
  const gridEl = document.getElementById("sv-product-grid");
  const chipsEl = document.getElementById("sv-active-filters");
  const progressFill = document.getElementById("sv-progress-fill");
  const showingEl = document.getElementById("sv-showing-count");
  const totalEl = document.getElementById("sv-total-count");
  const loadMoreBtn = document.getElementById("sv-load-more-btn");
  const resetBtn = document.getElementById("sv-reset-filters");
  const sortSel = document.getElementById("sv-sort-select");
  const perPageSel = document.getElementById("sv-per-page");
  const priceMinInput = document.getElementById("sv-price-min");
  const priceMaxInput = document.getElementById("sv-price-max");

  // Search page elements (null on collection page — all guarded below)
  const productSearchInput = document.getElementById("sv-product-search");
  const searchClearBtn = document.getElementById("sv-search-clear");

  /* ── Helpers ── */
  function escHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ── Derive unique sizes & colors from all products ── */
  const allSizes = [...new Set(ALL_PRODUCTS.flatMap((p) => p.sizes || []).filter(Boolean))];
  const allColors = [...new Set(ALL_PRODUCTS.flatMap((p) => p.colors || []).filter(Boolean))];

  /* ── Build accordion tab helper ── */
  function createAccordionTab(titleText, bodyEl) {
    const tab = document.createElement("accordion-tab");
    tab.setAttribute("open", "");

    const h3 = document.createElement("h3");
    h3.setAttribute("data-header", "");
    h3.className = "sv-filter-header";
    h3.innerHTML = `${escHtml(titleText)} <span class="sv-toggle-icon">−</span>`;

    const body = document.createElement("div");
    body.setAttribute("data-content", "");
    body.className = "sv-filter-body";
    body.appendChild(bodyEl);

    tab.appendChild(h3);
    tab.appendChild(body);
    return tab;
  }

  /* ── Inject dynamic Size & Color filter tabs ── */
  (function injectDynamicFilters() {
    const panel = document.querySelector(".sv-filter-panel");
    const anchor = document.getElementById("sv-reset-filters");
    if (!panel || !anchor) return;

    if (allSizes.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "sv-checkbox-list";
      allSizes.forEach(function (sz) {
        const li = document.createElement("li");
        li.innerHTML = `<label>
          <input type="checkbox" class="sv-filter-check" data-filter-group="size" value="${escHtml(sz)}">
          <span>${escHtml(sz.toUpperCase())}</span>
        </label>`;
        ul.appendChild(li);
      });
      panel.insertBefore(createAccordionTab("Size", ul), anchor);
    }

    if (allColors.length > 0) {
      const wrap = document.createElement("div");
      wrap.className = "sv-color-swatches";
      allColors.forEach(function (col) {
        const lbl = document.createElement("label");
        lbl.className = "sv-color-label";
        lbl.title = col.charAt(0).toUpperCase() + col.slice(1);
        lbl.innerHTML = `
          <input type="checkbox" class="sv-filter-check sv-color-check"
                 data-filter-group="color" value="${escHtml(col)}">
          <span class="sv-color-swatch" style="background-color:${escHtml(col)};"
                aria-label="${escHtml(col)}"></span>`;
        wrap.appendChild(lbl);
      });
      panel.insertBefore(createAccordionTab("Color", wrap), anchor);
    }

    attachCheckboxEvents();
  })();

  /* ── Custom sort dropdown ── */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".sv-custom-select").forEach((wrapper) => {
      const trigger = wrapper.querySelector(".sv-custom-select-trigger");
      const triggerText = trigger.querySelector("span");
      const options = wrapper.querySelectorAll(".sv-custom-option");
      const nativeSelect = document.getElementById("sv-sort-select");

      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        wrapper.classList.toggle("open");
      });

      options.forEach((option) => {
        option.addEventListener("click", function (e) {
          e.stopPropagation();
          triggerText.textContent = this.textContent;
          options.forEach((opt) => opt.classList.remove("selected"));
          this.classList.add("selected");
          nativeSelect.value = this.getAttribute("data-value");
          nativeSelect.dispatchEvent(new Event("change"));
          wrapper.classList.remove("open");
        });
      });

      document.addEventListener("click", function (e) {
        if (!wrapper.contains(e.target)) wrapper.classList.remove("open");
      });
    });
  });

  /* ── Read URL params into state ── */
  function readURLParams() {
    const p = new URLSearchParams(window.location.search);

    const cats = p.get("filter_cat");
    if (cats) state.categories = cats.split(",").filter(Boolean);

    const sizes = p.get("filter_size");
    if (sizes) state.sizes = sizes.split(",").filter(Boolean);

    const colors = p.get("filter_color");
    if (colors) state.colors = colors.split(",").filter(Boolean);

    const statuses = p.get("filter_status");
    if (statuses) state.status = statuses.split(",").filter(Boolean);

    const pMin = p.get("price_min");
    if (pMin !== null && pMin !== "") state.priceMin = parseFloat(pMin) || 0;

    const pMax = p.get("price_max");
    if (pMax !== null && pMax !== "") state.priceMax = parseFloat(pMax) || MAX_PRICE;

    const sort = p.get("sort_by");
    if (sort) state.sort = sort;

    const perPage = p.get("per_page");
    if (perPage) state.perPage = parseInt(perPage) || 12;

    // On the search page the initial query comes from the input's value
    // (pre-filled by Liquid from search.terms). We read it here so the
    // client-side filter starts in sync with the server-rendered results.
    if (productSearchInput) {
      state.searchQuery = productSearchInput.value.toLowerCase().trim();
    }
  }

  /* ── Reflect state back onto UI controls ── */
  function syncUIToState() {
    if (sortSel) sortSel.value = state.sort;
    if (perPageSel) perPageSel.value = String(state.perPage);

    document.querySelectorAll(".sv-filter-check").forEach(function (cb) {
      const g = cb.dataset.filterGroup;
      const v = cb.value;
      if (g === "category") cb.checked = state.categories.includes(v);
      if (g === "size") cb.checked = state.sizes.includes(v);
      if (g === "color") cb.checked = state.colors.includes(v);
      if (g === "status") cb.checked = state.status.includes(v);
    });
  }

  /* ── Filter products ── */
  function getFilteredProducts() {
    return ALL_PRODUCTS.filter(function (p) {
      /* ① Text search (search page only — ignored when empty) */
      if (state.searchQuery) {
        const q = state.searchQuery;
        const inTitle = (p.title || "").toLowerCase().includes(q);
        const inType = (p.type || "").toLowerCase().includes(q);
        const inTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inType && !inTags) return false;
      }

      /* ② Category */
      if (state.categories.length > 0) {
        if (!state.categories.some((h) => (p.collections || []).includes(h))) return false;
      }

      /* ③ Price */
      if (p.price < state.priceMin || p.price > state.priceMax) return false;

      /* ④ Size */
      if (state.sizes.length > 0) {
        if (!state.sizes.some((s) => (p.sizes || []).includes(s))) return false;
      }

      /* ⑤ Color */
      if (state.colors.length > 0) {
        if (!state.colors.some((c) => (p.colors || []).includes(c))) return false;
      }

      /* ⑥ Status */
      if (state.status.length > 0) {
        const ok = state.status.some(function (s) {
          if (s === "in_stock") return p.available === true;
          if (s === "out_stock") return p.available === false;
          if (s === "on_sale") return p.on_sale === true;
          return false;
        });
        if (!ok) return false;
      }

      return true;
    });
  }

  /* ── Sort ── */
  function sortProducts(list) {
    const s = list.slice();
    switch (state.sort) {
      case "price-asc":
        return s.sort((a, b) => a.price - b.price);
      case "price-desc":
        return s.sort((a, b) => b.price - a.price);
      case "alpha-asc":
        return s.sort((a, b) => a.title.localeCompare(b.title));
      case "alpha-desc":
        return s.sort((a, b) => b.title.localeCompare(a.title));
      case "date-desc":
        return s.sort((a, b) => (b.published_at || 0) - (a.published_at || 0));
      case "date-asc":
        return s.sort((a, b) => (a.published_at || 0) - (b.published_at || 0));
      default:
        return s; // best-selling / featured = original order
    }
  }

  /* ── Build a product card HTML string ── */
  function buildCard(p) {
    const saleTag = p.on_sale ? `<span class="sv-price-original">$${(p.compare_at_price || 0).toFixed(2)}</span>` : "";
    const img = p.image
      ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.title)}" loading="lazy" width="300" height="300">`
      : "";

    return `<div class="sv-product-card">
      <a href="${escHtml(p.url)}" class="sv-card-link">
        <div class="sv-card-image">${img}</div>
        <div class="sv-card-info">
          <div class="sv-card-info-main">
            <h4 class="sv-card-title">${escHtml(p.title)}</h4>
            <div class="sv-card-price">
              $${p.price.toFixed(2)} ${saleTag}
            </div>
          </div>
          <div class="sv-card-rating">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#f5a623">
              <path d="M6 1l1.5 3h3l-2.4 1.8.9 3L6 7.2 3 8.8l.9-3L1.5 4h3z"/>
            </svg>
            4.5 (189)
          </div>
        </div>
      </a>
    </div>`;
  }

  /* ── Render the grid ── */
  function renderGrid(resetCount) {
    if (resetCount) state.loadedCount = state.perPage;

    const filtered = sortProducts(getFilteredProducts());
    const toShow = filtered.slice(0, state.loadedCount);

    if (toShow.length === 0) {
      gridEl.innerHTML = `<div class="sv-no-results">No products match your filters.</div>`;
    } else {
      gridEl.innerHTML = toShow.map(buildCard).join("");
    }

    const total = filtered.length;
    const shown = Math.min(state.loadedCount, total);

    if (showingEl) showingEl.textContent = shown;
    if (totalEl) totalEl.textContent = total;
    if (progressFill) progressFill.style.width = total > 0 ? (shown / total) * 100 + "%" : "0%";

    if (loadMoreBtn) {
      if (shown >= total || total === 0) {
        loadMoreBtn.style.display = "none";
      } else {
        loadMoreBtn.style.display = "";
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = "LOAD MORE";
      }
    }

    updateURL();
    renderChips();
  }

  /* ── Load more ── */
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", function () {
      state.loadedCount += state.perPage;
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = "Loading…";
      setTimeout(() => renderGrid(false), 200);
    });
  }

  /* ── Per-page selector ── */
  if (perPageSel) {
    perPageSel.addEventListener("change", function () {
      state.perPage = parseInt(this.value) || 12;
      renderGrid(true);
    });
  }

  /* ── Sort selector ── */
  if (sortSel) {
    sortSel.addEventListener("change", function () {
      state.sort = this.value;
      renderGrid(true);
    });
  }

  /* ── Live client-side search (search page only) ── */
  if (productSearchInput) {
    productSearchInput.addEventListener("input", function () {
      state.searchQuery = this.value.toLowerCase().trim();
      renderGrid(true);

      // Show/hide the clear button dynamically
      if (searchClearBtn) {
        searchClearBtn.style.display = this.value ? "" : "none";
      }
    });
  }

  // Clear button wipes the input and re-renders
  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", function () {
      if (productSearchInput) productSearchInput.value = "";
      state.searchQuery = "";
      this.style.display = "none";
      renderGrid(true);
    });
  }

  /* ── Checkbox filter events ── */
  function attachCheckboxEvents() {
    document.querySelectorAll(".sv-filter-check").forEach(function (cb) {
      if (cb._svBound) return;
      cb._svBound = true;

      cb.addEventListener("change", function () {
        const group = this.dataset.filterGroup;
        const val = this.value;

        function toggle(arr) {
          if (cb.checked) {
            if (!arr.includes(val)) arr.push(val);
          } else {
            const i = arr.indexOf(val);
            if (i > -1) arr.splice(i, 1);
          }
        }

        if (group === "category") toggle(state.categories);
        if (group === "size") toggle(state.sizes);
        if (group === "color") toggle(state.colors);
        if (group === "status") toggle(state.status);

        renderGrid(true);
      });
    });
  }

  attachCheckboxEvents();

  /* ── Price range slider ── */
  (function () {
    const track = document.querySelector(".sv-price-track");
    const fill = document.getElementById("sv-price-fill");
    const thumbMin = document.getElementById("sv-thumb-min");
    const thumbMax = document.getElementById("sv-thumb-max");

    if (!track) return;

    let dragging = null;
    let pctMin = state.priceMin / MAX_PRICE;
    let pctMax = state.priceMax / MAX_PRICE;

    function updateSlider() {
      const l = pctMin * 100;
      const r = (1 - pctMax) * 100;
      fill.style.left = l + "%";
      fill.style.right = r + "%";
      thumbMin.style.left = l + "%";
      thumbMax.style.right = r + "%";

      const vMin = Math.round(pctMin * MAX_PRICE);
      const vMax = Math.round(pctMax * MAX_PRICE);
      if (priceMinInput) priceMinInput.value = vMin;
      if (priceMaxInput) priceMaxInput.value = vMax;
      state.priceMin = vMin;
      state.priceMax = vMax;
    }

    function getPct(e) {
      const rect = track.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
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
        const p = getPct(e);
        if (dragging === "min") pctMin = Math.min(p, pctMax - 0.02);
        else pctMax = Math.max(p, pctMin + 0.02);
        updateSlider();
      });
    });

    ["mouseup", "touchend"].forEach(function (ev) {
      document.addEventListener(ev, function () {
        if (dragging) {
          dragging = null;
          renderGrid(true);
        }
      });
    });

    if (priceMinInput) {
      priceMinInput.addEventListener("change", function () {
        pctMin = Math.min((parseFloat(this.value) || 0) / MAX_PRICE, pctMax - 0.02);
        updateSlider();
        renderGrid(true);
      });
    }
    if (priceMaxInput) {
      priceMaxInput.addEventListener("change", function () {
        pctMax = Math.max((parseFloat(this.value) || MAX_PRICE) / MAX_PRICE, pctMin + 0.02);
        updateSlider();
        renderGrid(true);
      });
    }

    updateSlider();
  })();

  /* ── Chip label helpers ── */
  function labelForValue(group, val) {
    if (group === "category") {
      const el = document.querySelector(`.sv-filter-check[data-filter-group="category"][value="${CSS.escape(val)}"]`);
      if (el) {
        const lbl = el.closest("label");
        return lbl ? lbl.textContent.trim() : val;
      }
      return val;
    }
    if (group === "size") return val.toUpperCase();
    if (group === "color") return val.charAt(0).toUpperCase() + val.slice(1);
    if (group === "status") return { in_stock: "In Stock", out_stock: "Out of Stock", on_sale: "On Sale" }[val] || val;
    return val;
  }

  /* ── Render active filter chips ── */
  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = "";

    function addChip(label, onRemove, swatchColor) {
      const chip = document.createElement("span");
      chip.className = "sv-filter-chip";
      const swatch = swatchColor
        ? `<span class="sv-chip-swatch" style="background:${escHtml(swatchColor)}"></span>`
        : "";
      chip.innerHTML = `${swatch}${escHtml(label)} <button class="sv-filter-chip-remove" aria-label="Remove filter">✕</button>`;
      chip.querySelector(".sv-filter-chip-remove").addEventListener("click", onRemove);
      chipsEl.appendChild(chip);
    }

    // Search query chip
    if (state.searchQuery) {
      addChip(`Search: "${state.searchQuery}"`, function () {
        state.searchQuery = "";
        if (productSearchInput) productSearchInput.value = "";
        if (searchClearBtn) searchClearBtn.style.display = "none";
        renderGrid(true);
      });
    }

    state.categories.forEach(function (val) {
      addChip(labelForValue("category", val), function () {
        state.categories = state.categories.filter((v) => v !== val);
        const cb = document.querySelector(`.sv-filter-check[data-filter-group="category"][value="${CSS.escape(val)}"]`);
        if (cb) cb.checked = false;
        renderGrid(true);
      });
    });

    state.sizes.forEach(function (val) {
      addChip(labelForValue("size", val), function () {
        state.sizes = state.sizes.filter((v) => v !== val);
        const cb = document.querySelector(`.sv-filter-check[data-filter-group="size"][value="${CSS.escape(val)}"]`);
        if (cb) cb.checked = false;
        renderGrid(true);
      });
    });

    state.colors.forEach(function (val) {
      addChip(
        labelForValue("color", val),
        function () {
          state.colors = state.colors.filter((v) => v !== val);
          const cb = document.querySelector(`.sv-filter-check[data-filter-group="color"][value="${CSS.escape(val)}"]`);
          if (cb) cb.checked = false;
          renderGrid(true);
        },
        val,
      );
    });

    state.status.forEach(function (val) {
      addChip(labelForValue("status", val), function () {
        state.status = state.status.filter((v) => v !== val);
        const cb = document.querySelector(`.sv-filter-check[data-filter-group="status"][value="${CSS.escape(val)}"]`);
        if (cb) cb.checked = false;
        renderGrid(true);
      });
    });

    if (state.priceMin > 0 || state.priceMax < MAX_PRICE) {
      addChip(`$${state.priceMin} – $${state.priceMax}`, function () {
        state.priceMin = 0;
        state.priceMax = MAX_PRICE;
        resetPriceSliderUI();
        renderGrid(true);
      });
    }
  }

  /* ── Reset price slider UI ── */
  function resetPriceSliderUI() {
    const fill = document.getElementById("sv-price-fill");
    const thumbMin = document.getElementById("sv-thumb-min");
    const thumbMax = document.getElementById("sv-thumb-max");
    if (fill) {
      fill.style.left = "0%";
      fill.style.right = "0%";
    }
    if (thumbMin) thumbMin.style.left = "0%";
    if (thumbMax) thumbMax.style.right = "0%";
    if (priceMinInput) priceMinInput.value = 0;
    if (priceMaxInput) priceMaxInput.value = MAX_PRICE;
  }

  /* ── Reset all filters ── */
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      state.categories = [];
      state.sizes = [];
      state.colors = [];
      state.status = [];
      state.priceMin = 0;
      state.priceMax = MAX_PRICE;
      state.sort = "";
      state.searchQuery = "";
      state.loadedCount = state.perPage;

      document.querySelectorAll(".sv-filter-check").forEach((cb) => (cb.checked = false));
      if (sortSel) sortSel.selectedIndex = 0;
      if (productSearchInput) productSearchInput.value = "";
      if (searchClearBtn) searchClearBtn.style.display = "none";
      resetPriceSliderUI();
      renderGrid(true);
    });
  }

  /* ── Grid view switcher ── */
  const allGridClasses = ["sv-grid-list", "sv-grid-2", "sv-grid-3", "sv-grid-4"];
  document.querySelectorAll("[data-sv-grid]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-sv-grid]").forEach((b) => b.classList.remove("sv-active"));
      btn.classList.add("sv-active");
      allGridClasses.forEach((c) => gridEl.classList.remove(c));
      gridEl.classList.add(btn.getAttribute("data-sv-grid"));
    });
  });

  /* ── Category show-more + search ── */
  (function () {
    const list = document.querySelector(".sv-category-list");
    const showMoreBtn = document.getElementById("sv-show-more-cat");
    if (!list) return;

    const items = list.querySelectorAll("li");
    const VISIBLE_DEFAULT = 6;
    let expanded = false;

    items.forEach(function (li, i) {
      if (i >= VISIBLE_DEFAULT) li.classList.add("sv-hidden");
    });

    if (showMoreBtn) {
      const hiddenCount = Math.max(0, items.length - VISIBLE_DEFAULT);
      showMoreBtn.textContent = `+ ${hiddenCount} More`;
      if (hiddenCount === 0) showMoreBtn.style.display = "none";

      showMoreBtn.addEventListener("click", function () {
        expanded = !expanded;
        items.forEach(function (li, i) {
          if (i >= VISIBLE_DEFAULT) li.classList.toggle("sv-hidden", !expanded);
        });
        showMoreBtn.textContent = expanded ? "− Show Less" : `+ ${hiddenCount} More`;
      });
    }

    const searchInput = document.querySelector(".sv-category-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        const q = this.value.toLowerCase().trim();
        items.forEach(function (li) {
          li.style.display = !q || li.textContent.toLowerCase().includes(q) ? "" : "none";
        });
      });
    }
  })();

  /* ── Sync state to URL (bookmarkable / shareable) ── */
  function updateURL() {
    const params = new URLSearchParams();
    if (state.categories.length) params.set("filter_cat", state.categories.join(","));
    if (state.sizes.length) params.set("filter_size", state.sizes.join(","));
    if (state.colors.length) params.set("filter_color", state.colors.join(","));
    if (state.status.length) params.set("filter_status", state.status.join(","));
    if (state.priceMin > 0) params.set("price_min", state.priceMin);
    if (state.priceMax < MAX_PRICE) params.set("price_max", state.priceMax);
    if (state.sort) params.set("sort_by", state.sort);

    // Preserve the Shopify search query on the search page
    const existing = new URLSearchParams(window.location.search);
    if (existing.has("q")) params.set("q", existing.get("q"));
    if (existing.has("type")) params.set("type", existing.get("type"));

    const newURL = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    history.replaceState({}, "", newURL);
  }

  /* ── Bootstrap ── */
  readURLParams();
  syncUIToState();
  renderGrid(true);
})();
