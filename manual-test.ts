// Manual test runner for Observable integration tests
// Run with: npx tsx tests/manual-test.ts

import { Table } from '../src/observables.ts';

type Person = {
  name: string;
  age: number;
  id: number;
};

type Todo = {
  name: string;
  completed: boolean;
  person_id: number;
};

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
  } else {
    console.log(`✓ PASS: ${message}`);
    testsPassed++;
  }
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`\n✓ ${name}`);
  } catch (e) {
    console.error(`\n❌ ${name}: ${e}`);
    testsFailed++;
  }
}

console.log('=== Observable Integration Tests ===\n');

// Test 1: TopN - Add and Remove
test('TopN: Add item and remove it completely', () => {
  const people = new Table<Person>();
  const topN = people.top(3, p => p.age);

  people.add({ name: 'Alice', age: 25, id: 1 });
  people.add({ name: 'Bob', age: 30, id: 2 });
  people.add({ name: 'Charlie', age: 20, id: 3 });

  let items = Array.from(topN.pull());
  assert(items.length === 3, 'Initial topN has 3 items');
  assert(items[0].name === 'Bob', 'Bob (30) is highest');

  people.remove({ name: 'Bob', age: 30, id: 2 });

  items = Array.from(topN.pull());
  assert(items.length === 2, 'After removing Bob, topN has 2 items');
  assert(items.every(p => p.name !== 'Bob'), 'Bob is completely gone');
  assert(items[0].name === 'Alice', 'Alice (25) is now highest');
});

// Test 2: TopN - Remove middle item maintains order
test('TopN: Remove middle item maintains correct order', () => {
  const people = new Table<Person>();
  const topN = people.top(5, p => p.age);

  people.add({ name: 'E', age: 50, id: 5 });
  people.add({ name: 'D', age: 40, id: 4 });
  people.add({ name: 'C', age: 30, id: 3 });
  people.add({ name: 'B', age: 20, id: 2 });
  people.add({ name: 'A', age: 10, id: 1 });

  people.remove({ name: 'C', age: 30, id: 3 });

  const items = Array.from(topN.pull());
  assert(items.length === 4, 'After removal, 4 items remain');
  assert(items.map(p => p.name).join(',') === 'E,D,B,A', 'Order is correct: E,D,B,A');
});

// Test 3: TopN - Add/Remove/Re-add cycle
test('TopN: Handle add/remove/re-add cycle', () => {
  const people = new Table<Person>();
  const topN = people.top(3, p => p.age);

  people.add({ name: 'Alice', age: 25, id: 1 });
  assert(Array.from(topN.pull()).length === 1, 'After first add: 1 item');

  people.remove({ name: 'Alice', age: 25, id: 1 });
  assert(Array.from(topN.pull()).length === 0, 'After remove: 0 items');

  people.add({ name: 'Alice', age: 25, id: 1 });
  const items = Array.from(topN.pull());
  assert(items.length === 1, 'After re-add: 1 item');
  assert(items[0].name === 'Alice', 'Item is Alice');
});

// Test 4: Joiner - Remove from first observable
test('Joiner: Remove join when item removed from first observable', () => {
  const people = new Table<Person>();
  const todos = new Table<Todo>();
  const joined = people.join_on(todos, p => p.id.toString(), t => t.person_id.toString());

  people.add({ name: 'Alice', age: 25, id: 1 });
  todos.add({ name: 'Task1', completed: false, person_id: 1 });

  let items = Array.from(joined.pull());
  assert(items.length === 1, 'Initial join has 1 item');
  assert(items[0][0].name === 'Alice', 'First element is Alice');

  people.remove({ name: 'Alice', age: 25, id: 1 });

  items = Array.from(joined.pull());
  assert(items.length === 0, 'After removing person, join is empty');
});

// Test 5: Joiner - Remove from second observable
test('Joiner: Remove join when item removed from second observable', () => {
  const people = new Table<Person>();
  const todos = new Table<Todo>();
  const joined = people.join_on(todos, p => p.id.toString(), t => t.person_id.toString());

  people.add({ name: 'Alice', age: 25, id: 1 });
  todos.add({ name: 'Task1', completed: false, person_id: 1 });

  let items = Array.from(joined.pull());
  assert(items.length === 1, 'Initial join has 1 item');

  todos.remove({ name: 'Task1', completed: false, person_id: 1 });

  items = Array.from(joined.pull());
  assert(items.length === 0, 'After removing todo, join is empty');
});

// Test 6: Joiner - Multiple joins and selective removal
test('Joiner: Handle multiple joins with selective removal', () => {
  const people = new Table<Person>();
  const todos = new Table<Todo>();
  const joined = people.join_on(todos, p => p.id.toString(), t => t.person_id.toString());

  people.add({ name: 'Alice', age: 25, id: 1 });
  people.add({ name: 'Bob', age: 30, id: 2 });
  todos.add({ name: 'Task1', completed: false, person_id: 1 });
  todos.add({ name: 'Task2', completed: false, person_id: 2 });

  let items = Array.from(joined.pull());
  assert(items.length === 2, 'Initial joins: 2 items');

  people.remove({ name: 'Alice', age: 25, id: 1 });

  items = Array.from(joined.pull());
  assert(items.length === 1, 'After removing Alice: 1 join remains');
  assert(items[0][0].name === 'Bob', 'Remaining join is Bob-Task2');
});

// Test 7: Mapped observable - Remove cascades through map
test('Map: Remove cascades through mapped observable', () => {
  const people = new Table<Person>();
  const doubled = people.map(p => ({ ...p, age: p.age * 2 }));

  people.add({ name: 'Alice', age: 25, id: 1 });
  people.add({ name: 'Bob', age: 30, id: 2 });

  let items = Array.from(doubled.pull());
  assert(items.length === 2, 'Mapped: 2 items');
  assert(items[0].age === 50, 'Alice age doubled to 50');

  people.remove({ name: 'Alice', age: 25, id: 1 });

  items = Array.from(doubled.pull());
  assert(items.length === 1, 'After removal: 1 item');
  assert(items[0].name === 'Bob', 'Bob remains');
  assert(items[0].age === 60, 'Bob age is 60');
});

// Test 8: Filtered observable - Remove cascades through filter
test('Filter: Remove cascades through filtered observable', () => {
  const people = new Table<Person>();
  const adults = people.where(p => p.age >= 25);

  people.add({ name: 'Alice', age: 25, id: 1 });
  people.add({ name: 'Charlie', age: 20, id: 3 });

  let items = Array.from(adults.pull());
  assert(items.length === 1, 'Filtered: 1 adult');

  people.remove({ name: 'Alice', age: 25, id: 1 });

  items = Array.from(adults.pull());
  assert(items.length === 0, 'After removal: 0 adults');
});

// Test 9: Index - Remove cascades through index
test('Index: Remove cascades through indexed observable', () => {
  const todos = new Table<Todo>();
  const todosByPersonId = todos.index_on(t => t.person_id.toString());

  todos.add({ name: 'Task1', completed: false, person_id: 1 });
  todos.add({ name: 'Task2', completed: false, person_id: 1 });
  todos.add({ name: 'Task3', completed: false, person_id: 2 });

  assert(Array.from(todosByPersonId.on('1').pull()).length === 2, 'Person 1: 2 tasks');
  assert(Array.from(todosByPersonId.on('2').pull()).length === 1, 'Person 2: 1 task');

  todos.remove({ name: 'Task1', completed: false, person_id: 1 });

  assert(Array.from(todosByPersonId.on('1').pull()).length === 1, 'After removal: 1 task for person 1');
  assert(Array.from(todosByPersonId.on('2').pull()).length === 1, 'Person 2: still 1 task');
});

// Test 10: Complex cascade - Map -> TopN
test('Complex: Cascade through map -> topN', () => {
  const people = new Table<Person>();
  const mapped = people.map(p => ({ name: p.name, value: p.age }));
  const topAges = mapped.top(2, p => p.value);

  people.add({ name: 'Alice', age: 30, id: 1 });
  people.add({ name: 'Bob', age: 25, id: 2 });
  people.add({ name: 'Charlie', age: 20, id: 3 });

  let items = Array.from(topAges.pull());
  assert(items.length === 2, 'TopN: 2 items');
  assert(items[0].name === 'Alice', 'Alice (30) is highest');

  people.remove({ name: 'Alice', age: 30, id: 1 });

  items = Array.from(topAges.pull());
  assert(items.length === 2, 'After removal: still 2 items');
  assert(items[0].name === 'Bob', 'Bob (25) is now highest');
  assert(items[1].name === 'Charlie', 'Charlie (20) is second');
});

// Test 11: Complex cascade - Filter -> Index
test('Complex: Cascade through filter -> index', () => {
  const people = new Table<Person>();
  const young = people.where(p => p.age < 30);
  const youngById = young.index_on(p => p.id.toString());

  people.add({ name: 'Alice', age: 25, id: 1 });
  people.add({ name: 'Bob', age: 35, id: 2 });
  people.add({ name: 'Charlie', age: 28, id: 3 });

  assert(Array.from(youngById.on('1').pull()).length === 1, 'Young by ID: Alice found');
  assert(Array.from(youngById.on('2').pull()).length === 0, 'Young by ID: Bob not found');

  people.remove({ name: 'Alice', age: 25, id: 1 });

  assert(Array.from(youngById.on('1').pull()).length === 0, 'After removal: Alice gone');
  assert(Array.from(youngById.on('3').pull()).length === 1, 'Charlie still there');
});

// Test 12: Multiple add/remove cycles
test('Complex: Multiple add/remove cycles', () => {
  const people = new Table<Person>();
  const topN = people.top(2, p => p.age);

  // Cycle 1
  people.add({ name: 'A', age: 10, id: 1 });
  assert(Array.from(topN.pull()).length === 1, 'Cycle 1: add');

  people.remove({ name: 'A', age: 10, id: 1 });
  assert(Array.from(topN.pull()).length === 0, 'Cycle 1: remove');

  // Cycle 2
  people.add({ name: 'B', age: 20, id: 2 });
  people.add({ name: 'C', age: 30, id: 3 });
  assert(Array.from(topN.pull()).length === 2, 'Cycle 2: add 2');

  people.remove({ name: 'C', age: 30, id: 3 });
  assert(Array.from(topN.pull()).length === 1, 'Cycle 2: remove 1');

  // Cycle 3
  people.add({ name: 'D', age: 40, id: 4 });
  people.add({ name: 'E', age: 25, id: 5 });
  assert(Array.from(topN.pull()).length === 2, 'Cycle 3: full again');

  const items = Array.from(topN.pull());
  assert(items[0].name === 'D', 'D (40) is highest');
  assert(items[1].name === 'B', 'B (20) is second');
});

console.log(`\n\n=== Test Summary ===`);
console.log(`✓ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

process.exit(testsFailed > 0 ? 1 : 0);
