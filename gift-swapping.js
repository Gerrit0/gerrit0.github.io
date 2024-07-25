// @ts-check

/**
 * @param {number} totalGivers
 * @param {number[][]} disallowed
 * @returns {number[][]}
 */
function findAllSolutions(totalGivers, disallowed) {
  /** @type {number[][]} */
  const solutions = [];

  for (let i = 1; i < totalGivers; i++) {
    if (!disallowed[0].includes(i)) {
      buildSolution([i]);
    }
  }

  return solutions;

  /** @param {number[]} solutionSoFar */
  function buildSolution(solutionSoFar) {
    if (solutionSoFar.length === totalGivers) {
      solutions.push(solutionSoFar);
      return;
    }

    for (let target = 0; target < totalGivers; target++) {
      if (
        target !== solutionSoFar.length &&
        !solutionSoFar.includes(target) &&
        !disallowed[solutionSoFar.length].includes(target)
      ) {
        buildSolution([...solutionSoFar, target]);
      }
    }
  }
}

/**
 * @param {number[][]} chosenSolutions
 * @param {number[][]} solutions
 */
function chooseNextBestSolution(chosenSolutions, solutions) {
  let bestScoreSoFar = -Infinity;
  let bestSolutionSoFar = solutions[0];

  for (let i = 0, len = solutions.length; i < len; i++) {
    const score = scoreSolution(solutions[i]);
    if (bestScoreSoFar < score) {
      bestScoreSoFar = score;
      bestSolutionSoFar = solutions[i];
    }
  }

  return bestSolutionSoFar;

  /** @param {number[]} solution */
  function scoreSolution(solution) {
    let score = solution.length * 1000;

    let penalty = 500;
    for (let k = chosenSolutions.length - 1; k >= 0; k--) {
      for (let i = 0; i < solution.length; i++) {
        if (chosenSolutions[k][i] === solution[i]) {
          score -= penalty;
        }
      }
      penalty = penalty * 0.5;
    }
    return score;
  }
}

/**
 * Given a list of names and couples, build a table of indices
 * which should not be allowed in a solution. Does _not_ include
 * the index of the array.
 * @param {string[]} names
 * @param {string[][]} couples
 */
function buildDisallowedMatrix(names, couples) {
  /** @type {number[][]} */
  const disallowed = Array.from({ length: names.length }, () => []);
  /** @type {string[]} */
  const logs = [];

  for (const [a, b] of couples) {
    const ai = names.indexOf(a);
    const bi = names.indexOf(b);
    if (ai === -1) {
      logs.push(`"${a}" is not in the list of gift givers`);
    }
    if (bi === -1) {
      logs.push(`"${b}" is not in the list of gift givers`);
    }

    if (ai !== -1 && bi !== -1) {
      disallowed[ai].push(bi);
      disallowed[bi].push(ai);
    }
  }

  return { disallowed, logs };
}

/**
 * @param {string[]} names
 * @param {string[][]} couples
 * @param {number} maxSolutions
 */
function findSolution(names, couples, maxSolutions) {
  const { disallowed, logs } = buildDisallowedMatrix(names, couples);

  /** @type {number[][]} */
  const chosenSolutions = [];

  if (names.length < 9) {
    const solutions = findAllSolutions(names.length, disallowed);
    chosenSolutions.push(solutions[0]);
    do {
      chosenSolutions.push(chooseNextBestSolution(chosenSolutions, solutions));
    } while (
      chosenSolutions[0] !== chosenSolutions[chosenSolutions.length - 1] &&
      chosenSolutions.length < maxSolutions
    );
  } else {
    // Randomly pick solutions until we hit the limit.
    chosenSolutions.push(chooseRandomSolution(names.length, disallowed));
    do {
      const solutions = Array.from({ length: names.length * 3 }, () => {
        return chooseRandomSolution(names.length, disallowed);
      });
      chosenSolutions.push(chooseNextBestSolution(chosenSolutions, solutions));
    } while (
      // Can't use reference equality here as we generate new arrays each time.
      chosenSolutions[0].some((t, i) => t != chosenSolutions[chosenSolutions.length - 1][i]) &&
      chosenSolutions.length < maxSolutions
    );
  }

  if (chosenSolutions[0].some((t, i) => t != chosenSolutions[chosenSolutions.length - 1][i])) {
    logs.push(`Stopped out after ${maxSolutions} years of gift swaps without encountering a cycle.`);
  } else {
    logs.push(`There are ${chosenSolutions.length - 1} years before the cycle will repeat.`);
  }

  return { disallowed, solutions: chosenSolutions, logs };
}

/**
 * @param {number} size
 * @param {number[][]} disallowed
 */
function chooseRandomSolution(size, disallowed) {
  const MAX_ATTEMPTS = 1000;
  for (let i = 0; i < MAX_ATTEMPTS; ++i) {
    const solution = randomArray(size);
    if (solution.every((v, i) => v != i && !disallowed[i].includes(v))) {
      return solution;
    }
  }
  throw new Error(`Failed to find a possible solution in ${MAX_ATTEMPTS} attempts.`);
}

/** @param {number} size */
function randomArray(size) {
  const result = Array.from({ length: size }, (_, i) => i);
  fisherYatesShuffle(result);
  return result;
}

/** @param {unknown[]} arr */
function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * arr.length);
    [arr[j], arr[i]] = [arr[i], arr[j]];
  }
}

/////////////////////////////////////////////////////////////////////////////
/// Past here is the glue code to make the page work.
/////////////////////////////////////////////////////////////////////////////

const $ = (q) => document.body.querySelector(q);

/** @type {HTMLTextAreaElement} */
const $names = $("#names");
/** @type {HTMLTextAreaElement} */
const $couples = $("#couples");
/** @type {HTMLInputElement} */
const $maxYears = $("#maxYears");
/** @type {HTMLElement} */
const $messages = $("#messages");
/** @type {HTMLElement} */
const $output = $("#output");

/** @type {HTMLButtonElement} */
const $go = $("#go");

$go.addEventListener("click", updateSolution);

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

  // @ts-ignore
  const viz = await Viz.instance();
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
  const startTime = Date.now();
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

  $go.disabled = $names.disabled = $couples.disabled = true;
  const start = new Date().getFullYear();

  const { disallowed, solutions, logs } = findSolution(names, couples, $maxYears.valueAsNumber);
  logs.forEach(logMessage);

  for (const solution of solutions) {
    const tr = tbody.appendChild(document.createElement("tr"));
    tr.appendChild(document.createElement("th")).textContent = (start + tbody.childElementCount - 1).toString();
    for (const cell of solution) {
      tr.appendChild(document.createElement("td")).textContent = names[cell];
    }

    const actionsContainer = tr.appendChild(document.createElement("td"));
    const visualize = actionsContainer.appendChild(document.createElement("button"));
    visualize.textContent = "Visualize";
    visualize.addEventListener("click", () => {
      visualize.disabled = true;
      visualize.textContent = "Loading...";
      visualizeSolution(names, disallowed, solution).then((svg) => {
        visualize.replaceWith(svg);
      });
    });
  }

  $go.disabled = $names.disabled = $couples.disabled = false;

  logMessage(`Found solutions in ${Date.now() - startTime}ms`);
}

updateSolution();
