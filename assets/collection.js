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

/* ---- Show More (category list) ---- */
document.querySelectorAll("[data-sv-show-more]").forEach(function (btn) {
  var cls = btn.getAttribute("data-sv-show-more");
  var items = document.querySelectorAll("." + cls);
  var expanded = false;

  btn.addEventListener("click", function () {
    expanded = !expanded;
    items.forEach(function (el) {
      el.classList.toggle("sv-hidden", !expanded);
    });
    btn.textContent = expanded ? "− Show Less" : "+ 13 More";
  });
});

/* ---- Category search filter ---- */
var searchInput = document.querySelector(".sv-category-search");
if (searchInput) {
  searchInput.addEventListener("input", function () {
    var q = this.value.toLowerCase().trim();
    document.querySelectorAll(".sv-category-list li").forEach(function (li) {
      li.style.display = !q || li.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
}

/* ---- Grid view switcher ---- */
var grid = document.getElementById("sv-product-grid");
var viewBtns = document.querySelectorAll("[data-sv-grid]");
var allGridClasses = ["sv-grid-list", "sv-grid-2", "sv-grid-3", "sv-grid-4"];

viewBtns.forEach(function (btn) {
  btn.addEventListener("click", function () {
    var targetClass = btn.getAttribute("data-sv-grid");
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

/* ---- Simple price range drag ---- */
(function () {
  var track = document.querySelector(".sv-price-track");
  var fill = document.getElementById("sv-price-fill");
  var thumbMin = document.getElementById("sv-thumb-min");
  var thumbMax = document.getElementById("sv-thumb-max");
  var inputMin = document.getElementById("sv-price-min");
  var inputMax = document.getElementById("sv-price-max");
  var MAX_PRICE = 3000;
  var dragging = null;
  var pctMin = 0,
    pctMax = 1;

  if (!track) return;

  function updateSlider() {
    var left = pctMin * 100;
    var right = (1 - pctMax) * 100;
    fill.style.left = left + "%";
    fill.style.right = right + "%";
    thumbMin.style.left = left + "%";
    thumbMax.style.right = right + "%";
    if (inputMin) inputMin.value = Math.round(pctMin * MAX_PRICE);
    if (inputMax) inputMax.value = Math.round(pctMax * MAX_PRICE);
  }

  function getPct(e) {
    var rect = track.getBoundingClientRect();
    var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
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
      var p = getPct(e);
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
})();
