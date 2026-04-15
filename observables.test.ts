import { describe, it, expect, beforeEach } from 'vitest';
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

describe('Observable Integration Tests', () => {
    
  let people: Table<Person>;
  let todos: Table<Todo>;

  beforeEach(() => {
    people = new Table<Person>();
    todos = new Table<Todo>();
  });

  describe('TopN - Add and Remove', () => {
    it('should add item to topN and then remove it completely', () => {
      const topN = people.top(3, p => p.age);
      
      people.add({ name: 'Alice', age: 25, id: 1 });
      people.add({ name: 'Bob', age: 30, id: 2 });
      people.add({ name: 'Charlie', age: 20, id: 3 });

      // Initial state
      const initial = Array.from(topN.pull());
      expect(initial.length).toBe(3);
      expect(initial[0].name).toBe('Bob'); // 30 is highest
      expect(initial[1].name).toBe('Alice'); // 25
      expect(initial[2].name).toBe('Charlie'); // 20

      // Remove the top item
      people.remove({ name: 'Bob', age: 30, id: 2 });

      // Bob should be gone
      const afterRemove = Array.from(topN.pull());
      expect(afterRemove.length).toBe(2);
      expect(afterRemove.every(p => p.name !== 'Bob')).toBe(true);
      expect(afterRemove[0].name).toBe('Alice'); // Now highest
      expect(afterRemove[1].name).toBe('Charlie');
    });

    it('should maintain correct order after removing middle item from topN', () => {
      const topN = people.top(5, p => p.age);

      people.add({ name: 'E', age: 50, id: 5 });
      people.add({ name: 'D', age: 40, id: 4 });
      people.add({ name: 'C', age: 30, id: 3 });
      people.add({ name: 'B', age: 20, id: 2 });
      people.add({ name: 'A', age: 10, id: 1 });

      let items = Array.from(topN.pull());
      expect(items.map(p => p.name)).toEqual(['E', 'D', 'C', 'B', 'A']);

      // Remove middle item
      people.remove({ name: 'C', age: 30, id: 3 });

      items = Array.from(topN.pull());
      expect(items.map(p => p.name)).toEqual(['E', 'D', 'B', 'A']);
      expect(items.length).toBe(4);
    });

    it('should not include item in topN if it was removed before reaching capacity', () => {
      const topN = people.top(2, p => p.age);

      people.add({ name: 'Alice', age: 25, id: 1 });
      people.add({ name: 'Bob', age: 30, id: 2 });

      let items = Array.from(topN.pull());
      expect(items.length).toBe(2);

      // Add a third person
      people.add({ name: 'Charlie', age: 20, id: 3 });
      
      // TopN is full, Charlie shouldn't be added (lowest value)
      items = Array.from(topN.pull());
      expect(items.length).toBe(2);
      expect(items.every(p => p.name !== 'Charlie')).toBe(true);

      // Remove Bob (middle value)
      people.remove({ name: 'Bob', age: 30, id: 2 });

      // Alice should still be there
      items = Array.from(topN.pull());
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Alice');
    });

    it('should handle adding item, removing it, and adding it back', () => {
      const topN = people.top(3, p => p.age);

      people.add({ name: 'Alice', age: 25, id: 1 });
      let items = Array.from(topN.pull());
      expect(items.length).toBe(1);

      people.remove({ name: 'Alice', age: 25, id: 1 });
      items = Array.from(topN.pull());
      expect(items.length).toBe(0);

      people.add({ name: 'Alice', age: 25, id: 1 });
      items = Array.from(topN.pull());
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Alice');
    });
  });

  describe('Joiner - Add and Remove', () => {
    it('should remove join when item is removed from first observable', () => {
      const joined = people.join_on(todos, p => p.id.toString(), t => t.person_id.toString());

      people.add({ name: 'Alice', age: 25, id: 1 });
      todos.add({ name: 'Task1', completed: false, person_id: 1 });

      let items = Array.from(joined.pull());
      expect(items.length).toBe(1);
      expect(items[0][0].name).toBe('Alice');
      expect(items[0][1].name).toBe('Task1');

      // Remove person
      people.remove({ name: 'Alice', age: 25, id: 1 });

      items = Array.from(joined.pull());
      expect(items.length).toBe(0);
    });

    it('should remove join when item is removed from second observable', () => {
      const joined = people.join_on(todos, p => p.id.toString(), t => t.person_id.toString());

      people.add({ name: 'Alice', age: 25, id: 1 });
      todos.add({ name: 'Task1', completed: false, person_id: 1 });

      let items = Array.from(joined.pull());
      expect(items.length).toBe(1);

      // Remove todo
      todos.remove({ name: 'Task1', completed: false, person_id: 1 });

      items = Array.from(joined.pull());
      expect(items.length).toBe(0);
    });

    it('should handle multiple joins and selective removal', () => {
      const joined = people.join_on(todos, p => p.id.toString(), t => t.person_id.toString());

      people.add({ name: 'Alice', age: 25, id: 1 });
      people.add({ name: 'Bob', age: 30, id: 2 });
      todos.add({ name: 'Task1', completed: false, person_id: 1 });
      todos.add({ name: 'Task2', completed: false, person_id: 2 });

      let items = Array.from(joined.pull());
      expect(items.length).toBe(2);

      // Remove Alice
      people.remove({ name: 'Alice', age: 25, id: 1 });

      items = Array.from(joined.pull());
      expect(items.length).toBe(1);
      expect(items[0][0].name).toBe('Bob');
      expect(items[0][1].name).toBe('Task2');
    });

    it('should maintain joins after add/remove cycle', () => {
      const joined = people.join_on(todos, p => p.id.toString(), t => t.person_id.toString());

      people.add({ name: 'Alice', age: 25, id: 1 });
      todos.add({ name: 'Task1', completed: false, person_id: 1 });

      let items = Array.from(joined.pull());
      expect(items.length).toBe(1);

      // Remove and re-add
      people.remove({ name: 'Alice', age: 25, id: 1 });
      items = Array.from(joined.pull());
      expect(items.length).toBe(0);

      people.add({ name: 'Alice', age: 25, id: 1 });
      items = Array.from(joined.pull());
      expect(items.length).toBe(1);
      expect(items[0][0].name).toBe('Alice');
    });
  });

  describe('Table - Add and Remove', () => {
    it('should add item to table with observers', () => {
      let addedItems: Person[] = [];
      const observer = people.map(p => {
        addedItems.push(p);
        return p;
      });

      people.add({ name: 'Alice', age: 25, id: 1 });

      const items = Array.from(observer.pull());
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Alice');
    });

    it('should remove item from table with mapped observers', () => {
      const doubled = people.map(p => ({ ...p, age: p.age * 2 }));

      people.add({ name: 'Alice', age: 25, id: 1 });
      people.add({ name: 'Bob', age: 30, id: 2 });

      let items = Array.from(doubled.pull());
      expect(items.length).toBe(2);
      expect(items[0].age).toBe(50);

      people.remove({ name: 'Alice', age: 25, id: 1 });

      items = Array.from(doubled.pull());
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Bob');
      expect(items[0].age).toBe(60);
    });

    it('should remove item from filtered observable', () => {
      const adults = people.where(p => p.age >= 25);

      people.add({ name: 'Alice', age: 25, id: 1 });
      people.add({ name: 'Charlie', age: 20, id: 3 });

      let items = Array.from(adults.pull());
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Alice');

      people.remove({ name: 'Alice', age: 25, id: 1 });

      items = Array.from(adults.pull());
      expect(items.length).toBe(0);
    });
  });

  describe('Index - Add and Remove', () => {
    it('should index items and remove them correctly', () => {
      const todosByPersonId = todos.index_on(t => t.person_id.toString());

      todos.add({ name: 'Task1', completed: false, person_id: 1 });
      todos.add({ name: 'Task2', completed: false, person_id: 1 });
      todos.add({ name: 'Task3', completed: false, person_id: 2 });

      let person1Tasks = Array.from(todosByPersonId.on('1').pull());
      expect(person1Tasks.length).toBe(2);

      todos.remove({ name: 'Task1', completed: false, person_id: 1 });

      person1Tasks = Array.from(todosByPersonId.on('1').pull());
      expect(person1Tasks.length).toBe(1);
      expect(person1Tasks[0].name).toBe('Task2');

      let person2Tasks = Array.from(todosByPersonId.on('2').pull());
      expect(person2Tasks.length).toBe(1);
      expect(person2Tasks[0].name).toBe('Task3');
    });
  });

  describe('Complex Cascading Operations', () => {
    it('should cascade remove through map -> topN', () => {
      const personNames = people.map(p => ({ name: p.name, value: p.age }));
      const topAges = personNames.top(2, p => p.value);

      people.add({ name: 'Alice', age: 30, id: 1 });
      people.add({ name: 'Bob', age: 25, id: 2 });
      people.add({ name: 'Charlie', age: 20, id: 3 });

      let items = Array.from(topAges.pull());
      expect(items.length).toBe(2);
      expect(items[0].name).toBe('Alice');

      people.remove({ name: 'Alice', age: 30, id: 1 });

      items = Array.from(topAges.pull());
      expect(items.length).toBe(2);
      expect(items[0].name).toBe('Bob');
      expect(items[1].name).toBe('Charlie');
    });

    it('should handle remove cascading through filter -> index', () => {
      const youngPeople = people.where(p => p.age < 30);
      const youngById = youngPeople.index_on(p => p.id.toString());

      people.add({ name: 'Alice', age: 25, id: 1 });
      people.add({ name: 'Bob', age: 35, id: 2 });
      people.add({ name: 'Charlie', age: 28, id: 3 });

      let young = Array.from(youngById.on('1').pull());
      expect(young.length).toBe(1);

      people.remove({ name: 'Alice', age: 25, id: 1 });

      young = Array.from(youngById.on('1').pull());
      expect(young.length).toBe(0);

      let charlie = Array.from(youngById.on('3').pull());
      expect(charlie.length).toBe(1);
    });

    it('should handle multiple add/remove cycles', () => {
      const topN = people.top(2, p => p.age);

      // First cycle
      people.add({ name: 'A', age: 10, id: 1 });
      expect(Array.from(topN.pull()).length).toBe(1);

      people.remove({ name: 'A', age: 10, id: 1 });
      expect(Array.from(topN.pull()).length).toBe(0);

      // Second cycle
      people.add({ name: 'B', age: 20, id: 2 });
      people.add({ name: 'C', age: 30, id: 3 });
      expect(Array.from(topN.pull()).length).toBe(2);

      people.remove({ name: 'C', age: 30, id: 3 });
      expect(Array.from(topN.pull()).length).toBe(1);

      // Third cycle
      people.add({ name: 'D', age: 40, id: 4 });
      people.add({ name: 'E', age: 25, id: 5 });
      expect(Array.from(topN.pull()).length).toBe(2);

      let items = Array.from(topN.pull());
      expect(items[0].name).toBe('D'); // 40
      expect(items[1].name).toBe('B'); // 20
    });
  });
});
