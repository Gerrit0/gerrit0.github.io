+++
title = "TypeScript - Type Safe Plugins"
date = 2024-10-14
+++

A recent question in the [TypeScript Discord](https://discord.gg/typescript)
needs more space than is available there. It happens to be a pretty good
question for providing a walkthrough for how I create complex systems, so I am
roughly reproducing it here to be able to reference it in the future.

The question, stripped down from the back and forth to arrive here:

> How can I create a type safe plugin system which requires that plugin
> dependencies are loaded? I'm looking for an API similar to the following:
>
> ```ts
> const ext1 = ExtensionLoader(
>   () => app, // Dependencies
>   { name: "Ext1" }, // Extension name
>   {
>     // Commands contributed by this extension
>     commandFromExt1: {
>       function: () => {
>         return "";
>       },
>       name: "a",
>     },
>   }
> );
>
> const ext2 = ExtensionLoader(
>   () => app.add(ext1),
>   { name: "Ext2" },
>   {
>     commandExt2: {
>       // app parameter here should be the same type as returned by
>       // the dependency function above
>       function: (app) => {
>         // This should be type safe, note we don't have to pass `app`
>         // to run()
>         const result: string = app.commands.commandFromExt1.run();
>       },
>       name: "b",
>     },
>     commandWithArgument: {
>       // Commands can accept additional arguments
>       function: (app, arg: number, arg2: string) => {
>         // The loaded extensions should also be available on app
>         app.extensions.Ext1.commands.commandFromExt1.run();
>       },
>       name: "c",
>     },
>   }
> );
> ```
>
> In addition to this, when adding plugins to the app, there should be a type
> error if any dependencies are not met.
>
> ```ts
> app.add(ext1); // ok, ext1 has no dependencies
> app.add(ext1).add(ext2); // ok, ext2 depends on ext1, which is loaded
> app.add(ext2); // error, ext2 requires that ext1 has been loaded
> ```

The asker also provided a playground link with their attempt, but I've decided
to build this from the ground up rather than work from it.

The proposed API is fairly complicated so we'll start with a simplified version.
(just looking at the provided code, it definitely seems overly complicated, but
good questions are usually heavily simplified, so I generally assume the
additional complexity is important for reasons outside of the scope of the
question)

Let's start with the following version:

```ts
const ext1 = {
  name: "Ext1",
  commands: {
    commandFromExt1(app: Application<{}>) {
      return "";
    },
  },
} as const;

const ext2 = {
  name: "Ext2",
  commands: {
    commandFromExt1(app: Application<{ Ext1: typeof ext1 }>) {
      const result: string = app.commands.commandFromExt1(app);
      const ext1Name: "Ext1" = app.extensions.Ext1.name;
    },
  },
} as const;

declare const app: Application<{}>;
app.add(ext1).add(ext2); // ok, dependencies met
app.add(ext2); // compile error
```

This version is missing quite a few features of the original:

- implicit `app` parameter passing for properties of `app.commands`
- inferred parameter types
- factory functions for plugins (they're just objects here)
- additional members of `app.commands` (command names)
- a working implementation

This is a good thing, as it lets us focus on figuring out a good base from which
the additional features can gradually be added on. When developing the types,
being able to actually run the code isn't important, so we'll start with
interfaces everywhere and replace them with classes at the end.

To start, we'll define the `Plugin` and `Application` interfaces:

```ts
interface Plugin<App extends Application<any>> {
  name: string;
  commands: Record<string, (app: App, ...args: any) => any>;
}

interface Application<Plugins extends Record<string, Plugin<any>>> {
  extensions: Plugins;
  commands: PluginCommands<Plugins>;
  add<P extends Plugin<Application<Plugins>>>(plugin: P): Application<Plugins & Record<P["name"], P>>;
}
```

There are a couple things to note about these types:

1. `Plugin` doesn't try to define specific types, it is just used as a constraint.
2. `Application` has a single type parameter which describes all dynamic content.

The definition for `PluginCommands` will change in the future, but for now let's
just get the intersection of the `commands` property of all plugins, which can
be done with a [mapped
type](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) and a
[union to intersection
helper](https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type#answer-50375286)

```ts
type U2I<U> = (U extends U ? (_: U) => 1 : 2) extends (_: infer I) => 1 ? I : never;
type PluginCommands<P extends Record<string, Plugin<any>>> = U2I<{ [K in keyof P]: P[K]["commands"] }[keyof P]>;
```

With this, everything nearly works! In the [playground][playground first cut] we
only have one undesirable compiler error due to the `Plugins` type parameter being
[invariant](<https://en.wikipedia.org/wiki/Covariance_and_contravariance_(computer_science)>).

The current variance of the `Application` class means that `Application<{ Ext1:
typeof ext1 }>` is not assignable to `Application<{}>` (undesirable) and that
`Application<{}>` is not assignable to `Application<{ Ext1: typeof ext1 }>`
(desirable). This is a problem since it means that if we have two plugins
without dependencies, attempting to add them both to an application will be a
compiler error. ([playground with variance issue])

```ts
declare const ext0: Plugin<Application<{}>>;
declare const ext1: Plugin<Application<{}>>;
declare const app: Application<{}>;

app.add(ext0); // ok
app.add(ext1); // ok
app.add(ext0).add(ext1); // error
```

Thankfully, we can fix this by updating the `commands` property to exclude the
`app` parameter. ([playground with fixed variance issue])

```ts
type Shift<T extends any[]> = T extends [any, ...infer R] ? R : [];
type PluginCommands<P extends Record<string, Plugin<any>>> = U2I<
  {
    [K in keyof P]: {
      [C in keyof P[K]["commands"]]: (
        ...args: Shift<Parameters<P[K]["commands"][C]>>
      ) => ReturnType<P[K]["commands"][C]>;
    };
  }[keyof P] | {} // extra | {} here to make PluginCommands<{}> be {} instead of never
>;
```

Next, let's look at getting inferred parameter types working. With lots of
commands, it's annoying to have to repeat the type of the `app` parameter for
each command.

In [TypeScript 4.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
and later, we can achieve this with the `satisfies` operator without the need for a function call.

```ts
const ext1 = {
  ...
} as const satisfies Plugin<Application<{}>>;

const ext2 = {
  name: "Ext2",
  commands: {
    commandFromExt1(app) {
      const result: string = app.commands.commandFromExt1();
    },
  },
} as const satisfies Plugin<Application<{ Ext1: typeof ext1 }>>;
```

The duplication of the `Ext1` name when defining the constraint for `ext2` is
unfortunate, but easily fixed with a helper to apply multiple dependent plugins.
We can add a default to `Plugin` to also make plugins which don't require
dependencies simpler to define: ([playground with satisfies])

```ts
interface Plugin<App extends Application<any> = Application<{}>> {
  name: string;
  commands: Record<string, (app: App, ...args: any) => any>;
}

type PluginWithDeps<Deps extends Plugin> = Plugin<Application<U2I<Deps extends Deps ? Record<Deps["name"], Deps> : never>>>

// can be used as...

const ext0 = { ... } as const satisfies Plugin;
const ext2 = {
  name: "Ext2",
  commands: {
    commandFromExt1(app) {
      const result: string = app.commands.commandFromExt1();
      const ext1Name: "Ext1" = app.extensions.Ext1.name;
    },
  },
} as const satisfies PluginWithDeps<typeof ext1>;

// If both ext1 and ext2 were needed, could use PluginWithDeps<typeof ext1 | typeof ext2>
```

Now that we have a working system with simple types, we can start extending it
to support the more complex version in the original question. Let's start with
the factory function for plugins.

```ts
interface Application<Plugins extends Record<string, Plugin<any>>> {
  extensions: Plugins;
  commands: PluginCommands<Plugins>;
  add<P extends Plugin<Application<Plugins>>>(plugin: (app: Application<Plugins>) => P): Application<Plugins & Record<P["name"], P>>;
}
```

With this change, it probably makes sense to update `PluginWithDeps` to operate
on factory functions too. ([playground with factory])

```ts
type PluginWithDeps<Deps extends (_: any) => Plugin> = Plugin<Application<U2I<Deps extends Deps ? Record<ReturnType<Deps>["name"], ReturnType<Deps>> : never>>>
```

Personally, this is as far as I would take this system. Without a good reason
for it, I might even stop earlier, before adding the factory function for
plugins... but for completeness, let's extend this to meet the original API
requested.

Let's start with the commands, they aren't just functions in the original API,
but also have a name.

```ts
interface Command<Name extends string, Fn extends (app: Application<any>, ...args: any) => any> {
  readonly name: Name;
  run(...args: Shift<Parameters<Fn>>): ReturnType<Fn>;
}
```

This is a different shape than is configured when creating commands, so we need
to introduce different types for the configured commands and the runtime
commands. The `ExtensionLoader` is responsible for making the transformation
from the configure shape to the runtime shape.

To make this work I just threw code at the wall until TS stopped complaining...
Without knowing the *why* for this additional complexity, it's hard to tell what
exactly should be required. ([playground with commands])


[playground first cut]: https://www.typescriptlang.org/play/?#code/KYDwDg9gTgLgBAbwL4CgUEsB2NhQGYCGAxsHAAoA2ArgOZYA8AgmGHKDpgCYDOczYFdEQIx0ETPQKYAngD5ZiFHDiYCAW2AAuONxhQsNANxK4RCGrVSe2gErAzUTvV37MNADRwAFARbb+ngB0wQRQNNzaUtIAlHAAvApRssaoGNi4hCR8LILCouL0lLRYvOzAXLx2Dk4uBp5FdBJJ8orKZZjcYh3aDSXGymYWVhHk1I0AwuaWFYVjJckmBJxOZGwgHDyjxRL8uSJds9vc8rJeAts90f45QvsFvR1wAGRwVdArANoARKoaXwC69XkKTQMGkYFIAFUAEwASXokIUcW8kLWG14qIA-N4APraSGxBJwACMcG00Ni7U2XjxcCweFwcFhaPKmwJ8QUpOxzO0mGAADdcMYwRCthMpsNCiyKq97O9nHo6mKGM0kXAYfCEHAPgBpOmYOAAa2A0ggeHI-x6uv+30G0x4ALgSA+xtN5rI-wWKAA9N74nEA4Gg8GQ2gzB14OxSciECZflo4F8AKLrYlfdwmO3DbSx5QDCVcABiUHMKZgxJ8fmyAlu+QkyFksVzeeUUGAMCoUANXy+-TzSAzygHKCQcAIvHDumMKEnkfW0PirRU6gTyfn6czBesS-zQyLJbUZehlbA1xreQOWrLxO0IuAZrRpKQjZ3edncDb3CoFBg2lqbkXXwwECLMKhArdi1LVMT2iPsh0HJ0M1HcdTHEKc0E4ewKFCUh3yAs89jregG2MIDAiWTgvCjaJyOWKj51guBfTgCBDRQMiKPomAKUMJi-UGMB0AoUhcBLKAgA
[playground with variance issue]: https://www.typescriptlang.org/play/?#code/KYDwDg9gTgLgBAbwL4CgUEsB2NhQGYCGAxsHAAoA2ArgOZYA8AgmGHKDpgCYDOczYFdEQIx0ETPQKYAngD5ZiFHDiYCAW2AAuONxhQsNANxK4RCGrVSe2gErAzUTvV37MNADRwAFARbb+ngB0wQRQNNzaUtIAlHAAvApRssaoGNi4hCR8LILCouL0lLRYvOzAXLx2Dk4uBp5FdBJJ8orKZZjcYh3aDSXGymYWVhHk1I0AwuaWFYVjJckmBJxOZGwgHDyjxRL8uSJds9vc8rJeAts90f45QvsFvR1wAGRwVdArANoARKoaXwC69XkKTQMGkYFIAFUAEwASXokIUcW8kLWG14qIA-N4APraSGxBJwACMcG00Ni7U2XjxcCweFwcFhaPKmwJ8QUpOxzO0mGAADdcMYwRCthMpsNCiyKq97O9nHo6mKGM0kXAYfCEHAPgBpOmYOAAa2A0ggeHI-x6uv+30G0x4ALgSA+xtN5rI-wWKAA9N74nEA4Gg8GQ2gzB14OwAAzxVoqdRaOBfACi6yjX3cJjtw20CBMAwlXAAYlBzKmYFGfH5sgJbvkJMhZLE88pW3AoMAYFQoAavl9+q2kJnlEOUEg4AReOHdMYUNPI+tSciW-GNNoU4uM1nC9Y4wWhsXS2py8Sq2BrrW8gdG83862O12e0n+3fRyPM+PJ6ZxDO0Jx7BQoSkPOE7VrsdbXkgCy+GAgRLJwXjRtEhhwL6cAQIaKAwXByyIYuyGoX6GFYSwOEIUhZF4TAxIEWhuCllAACEZJeCgQA
[playground with fixed variance issue]: https://www.typescriptlang.org/play/?#code/KYDwDg9gTgLgBAbwL4CgUEsB2NhQGYCGAxsHAAoA2ArgOZYA8AgmGHKDpgCYDOczYFdEQIx0ETPQKYAngD5ZiFHDiYCAW2AAuONxhQsNANxK4RCGrVSe2gErAzUTvV37MNADRwAFARbb+ngB0wQRQNNzaUtIAlHAAvApRssaoGNi4hCR8LILCouL0lLRYvOzAXLx2Dk4uBp5FdBJJ8orKZZjcYh3aDSXGymYWVhHk1I0AwuaWFYVjJckmBJxOZGwgHDyjxRL8uSJds9vc8rJeAts90f45QvsFvR1wAGRwVdArANoARKoaXwC69XkKTQMGkYFIAFUAEwASXokIUcW8kLWG14qIA-N4APraSGxBJwACMcG00Ni7U2XjxcCweFwcFhaPKmwJ8QUpOxzO0mGAADdcMYwRC4ABlAAW6DwMHoABUWRU4FEPv8kXAFVTeB8okFgvTGTZ-nBsTYyXBVcYUCLSA9JkMZqsta97O9nHo6ltGpIZCd4nAYfCTAgTMoPgBpOmYOAAa2A0ggeHI-20IeU6Yt4yjsfjifIEf+30G0x4AJT3lDGbgwUCoXC2kl0tlZFC6mAOCg3EKBaLU2GAI+4zVskrykJCjsMCoUEwcvBwG74cLX2L-cLQ4WGaQ-TgSA+cYTSbIxoAPohUAsUAB6K-xOL3h+Pp-PtBmDrwdgABn9aZUbe0XwAKLrJ+XzuCYq4VKmlaQZwABiUDmMBMCfj4fjZAItz5BIyCyLEv4ZlA7bTtGXxfDuyhIOBlHgUgyq8G+uhWoxH7rKSyK-r8WhwEBbFgRBfZQa06awQhSFsWhYDXJheQHLh+GjnARFTjOPHkZWVEmJpdEEAx4hMa++msTA0I-iYXEAch0L8QMgnWMJtkOvBiFqMhxKSdJezYfQCBwG52g2nm7CkkgeEOSJRlKcA3BUBQMDaLUbj+r4YCBLB3BpXZYmuRJ0QURF75osSABy-48W5XzJSwgTtJ0+mBG5gRcflmk0SgOl6e+VqcPYFChKQLHKuhuxYXJoXGCltbLF4X55Sgk1LJwM1sXNC3TbNU1LcFc3zdVi3LTAxLRJtB0UoYcA3nAEAxp4PUQlw5REOg0VwBoMC7al+3sGdF23oMYDoBQpC4IhUCeGo6DcJ0SXBUAA
[playground with satisfies]: https://www.typescriptlang.org/play/?#code/KYDwDg9gTgLgBAbwL4CgUEsB2NhQGYCGAxsHAAoA2ArgOZYA8AgmGHKDpgCYDOczYFdEQIx0ETPQKYAngD44AXj4tBw0ePrJZ8hCjhxMBALbAAXHG4woWGgG49cIhCNGpPcwCVgTqJ3qXrTBoAGjgACgIWc35QgDp4gigabnMpaQBKRXk02XtUFBhpMFJKWiwAdXQYAAsAEWAwbnp6xrYQDh5yajpMeSVSnqYVIRExCQBVACYASWaG3nZgLl4W3gB+OC8fP1WAbQAiQxN9gF1Q1flzTGAAN1xtWTQsHHxiUn5VUY0BrAX2pc6W2gfgCNlCPwkOW0iAci0w3DGKS6ZXh9n0ThcbiREIAws5XMt6BDuLkHAROH4yG0OrwIUMBCN1BJiQ8wgIUeYyOlosM1GMid1fnAAGSbbzAokHI7AU7g7R5NCFYpwKazcZ9cLjakA3hajZhAD65nGmQU8gAjHBzJNMnDOobzFg8Lg4NNtcsVaaLXANm6rrdcPYlaQAMrVdB4GD0AAq7s6aV2Jw1sbtvF2aTi8SdLo8Jx9mytcET9gKRRKgsweMxhKpqbF238VjByMGUI1qvoDl0+n0uwA0nAsHAANbAaQQPDkE7mbs93s4weYEdjifkfsnA4Ygk8U7T8IOOf6eKxRLJcxhiNRsiJYzAF5NMjrzf4rGnXY4pOPQ9wL1imBUKBMGjMtJT7Dd9i3V8Nw-Uk5yQNE4CQXZR3HScyDzAAfRBUFJFAAHo8MUBRiJI0iyPItAnHheB2AABkUGF9Glcx9gAUXaWj9mCBxIOWGcD0cF8uAAMSgZx2JgWiIhYTJZznKA7wApd9n2BD9CQbj1O4pA4AIXgqMsCxRm4PB0GAWkKxLAyaPaS0lFnZi4DY2yuJ4oT3EYnteM4UTxNs6SwFkgT9AU-9AKc1SBI0hxop0vTBOoozRBMsyLJRKzxEM9hJgYhzbxYiTJlc9F3KROTBOrHyxKMCTzQCoLv2suAFO4KgKBgcxQSCBjIjAWJvO4fr3N8mr-PSNSvMymyYHNAA5fKnNq-YepYWI4QRTLYlq2JpQm6KtJQOL9KmpL0BS8yWwqKo6nmehg1XdhzVwzhvAoRJSCa3qeQZPkNC0exepPCkwjo8aUEB8lOBB2ywYh4HQaBqHHrB8HVsh6GZvSRGMZtWw4AIuAIGHUIXuKLgliIVK4BMGBUb69HsvG-HCIxMB0AoUhcDEqBQiMM6EW6x6gA
[playground with factory]: https://www.typescriptlang.org/play/?#code/KYDwDg9gTgLgBAbzgXwFCoJYDsbCgMwEMBjYOABQBsBXAc2wB4BBMMOUXLAEwGc4WwlDMUIwMELA0JYAngD44AXn6shIsRIYJkchQlRw4WQgFtgALjg8YUbLQDcBuMQgmT03pYBKwF1C4M1rZYtAA0cAAUhKyWAuEAdImEULQ8ltIyAJRKChlyjmioMDJgZFR02ADqGDAAFgAiwGA8DI3N7CCcvJEA+umy2YoK5fRYCsojjAJqouKSAKoATACSrU18HMDcfG18APxwPn4BPjDUUFgAKiXAa81yANoARMZmTwC64afnVzd3PLo4JYsMAAG54XRydDYXAEEhkabCWaaSZYDadLbdI7QAJBOzhVFSWSQxBOTZouZpCg0UY8RyGFxuDxU1EAYVc7m2DFRAPpcEIXAC5A6XT4hMR6jm3Jp2ABugiggqWEsURiKkESI0kh5ckGw0ysVUmqlPLgADJDr4cdznq9gB8CboCuhiqU4EtVvNxpF5iLMXxfQcIn13Xq4ABGIFwRbZcndYOWbD4PBwZZ+7ahnIRuAHNPAsF4RyusgAZVqGHwMAYl3T3QyD3e3prcb4DwyCUSSZTXneOcOUYbjiKN2pSvZTK5wpbluOgRs+NHoyJ8kByg9DCc+kMhgeAGk4Ng4ABrYAyCD4CjvSxb7c71kHrDH0-nih797PRmc3gfK+RJy3wxEniZJUksMsKyrchklMYBYRacg3w-DlmQ+B5WUbKEALgMNvgua5ShtXd3yeT8UPfdD8n-FA+WQB4TzPC9yF7AAfRA0Eo1AAHpOKURQ+P4gTBKE9AXDReAOAABiUSIwwiG87UsJ4AFFOgkp5QicUjtmvKitK4AAxKBXBUmAJNVMBshvW8oFgn44CeJ4+UMZANOcjTkGyQg+FE6wrFmHh8AwYAxRlLAhx88TOkjZQIlk+SYMUkzw3UzTkO00lbz0wzjKi8zLKowwbLOC57McqiXKcCqPP5byJF8nh-MC4LF2wcK6simBFmk2KszkpwFPskzFhShk0s8DLtyyoyTCSvKJsy9q4BsnhqEoGBLDxEJpOiMB4j0ng9rG7KZtyzInMmxaOHDAA5BLBqip5ttYeJyR4Sl4iS+I7XOiq3NQZAaucRaGrEAKgpCpVqjqXYGGLF8rt1IcuF8ShkjICL+TVCVkUkbRKJ24DBQiSSztQAmBS4YmotJ8miZJwnKau0myeeimqZgcNMgZ9mY3sOBuLgCAj3CZHSm4LZiHBuAzBgFndrZjhef5njGTADBKDIPAjKgcITAwHg3q2q6gA
[playground with commands]: https://www.typescriptlang.org/play/?target=10#code/KYDwDg9gTgLgBAbzgXwFCoJYDsbCgMwEMBjYOAYQgFsrCsATASSwxgB4BBMMOUXBgM5wAQoQHAuYADYZihGBghY2dAJ4A+dYlRw4WQlWAAuOAJhRsAcwDcOuPgCuWYgqUmAFIW4nJAGjgAdEGEUJYCJmoAlHAAvFpqtmio9MDEUiFkaWJClDR09GwAcgZkfMCCpuZW-gBiWLwg-PRCnt5wfoHBoeFwUbHxWKr+kg1NQqLikjJyrspqmtq6xEpmUA4u0O76hibFhv74WCZ1kbZ2UMCE9EpSqnoluyW2umtY7kEBIWEmAMoAFhh8OwAAohEq4KACNh1TSREwAJWAMAcUCwABVVGBgNCsOpEugUlkLnAsgIhMCpA5LNgiiVRuVmpULFhLP5crQKmUKojllACqtqhRqBymCx2JJNMNuPSKhMJNxpvJFHNBgsEHZllhVusYJttsY4HtgP5lnlBCZ2fkBP4vGAfNxTugXpdrlhbvcdoanucXTc7qaRT11bpdABtADScGwcAA1sBVBB8EKzc0ALoW4X5NiWwQR1OhgBE+oLqbZmdz4fzBcczlmJalYHUdjQSWwEKIpBEYnl0lkSqUbApVOwQi5jJ50H5VRZ-iH1JVQ16gxtqrVdi5AmVPTnI+eJPLzRMO6wOeag8p84EeNQrZweA7ZCmfdm5+HWpl49Sk7YApncGPKjLkui7zAsY7jN2T4zMqr6Xlowa9PQBTAh+5IXjSagrouMAAle6juNIb4eLaJg4RgAjRHE-5wu0CrPjBx5CAAZHAE58oOhbFqW-6aPiqAwJiZAAKoAEyMGwQlaDEcDuEJqFwHJAD8MkAPomEJlFaAAjHAJgidE4GqSY2D4HgcCMPJGn9HAOnKRZJhYMAABueC2AJWJwP8gLsGi8lqKGqZSXAvmGaGmGdAEJlmfCqZwMp8K6XAAVnO5ZDHqeUIoYZbFTsyrL-uhC5YVhmhBaJ4l2AhYaRtGcYJkmwLpv+eaFgGVolnuyChnVib-rFAA+iBoNeySpOkxI1i4ypwAAoo05SbkoAAyEBXHgbB2AAIsAYCjvN3Jfuxv75QB4Vnauvgais8DHka8nHZdSzXcmgbyTlP7Tvlp7MKwbBylB-bKNtu2lZd+F2E4DjiPQwM9O4mm0b20EDrD6iPb03QmEg+pHoVd3IOjbXmi9VqoDRrR2l2kx0cjQM7VeCMAbdJRlim1pUz2iovqjI0APS87EMRC8LIui2L6CamYowAAyxLN+2LVgK1rVA7h2PD1m2v4-NwMDDLlMQGDAAIlUegaBZzTA0sFig2sC5bC3TfqlV2LoOsZfuOAWAARg4uD0HA3t3GRe38Irrv7imNRQNQlvS1jEe6JNsweAjVUhs6yKonABYFnuGcE4nZsmAW1vo7ohcV2TZyS-AfA6dJDtasqyspKr6sI1rcA63rDAG0bJu6NjDw55bWk2wT3f2wrTslC7GfuweQialUvv+4Hwe4TK4cZ0T9DR7HjRaQnGdJ04U1uDJadF5nKL1Ln+chpXp84znhAFuXtvNtXEvPXwIlyyborVueA1a6A1lRW0nwkLuHrpEdGw9PQW0aCJCeCCI570tiJE+p8da2jgGAMEhgIRwD+HgMgAg-gQAcFIAO3syA4QoXSVKvQhAXCzo5Ohqgi460YXAFIWI+7ODuMnaahBvYQBckXURl8KbX1PiGHWaIt6UOobQwODDBKmEIKZfwWAIC4DgAAdzIK6AA5PAP4hAXJwF1AQ7IcAAAGtpHE3ynrYiAcBXjwzcbXLxxsaEwBMMdOWUC94CACHvA+VAx4BG8Y6BRz8M6vwLN7D+EckmRxFAAdVYH8DgoQHCGBwDgheAsPZyHqCQUgYB4BXHoKwZUhApAY0sEU8oMBB6nxkUcGSXcvgOSKfQqANpQjYKZFYeRCj3HKLIFIVaKQA4bi3KYKhNCA7NIEJ4+hvQnKEAwOkb2UgyBKF6NwNxUDlkrACLE8JkSDzRNifEx+FdP66BScQdJBd0ZoEdKNIkmRnokURlzGCCBkDXigfU2BjRpaOihTAuBtgEX0BhVbSI0DUVIvQCitFWkMXQv-qcdxEAYz+AEfrZwA84DENQLiol1h3GmjAAc0oUAY4jJpeRTcLJRhaSAA
