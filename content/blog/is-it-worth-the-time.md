+++
title = "Is it worth the time?"
date = 2019-07-13
aliases = ["blog/2019/07/13/is-it-worth-the-time"]
+++

xkcd has [a post](https://xkcd.com/1205/) which details how much time you can spend automating a task before the time spent automating the task will be more than the time saved.

![Is It Worth The Time?](https://imgs.xkcd.com/comics/is_it_worth_the_time.png)

While an interesting idea, I find it more helpful to consider how much it will take before time spent automating will pay off.

<style>
#shavedTime, #automateTime, #periodTime,
#shavedUnit, #automateUnit, #periodUnit {
  padding: 0.3em;
  border-radius: 7px;
  border: 1px solid var(--accent-color);
}
#shavedTime, #automateTime, #periodTime {
  margin-left: 2em;
  margin-bottom: 1em;
  margin-top: 0.5em;
}

label {
  font-weight: bold;
}

#result {
  border: 1px solid var(--accent-color);
  background: var(--secondary-background);
  margin: 0.5em;
  padding: 0.5em;
}
</style>

<label>
  How much will the automation save?<br>
  <input id="shavedTime" type="number" value="5" min="1">
</label>
<select id="shavedUnit">
  <option value="second">seconds</option>
  <option value="minute" selected>minutes</option>
  <option value="hour">hours</option>
  <option value="day">days</option>
  <option value="week">weeks</option>
</select>

<br>

<label>
  How long will it take to automate?<br>
  <input id="automateTime" type="number" value="2" min="1">
</label>
<select id="automateUnit">
  <option value="second">seconds</option>
  <option value="minute">minutes</option>
  <option value="hour" selected>hours</option>
  <option value="day">days</option>
  <option value="week">weeks</option>
</select>

<br>

<label>
  How often do you do the task?<br>
  <input id="periodTime" type="number" value="1" min="1">
  time(s) per
</label>
<select id="periodUnit">
  <option value="minute">minute</option>
  <option value="hour" selected>hour</option>
  <option value="day">day</option>
  <option value="week">week</option>
  <option value="month">month</option>
</select>

<div id="result"></div>

<script src="/worth-the-time.js"></script>
