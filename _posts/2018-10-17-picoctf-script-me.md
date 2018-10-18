---
layout: post
title: "picoCTF 2018 - script me"
date: 2018-10-17
---

[picoCTF](https://picoctf.com/) is an annual CTF designed primarily for high school students but the competition is open to everyone. This year contained dozens of challenges and I was able to finish with just under 14k points, which placed me at around 350 in the global scoreboard.

One of my favorite challenges was "script me". The problem reads:

> Can you understand the language and answer the questions to retrieve the flag?

The problem also provides a `nc` command to connect to the problem server. Connecting to the server will give output similar to this:

```text
Rules:
() + () = ()()                                      => [combine]
((())) + () = ((())())                              => [absorb-right]
() + ((())) = (()(()))                              => [absorb-left]
(())(()) + () = (())(()())                          => [combined-absorb-right]
() + (())(()) = (()())(())                          => [combined-absorb-left]
(())(()) + ((())) = ((())(())(()))                  => [absorb-combined-right]
((())) + (())(()) = ((())(())(()))                  => [absorb-combined-left]
() + (()) + ((())) = (()()) + ((())) = ((()())(())) => [left-associative]

Example:
(()) + () = () + (()) = (()())

Let's start with a warmup.
(()()()) + (()()()) = ???

>
```

This doesn't look to painful at first glance. The first thing I did was to pull all of the provided rules into an array I could use to test with, and added a loop that will check each test. I'm using Python 3, but the code would be fairly similar another language.

```python3
#!/usr/bin/env python3

tests = [
    ['combine', '() + ()', '()()'],
    ['absorb-left', '((())) + ()', '((())())'],
    ['combined-absorb-right', '() + ((()))', '(()(()))'],
    ['Combined absorb right', '(())(()) + ()', '(())(()())'],
    ['combined-absorb-left', '() + (())(())', '(()())(())'],
    ['absorb-combined-right', '(())(()) + ((()))', '((())(())(()))'],
    ['absorb-combined-left', '((())) + (())(())', '((())(())(()))'],
    ['left-associative', '() + (()) + ((()))', '((()())(()))']
]

def solve(s):
    pass

for (name, problem, result) in tests:
    if solve(problem) != result:
        print('FAIL: ' + name)
        print('ACT: ' + solve(problem))
        print('EXP: ' + result)
        print('')
```

While the "combine" rule is probably the simplest to implement, I decided to start by applying the "left-associative" rule first, and adding a helper function to combine two parts. For starters, this function will just handle the first rule.

```python3
def solve(s):
    parts = s.split(' + ')
    while len(parts) > 1:
        parts = [combine(parts[0], parts[1]), *parts[2:]]
    return parts[0]


def combine(a, b):
    return a + b
```

With this skeleton, the code will pass the first test, but fail on everything else. I had to stop and think for a while in order to figure out when it is possible to absorb a node. I initially tried just counting the number of opening (or closing) parenthesis to see if it was possible to absorb, but this won't always work. I eventually realized that each node has a "depth" associated with it that can be used to determine if a node can absorb another node.

Depth can be easily defined:

- If the node is `()`, the depth is 1
- If the node is a combination (as in rule 1) of multiple nodes, the depth is the max depth of each node
- If the node contains other nodes, the depth is 1 + the depth of the child nodes

In order to write this function, we first need a function that will split a string into its nodes. `getNodes` should return `[]` for the empty string, `[ '()' ]` for `()` and `[ '()', '()' ]` for `()()`.

```python3
def getNodes(s):
    result = []
    depth = 0
    start = 0
    for i in range(len(s)):
        depth += 1 if s[i] == '(' else -1
        if depth == 0:
            result.append(s[start:i+1])
            start = i + 1
    return result
```

With this function, defining `getDepth` is fairly trivial.

```python3
def getDepth(s):
    nodes = getNodes(s)
    if len(nodes) == 0:
        return 0
    if len(nodes) == 1:
        return 1 + getDepth(s[1:-1])
    return max(map(getDepth, nodes))
```

Now we only need to realize one more thing. Since we can merge into either the left or the right, we need to check the last node of the left hand side if we are trying to merge the right hand side into the left hand side. Similarly, if we are trying to merge the left hand side into the right hand side, we need to check the depth of the first node in the right hand side. In code:

```python3
def combine(a, b):
    if getDepth(getNodes(a)[-1]) > getDepth(b):
        return '({}{})'.format(a[1:-1], b)
    if getDepth(getNodes(b)[0]) > getDepth(a):
        return '({}{})'.format(a, b[1:-1])
    return a + b
```

With this function, the answer is complete! I wrote a bit more code to allow for an interactive prompt that I could paste into when connecting to the server. Below is the complete script for anyone interested:

```python3
tests = [
    ['combine', '() + ()', '()()'],
    ['absorb-left', '((())) + ()', '((())())'],
    ['combined-absorb-right', '() + ((()))', '(()(()))'],
    ['Combined absorb right', '(())(()) + ()', '(())(()())'],
    ['combined-absorb-left', '() + (())(())', '(()())(())'],
    ['absorb-combined-right', '(())(()) + ((()))', '((())(())(()))'],
    ['absorb-combined-left', '((())) + (())(())', '((())(())(()))'],
    ['left-associative', '() + (()) + ((()))', '((()())(()))']
]

def solve(s):
    parts = s.split(' + ')
    while len(parts) > 1:
        parts = [combine(parts[0], parts[1]), *parts[2:]]
    return parts[0]


def combine(a, b):
    if getDepth(getNodes(a)[-1]) > getDepth(b):
        return '({}{})'.format(a[1:-1], b)
    if getDepth(getNodes(b)[0]) > getDepth(a):
        return '({}{})'.format(a, b[1:-1])
    return a + b

def getNodes(s):
    result = []
    depth = 0
    start = 0
    for i in range(len(s)):
        depth += 1 if s[i] == '(' else -1
        if depth == 0:
            result.append(s[start:i+1])
            start = i + 1
    return result

def getDepth(s):
    nodes = getNodes(s)
    if len(nodes) == 0:
        return 0
    if len(nodes) == 1:
        return 1 + getDepth(s[1:-1])
    return max(map(getDepth, nodes))

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'solve':
        while True:
            s = input('> ')
            print(solve(s))
    for (name, problem, result) in tests:
        if solve(problem) != result:
            print('FAIL: ' + name)
            print('ACT: ' + solve(problem))
            print('EXP: ' + result)
            print('')
```
