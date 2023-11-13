(function (select) {
  select.addEventListener("change", () => {
    document.documentElement.dataset.theme = select.value;
    localStorage.setItem("theme", select.value);
  });
})(document.querySelector("nav select"));
