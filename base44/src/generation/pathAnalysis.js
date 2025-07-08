// pathAnalysis.js
// Shortest-path analysis for each entry point. Returns { all_paths } array.

function calculateStepCost(level) {
  return Math.pow(2, level - 1);
}

export function findAllPathsFromEntries(grid, allTiles) {
  // Greedy "up-first" path calculation. For each entry point, march toward the key
  // choosing (1) up if possible, (2) left/right if blocked (preferring the side
  // closer to the key), and (3) down only if completely trapped. This mirrors
  // typical player behaviour and produces a single deterministic path per entry.

  const rows = grid.length;
  const cols = grid[0].length;

  // Map for quick tile lookup by "r,c".
  const tileMap = new Map(allTiles.map(t => [`${t.row - 1},${t.col - 1}`, t]));

  // Locate the key.
  let keyPos = null;
  for (let r = 0; r < rows && !keyPos; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 'key') {
        keyPos = { r, c };
        break;
      }
    }
  }
  if (!keyPos) return { all_paths: [] };

  const keyStr = `${keyPos.r},${keyPos.c}`;

  // Identify entry points flagged on tiles.
  const entries = [...tileMap.entries()]
    .filter(([, t]) => t.isEntryPoint)
    .map(([k]) => {
      const [r, c] = k.split(',').map(Number);
      return { r, c };
    });

  // Helper utilities.
  const stepCost = (r, c) => {
    const t = tileMap.get(`${r},${c}`);
    return t && t.required_item_level ? calculateStepCost(t.required_item_level) : 0;
  };

  const passable = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const t = grid[r][c];
    return t.startsWith('path') || t === 'bridge' || t === 'key';
  };

  const buildPath = (entry, opts) => {
    let { r, c } = entry;
    const path = [`${r},${c}`];
    let cost = stepCost(r, c);
    const visited = new Set(path);
    let safety = rows * cols;

    while (`${r},${c}` !== keyStr && safety-- > 0) {
      const candidates = [];

      // Attempt to move up first (row - 1).
      if (passable(r - 1, c) && !visited.has(`${r - 1},${c}`)) {
        candidates.push({ r: r - 1, c, priority: 0 });
      }

      // side moves
      if (passable(r, c - 1) && !visited.has(`${r},${c - 1}`)) {
        candidates.push({ r, c: c - 1, priority: 1 });
      }
      if (passable(r, c + 1) && !visited.has(`${r},${c + 1}`)) {
        candidates.push({ r, c: c + 1, priority: 1 });
      }

      // Optional down move (only considered if nothing else works)
      if (!candidates.length && passable(r + 1, c) && !visited.has(`${r + 1},${c}`)) {
        candidates.push({ r: r + 1, c, priority: 2 });
      }

      if (!candidates.length) {
        // We hit a dead-end; return what we have so far.
        return { path, cost, reachedKey: false };
      }

      // 10 % random noise override
      if (opts.noise && Math.random() < 0.10) {
        ({ r, c } = candidates[Math.floor(Math.random() * candidates.length)]);
      } else if (opts.costAware) {
        // Choose the candidate with the lowest step cost (preferring up on ties)
        candidates.sort((a, b) => {
          const costDiff = stepCost(a.r, a.c) - stepCost(b.r, b.c);
          if (costDiff !== 0) return costDiff;
          // tie-break: priority (up first), then distance to key column
          const prioDiff = a.priority - b.priority;
          if (prioDiff !== 0) return prioDiff;
          return Math.abs(a.c - keyPos.c) - Math.abs(b.c - keyPos.c);
        });
        ({ r, c } = candidates[0]);
      } else {
        // Original up-first behaviour: pick highest priority (up), else closer to key
        candidates.sort((a, b) => {
          const prioDiff = a.priority - b.priority;
          if (prioDiff !== 0) return prioDiff;
          return Math.abs(a.c - keyPos.c) - Math.abs(b.c - keyPos.c);
        });
        ({ r, c } = candidates[0]);
      }

      const coord = `${r},${c}`;
      path.push(coord);
      cost += stepCost(r, c);
      visited.add(coord);
    }

    // Reached key successfully
    return { path, cost, reachedKey: true };
  };

  const all_paths = [];
  const addPath = p => {
    if (!p) return;
    const k = p.path.join('|');
    if (!all_paths.some(existing => existing.path.join('|') === k)) {
      all_paths.push(p);
    }
  };

  const MAX_BRANCH_PATHS = 20;

  const exploreForks = (entry) => {
    const queue = [{ r: entry.r, c: entry.c, path: [`${entry.r},${entry.c}`], cost: stepCost(entry.r, entry.c), visited: new Set([`${entry.r},${entry.c}`]) }];
    let emitted = 0;

    while (queue.length && emitted < MAX_BRANCH_PATHS) {
      const node = queue.shift();
      if (node.path[node.path.length - 1] === keyStr) {
        addPath({ path: node.path, cost: node.cost, reachedKey: true });
        emitted++;
        continue;
      }

      // identical candidate generation to cost-aware mode, but without noise
      const { r, c } = node;
      const candidates = [];
      if (passable(r - 1, c) && !node.visited.has(`${r - 1},${c}`)) candidates.push({ r: r - 1, c, priority: 0 });
      if (passable(r, c - 1) && !node.visited.has(`${r},${c - 1}`)) candidates.push({ r, c: c - 1, priority: 1 });
      if (passable(r, c + 1) && !node.visited.has(`${r},${c + 1}`)) candidates.push({ r, c: c + 1, priority: 1 });
      if (!candidates.length && passable(r + 1, c) && !node.visited.has(`${r + 1},${c}`)) candidates.push({ r: r + 1, c, priority: 2 });

      candidates.sort((a, b) => {
        const costDiff = stepCost(a.r, a.c) - stepCost(b.r, b.c);
        if (costDiff !== 0) return costDiff;
        const prioDiff = a.priority - b.priority;
        if (prioDiff !== 0) return prioDiff;
        return Math.abs(a.c - keyPos.c) - Math.abs(b.c - keyPos.c);
      });

      for (const cand of candidates) {
        const coord = `${cand.r},${cand.c}`;
        const newVisited = new Set(node.visited);
        newVisited.add(coord);
        queue.push({
          r: cand.r,
          c: cand.c,
          path: [...node.path, coord],
          cost: node.cost + stepCost(cand.r, cand.c),
          visited: newVisited
        });
      }

      // If there are no further moves and we're stuck, record this dead-end path.
      if (!candidates.length) {
        addPath({ path: node.path, cost: node.cost, reachedKey: false });
        emitted++;
        continue;
      }
    }
  };

  for (const entry of entries) {
    // 1. Up-first deterministic path
    addPath(buildPath(entry, { costAware: false, noise: false }));

    // 2. Cost-aware path
    addPath(buildPath(entry, { costAware: true, noise: false }));

    // 3. Cost-aware with noise
    for (let i = 0; i < 3; i++) addPath(buildPath(entry, { costAware: true, noise: true }));

    // 4. Branch exploration at forks
    exploreForks(entry);
  }

  return { all_paths };
} 