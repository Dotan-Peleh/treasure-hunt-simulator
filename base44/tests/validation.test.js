import { describe, it, expect } from 'vitest';
import { validateAndRepairLayout } from '@/generation/validation';

// Helper to clone grid for safety
const clone = g => g.map(row => [...row]);

describe('validateAndRepairLayout', () => {
  it('converts blocking rock into bridge so path becomes reachable', () => {
    /*
      Grid legend (3×3 for brevity):
      R = rock, S = start, P = path1, K = key
      Row index reference (top=0):
        0: R K R
        1: R P R   (unreachable path tile)
        2: S R R
      The rock at (2,1) should turn into 'bridge'.
    */
    const grid = [
      ['rock', 'key', 'rock'],
      ['rock', 'path1', 'rock'],
      ['start', 'rock', 'rock'],
    ];

    const fixed = validateAndRepairLayout(clone(grid));
    expect(fixed[2][1]).toBe('bridge');
  });
}); 