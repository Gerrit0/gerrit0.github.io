(function (select) {
  select.addEventListener("change", () => {
    document.documentElement.dataset.theme = select.value;
    localStorage.setItem("theme", select.value);
  });
})(document.querySelector("nav select"));

(function () {
  for (const block of document.querySelectorAll("pre")) {
    const text = block.innerText;
    const copyButton = block.appendChild(document.createElement("button"));
    copyButton.textContent = "Copy";
    copyButton.classList.add("copy-button");
    let timeout = null;

    copyButton.addEventListener("click", () => {
      navigator.clipboard
        .writeText(text)
        .then(
          () => {
            copyButton.textContent = "Copied!";
          },
          () => {
            copyButton.textContent = "Clipboard access denied";
          }
        )
        .then(() => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            copyButton.textContent = "Copy";
          }, 1000);
        });
    });
  }
})();
