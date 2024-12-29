// @ts-check
(function ($) {
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = week * (365 / 12);
  const year = day * 365;

  const shavedTime = $("#shavedTime");
  const shavedUnit = $("#shavedUnit");
  const automateTime = $("#automateTime");
  const automateUnit = $("#automateUnit");
  const periodTime = $("#periodTime");
  const periodUnit = $("#periodUnit");
  const result = $("#result");

  /** @type {(n: number, s: string) => string} */
  const plural = (n, str) => (n === 1 ? str : str + "s");

  [shavedTime, shavedUnit, automateTime, automateUnit, periodTime, periodUnit].forEach((el) => {
    el.addEventListener("input", calculate);
  });
  calculate();

  /** @type {(unit: string) => number} */
  function unitToMultiplier(unit) {
    return {
      second: 1,
      minute,
      hour,
      day,
      week,
      month,
    }[unit];
  }

  /** @type {(seconds: number, stop?: string) => string} */
  function toHumanString(seconds, stop = "") {
    if (!Number.isFinite(seconds)) {
      return `(bug, please report)`;
    }

    if (seconds < minute) {
      return `${seconds} ${plural(seconds, "second")}`;
    }

    /** @type {[number, number, string][]} */
    const checks = [
      [month, year, "month"],
      [week, month, "week"],
      [day, week, "day"],
      [hour, day, "hour"],
      [minute, hour, "minute"],
    ];

    for (const [low, high, label] of checks) {
      if (seconds < high && seconds >= low) {
        const amount = Math.floor(seconds / low);
        const leftover = seconds - amount * low;
        if (leftover === 0) {
          return `${amount} ${plural(amount, label)}`;
        } else if (label === stop) {
          return `${amount + 1} ${plural(amount + 1, label)}`;
        }
        return `${amount} ${plural(amount, label)} and ${toHumanString(leftover, stop)}`;
      }
    }

    const years = Math.floor(seconds / year);
    const leftover = seconds - years * year;
    if (leftover === 0) {
      return `${years} ${plural(years, "year")}`;
    }
    return `${years} ${plural(years, "year")} and ${toHumanString(leftover, stop)}`;
  }

  function calculate() {
    const secondsSaved = +shavedTime.value * unitToMultiplier(shavedUnit.value);
    const secondsSpent = +automateTime.value * unitToMultiplier(automateUnit.value);
    const timesToRecoup = Math.ceil(secondsSpent / secondsSaved);
    const period = Math.ceil(unitToMultiplier(periodUnit.value) / +periodTime.value);
    const timeToRecoup = timesToRecoup * period;

    if (secondsSaved >= secondsSpent) {
      result.textContent = `You should automate it. Automating takes less time than doing the task.`;
      return;
    }
    if (period < secondsSaved) {
      result.textContent = `The task takes too long to complete for how often you do it.`;
      return;
    }

    const message = [
      `You need to do the task ${timesToRecoup} ${plural(timesToRecoup, "time")} to break even.`,
      `It would take ${toHumanString(timeToRecoup)} to recoup the time spent automating if done ${
        periodTime.value
      } ${plural(+periodTime.value, "time")} per ${periodUnit.value}.`,
    ];

    if (unitToMultiplier(periodUnit.value) < day && timeToRecoup > 8 * hour) {
      const timesPerDay = Math.floor((day / period) * (8 / 24));
      const totalDays = Math.ceil(timesToRecoup / timesPerDay);
      message.push(
        "",
        `Assuming an 8 hour work day, you will do this task ${timesPerDay} ${plural(
          timesPerDay,
          "time"
        )} per day for ${totalDays} ${plural(totalDays, "day")} to break even after automation.`
      );

      const scaledTimeToRecoup = (timesToRecoup / timesPerDay) * day * (7 / 5);
      const scale = totalDays > 5 ? "week" : "day";
      message.push(`Working 5 days a week, this will take around ${toHumanString(scaledTimeToRecoup, scale)}.`);
    } else if (unitToMultiplier(periodUnit.value) < week && timeToRecoup > 5 * day) {
      const timesPerWeek = Math.floor(day / period) * 5;
      const totalWeeks = Math.ceil(timesToRecoup / timesPerWeek);
      message.push(
        "",
        `Assuming a 5 day work week, you will do this task ${timesPerWeek} ${plural(
          timesPerWeek,
          "time"
        )} per week for ${toHumanString(totalWeeks * week, "week")} to break even after automation.`
      );
    }

    result.innerHTML = message.join("<br>");
  }
})((q) => document.querySelector(q));
