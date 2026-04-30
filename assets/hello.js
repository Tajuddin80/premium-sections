document.addEventListener("DOMContentLoaded", function () {
  const { animate, stagger, hover } = Motion;


  // 3D rotation (this part is fine)
  const el = document.querySelector("#three-container");

  if (el) {
    animate(el, { rotateY: 360 }, { duration: 10, repeat: Infinity, ease: "linear" });
  }

  // TEXT SPLIT (manual)
  const h1 = document.querySelector("h1");

  if (!h1) return;

  const text = h1.textContent;

  h1.innerHTML = text
    .split("")
    .map((char) => `<span class="char">${char}</span>`)
    .join("");

  const chars = h1.querySelectorAll(".char");

  animate(chars, { opacity: [0, 1], y: [10, 0] }, { duration: 1, delay: stagger(0.05) });

  console.log(chars);


const li = document.querySelectorAll("li");
  animate("li", { y: 0, opacity: 1 }, { delay: stagger(0.9) });

console.log(Motion.hover);

document.addEventListener("DOMContentLoaded", () => {
  const { hover } = Motion;

  const el = document.getElementById("my-id");

  if (!el || !hover) {
    console.log("Element or hover not available");
    return;
  }

  hover(el, () => {
    console.log("my-id hovered!");
  });
});

});
