import { LayoutManager } from './LayoutManager';

const createTile = (row, col, tileType, unlocked = false, item = null, required_item = null) => {
    const tile = {
      id: `tile-${row}-${col}`,
      row,
      col,
      tile_type: tileType,
      unlocked: unlocked || tileType === 'free',
      item: item,
      discovered: false, // Default to false, discovery is handled by the main generator function
    };
    if (required_item) {
      tile.required_item_name = required_item.name;
      tile.required_item_level = required_item.level;
      tile.required_item_chain_color = required_item.chain_color;
    }
    return tile;
};

const generateItemForChain = (chain, level) => {
  if (!chain) return null;
  const name = `${chain.chain_name} L${level}`;
  return { 
    id: `req-${name}`, 
    name, 
    level, 
    chain_color: chain.color 
  };
};

const calculateStepCost = (level) => {
    return Math.pow(2, level - 1);
};

// Validates that all path and key tiles are reachable from the start area.
// If not, it attempts to repair the layout by converting blocking rocks into path tiles.
const validateAndRepairLayout = (grid) => {
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = new Set();
    const queue = [];

    // 1. Find all start tiles and add them to the queue
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 'start') {
                const key = `${r},${c}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({ r, c });
                }
            }
        }
    }

    // 2. Perform BFS to find all reachable tiles
    let head = 0;
    while (head < queue.length) {
        const { r, c } = queue[head++];
        const neighbors = [
            { r: r - 1, c: c }, { r: r + 1, c: c },
            { r: r, c: c - 1 }, { r: r, c: c + 1 }
        ];

        for (const neighbor of neighbors) {
            const { r: nr, c: nc } = neighbor;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                const key = `${nr},${nc}`;
                // We can traverse any tile that is NOT a rock.
                if (grid[nr][nc] !== 'rock' && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ r: nr, c: nc });
                }
            }
        }
    }

    // 3. Identify all unreachable but important tiles (paths and key)
    const unreachableImportantTiles = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const key = `${r},${c}`;
            const cellType = grid[r][c];
            if ((cellType.startsWith('path') || cellType === 'key' || cellType === 'bridge') && !visited.has(key)) {
                unreachableImportantTiles.push({ r, c });
            }
        }
    }

    // 4. Repair the grid by converting blocking rocks into path tiles
    if (unreachableImportantTiles.length > 0) {
        console.warn(`Repairing layout: Found ${unreachableImportantTiles.length} unreachable important tiles.`);
        for (const tile of unreachableImportantTiles) {
            // Find the nearest rock separating this tile from the visited area
            // This is a simplified heuristic: find an adjacent rock that has a visited neighbor.
            const neighbors = [
                { r: tile.r - 1, c: tile.c }, { r: tile.r + 1, c: tile.c },
                { r: tile.r, c: tile.c - 1 }, { r: tile.r, c: tile.c + 1 }
            ];
            let repaired = false;
            for (const neighbor of neighbors) {
                const { r: nr, c: nc } = neighbor;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 'rock') {
                    // Is this rock adjacent to the main visited area?
                    const rockNeighbors = [
                        { r: nr - 1, c: nc }, { r: nr + 1, c: nc },
                        { r: nr, c: nc - 1 }, { r: nr, c: nc + 1 }
                    ];
                    for (const rn of rockNeighbors) {
                        if (visited.has(`${rn.r},${rn.c}`)) {
                            // This rock is a bridge. Convert it.
                            // We'll make it a 'bridge' tile as a neutral connector.
                            grid[nr][nc] = 'bridge'; 
                            console.log(`Repaired by converting rock at (${nr},${nc}) to a bridge.`);
                            repaired = true;
                            break;
                        }
                    }
                }
                if (repaired) break;
            }
        }
        // After repairs, we need to re-run the validation to connect the new bridge.
        return validateAndRepairLayout(grid);
    }
    
    return grid; // Return the validated (and possibly repaired) grid
};

export const generateBoardLayout = (config) => {
    const { item_chains = [], milestones, customGrid, pathCount = 2, freeTileCount = 10 } = config; 
    const rows = 9;
    const cols = 7;
    
    // Start with a base grid. If a custom grid (e.g., a variation) is provided, use it.
    // Otherwise, create a fresh grid of rocks.
    let grid = customGrid || Array(rows).fill(null).map(() => Array(cols).fill('rock'));

    // --- BOARD SANITIZATION AND SETUP ---
    // This process now runs for ALL layouts, including custom ones, to ensure consistency.

    // 1. Create a standard 6-tile start area
    for (let r = 7; r < 9; r++) { // Two bottom rows
        for (let c = 0; c < 3; c++) { // First three columns
            grid[r][c] = 'start';
        }
    }

    // 2. Nuke all existing keys to ensure only one is placed.
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 'key') {
                grid[r][c] = 'rock'; // Replace rogue key with a rock
            }
        }
    }

    // 3. Randomize key position in the top row
    const keyCol = Math.floor(Math.random() * (cols - 2)) + 1;
    const keyPos = { r: 0, c: keyCol };
    grid[keyPos.r][keyPos.c] = 'key';

    // 4. If this is a NEW layout (no custom grid), generate paths procedurally.
    // Variations from customGrid have their paths already.
    if (!customGrid) {
        const layoutManager = new LayoutManager(grid, keyPos);
        grid = layoutManager.generateLayout(pathCount);
    }
    
    // 5. Run accessibility validation AFTER the start area and key have been defined
    grid = validateAndRepairLayout(grid);
    
    // 6. Place generators in fixed positions within the start area
    grid[8][0] = 'generator_mixed';
    grid[8][2] = 'generator_green';

    // Place extra free tiles by converting some rocks
    const rockTiles = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 'rock') {
                rockTiles.push({ r, c });
            }
        }
    }

    // Shuffle the rock tiles and pick the first N to convert
    rockTiles.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(freeTileCount, rockTiles.length); i++) {
        const tile = rockTiles[i];
        grid[tile.r][tile.c] = 'free';
    }

    // Final pass to ensure all non-path, non-start tiles are rocks
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const type = grid[r][c];
            if (type !== 'start' && !type.startsWith('path') && !type.startsWith('generator') && type !== 'key' && type !== 'bridge') {
                grid[r][c] = 'rock';
            }
        }
    }

    const tiles = [];
    
    // Ensure we have the 3 standard chains with correct levels
    const orangeChain = item_chains.find(c => c.color === 'orange') || { chain_name: 'Energy Cell', levels: 12, color: 'orange' };
    const blueChain = item_chains.find(c => c.color === 'blue') || { chain_name: 'Data Chip', levels: 8, color: 'blue' };
    const greenChain = item_chains.find(c => c.color === 'green') || { chain_name: 'Bio Fuel', levels: 10, color: 'green' };
    
    let bridgeCost = 0;
    
    // Collect all path tiles together for processing
    const pathTiles = [];
    for (let i = 1; i <= pathCount; i++) {
        pathTiles.push([]);
    }
    const bridgeTiles = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cellType = grid[r][c];
            if (cellType.startsWith('path')) {
                const pathIndex = parseInt(cellType.replace('path', ''), 10) - 1;
                if(pathTiles[pathIndex]) {
                    pathTiles[pathIndex].push({ r, c, cellType });
                }
            } else if (cellType === 'bridge') {
                bridgeTiles.push({ r, c, cellType });
            }
        }
    }

    // Now create the board tiles
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cellType = grid[r][c];
            let tile;

            if (cellType.startsWith('path') || cellType === 'bridge') {
                tile = createTile(r + 1, c + 1, 'semi_locked');
            } else if (cellType === 'start' || cellType === 'free') {
                tile = createTile(r + 1, c + 1, 'free', true);
                tile.discovered = true;
            } else if (cellType === 'generator_mixed') {
                tile = createTile(r + 1, c + 1, 'free', true, { type: 'generator', chains: [blueChain, orangeChain] });
                tile.discovered = true;
            } else if (cellType === 'generator_green') {
                tile = createTile(r + 1, c + 1, 'free', true, { type: 'generator', chains: [greenChain] });
                tile.discovered = true;
            } else if (cellType === 'key') {
                tile = createTile(r + 1, c + 1, 'key', false, null, null);
                tile.discovered = true; // The key should always be visible.
            } else { // All other cell types, including 'rock' and any unknowns
                tile = createTile(r + 1, c + 1, 'rock');
            }
            tiles.push(tile);
        }
    }
    
    // BALANCED PROGRESSION: Distribute costs with PROGRESSIVE DIFFICULTY
    const createBalancedProgression = (pathTiles, allBoardTiles) => {
        if (pathTiles.length === 0) return 0;
        
        let currentPathTotalCost = 0;
        // Sort tiles by distance from start (bottom-left) to provide progression
        // CRITICAL: Bottom tiles (higher row numbers) should be EASIER (lower levels)
        // Top tiles (lower row numbers) should be HARDER (higher levels)
        const sortedTiles = [...pathTiles].sort((a, b) => b.r - a.r); // Bottom to top
        const allChains = [orangeChain, blueChain, greenChain];
        
        // PROGRESSIVE DIFFICULTY SYSTEM
        // Bottom tiles (start of path): Level 1-2 (very accessible start)
        // Middle tiles: Level 2-4 (moderate) 
        // Top tiles (near key): Level 3-6 (harder)
        
        sortedTiles.forEach((pathTile, index) => {
            // Randomly select a chain for each tile to improve variance
            const selectedChain = allChains[Math.floor(Math.random() * allChains.length)];
            
            // PROGRESSIVE DIFFICULTY: Calculate level based on position in path
            const progressRatio = index / (sortedTiles.length - 1); // 0 at start, 1 at end
            
            let level;
            if (progressRatio <= 0.3) {
                // First 30% of path: Levels 2-3 (accessible, but not trivial)
                level = Math.floor(Math.random() * 2) + 2; // 2 or 3
            } else if (progressRatio <= 0.7) {
                // Middle 40% of path: Levels 3-5 (moderate challenge)
                level = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
            } else {
                // Final 30% of path: Levels 4-7 (significant challenge)
                level = Math.floor(Math.random() * 4) + 4; // 4, 5, 6, or 7
            }
            
            // Ensure level doesn't exceed chain maximum
            level = Math.min(level, selectedChain.levels - 1);
            // Ensure level is at least 2
            level = Math.max(level, 2);
            
            currentPathTotalCost += calculateStepCost(level);
            
            const required_item = generateItemForChain(selectedChain, level);
            const tileIndex = allBoardTiles.findIndex(t => t.row === pathTile.r + 1 && t.col === pathTile.c + 1);
            if (tileIndex !== -1) {
                // This replaces the placeholder 'semi_locked' tile with one containing the required item data.
                allBoardTiles[tileIndex] = createTile(pathTile.r + 1, pathTile.c + 1, 'semi_locked', false, null, required_item);
            }
        });
        return currentPathTotalCost;
    };
    
    const pathCosts = pathTiles.map(path => createBalancedProgression(path, tiles));
    bridgeCost = createBalancedProgression(bridgeTiles, tiles);

    // Discover the start of each path so the player knows where to go.
    pathTiles.forEach(path => {
        if (path.length === 0) return;

        // The start of a path is the tile with the highest row number (closest to the bottom).
        const pathStartTile = path.reduce((prev, curr) => (prev.r > curr.r ? prev : curr));

        // Find this tile in the main `tiles` array and set it to discovered.
        const tileToDiscover = tiles.find(t => t.row === pathStartTile.r + 1 && t.col === pathStartTile.c + 1);
        if (tileToDiscover) {
            tileToDiscover.discovered = true;
        }
    });

    const effectivePathCosts = pathCosts.map(c => c + bridgeCost);
    const totalPathTiles = pathTiles.reduce((sum, path) => sum + path.length, 0) + bridgeTiles.length;
    
    const analysis = {
        path_costs: effectivePathCosts.map(cost => Math.ceil(cost)),
        bridge_cost: Math.ceil(bridgeCost),
        cost_variance: effectivePathCosts.length > 1 ? Math.abs(Math.max(...effectivePathCosts) - Math.min(...effectivePathCosts)) : 0,
        shortest_path: effectivePathCosts.length > 0 ? Math.ceil(Math.min(...effectivePathCosts)) : 0,
        longest_path: effectivePathCosts.length > 0 ? Math.ceil(Math.max(...effectivePathCosts)) : 0,
        average_path: effectivePathCosts.length > 0 ? effectivePathCosts.reduce((a, b) => a + b, 0) / effectivePathCosts.length : 0,
        key_cost: 0,
        milestones: milestones,
        total_path_tiles: totalPathTiles,
        path_info: {
            path_count: pathCount,
            path_tiles: pathTiles.map(p => p.length),
            bridge_tiles: bridgeTiles.length,
            has_connection: bridgeTiles.length > 0
        }
    };

    return { tiles, analysis };
};