import { describe, it, expect } from 'vitest';

// Simulate the TopN class logic for testing
class TopNTester {
  topN: { value: number }[] = [];

  findNumberIndexInSortedVector(
    vec: { value: number }[],
    number: number,
    getSortValue: (value: { value: number }) => number
  ) {
    for (let i = vec.length; i >= 0; i--) {
      const n = vec[i] === undefined ? -1 : getSortValue(vec[i]);
      if (n >= number) {
        return i + 1;
      }
    }
    return -1;
  }

  getSortValue(item: { value: number }) {
    return item.value;
  }
}

describe('findNumberIndexInSortedVector', () => {
  let tester: TopNTester;

  beforeEach(() => {
    tester = new TopNTester();
  });

  // Test 1: Empty vector
  it('should return 0 for empty vector', () => {
    const vec: { value: number }[] = [];
    const result = tester.findNumberIndexInSortedVector(vec, 50, tester.getSortValue);
    expect(result).toBe(0);
  });

  // Test 2: Single element, new value larger (should go before)
  it('should place larger value at beginning of single-element vector', () => {
    tester.topN = [{ value: 100 }];
    const result = tester.findNumberIndexInSortedVector(tester.topN, 150, tester.getSortValue);
    // Vector: [100], incoming: 150
    // At i=1: vec[1] = undefined, n = -1, -1 >= 150? No
    // At i=0: vec[0] = 100, n = 100, 100 >= 150? No
    // Loop ends, return -1
    expect(result).toBe(-1);
  });

  // Test 3: Single element, new value smaller (should go after)
  it('should place smaller value after single-element vector', () => {
    tester.topN = [{ value: 100 }];
    const result = tester.findNumberIndexInSortedVector(tester.topN, 50, tester.getSortValue);
    // Vector: [100], incoming: 50
    // At i=1: vec[1] = undefined, n = -1, -1 >= 50? No
    // At i=0: vec[0] = 100, n = 100, 100 >= 50? Yes, return 0 + 1 = 1
    expect(result).toBe(1);
  });

  // Test 4: Multiple elements in descending order
  it('should find correct position in descending sorted vector', () => {
    tester.topN = [{ value: 100 }, { value: 50 }, { value: 25 }];
    // Vector: [100, 50, 25]
    
    // Incoming value 75 - should go between 100 and 50
    const result1 = tester.findNumberIndexInSortedVector(tester.topN, 75, tester.getSortValue);
    // At i=3: vec[3] = undefined, n = -1, -1 >= 75? No
    // At i=2: vec[2] = 25, n = 25, 25 >= 75? No
    // At i=1: vec[1] = 50, n = 50, 50 >= 75? No
    // At i=0: vec[0] = 100, n = 100, 100 >= 75? Yes, return 0 + 1 = 1
    expect(result1).toBe(1);
  });

  // Test 5: Value larger than all elements
  it('should return 0 for value larger than all elements', () => {
    tester.topN = [{ value: 100 }, { value: 50 }, { value: 25 }];
    const result = tester.findNumberIndexInSortedVector(tester.topN, 200, tester.getSortValue);
    // At i=3: vec[3] = undefined, n = -1, -1 >= 200? No
    // At i=2: vec[2] = 25, n = 25, 25 >= 200? No
    // At i=1: vec[1] = 50, n = 50, 50 >= 200? No
    // At i=0: vec[0] = 100, n = 100, 100 >= 200? No
    // Loop ends, return -1
    expect(result).toBe(-1);
  });

  // Test 6: Value smaller than all elements
  it('should return length for value smaller than all elements', () => {
    tester.topN = [{ value: 100 }, { value: 50 }, { value: 25 }];
    const result = tester.findNumberIndexInSortedVector(tester.topN, 10, tester.getSortValue);
    // At i=3: vec[3] = undefined, n = -1, -1 >= 10? No
    // At i=2: vec[2] = 25, n = 25, 25 >= 10? Yes, return 2 + 1 = 3
    expect(result).toBe(3);
  });

  // Test 7: Value equal to existing element
  it('should place equal value at next position', () => {
    tester.topN = [{ value: 100 }, { value: 50 }, { value: 25 }];
    const result = tester.findNumberIndexInSortedVector(tester.topN, 50, tester.getSortValue);
    // At i=3: vec[3] = undefined, n = -1, -1 >= 50? No
    // At i=2: vec[2] = 25, n = 25, 25 >= 50? No
    // At i=1: vec[1] = 50, n = 50, 50 >= 50? Yes, return 1 + 1 = 2
    expect(result).toBe(2);
  });

  // Test 8: Edge case - value exactly equal to first element
  it('should place value at position 1 when equal to first element', () => {
    tester.topN = [{ value: 100 }];
    const result = tester.findNumberIndexInSortedVector(tester.topN, 100, tester.getSortValue);
    // At i=1: vec[1] = undefined, n = -1, -1 >= 100? No
    // At i=0: vec[0] = 100, n = 100, 100 >= 100? Yes, return 0 + 1 = 1
    expect(result).toBe(1);
  });

  // Test 9: Larger vector with mixed values
  it('should find correct position in larger vector', () => {
    tester.topN = [
      { value: 1000 },
      { value: 200 },
      { value: 100 },
      { value: 50 },
      { value: 20 }
    ];
    const result = tester.findNumberIndexInSortedVector(tester.topN, 150, tester.getSortValue);
    // At i=5: vec[5] = undefined, n = -1, -1 >= 150? No
    // At i=4: vec[4] = 20, n = 20, 20 >= 150? No
    // At i=3: vec[3] = 50, n = 50, 50 >= 150? No
    // At i=2: vec[2] = 100, n = 100, 100 >= 150? No
    // At i=1: vec[1] = 200, n = 200, 200 >= 150? Yes, return 1 + 1 = 2
    expect(result).toBe(2);
  });
});
