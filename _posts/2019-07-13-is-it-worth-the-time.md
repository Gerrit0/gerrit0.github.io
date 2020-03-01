---
layout: post
title: "Is it worth the time?"
date: 2019-07-13
---

xkcd has [a post](https://xkcd.com/1205/) which details how much time you can spend automating a task before the time spent automating the task will be more than the time saved.

![Is It Worth The Time?](https://imgs.xkcd.com/comics/is_it_worth_the_time.png)

While an interesting idea, I find it more helpful to consider how much it will take before time spent automating will pay off.

<style>
#shavedTime, #automateTime, #frequencyTime,
#shavedUnit, #automateUnit, #frequencyUnit {
  padding: 0.3em;
  border-radius: 7px;
  border: 1px solid #ccc;
}
#shavedTime, #automateTime, #frequencyTime {
  margin-left: 2em;
}

label {
  font-weight: bold;
}

#result {
  border: 1px solid #ccc;
  background: #eee;
  margin: 0.5em;
  padding: 0.5em;
}
</style>

<label>
  How much will the automation save?<br>
  <input id="shavedTime" type="number" value="5" min="1">
</label>
<select id="shavedUnit">
  <option value="seconds">seconds</option>
  <option value="minutes" selected>minutes</option>
  <option value="hours">hours</option>
  <option value="days">days</option>
  <option value="weeks">weeks</option>
</select>

<br>

<label>
  How long will it take to automate?<br>
  <input id="automateTime" type="number" value="2" min="1">
</label>
  <select id="automateUnit">
  <option value="seconds">seconds</option>
  <option value="minutes">minutes</option>
  <option value="hours" selected>hours</option>
  <option value="days">days</option>
  <option value="weeks">weeks</option>
</select>

<br>

<label>
  How often do you do the task?<br>
  <input id="frequencyTime" type="number" value="1" min="1">
  time(s) per
</label>
  <select id="frequencyUnit">
  <option value="minutes">minute</option>
  <option value="hours" selected>hour</option>
  <option value="days">day</option>
  <option value="weeks">week</option>
  <option value="months">month</option>
</select>

<div id="result"></div>

<script>
(function($) {
  const minute = 60
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  const month = week * (365 / 12)
  const year = day * 365

  const shavedTime = $('#shavedTime')
  const shavedUnit = $('#shavedUnit')
  const automateTime = $('#automateTime')
  const automateUnit = $('#automateUnit')
  const frequencyTime = $('#frequencyTime')
  const frequencyUnit = $('#frequencyUnit')
  const result = $('#result')

  const plural = (n, str) => n === 1 ? str : str + 's'

  ;[shavedTime, shavedUnit, automateTime, automateUnit, frequencyTime, frequencyUnit].forEach(el => {
    el.addEventListener('input', calculate)
  })
  calculate()


  function unitToMultiplier(unit) {
    return {
      seconds: 1,
      minutes: minute,
      hours: hour,
      days: day,
      weeks: week,
      months: month
    }[unit]
  }

  function toHumanString(seconds) {
    if (seconds < minute) {
      return `${seconds} ${plural(seconds, 'second')}`
    }

    const checks = [
      [month, year, 'month'],
      [week, month, 'week'],
      [day, week, 'day'],
      [hour, day, 'hour'],
      [minute, hour, 'minute'],
    ]

    for (const [low, high, label] of checks) {
      if (seconds < high && seconds >= low) {
        const amount = Math.floor(seconds / low)
        const leftover = seconds - amount * low
        if (leftover === 0) {
          return `${amount} ${plural(amount, label)}`
        }
        return `${amount} ${plural(amount, label)} and ${toHumanString(leftover)}`
      }
    }

    const years = Math.floor(seconds / year)
    const leftover = seconds - years * year
    if (leftover === 0) {
      return `${years} ${plural(years, 'year')}`
    }
    return `${years} ${plural(years, 'year')} and ${toHumanString(leftover)}`
  }

  function calculate() {
    const secondsSaved = +shavedTime.value * unitToMultiplier(shavedUnit.value)
    const secondsSpent = +automateTime.value * unitToMultiplier(automateUnit.value)
    const timesToRecoup = Math.ceil(secondsSpent / secondsSaved)
    const frequency = Math.ceil(unitToMultiplier(frequencyUnit.value) / +frequencyTime.value)
    const timeToRecoup = timesToRecoup * frequency

    if (secondsSaved >= secondsSpent) {
    	result.textContent = `You should automate it. Automating takes less time than doing the task.`
      return
    }
    if (frequency < secondsSaved) {
    	result.textContent = `The task takes too long to complete for how often you do it.`
      return
    }

    result.textContent = `You need to do the task ${timesToRecoup} ${plural(timesToRecoup, 'time')} to save time. ` +
      `It will take ${toHumanString(timeToRecoup)} to recoup the time spent automating.`
  }
})(q => document.querySelector(q))
</script>
