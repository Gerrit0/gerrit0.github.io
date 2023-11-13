+++
title = "Gift Swapping"
date = 2023-11-12
+++

If you just want the tool: [Click here](#tool)

## Introduction

When exchanging gifts at Christmas, my extended family doesn't have everyone give to everyone,
instead, each person receives the name of another in the family and gives to that person. This
assignment changes each year with the following goals, in decreasing order of importance:

1. Everybody should give to exactly one person.
2. Nobody should give to themselves.
3. Couples should not give to one another.
4. Each person should eventually give to every other person.
5. Couple-pairs should not give to one another. (Prioritize cross-branch giving)

My solution for this problem ignores #5, since the solution that it happened to generate
looked reasonable for my input without handling it explicitly.

## Solution

To visualize this problem, I imagine a graph where the nodes of the graph are people
and the edges of the graph are the people that that person _could_ give a gift to.

{{ graph(path="gift-swapping-graph.svg") }}

Let's walk through choosing a set of edges for one year. When we say
"A gives to B", that means we highlight the edge A-B, and ignore the other edges connected to either
A or B.

{{ graph(path="gift-swapping-graph-ab.svg") }}

Well, this has immediately revealed a problem. If A gives to B, then either D or E will not give
to anyone, or we need to break rule #3. In fact, with an undirected graph like this, we'll always
run into problems with an odd number of people since we need to have three people trading gifts.

Let's re-think this. What if we had a directed graph instead of an undirected graph? In this case,
A giving to B does not imply that B gives to A, so we still have lots of options.

{{ graph(path="gift-swapping-graph-dir-ab.svg") }}

Using a directed graph doesn't completely eliminate the problem with an odd number of people,
but it gives the algorithm far more opportunities to create a 3 person swap to avoid this issue.

Graphs are more difficult to work with in code than tables, so we'll represent the above graph
as a table. Each column of the table belongs to a node in the graph, and will contain the node
which that node points to.

If we enumerate all possible gift swap configurations, we get a multi-row table where each row
in the table is a possible solution. Here's a graph and the table for multiple people giving gifts
(first row of table is shown in the graph). The first three goals are met by how the enumeration
is done.

{{ graph(path="gift-swapping-graph-dir-full.svg") }}

```
| A   | B   | C   | D   | E   |
| --- | --- | --- | --- | --- |
| B   | D   | E   | A   | C   |
| B   | D   | E   | C   | A   |
| B   | E   | D   | A   | C   |
| B   | E   | D   | C   | A   |
| C   | D   | E   | A   | B   |
| C   | D   | E   | B   | A   |
| C   | E   | D   | A   | B   |
| C   | E   | D   | B   | A   |
| D   | A   | E   | B   | C   |
| D   | A   | E   | C   | B   |
| D   | E   | A   | B   | C   |
| D   | E   | A   | C   | B   |
| E   | A   | D   | B   | C   |
| E   | A   | D   | C   | B   |
| E   | D   | A   | B   | C   |
| E   | D   | A   | C   | B   |
```

While this is interesting, it isn't enough. It wouldn't be a good idea to just start at the top of
the table, and move to the next row each year. That would result in A giving to B four years in a row!

To fix this, we need to define a scoring system which tries to pick the next best row given the current
row of names. Ideally, our scoring system should also include at least the previous year's names so that
people who have never given to one another are weighted more highly than those who gave to each other just
one or two years ago.

The way I decided to do this was to add the first discovered solution, and then from there, search for
the highest scoring solution from the discovered solutions. The scoring system I went with will penalize
solutions which cause people to give to the same person as a previous solution, with each year decreasing
the penalty by 50% (chosen arbitrarily, seemed to behave reasonably).

## Complexity

This problem does not scale nicely. It is exponential in nature, with just 12 people involved in the gift
swap, there are so many solutions that web browsers don't handle it very well.

| People | Solutions (no couples) |
| ------ | ---------------------- |
| 3      | 2                      |
| 4      | 9                      |
| 5      | 44                     |
| 6      | 265                    |
| 7      | 1854                   |
| 8      | 14833                  |
| 9      | 133496                 |
| 10     | 1334961                |
| 11     | 14684570               |

This is approximately the curve `factorial(people * 1.5)`. There's likely a smarter way to do this to avoid
at least some of the exponential complexity, but my use case only required 12 people, which runs in ~5 minutes
when implemented in Rust on my laptop, so it wasn't worth the effort.

The method for determining the score of a solution is also expensive, `O(# solutions * # previous solutions)`
since it considers all previously discovered solutions. It might be worth changing this to only consider the
previous N solutions, but again, it wasn't slow enough to be a problem with 12 people.

## Tool

Input the list of people to be included in the gift swap here, one per line:

<textarea id="names">
A
B
C
D
E
</textarea>

Input the list of couples here, with names separated by a slash (`/`), one couple per line:

<textarea id="couples" placeholder="D/E">
D/E
B/C
</textarea>

<button id="go">Go!</button>
<button id="stop" disabled>Terminate search</button>

Logs:

<ul id="messages"></ul>

<div id="output"></div>

<style>
    textarea {
        width: 100%;
        height: 200px;
        resize: vertical;
    }
</style>

<script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.1.2/viz.js" integrity="sha512-vnRdmX8ZxbU+IhA2gLhZqXkX1neJISG10xy0iP0WauuClu3AIMknxyDjYHEpEhi8fTZPyOCWgqUCnEafDB/jVQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.1.2/full.render.js" integrity="sha512-1zKK2bG3QY2JaUPpfHZDUMe3dwBwFdCDwXQ01GrKSd+/l0hqPbF+aak66zYPUZtn+o2JYi1mjXAqy5mW04v3iA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="/gift-swapping.js" type="module"></script>
