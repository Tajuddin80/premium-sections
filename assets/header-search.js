class PredictiveSearch {
  constructor(container) {
    this.container = container;

    // Config
    this.apiUrl = container.dataset.url;
    this.moneyFormat = JSON.parse(container.dataset.moneyFormat || '""');

    // Elements (scoped)
    this.icon = container.querySelector(".sv-search-icon");
    this.wrapper = container.querySelector(".sv-search-input-wrapper");
    this.input = container.querySelector(".sv-search-input");
    this.closeBtn = container.querySelector(".sv-search-close");
    this.dropdown = container.querySelector(".sv-search-dropdown");

    // State
    this.cache = new Map();
    this.cacheLimit = 20;
    this.debounceTimer = null;
    this.currentFocus = -1;
    this.lastQuery = "";

    this.init();
  }

  /* ================= INIT ================= */
  init() {
    this.bindEvents();
  }

  bindEvents() {
    this.icon.addEventListener("click", () => this.openSearch());
    this.closeBtn.addEventListener("click", () => this.closeSearch());

    this.input.addEventListener("input", (e) => this.handleInput(e));
    this.input.addEventListener("keydown", (e) => this.handleKeydown(e));

    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
      }
    });
  }

  /* ================= UI ================= */
  openSearch() {
    this.icon.classList.add("sv-hidden");
    this.wrapper.classList.add("sv-active");
    requestAnimationFrame(() => this.input.focus());
  }

  closeSearch() {
    this.icon.classList.remove("sv-hidden");
    this.wrapper.classList.remove("sv-active");
    this.input.value = "";
    this.closeBtn.classList.remove("sv-visible");
    this.closeDropdown();
    this.lastQuery = "";
  }

  closeDropdown() {
    this.dropdown.classList.remove("sv-open");
    this.dropdown.innerHTML = "";
    this.dropdown._cards = [];
    this.currentFocus = -1;
  }

  showShimmer(count = 3) {
    this.dropdown.innerHTML = "";

    for (let i = 0; i < count; i++) {
      this.dropdown.innerHTML += `
        <div class="sv-shimmer-card">
          <div class="sv-shimmer-img"></div>
          <div class="sv-shimmer-body">
            <div class="sv-shimmer-line"></div>
            <div class="sv-shimmer-line sv-shimmer-line--short"></div>
          </div>
        </div>`;
    }

    this.dropdown.classList.add("sv-open");
  }

  /* ================= INPUT ================= */
  handleInput(e) {
    const q = e.target.value.trim();

    this.closeBtn.classList.toggle("sv-visible", q.length > 0);

    if (!q) return this.closeDropdown();
    if (q === this.lastQuery) return;

    this.lastQuery = q;
    this.showShimmer();

    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(async () => {
      try {
        const data = await this.fetchSuggestions(q);
        if (this.input.value.trim() === q) {
          this.renderResults(data, q);
        }
      } catch {
        this.showError();
      }
    }, 160);
  }

  /* ================= FETCH ================= */
  async fetchSuggestions(q) {
    if (this.cache.has(q)) return this.cache.get(q);

    const url = `${this.apiUrl}?q=${encodeURIComponent(q)}&resources[type]=product,collection&resources[limit]=6`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("API error");

    const data = await res.json();

    this.setCache(q, data);
    return data;
  }

  setCache(key, value) {
    if (this.cache.size >= this.cacheLimit) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /* ================= RENDER ================= */
  renderResults(data, query) {
    this.dropdown.innerHTML = "";

    const results = data?.resources?.results || {};
    const products = results.products || [];
    const collections = results.collections || [];

    if (!products.length && !collections.length) {
      this.dropdown.innerHTML = `<p>No results for "${query}"</p>`;
      return this.dropdown.classList.add("sv-open");
    }

    const allCards = [];

    const addSection = (title) => {
      const el = document.createElement("p");
      el.textContent = title;
      el.className = "sv-dropdown-section-title";
      this.dropdown.appendChild(el);
    };

    if (products.length) {
      addSection("Products");

      products.forEach((p) => {
        const card = this.buildCard({
          title: p.title,
          sub: p.price ? this.formatMoney(p.price) : "",
          img: p.image?.url,
          url: p.url,
        });
        this.dropdown.appendChild(card);
        allCards.push(card);
      });
    }

    if (collections.length) {
      addSection("Collections");

      collections.forEach((c) => {
        const card = this.buildCard({
          title: c.title,
          sub: `${c.products_count || 0} products`,
          img: c.image?.url,
          url: c.url,
        });
        this.dropdown.appendChild(card);
        allCards.push(card);
      });
    }

    this.dropdown._cards = allCards;
    this.dropdown.classList.add("sv-open");
  }

  buildCard({ title, sub, img, url }) {
    const el = document.createElement("div");
    el.className = "sv-result-card";

    el.innerHTML = `
      ${img ? `<img src="${img}" />` : ""}
      <div>
        <div>${this.esc(title)}</div>
        ${sub ? `<div>${this.esc(sub)}</div>` : ""}
      </div>
    `;

    el.addEventListener("click", () => {
      window.location.href = url;
    });

    return el;
  }

  /* ================= KEYBOARD ================= */
  handleKeydown(e) {
    const cards = this.dropdown._cards || [];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.setFocus(Math.min(this.currentFocus + 1, cards.length - 1));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      this.setFocus(Math.max(this.currentFocus - 1, 0));
    }

    if (e.key === "Enter") {
      if (cards[this.currentFocus]) {
        cards[this.currentFocus].click();
      }
    }

    if (e.key === "Escape") {
      this.closeSearch();
    }
  }

  setFocus(index) {
    const cards = this.dropdown._cards || [];

    cards.forEach((c) => c.classList.remove("sv-focused"));

    this.currentFocus = index;

    if (cards[index]) {
      cards[index].classList.add("sv-focused");
    }
  }

  /* ================= UTILS ================= */
  formatMoney(cents) {
    const symbol = this.moneyFormat.replace(/\{\{.*?\}\}/, "").trim();
    return symbol + (cents / 100).toFixed(2);
  }

  esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  showError() {
    this.dropdown.innerHTML = `<p>Something went wrong</p>`;
    this.dropdown.classList.add("sv-open");
  }
}

/* ================= INIT ================= */
document.querySelectorAll(".sv-search-container").forEach((el) => {
  new PredictiveSearch(el);
});
