/**
 * TypedFunction extracts the parameter and return types from a function
 */
export type TypedFunction<T> = T extends (...args: infer P) => infer R
  ? { params: P; expected: R }
  : never;

/**
 * TestSet is a collection of test cases for a typed function
 * @template T - A function of any arity and return type
 *
 * @example
 * const addTests: TestSet<typeof add> = {
 *   func: add,
 *   label: "Addition",
 *   cases: [
 *     { params: [1, 2], expected: 3 },
 *     { params: [2, 3], expected: 5 }
 *   ]
 * }
 */
export type TestSet<T extends (...args: any[]) => any> = T extends (
  ...args: infer P
) => infer R
  ? {
      func: T;
      label?: string;
      cases: {
        params: P;
        expected: R;
        label?: string;
      }[];
    }
  : never;
