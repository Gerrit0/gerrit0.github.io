(function (select) {
  const light = document.querySelector("#syntax-light");
  const lightMedia = light.getAttribute("media");
  const dark = document.querySelector("#syntax-dark");
  const darkMedia = dark.getAttribute("media");

  function updateHighlightCss() {
    light.remove();
    dark.remove();
    document.head.appendChild(light);
    document.head.appendChild(dark);

    switch (document.documentElement.dataset.theme) {
      case "os":
        light.setAttribute("media", lightMedia);
        dark.setAttribute("media", darkMedia);
        document.head.appendChild(light);
        document.head.appendChild(dark);
        break;
      case "light":
        light.removeAttribute("media");
        document.head.appendChild(light);
        break;
      case "dark":
        dark.removeAttribute("media");
        document.head.appendChild(dark);
        break;
    }
  }

  select.addEventListener("change", () => {
    document.documentElement.dataset.theme = select.value;
    localStorage.setItem("theme", select.value);
    updateHighlightCss();
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
