// @ts-check
const $ = (q) => document.body.querySelector(q);

/** @type {HTMLTextAreaElement} */
const $names = $("#names");
/** @type {HTMLTextAreaElement} */
const $couples = $("#couples");
/** @type {HTMLElement} */
const $messages = $("#messages");
/** @type {HTMLElement} */
const $output = $("#output");

/** @type {HTMLButtonElement} */
const $go = $("#go");
/** @type {HTMLButtonElement} */
const $stop = $("#stop");

/** @type {Worker | undefined} */
let worker;
const viz = new Viz();

$go.addEventListener("click", updateSolution);
$stop.addEventListener("click", () => {
  worker?.terminate();
  $names.disabled = $couples.disabled = $go.disabled = false;
  $stop.disabled = true;
});

function getNames() {
  return $names.value
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
}

function getCouples() {
  return /** @type {[string, string][]} */ (
    $couples.value
      .split("\n")
      .filter((s) => s.includes("/"))
      .map((s) => s.split("/", 2).map((s) => s.trim()))
  );
}

/** @param {string} message */
function logMessage(message) {
  $messages.appendChild(document.createElement("li")).textContent = message;
}

/**
 * @param {string[]} names
 * @param {number[][]} disallowed
 * @param {number[]} solution
 */
async function visualizeSolution(names, disallowed, solution) {
  const indent = "\t";
  const lines = [
    `digraph G {`,
    `bgcolor = "#444444"`,
    ...names.map((name) => `${indent}"${name}" [color="#111111", fontcolor="#111111"]`),
  ];
  const solutionArrows = solution.map((dst, src) => `${indent}"${names[src]}" -> "${names[dst]}"`);
  lines.push(...solutionArrows.map((arrow) => `${arrow} [color="#222222"]`));

  for (let a = 0; a < names.length; a++) {
    for (let b = 0; b < names.length; b++) {
      if (a === b) continue;
      if (disallowed[a].includes(b)) continue;
      const arrow = `${indent}"${names[a]}" -> "${names[b]}"`;
      if (solutionArrows.includes(arrow)) continue;
      lines.push(`${arrow} [color="#333333"]`);
    }
  }

  lines.push("}");

  // Graphviz unfortunately doesn't allow CSS variables, so fix it here.
  const replacements = {
    "#111111": "var(--text-color)",
    "#222222": "var(--text-emphasis)",
    "#333333": "var(--text-dim)",
    "#444444": "transparent",
  };

  const element = await viz.renderSVGElement(lines.join("\n"), { engine: "circo" });
  element.querySelectorAll("*").forEach((el) => {
    for (const attr of el.attributes) {
      if (replacements.hasOwnProperty(attr.value)) {
        attr.value = replacements[attr.value];
      }
    }
  });

  return element;
}

function updateSolution() {
  const names = getNames();
  const couples = getCouples();

  $messages.innerHTML = "";
  $output.innerHTML = "";

  const table = $output.appendChild(document.createElement("table"));
  const thead = table.appendChild(document.createElement("thead"));
  const headerRow = thead.appendChild(document.createElement("tr"));
  headerRow.appendChild(document.createElement("th")).textContent = "Year";
  for (const cell of names) {
    headerRow.appendChild(document.createElement("th")).textContent = cell;
  }
  headerRow.appendChild(document.createElement("th")); // Visualize column

  const tbody = table.appendChild(document.createElement("tbody"));

  if (names.length > 11) {
    logMessage(`This will take a very long time. Your browser may kill the script before it finishes.`);
  } else if (names.length === 11) {
    logMessage(`This will take ~5 minutes`);
  }

  $stop.disabled = false;
  $go.disabled = $names.disabled = $couples.disabled = true;

  let disallowed;
  const start = new Date().getFullYear();

  worker?.terminate();
  worker = new Worker("/gift-swapping-worker.js");
  worker.onmessage = (event) => {
    switch (event.data.type) {
      case "message":
        logMessage(event.data.message);
        break;
      case "disallowed":
        disallowed = event.data.disallowed;
        break;
      case "solution": {
        const tr = tbody.appendChild(document.createElement("tr"));
        tr.appendChild(document.createElement("th")).textContent = (start + tbody.childElementCount - 1).toString();
        for (const cell of event.data.solution) {
          tr.appendChild(document.createElement("td")).textContent = names[cell];
        }

        const actionsContainer = tr.appendChild(document.createElement("td"));
        const visualize = actionsContainer.appendChild(document.createElement("button"));
        visualize.textContent = "Visualize";
        visualize.addEventListener("click", () => {
          visualize.disabled = true;
          visualize.textContent = "Loading...";
          visualizeSolution(names, disallowed, event.data.solution).then((svg) => {
            visualize.replaceWith(svg);
          });
        });
        break;
      }
      case "done":
        $go.disabled = $names.disabled = $couples.disabled = false;
        $stop.disabled = true;
        break;
    }
  };

  worker.postMessage({ names, couples });
}

if (getNames().length < 9) {
  updateSolution();
}
