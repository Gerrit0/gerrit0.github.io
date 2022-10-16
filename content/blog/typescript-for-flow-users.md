+++
title = "TypeScript for Flow Users"
date = 2018-10-17
aliases = ["blog/2018/10/17/typescript-for-flow-users"]
+++

Both Flow and TypeScript provide several utility types. Here I've taken Flow's [utility types](https://flow.org/en/docs/types/utilities/) and compiled some examples to show the equivalent syntax in TypeScript. The examples are (mostly) taken straight from the Flow docs.

Disclaimer: I don't use Flow. I may miss some less obvious features - please let me know if I do!

### `$Keys<T>`

TypeScript just uses `keyof`, though you could define `type $Keys<T> = keyof T`

```ts
const countries = {
  US: "United States",
  IT: "Italy",
  FR: "France",
};

type Country = keyof typeof countries; // $Keys<typeof countries>
const italy: Country = "IT";
const nope: Country = "nope"; // Error
```

### `$Values<T>`

Easily defined as `T[keyof T]`, can be wrapped as `type $Values<T> = T[keyof T]` if desired.

```ts
type Values<T> = T[keyof T]; // $Values<T>

type Props = {
  name: string;
  age: number;
};

// The following two types are equivalent:
type PropValues = string | number;
type Prop$Values = Values<Props>;

const name: Prop$Values = "Jon"; // OK, if in a module context
const age: Prop$Values = 42; // OK
const fn: Prop$Values = () => {}; // Error
```

### `$ReadOnly<T>`

Can be easily defined using [mapped types](http://www.typescriptlang.org/docs/handbook/advanced-types.html#mapped-types). The TypeScript handbook actually provides it as an example!

```ts
type Readonly<T> = {
  readonly // $Readonly<T>
  [P in keyof T]: T[P];
};

type Props = {
  name: string;
  age: number;
  // ...
};

type ReadOnlyProps = Readonly<Props>;

function render(props: ReadOnlyProps) {
  const { name, age } = props; // OK to read
  props.age = 42; // Error when writing
}
```

### `$Exact<T>`

`$Exact<T>` doesn't quite make sense in TypeScript. If you specify the type of an object when defining an object literal, you will get an error if you try to provide more properties.

```ts
type User = { name: string };
const user: User = { name: "name", age: 0 }; // Error
```

However, it may sometimes be desirable to check later. In this case, it is possible to check if two types are exactly equal, and cause a type error if they are not. The [conditional-type-checks](https://www.npmjs.com/package/conditional-type-checks) library makes this fairly painless. The `AssertTrue` and `IsExactType` types have been extracted from it for purposes of demonstration.

```ts
type AssertTrue<T extends true> = never;
type IsExactType<T, U> = Exclude<T, U> extends never
  ? Exclude<U, T> extends never
    ? true
    : false
  : false;

type User = { name: string };
const user = { name: "name", age: 0 };
{
  // Scope so that ExactCheck doesn't show up anywhere else
  type ExactCheck = AssertTrue<IsExactType<User, typeof user>>; // Error
}
```

### `$Diff<A, B>`

`Diff` in TypeScript is commonly used for union types, however the `$Diff` defined by Flow can easily be defined in TypeScript as well.

There are three similar ways to represent `$Diff`, each has its advantages. While `$Diff2` below is closer to the diff used by Flow, the `$Diff` implementation below is safer.

```ts
type $Diff<A, B extends Partial<A>> = {
  [K in Exclude<keyof A, keyof B>]: A[K];
} & {
  [K in keyof A & keyof B]?: A[K];
};

type $Diff2<A, B extends Partial<A>> = $Diff<A, B> & {
  [K: string]: any;
};

type Props = { name: string; age: number };
type DefaultProps = { age: number };
type RequiredProps = $Diff<Props, DefaultProps>;
type RequiredProps2 = $Diff2<Props, RequiredProps>;

declare function setProps(props: RequiredProps);
declare function setProps2(props: RequiredProps2);

setProps({ name: "foo" });
setProps2({ name: "foo" });

setProps({ name: "foo", age: 42, baz: false }); // Error
setProps2({ name: "foo", age: 42, baz: false }); // Ok, as in Flow

setProps({ age: 42 }); // Error
setProps2({ age: 42 }); // Error
```

Note that the above `$Diff` implementations will _not_ complain if you try to remove properties which do not exist in `A`. There isn't a standard way to raise a compile time type error in TypeScript, but it can be achieved by resolving the type to `never` and causing an error where we try to assign an object to `never`.

```ts
type $Diff3<A, B extends Partial<A>> = keyof B extends keyof A
  ? {
      [K in Exclude<keyof A, keyof B>]: A[K];
    } & {
      [K in keyof A & keyof B]?: A[K];
    } & {
      [K: string]: any;
    }
  : never;

type Props = { name: string; age: number };
type DefaultProps = { age: number };
type DefaultPropsBroken = { age: number; other: string | undefined };
type RequiredProps = $Diff3<Props, DefaultProps>;
type RequiredPropsBroken = $Diff3<Props, DefaultPropsBroken>;

declare function setProps(props: RequiredProps);
declare function setPropsBroken(props: RequiredPropsBroken);

setProps({ name: "foo" }); // Still Ok
setPropsBroken({ name: "foo" }); // Error
```

However, this implementation still does not quite match Flow's `$Diff` type. In Flow's `$Diff` type, Flow will allow keys that don't exist in `A` to exist in `B` if they are defined with `| void`. TypeScript's equivalent is `| undefined`, so here's one last implementation.

```ts
type RequiredKeys<T> = Exclude<
  {
    [K in keyof T]: undefined extends T[K] ? never : K;
  }[keyof T],
  undefined
>;

type $Diff4<A, B extends Partial<A>> = RequiredKeys<B> extends keyof A
  ? {
      [K in Exclude<keyof A, keyof B>]: A[K];
    } & {
      [K in keyof A & keyof B]?: A[K];
    } & {
      [K: string]: any;
    }
  : never;

type Props = { name: string; age: number };
type DefaultProps = { age: number; other?: string };
type DefaultPropsBroken = { age: number; other: string };

type RequiredProps = $Diff4<Props, DefaultProps>;
type RequiredPropsBroken = $Diff4<Props, DefaultPropsBroken>;

declare function setProps(props: RequiredProps): void;
declare function setPropsBroken(props: RequiredPropsBroken): void;

setProps({ name: "foo" }); // Still Ok, other is optional
setPropsBroken({ name: "foo" }); // Error
```

### `$Rest<A, B>`

`$Rest` is much simpler to represent with TypeScript. `$Rest<A, B>` returns an object with `A`'s properties that are not `B`'s properties. Following Flow's behavior, the remaining properties are marked optional.

```ts
type Rest<A, B extends Partial<A>> = {
  [K in Exclude<keyof A, keyof B>]?: A[K];
};

type JustA = Rest<{ a: string; b: number }, { b: number }>;
type JustB = Rest<{ a: string; b: number }, { a: string }>;
```

### `$PropertyType<T, k>, $ElementType<T, K>`

Like `$Keys`, there's not much point in defining this in TypeScript. You can just use `T['key']`.

```ts
type $PropertyType<T, K extends keyof T> = T[K];

type Person = {
  name: string;
  age: number;
  parent: Person;
};

const newName: $PropertyType<Person, "name"> = "Michael Jackson";
const newAge: $PropertyType<Person, "age"> = 50;
const newParent: $PropertyType<Person, "parent"> = "Joe Jackson"; // Error
```

### `$NonMaybeType<T>`

This can be trivially implemented using the built in `Exclude`.

```ts
type NonMaybeType<T> = Exclude<T, null | undefined>;

type MaybeString = string | undefined | null;
type DefinitelyString = NonMaybeType<MaybeString>; // => string
```

### `$ObjType<T, F>, $TupleMap<T, F>`

This is a bit more complicated, TypeScript doesn't have the ability to "call" a function type like Flow does, but it should be possible to write types which provide the same behavior.

Here's a few examples, taken from the Flow docs and translated to TypeScript.

```ts
// Run
declare function run<O extends { [key: string]: () => any }>(
  o: O
): { [K in keyof O]: ReturnType<O[K]> };

const o = {
  a: () => true,
  b: () => "foo",
};

const a: boolean = run(o).a; // Ok
const b: string = run(o).b; // Ok
const b2: boolean = run(o).b; // Error
const c = run(o).c; // Error, c doesn't exist

// Props
type PromiseType<T> = T extends PromiseLike<infer U> ? U : never;

declare function props<O extends { [key: string]: Promise<any> }>(
  promises: O
): Promise<{ [K in keyof O]: PromiseType<O[K]> }>;

const promises = { a: Promise.resolve(42) };
props(promises).then((o) => {
  const a: number = o.a; // Ok, not 42 like in Flow.
});

// Tuple Run
// Unfortunately this only works when arr functions return a single type.
declare function run<T extends Array<() => any>>(
  iter: T
): ReturnType<T[number]>;

const arr = [() => "foo", () => "bar"];
const a: string = run(arr)[0];
const b: string = run(arr)[1];
const c: boolean = run(arr)[1]; // Error
```

### `$Call<F>`

It isn't currently possible to completely represent `$Call` with TypeScript as it requires support for [variadic kinds](https://github.com/Microsoft/TypeScript/issues/5453), which has been on the roadmap for several versions. However, for functions with a static return type, it is possible to use the built in `ReturnType<T>` to extract a the return type of a function.

### `Class<T>`

Is not quite possible in TypeScript, there's no way to recover the constructor type from any instance type. (`T['constructor']` is just `Function`)

However, it is mostly unnecessary in TypeScript, just use `typeof` and the class name.

```ts
class Store {}
class ExtendedStore extends Store {}
class Model {}

declare function makeStore(storeClass: typeof Store): Store;

makeStore(Store);
makeStore(ExtendedStore);
// To make this error, add a property to Store that is not in Model.
makeStore(Model); // No error
```

### `$Shape<T>`

Is identical to `Partial<T>` in TypeScript.
