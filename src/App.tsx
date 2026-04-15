import { For, Show, createMemo, type Component } from 'solid-js';
import type { TestSet } from './types';

// ---------------------------------------------------------------------------
// Example function under test
// ---------------------------------------------------------------------------

function add(a: number, b: number) {
  return a + b;
}

// ---------------------------------------------------------------------------
// TestCaseRow — renders a single test case
// ---------------------------------------------------------------------------

type TestCaseRowProps<T extends (...args: any[]) => any> = {
  func: T;
  params: Parameters<T>;
  expected: ReturnType<T>;
  index: number;
  label?: string;
};

function TestCaseRow<T extends (...args: any[]) => any>(
  props: TestCaseRowProps<T>
) {
  // Run the function. Wrapped in createMemo so Solid can track reactivity
  // if `func` or `params` are ever made reactive signals.
  const actual = createMemo(() => props.func(...(props.params as any[])));
  const passed = createMemo(() => actual() === props.expected);

  const paramsDisplay = () =>
    (props.params as unknown[])
      .map((p) => JSON.stringify(p))
      .join(', ');

  return (
    <div
      class={[
        'rounded-lg border px-4 py-3 transition-colors',
        passed()
          ? 'border-emerald-600/40 bg-emerald-950/20'
          : 'border-red-600/40 bg-red-950/20',
      ].join(' ')}
    >
      {/* Row header */}
      <div class="flex items-center justify-between gap-4">
        <span class="font-mono text-sm text-neutral-400">
          <span class="text-neutral-600 select-none mr-1">
            #{String(props.index + 1).padStart(2, '0')}
          </span>
          {props.label ?? `(${paramsDisplay()})`}
        </span>
        <span
          class={[
            'shrink-0 text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full',
            passed()
              ? 'text-emerald-400 bg-emerald-900/40'
              : 'text-red-400 bg-red-900/40',
          ].join(' ')}
        >
          {passed() ? '✓ pass' : '✗ fail'}
        </span>
      </div>

      {/* Detail row — only shown for failures */}
      <Show when={!passed()}>
        <div class="mt-2 grid grid-cols-2 gap-2 font-mono text-sm">
          <div class="rounded bg-black/30 px-3 py-1.5">
            <span class="text-neutral-500 text-xs block mb-0.5">expected</span>
            <span class="text-emerald-300">{JSON.stringify(props.expected)}</span>
          </div>
          <div class="rounded bg-black/30 px-3 py-1.5">
            <span class="text-neutral-500 text-xs block mb-0.5">received</span>
            <span class="text-red-300">{JSON.stringify(actual())}</span>
          </div>
        </div>
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TestSuite — renders one TestSet<T>
// ---------------------------------------------------------------------------

type TestSuiteProps<T extends (...args: any[]) => any> = {
  suite: TestSet<T>;
};

/**
 * Renders a visual test suite for a single typed function.
 * Accepts any `TestSet<T>` — works for functions of any arity and return type.
 *
 * @example
 * <TestSuite suite={addTests} />
 */
function TestSuite<T extends (...args: any[]) => any>(
  props: TestSuiteProps<T>
) {
  const results = createMemo(() =>
    props.suite.cases.map((c) => ({
      ...c,
      passed: props.suite.func(...(c.params as any[])) === c.expected,
    }))
  );

  const passCount = createMemo(() => results().filter((r) => r.passed).length);
  const total = () => props.suite.cases.length;
  const allPassed = () => passCount() === total();

  return (
    <section class="rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur overflow-hidden">
      {/* Suite header */}
      <div class="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900/80">
        <div class="flex items-center gap-3">
          <span class="font-mono text-base font-semibold text-neutral-100">
            {props.suite.label ?? props.suite.func.name}
          </span>
          <span class="text-neutral-600 text-xs font-mono">
            {props.suite.func.length === 0
              ? '()'
              : `(${Array.from({ length: props.suite.func.length }, (_, i) =>
                  `arg${i}`
                ).join(', ')})`}
          </span>
        </div>

        {/* Pass/fail pill */}
        <span
          class={[
            'font-mono text-sm font-medium px-3 py-0.5 rounded-full',
            allPassed()
              ? 'text-emerald-300 bg-emerald-900/50'
              : 'text-red-300 bg-red-900/50',
          ].join(' ')}
        >
          {passCount()} / {total()} passed
        </span>
      </div>

      {/* Test cases */}
      <div class="flex flex-col gap-2 p-4">
        <For each={props.suite.cases}>
          {(c, i) => (
            <TestCaseRow
              func={props.suite.func}
              params={c.params}
              expected={c.expected}
              index={i()}
              label={c.label}
            />
          )}
        </For>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TestRunner — renders multiple suites at once
// ---------------------------------------------------------------------------

type TestRunnerProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suites: TestSet<any>[];
  title?: string;
};

/**
 * Renders an ordered list of `TestSuite` panels with a global summary header.
 *
 * @example
 * <TestRunner suites={[addTests, subTests, mulTests]} title="Math utils" />
 */
export const TestRunner: Component<TestRunnerProps> = (props) => {
  const totals = createMemo(() => {
    let pass = 0;
    let total = 0;
    for (const suite of props.suites) {
      for (const c of suite.cases) {
        total++;
        if (suite.func(...(c.params as any[])) === c.expected) pass++;
      }
    }
    return { pass, total };
  });

  const allPassed = () => totals().pass === totals().total;

  return (
    <div class="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-sans">
      {/* Global header */}
      <header class="mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-neutral-100 mb-1">
          {props.title ?? 'Test Runner'}
        </h1>
        <p
          class={[
            'font-mono text-sm',
            allPassed() ? 'text-emerald-400' : 'text-red-400',
          ].join(' ')}
        >
          {allPassed() ? '● All tests passed' : '● Some tests failed'}&nbsp;·&nbsp;
          {totals().pass}/{totals().total} total
        </p>
      </header>

      {/* Suite list */}
      <div class="flex flex-col gap-6 max-w-2xl">
        <For each={props.suites}>
          {(suite) => <TestSuite suite={suite} />}
        </For>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const addTests: TestSet<typeof add> = {
  func: add,
  label: 'Addition',
  cases: [
    { params: [1, 2], expected: 3 },
    { params: [2, 3], expected: 5 },
    { params: [3, 4], expected: 7 },
    { params: [2, 2], expected: 4 },
  ],
};

const App: Component = () => {
  return <TestRunner suites={[addTests]} title="Function Test Runner" />;
};

export default App;
