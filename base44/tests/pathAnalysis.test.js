import { describe, it, expect } from 'vitest';
import { findAllPathsFromEntries } from '@/generation/pathAnalysis';

const buildTile = (row, col, opts = {}) => ({
  id: `t-${row}-${col}`,
  row, col,
  tile_type: opts.type || 'semi_locked',
  unlocked: false,
  discovered: false,
  ...opts,
});

describe('findAllPathsFromEntries', () => {
  it('returns single path with correct cost', () => {
    /* 3×3 grid
       R K R
       R P R
       S P R  (entry at 3,2 row index 2 col1)
    */
    const grid = [
      ['rock','key','rock'],
      ['rock','path1','rock'],
      ['start','path1','rock'],
    ];

    const tiles = [
      buildTile(1,2,{ tile_type:'key', discovered:true}),
      buildTile(2,2,{ isEntryPoint:false }),
      buildTile(3,1,{ tile_type:'start', unlocked:true, discovered:true }),
      buildTile(3,2,{ isEntryPoint:true, required_item_level:2 }),
    ];

    const { all_paths } = findAllPathsFromEntries(grid, tiles);
    expect(all_paths.length).toBe(1);
    expect(all_paths[0].cost).toBe(2); // 2^(2-1)
  });
}); 