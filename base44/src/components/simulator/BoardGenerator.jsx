import { LayoutManager } from './LayoutManager';
import { validateAndRepairLayout } from '@/generation/validation';
import { findAllPathsFromEntries } from '@/generation/pathAnalysis';

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

// (helpers now imported)

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

    // --- FAULTY START INJECTION ---
    const faultyStartCount = 1 + Math.floor(Math.random() * 2); // 1 or 2 faulty starts
    const potentialStartPoints = [];
    // Tiles just above the 3x2 start area
    for (let c = 0; c < 3; c++) potentialStartPoints.push({ r: 6, c }); 
    // Tiles to the right of the start area
    potentialStartPoints.push({ r: 7, c: 3 });
    potentialStartPoints.push({ r: 8, c: 3 });
    
    // Shuffle to pick random spots
    potentialStartPoints.sort(() => Math.random() - 0.5);

    let createdFaultyStarts = 0;
    for (const pos of potentialStartPoints) {
        if (createdFaultyStarts >= faultyStartCount) break;

        // Draw a short vertical branch upwards from the start area's perimeter
        const length = 1 + Math.floor(Math.random() * 2); // 1 or 2 tiles
        let canBuild = true;
        for(let i=0; i < length; i++) {
            const r = pos.r - i;
            if (r < 0 || grid[r][pos.c] !== 'rock') {
                canBuild = false;
                break;
            }
        }

        if (canBuild) {
            for(let i=0; i < length; i++) {
                // Assign to path1 so it's processed as a standard semi_locked tile
                grid[pos.r - i][pos.c] = 'path1';
            }
            createdFaultyStarts++;
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
        grid = layoutManager.generateLayout(pathCount, config.pathPattern);
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

    // --- ENFORCE EXACTLY 8 FREE TILES (excluding start tiles) ---
    const collectTilesOfType = (type) => {
        const arr=[];
        for(let r=0;r<rows;r++){
          for(let c=0;c<cols;c++) if(grid[r][c]===type) arr.push({r,c});
        }
        return arr;
    };

    const isStartArea = (r,c) => (r>=7 && r<=8 && c>=0 && c<=2);

    // Force exactly two extra free tiles adjacent: (row 7,col3) and (row8,col3)
    // Always override whatever is currently in those cells to ensure we have 8 contiguous free tiles.
    const extraCoords = [ {r:7,c:3}, {r:8,c:3} ];
    extraCoords.forEach(({r,c})=>{ grid[r][c]='free'; });

    // Remove any other accidental free tiles outside start area and extras
    collectTilesOfType('free').forEach(({r,c})=>{
        if(isStartArea(r,c)) return;
        if(!extraCoords.some(ec=>ec.r===r&&ec.c===c)){
            grid[r][c]='rock';
        }
    });

    // Final pass to ensure all non-path, non-start tiles are rocks
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const type = grid[r][c];
            if (type !== 'start' && type !== 'free' && !type.startsWith('path') && !type.startsWith('generator') && type !== 'key' && type !== 'bridge') {
                grid[r][c] = 'rock';
            }
        }
    }

    const tiles = [];
    
    // Ensure we have the 3 standard chains with correct levels
    const orangeChain = item_chains.find(c => c.color === 'orange') || { chain_name: 'Energy Cell', levels: 12, color: 'orange' };
    const blueChain = item_chains.find(c => c.color === 'blue') || { chain_name: 'Data Chip', levels: 8, color: 'blue' };
    const greenChain = item_chains.find(c => c.color === 'green') || { chain_name: 'Bio Fuel', levels: 10, color: 'green' };
    
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
                tile = createTile(r + 1, c + 1, 'free', true, { type: 'generator', chains: [blueChain, orangeChain], isStart: true });
                tile.discovered = true;
            } else if (cellType === 'generator_green') {
                tile = createTile(r + 1, c + 1, 'free', true, { type: 'generator', chains: [greenChain], isStart: true });
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
        
        let prevLevel = 2;

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

            // Ensure level does not decrease compared to previous tile
            level = Math.max(level, prevLevel);

            // Ensure level doesn't exceed chain maximum
            level = Math.min(level, selectedChain.levels - 1);
            // Ensure level is at least 2
            level = Math.max(level, 2);

            prevLevel = level;
            
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
    
    const nonEmptyPaths = pathTiles.filter(p => p.length > 0);

    nonEmptyPaths.forEach(path => createBalancedProgression(path, tiles));
    createBalancedProgression(bridgeTiles, tiles);

    // ---------------- AUTO BALANCE ACROSS PATHS -----------------
    const getTileObj = (r,c) => tiles.find(t=>t.row===r+1 && t.col===c+1);
    const stepCost = lvl => Math.pow(2, lvl-1);

    const computePathCosts = () => {
        return nonEmptyPaths.map(p => {
            return p.reduce((sum, tile)=>{
                const obj=getTileObj(tile.r,tile.c);
                return sum + (obj?.required_item_level ? stepCost(obj.required_item_level):0);
            },0);
        });
    };

    let pathCostsBal = computePathCosts();
    let iterationsBal = 0;
    while (pathCostsBal.length>1) {
        const avg = pathCostsBal.reduce((a,b)=>a+b,0)/pathCostsBal.length;
        const maxDiff = Math.max(...pathCostsBal.map(c=>Math.abs(c-avg)));
        if (avg===0 || (maxDiff/avg)*100 <= 15 || iterationsBal>300) break;

        // Identify highest and lowest cost paths
        let maxIdx=0,minIdx=0;
        pathCostsBal.forEach((c,idx)=>{if(c>pathCostsBal[maxIdx])maxIdx=idx;if(c<pathCostsBal[minIdx])minIdx=idx;});

        const adjustPath = (idx, direction) => { // direction: -1 lower, +1 raise
            const path = nonEmptyPaths[idx];
            if(!path) return false;
            // sort tiles by level desc/asc depending direction
            const tilesSorted = [...path].sort((a,b)=>{
                const la=getTileObj(a.r,a.c)?.required_item_level||0;
                const lb=getTileObj(b.r,b.c)?.required_item_level||0;
                return direction===-1?lb-la:la-lb;
            });
            for(const tileRef of tilesSorted){
                const obj=getTileObj(tileRef.r,tileRef.c);
                if(!obj||!obj.required_item_level) continue;
                const newLevel = Math.min(12, Math.max(2, obj.required_item_level + direction));
                if(newLevel===obj.required_item_level) continue;
                // apply
                const prevCost = stepCost(obj.required_item_level);
                obj.required_item_level=newLevel;
                if(obj.required_item_name){
                    const parts=obj.required_item_name.split(' L');
                    obj.required_item_name=`${parts[0]} L${newLevel}`;
                }
                const newCost = stepCost(newLevel);
                pathCostsBal[idx]+= (newCost-prevCost);
                return true;
            }
            return false;
        };

        if(pathCostsBal[maxIdx]-avg > avg - pathCostsBal[minIdx]){
            // Lower highest path one step
            adjustPath(maxIdx,-1);
        }else{
            // Raise lowest path
            adjustPath(minIdx,+1);
        }
        iterationsBal++;
    }

    // Determine and flag the true entry tile for each path: the tile farthest from the key (bottom-/left-/right-most depending on path shape).
    const usedEntryColumns = new Set();
    nonEmptyPaths.forEach(path => {
        if (path.length === 0) return;

        // Choose the entry tile (bottom-most, tie-breakers by path side)
        const maxRow = Math.max(...path.map(t => t.r));
        const bottomTiles = path.filter(t => t.r === maxRow);
        let entry;
        if (bottomTiles.length === 1) {
            entry = bottomTiles[0];
        } else {
            const avgCol = path.reduce((sum, t) => sum + t.c, 0) / path.length;
            if (avgCol <= (cols - 1) / 2) {
                entry = bottomTiles.reduce((prev, curr) => (curr.c < prev.c ? curr : prev));
            } else {
                entry = bottomTiles.reduce((prev, curr) => (curr.c > prev.c ? curr : prev));
            }
        }

        // Enforce unique column per entry flag to avoid stacked flags.
        if (usedEntryColumns.has(entry.c)) return;
        usedEntryColumns.add(entry.c);

        const tileInBoard = tiles.find(t => t.row === entry.r + 1 && t.col === entry.c + 1);
        if (tileInBoard) {
            tileInBoard.discovered = true;
            tileInBoard.isEntryPoint = true;
        }
    });

    const totalPathTiles = nonEmptyPaths.reduce((sum, path) => sum + path.length, 0) + bridgeTiles.length;
    
    // Pass the grid explicitly to the pathfinder.
    let { all_paths } = findAllPathsFromEntries(grid, tiles);

    // NEW: Consolidate forked paths from a single entry point.
    // If we have exactly two paths and they share a start tile, it implies a main route
    // and a single-detour route. We merge these into one "completionist" path representing
    // the cost of clearing both the main path and the dead-end branch.
    if (all_paths.length === 2 && all_paths[0].path[0] === all_paths[1].path[0]) {
        // The path with more steps is the one that includes the detour.
        const supersetPath = all_paths[0].path.length > all_paths[1].path.length
            ? all_paths[0]
            : all_paths[1];
        all_paths = [supersetPath];
    }

    const reachableEntries = new Set(all_paths.map(p => p.path[0]));
    tiles.forEach(t => {
        if (t.isEntryPoint && !reachableEntries.has(`${t.row-1},${t.col-1}`)) {
            t.isEntryPoint = false; // Change to false instead of deleting
        }
    });

    // Ensure at least one entry point exists and is reachable
    if (!tiles.some(t => t.isEntryPoint)) {
        // Attempt to flag the bottom-most tile of the first existing path as the entry.
        if (nonEmptyPaths.length > 0) {
            const path0 = nonEmptyPaths[0];
            // Bottom-most = highest row index
            const maxRow = Math.max(...path0.map(t => t.r));
            const bottomTiles = path0.filter(t => t.r === maxRow);
            const chosen = bottomTiles[0];
            const fallback = tiles.find(t => t.row === chosen.r + 1 && t.col === chosen.c + 1);
            if (fallback) {
                fallback.isEntryPoint = true;
                fallback.discovered = true;
            }
        }
    }
    const pathCosts = all_paths.map(p => p.cost);

    const avgCost = pathCosts.length > 0 ? pathCosts.reduce((a, b) => a + b, 0) / pathCosts.length : 0;
    const maxDiff = pathCosts.length > 0 ? Math.max(...pathCosts.map(c => Math.abs(c - avgCost))) : 0;
    const costVariancePercent = avgCost > 0 ? (maxDiff / avgCost) * 100 : 0;

    const analysis = {
        path_costs: pathCosts.map(cost => Math.ceil(cost)),
        cost_variance: costVariancePercent,
        balanced_costs: costVariancePercent <= 15,
        shortest_path: pathCosts.length > 0 ? Math.ceil(Math.min(...pathCosts)) : 0,
        longest_path: pathCosts.length > 0 ? Math.ceil(Math.max(...pathCosts)) : 0,
        average_path: pathCosts.length > 0 ? pathCosts.reduce((a, b) => a + b, 0) / pathCosts.length : 0,
        all_paths: all_paths,
        key_cost: 0,
        milestones: milestones,
        total_path_tiles: totalPathTiles,
        path_info: {
            path_count: all_paths.length,
            path_tiles: nonEmptyPaths.map(p => p.length),
            bridge_tiles: bridgeTiles.length,
            has_connection: bridgeTiles.length > 0
        }
    };

    return { tiles, analysis };
};