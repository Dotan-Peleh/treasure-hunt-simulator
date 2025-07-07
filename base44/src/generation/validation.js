// validation.js
// Reachability validation & automatic repair for board layouts.
// Exported as a pure function: takes a 2-D grid of strings, returns a validated (mutated) grid.

export function validateAndRepairLayout(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = new Set();
  const queue = [];

  // 1. Seed BFS with all start tiles.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 'start') {
        const key = `${r},${c}`;
        visited.add(key);
        queue.push({ r, c });
      }
    }
  }

  // 2. Standard BFS (4-dir) ignoring rocks.
  let head = 0;
  const dirs = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
    { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
  ];
  while (head < queue.length) {
    const { r, c } = queue[head++];
    for (const { dr, dc } of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === 'rock') continue;
      const key = `${nr},${nc}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ r: nr, c: nc });
      }
    }
  }

  // 3. Find unreachable but important tiles.
  const unreachable = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      const t = grid[r][c];
      if ((t.startsWith('path') || t === 'key' || t === 'bridge') && !visited.has(key)) {
        unreachable.push({ r, c });
      }
    }
  }

  // 4. Repair by turning adjacent blocking rocks into bridges.
  if (unreachable.length > 0) {
    for (const tile of unreachable) {
      const neighbors = dirs.map(({ dr, dc }) => ({ r: tile.r + dr, c: tile.c + dc }));
      for (const { r: nr, c: nc } of neighbors) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (grid[nr][nc] !== 'rock') continue;
        // check if rock touches visited area
        const around = dirs.map(({ dr, dc }) => `${nr + dr},${nc + dc}`);
        if (around.some(k => visited.has(k))) {
          grid[nr][nc] = 'bridge';
          // recurse after mutation
          return validateAndRepairLayout(grid);
        }
      }
    }
  }

  return grid; // grid now guaranteed reachable
} 