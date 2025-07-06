/**
 * layout-definitions.js
 * 
 * This file serves as the single source of truth for board layout definitions.
 * It contains the list of all predefined layouts and the function to generate
 * the grid for a given layout ID. Centralizing this prevents circular dependencies
 * and makes the layout logic easier to maintain.
 */

// The 24 predefined board layouts
export const boardLayouts = [
    { id: 1, name: "1. Short vs Long (Connected)" },
    { id: 2, name: "2. The Crossroads (Connected)" },
    { id: 3, name: "3. High vs Low Risk (Independent)" },
    { id: 4, name: "4. The Funnel (Connected)" },
    { id: 5, name: "5. S-Curves vs Direct (Independent)" },
    { id: 6, name: "6. Island Hopping (Connected)" },
    { id: 7, name: "7. Outer Ring vs Center (Independent)" },
    { id: 8, name: "8. Central Pillar (Connected)" },
    { id: 9, name: "9. Braided Paths (Connected)" },
    { id: 10, name: "10. The Gauntlet (Independent)" },
    { id: 11, name: "11. Split Decision (Connected)" },
    { id: 12, name: "12. Mirrored Maze (Independent)" },
    { id: 13, name: "13. Asymmetric Flow (Connected)" },
    { id: 14, name: "14. The Spiral (Connected)" },
    { id: 15, name: "15. Edge Runner vs. Climber (Independent)" },
    { id: 16, name: "16. The Web (Connected)" },
    { id: 17, name: "17. The Y-Junction (Connected)" },
    { id: 18, name: "18. Parallel Highways (Independent)" },
    { id: 19, name: "19. The Bottleneck (Connected)" },
    { id: 20, name: "20. Zigzag Valley (Independent)" },
    { id: 21, name: "21. Double Helix (Connected)" },
    { id: 22, name: "22. Corner Routes (Independent)" },
    { id: 23, name: "23. The Hourglass (Connected)" },
    { id: 24, name: "24. Racing Lanes (Independent)" },
];

// Helper to draw a path on a grid
const drawPath = (grid, pathPoints, type) => {
    for (let i = 0; i < pathPoints.length - 1; i++) {
        let [r1, c1] = pathPoints[i];
        const [r2, c2] = pathPoints[i+1];

        while (r1 !== r2 || c1 !== c2) {
            if (r1 >= 0 && r1 < grid.length && c1 >= 0 && c1 < grid[0].length) {
                grid[r1][c1] = type;
            }
            if (r1 < r2) r1++;
            else if (r1 > r2) r1--;
            else if (c1 < c2) c1++;
            else if (c1 > c2) c1--;
        }
        if (r1 >= 0 && r1 < grid.length && c1 >= 0 && c1 < grid[0].length) {
            grid[r1][c1] = type;
        }
    }
    const [lastR, lastC] = pathPoints[pathPoints.length - 1];
    if (lastR >= 0 && lastR < grid.length && lastC >= 0 && lastC < grid[0].length) {
         grid[lastR][lastC] = type;
    }
};

// Generates the grid for a given layout ID
export const getLayoutGrid = (layoutId) => {
    const rows = 9;
    const cols = 7;
    const grid = Array(rows).fill(null).map(() => Array(cols).fill('rock'));
    const keyPos = [0, 6];

    switch(layoutId) {
        case 1:
            drawPath(grid, [[7,1], [5,1], [3,1], [2,3]], 'path1');
            drawPath(grid, [[7,3], [4,3], [2,3]], 'path2');
            drawPath(grid, [[2,3], [1,5], keyPos], 'bridge');
            break;
        case 2:
            drawPath(grid, [[7,1], [5,1], [4,2]], 'path1');
            drawPath(grid, [[7,3], [5,3], [4,2]], 'path2');
            drawPath(grid, [[4,2], [3,3], [2,4], [1,5], keyPos], 'bridge');
            break;
        case 3:
            drawPath(grid, [[7,1], [6,1], [5,1], [4,1], [3,1], [2,1], [1,2], [1,3], [1,4], [1,5], keyPos], 'path1');
            drawPath(grid, [[7,3], [4,4], [2,5], keyPos], 'path2');
            break;
        case 4:
            drawPath(grid, [[7,1], [5,1], [4,2]], 'path1');
            drawPath(grid, [[7,3], [5,3], [4,2]], 'path2');
            drawPath(grid, [[4,2], [2,4], keyPos], 'bridge');
            break;
        case 5:
            drawPath(grid, [[7,1], [6,1], [6,2], [5,2], [5,3], [4,3], [4,4], [3,4], [3,5], [2,5], [2,6], keyPos], 'path1');
            drawPath(grid, [[7,3], [5,4], [3,5], [1,5], keyPos], 'path2');
            break;
        case 6:
            drawPath(grid, [[7,1], [6,1]], 'path1');
            drawPath(grid, [[5,2], [4,2]], 'path1');
            drawPath(grid, [[7,3], [5,3]], 'path2');
            drawPath(grid, [[4,2], [3,4]], 'bridge');
            drawPath(grid, [[5,3], [3,4]], 'bridge');
            drawPath(grid, [[3,4], [2,5], keyPos], 'bridge');
            break;
        case 7:
            drawPath(grid, [[7,1], [6,0], [4,0], [2,0], [1,2], [1,4], keyPos], 'path1');
            drawPath(grid, [[7,3], [6,3], [4,3], [3,4], [2,5], keyPos], 'path2');
            break;
        case 8:
            grid[4][3]='rock'; grid[5][3]='rock';
            drawPath(grid, [[7,1], [5,1], [4,2], [3,2]], 'path1');
            drawPath(grid, [[7,5], [5,5], [4,4], [3,4]], 'path2');
            drawPath(grid, [[3,2], [2,3]], 'bridge');
            drawPath(grid, [[3,4], [2,3]], 'bridge');
            drawPath(grid, [[2,3], [1,4], keyPos], 'bridge');
            break;
        case 9:
             drawPath(grid, [[7,1], [6,2], [5,1], [4,2], [3,1], [2,2]], 'path1');
            drawPath(grid, [[7,3], [6,2], [5,3], [4,2], [3,3], [2,2]], 'path2');
            drawPath(grid, [[2,2], [1,4], keyPos], 'bridge');
            break;
        case 10:
            drawPath(grid, [[7,1], [6,1], [5,1], [4,1], [3,1], [2,1], [1,3], keyPos], 'path1');
            drawPath(grid, [[7,3], [6,3], [5,3], [4,3], [3,3], [2,3], [1,5], keyPos], 'path2');
            break;
        case 11:
            drawPath(grid, [[7,1], [6,1], [5,2], [4,1], [3,2]], 'path1');
            drawPath(grid, [[7,1], [6,2], [5,3], [4,4], [3,2]], 'path2');
            drawPath(grid, [[3,2], [2,4], keyPos], 'bridge');
            break;
        case 12:
            drawPath(grid, [[7,1], [6,2], [5,1], [4,2], [3,1], [2,2], [1,3], keyPos], 'path1');
            drawPath(grid, [[7,3], [7,4], [6,4], [5,5], [4,4], [3,5], [2,4], [1,5], keyPos], 'path2');
            break;
        case 13:
            drawPath(grid, [[7,1], [5,1], [3,1], [2,2]], 'path1');
            drawPath(grid, [[7,3], [6,4], [5,5], [4,4], [3,3], [2,2]], 'path2');
            drawPath(grid, [[2,2], [1,4], keyPos], 'bridge');
            break;
        case 14:
            drawPath(grid, [[7,1], [7,5], [2,5], [2,2], [5,2], [5,4], [3,4]], 'path1');
            drawPath(grid, [[8,3], [6,3], [3,4]], 'path2');
            drawPath(grid, [[3,4], [1,4], keyPos], 'bridge');
            break;
        case 15:
            drawPath(grid, [[7,0], [4,0], [4,1], [1,1], [1,5], keyPos], 'path1');
            drawPath(grid, [[7,3], [6,3], [4,3], [4,4], [2,4], [2,5], keyPos], 'path2');
            break;
        case 16:
            drawPath(grid, [[7,1], [5,1], [5,3], [3,3], [3,5]], 'path1');
            drawPath(grid, [[7,5], [5,5], [5,3], [3,3], [3,1]], 'path2');
            drawPath(grid, [[3,1], [1,3]], 'bridge');
            drawPath(grid, [[3,5], [1,3]], 'bridge');
            drawPath(grid, [[1,3], keyPos], 'bridge');
            break;
        case 17:
            drawPath(grid, [[7,1], [5,1], [4,2], [3,3]], 'path1');
            drawPath(grid, [[7,5], [5,5], [4,4], [3,3]], 'path2');
            drawPath(grid, [[3,3], [2,4], [1,5], keyPos], 'bridge');
            break;
        case 18:
            drawPath(grid, [[7,1], [6,1], [5,1], [4,1], [3,1], [2,1], [1,2], [1,4], keyPos], 'path1');
            drawPath(grid, [[7,3], [6,3], [5,3], [4,3], [3,3], [2,3], [1,5], keyPos], 'path2');
            break;
        case 19:
            drawPath(grid, [[7,1], [6,1], [5,2], [4,3]], 'path1');
            drawPath(grid, [[7,3], [7,5], [6,5], [5,4], [4,3]], 'path2');
            drawPath(grid, [[4,3], [3,3], [2,2], [1,3]], 'bridge');
            drawPath(grid, [[1,3], [1,4], keyPos], 'bridge');
            break;
        case 20:
            drawPath(grid, [[7,1], [6,2], [5,1], [4,2], [3,1], [2,2], [1,3], keyPos], 'path1');
            drawPath(grid, [[7,3], [7,4], [6,4], [5,5], [4,4], [3,5], [2,4], [1,5], keyPos], 'path2');
            break;
        case 21:
            drawPath(grid, [[7,1], [6,2], [5,3], [4,2], [3,1], [2,2]], 'path1');
            drawPath(grid, [[7,3], [6,4], [5,3], [4,4], [3,5], [2,4], [2,2]], 'path2');
            drawPath(grid, [[2,2], [1,3], [1,5], keyPos], 'bridge');
            break;
        case 22:
            drawPath(grid, [[7,0], [6,0], [5,0], [4,0], [3,0], [2,0], [1,0], [1,1], [1,2], [1,3], [1,4], [1,5], keyPos], 'path1');
            drawPath(grid, [[7,3], [8,3], [8,4], [8,5], [8,6], [7,6], [6,6], [5,6], [4,6], [3,6], [2,6], [1,6], keyPos], 'path2');
            break;
        case 23:
            drawPath(grid, [[7,1], [6,2], [5,3], [4,3]], 'path1');
            drawPath(grid, [[7,5], [6,4], [5,3], [4,3]], 'path2');
            drawPath(grid, [[4,3], [3,3], [2,2], [1,1]], 'bridge');
            drawPath(grid, [[3,3], [2,4], [1,5], keyPos], 'bridge');
            break;
        case 24:
            drawPath(grid, [[7,1], [6,2], [5,1], [4,1], [3,2], [2,3], [1,4], keyPos], 'path1');
            drawPath(grid, [[7,3], [7,4], [6,4], [5,5], [4,4], [3,4], [2,5], [1,5], keyPos], 'path2');
            break;
        default:
            drawPath(grid, [[7,1], [4,2], [2,4], keyPos], 'path1');
            drawPath(grid, [[7,3], [5,4], [3,5], [1,5], keyPos], 'path2');
            break;
    }
    return grid;
} 