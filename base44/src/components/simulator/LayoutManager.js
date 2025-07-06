/**
 * LayoutManager.js
 * 
 * This class procedurally generates board layouts with a variable number of paths.
 * It replaces the static, hardcoded layout definitions and provides a more flexible
 * and powerful way to create diverse and interesting board configurations.
 */
export class LayoutManager {
    constructor(grid, keyPos) {
        this.grid = grid;
        this.keyPos = keyPos;
        this.rows = grid.length;
        this.cols = grid[0].length;
    }

    generateLayout(pathCount = 2) {
        const pathConfigs = this.getPathConfigs(pathCount);
        
        pathConfigs.forEach((config, index) => {
            this.drawPath(config.start, config.end, `path${index + 1}`);
        });

        // The validation function in BoardGenerator will handle connecting these paths to the key.
        if (pathConfigs.length > 0) {
            const lastPath = pathConfigs[pathConfigs.length - 1];
            const finalApproachTile = this.drawPath(lastPath.end, this.keyPos, 'bridge');
            this.addDecoyRocks(finalApproachTile);
        }

        return this.grid;
    }

    getPathConfigs(pathCount) {
        const configs = [];
        const startCols = this.getEvenlySpacedCols(pathCount);

        for (let i = 0; i < pathCount; i++) {
            const startRow = (this.rows - 1) - Math.floor(Math.random() * 3);
            const endPoint = this.getRandomEndPoint();
            configs.push({
                start: { r: startRow, c: startCols[i] },
                end: endPoint,
            });
        }
        return configs;
    }

    getRandomEndPoint() {
        // A random end point in the top third of the board (but not the very top row)
        const row = Math.floor(Math.random() * (this.rows / 3)) + 1;
        const col = Math.floor(Math.random() * (this.cols));
        return { r: row, c: col };
    }

    addDecoyRocks(finalApproachTile) {
        if (!finalApproachTile) return;
        const { r, c } = finalApproachTile;
        for (let col = c + 1; col < this.cols; col++) {
            if (this.grid[r][col] !== 'key') {
                this.grid[r][col] = 'rock';
            }
        }
    }

    getEvenlySpacedCols(count, jitter = false) {
        const cols = [];
        const spacing = this.cols / (count + 1);
        for (let i = 1; i <= count; i++) {
            let col = Math.round(i * spacing);
            if (jitter) {
                col += Math.random() < 0.5 ? -1 : 1;
            }
            cols.push(Math.max(0, Math.min(this.cols - 1, col)));
        }
        return cols;
    }

    drawPath(start, end, type) {
        // This is a simplified path drawing algorithm.
        // A* or other pathfinding would be more robust but is more complex.
        let current = { ...start };

        while (current.r !== end.r || current.c !== end.c) {
            if(this.grid[current.r][current.c] !== 'start') {
                this.grid[current.r][current.c] = type;
            }

            const moveR = Math.sign(end.r - current.r);
            const moveC = Math.sign(end.c - current.c);

            const nextR = current.r + moveR;
            const nextC = current.c + moveC;

            // Prevent path from immediately overwriting itself
            if(nextR === end.r && nextC === end.c) {
                // We have arrived next to the destination, so we can stop.
                break;
            }

            // Randomly decide whether to move horizontally or vertically first
            if (Math.random() < 0.5 && current.r !== end.r) {
                current.r += moveR;
            } else if (current.c !== end.c) {
                current.c += moveC;
            } else if (current.r !== end.r) {
                current.r += moveR;
            }
        }
        // DO NOT OVERWRITE THE END TILE
        return current;
    }
} 