// @ts-check

const MAX_SOLUTIONS = 50;

/**
 * @param {number} totalGivers
 * @param {number[][]} disallowed
 * @returns {number[][]}
 */
function findSolutions(totalGivers, disallowed) {
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
 * @param {string[]} names
 * @param {string[][]} couples
 */
function buildDisallowedMatrix(names, couples) {
  /** @type {number[][]} */
  const disallowed = Array.from({ length: names.length }, () => []);
  /** @type {string[]} */
  const warnings = [];

  for (const [a, b] of couples) {
    const ai = names.indexOf(a);
    const bi = names.indexOf(b);
    if (ai === -1) {
      console.warn(`"${a}" is not in the list of gift givers`);
    }
    if (bi === -1) {
      warnings.push(`"${b}" is not in the list of gift givers`);
    }

    if (ai !== -1 && bi !== -1) {
      disallowed[ai].push(bi);
      disallowed[bi].push(ai);
    }
  }

  return { disallowed, warnings };
}

onmessage = (event) => {
  const start = Date.now();
  /** @type {string[]} */
  const names = event.data.names;
  /** @type {string[][]} */
  const couples = event.data.couples;

  const { disallowed, warnings } = buildDisallowedMatrix(names, couples);
  warnings.forEach((message) => postMessage({ type: "message", message }));
  postMessage({ type: "disallowed", disallowed });

  postMessage({ type: "message", message: `Discovering solutions...` });
  const solutions = findSolutions(names.length, disallowed);
  postMessage({ type: "message", message: `There are ${solutions.length} possible solutions` });
  postMessage({
    type: "message",
    message: `It took ${((Date.now() - start) / 1000).toFixed(
      2
    )} seconds to discover solutions. Starting search for ideal solution order...`,
  });

  if (solutions.length === 0) return;

  const start2 = Date.now();
  const chosenSolutions = [solutions[0]];

  postMessage({
    type: "solution",
    solution: chosenSolutions[chosenSolutions.length - 1],
  });

  do {
    chosenSolutions.push(chooseNextBestSolution(chosenSolutions, solutions));
    postMessage({
      type: "solution",
      solution: chosenSolutions[chosenSolutions.length - 1],
    });
  } while (
    chosenSolutions[0] !== chosenSolutions[chosenSolutions.length - 1] &&
    chosenSolutions.length < MAX_SOLUTIONS
  );

  postMessage({
    type: "message",
    message: `Found gift cycles in ${((Date.now() - start2) / 1000).toFixed(2)} seconds`,
  });

  if (chosenSolutions.length === MAX_SOLUTIONS && chosenSolutions[0] !== chosenSolutions[chosenSolutions.length - 1]) {
    postMessage({
      type: "message",
      message: `Bailed out after ${MAX_SOLUTIONS} years of gift swaps without encountering a cycle.`,
    });
  } else {
    postMessage({
      type: "message",
      message: `There are ${chosenSolutions.length - 1} years before the cycle will repeat.`,
    });
  }

  postMessage({ type: "done" });
};
