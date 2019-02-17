---
layout: post
title: "Experimenting With Grammars"
date: 2019-02-16
---

I've been interested in language development for the past few months, and have experimented with building my own compiler using both [Jack W. Crenshaw's tutorial](http://www.stack.nl/~marcov/compiler.pdf) and [Nora Sandler's series](https://norasandler.com/2017/11/29/Write-a-Compiler.html). Unfortunately, while I was able to generate working code, the amount of effort required to achieve a product that I was satisfied with was massive. I never finished either of the above guides.

However, I recently realized that there was another simpler project that I could complete while learning more about parsers. While parsing certainly isn't the hardest part of compiler design, it can be difficult.

Last semester I took Linear Algebra and was introduced to LaTeX. I now use it for almost everything... including my math course this semester. For each homework assignment I need to create a new document, paste in my template, and manually convert the problem list into `\problem{#}` headers. The input looks like this:

```
Suggested: 1, 3bc, 4 - 8, 10 - 13
Hand in: 1, 3bc, 4, 5, 7 b,d, 11, 13
```

Now, it's possible to get a pretty good guess at what the problems are just by extracting the numbers or by splitting by commas and getting all the numbers, but I also wanted to capture the problem parts. Doing this manually isn't that hard (ignoring ranges for a moment)

```js
const text = '1, 3bc, 4, 5, 7 b,d, 11, 13'

const parts = text.split(',')
const result = []

for (const part of parts) {
	if (/\d/.test(part)) {
  	result.push({ value: parseInt(part), parts: [] })
  }
  if (/[a-z]/.test(part)) {
  	result[result.length - 1].parts.push(...part.match(/[a-z]/g))
  }
}

console.log(result)
```

... but what's the fun in that? Also, while the above code works, it will accept arbitrary input and, if the input isn't precisely formatted, may produce unexpected results. I wanted something better.

There are several JavaScript parser generators available, but I decided to use [nearley.js](https://nearley.js.org/) since I've played with it before.

I've found that the best way to experiment with a parser is to toss it into the [parser playground](https://omrelli.ug/nearley-playground/) and create a few tests. The first step is to accept single numbers and comma separated numbers.

```nearley
main -> problems {% d => JSON.stringify(d[0]) %}

problems ->
  problem # No id since we want the problem to be in an array
  | problems "," problem {% d => d[0].concat(d[2]) %}

problem -> number {% id %}

number -> [0-9]:+ {% d => +d[0].join('') %}
```

This parser is rather restrictive, it won't let you include spaces anywhere, so let's fix that. Convention is to use `_` for whitespace. According to the [How to grammar good](https://nearley.js.org/docs/how-to-grammar-good#postprocess-or-dispose) guide, this rule should return null to throw away the parsed value.

```nearley
main -> _ problems _ {% d => JSON.stringify(d[1]) %}

problems ->
  problem # No id since we want the problem to be in an array
  | problems _ "," _ problem {% d => d[0].concat(d[4]) %}

problem -> number {% id %}

number -> [0-9]:+ {% d => +d[0].join('') %}

_ -> [\s]:* {% () => null %}
```

Next up, let's extend the parser to also accept problem parts, so `1a, b` is now a valid problem. This isn't too difficult, if you do it the right way.

```nearley
main -> _ problems _ {% d => JSON.stringify(d[1]) %}

problems ->
    problem # No id since we want the problem to be in an array
  | problems _ "," _ problem {% d => d[0].concat(d[4]) %}

problem -> number _ parts:? {% ([value, _, parts]) => ({ value, parts: parts || [] }) %}

parts ->
    part {% d => d[1] %}
  | parts _ "," _ part {% d => d[0].concat(d[4]) %}

part -> [a-z]:+ {% id %}

number -> [0-9]:+ {% d => +d[0].join('') %}

_ -> [\s]:* {% () => null %}
```

In my first implementation of this parser, I forgot that I could use the `:?` EBNF modifier on `parts` in the `problem` rule to indicate that it was optional, and tried to make `parts` optional within the rule with `_ [a-z]:* _`. This is a problem since it introduces ambiguity. (How should the parser handle `1   a  `?)

Now all that's left is to handle problem ranges, this is also simple since ranges can't have `parts`.

```nearley
main -> _ problems {% d => JSON.stringify(d[1]) %}

problems ->
    problem # No id since we want the problem to be in an array
  | problem_range # ditto
  | problems _ "," _ (problem|problem_range) {% d => d[0].concat(d[4]) %}

problem -> number _ parts:? {% ([value, _, parts]) => ({ value, parts: parts || [] }) %}

problem_range -> number _ "-" _ number {% d => ({ range: [d[0], d[4]] }) %}

parts ->
    part {% id %}
  | parts _ "," _ part {% d => d[0].concat(d[4]) %}

part -> [a-z]:+ {% id %}

number -> [0-9]:+ {% d => +d[0].join('') %}

_ -> [\s]:* {% () => null %}
```

With this change, the parser can now handle both of the problem lists presented at the start of this post, and will throw an error that can quickly show where the problem is if something isn't quite right. I decided to not handle the "Suggested" or "Hand in" prefixes in the parser since I suspect that I will use this code for other classes that don't have these labels in the future.

I wrapped the parser up with a bit more ad-hoc parsing to handle suggested/required problems, and included it with a few other tools. You can see the result at [https://gerritbirkeland.com/tools/](https://gerritbirkeland.com/tools/), and the rest of the code at [https://github.com/Gerrit0/tools](https://github.com/Gerrit0/tools)
