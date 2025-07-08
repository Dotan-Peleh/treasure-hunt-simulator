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

    generateLayout(pathCount = 2, pattern = 'random') {
        const pathConfigs = this.getPathConfigs(pathCount, pattern);
        
        pathConfigs.forEach((config, index) => {
            // Draw main path segment
            this.drawPath(config.start, config.end, `path${index + 1}`);
            // Immediately connect this path’s end-point to the key with neutral bridges
            this.drawPath(config.end, this.keyPos, 'bridge');
        });

        return this.grid;
    }

    getPathConfigs(pathCount, pattern) {
        const configs = [];
        const startCols = this.getEvenlySpacedCols(pathCount);

        if (pattern === 'y_junction' && pathCount >= 2) {
            const midPoint = {
                r: Math.floor(this.rows / 2) + (Math.random() < 0.5 ? -1 : 1),
                c: Math.floor(this.cols / 2) + (Math.random() < 0.5 ? -1 : 1)
            };
            // Two paths meet at midPoint, then one path from there to key
            // For Y-junctions, also start one row above the start area
            configs.push({ start: { r: this.rows - 3, c: startCols[0] }, end: midPoint });
            configs.push({ start: { r: this.rows - 3, c: startCols[startCols.length-1] }, end: midPoint });
            return configs;
        }

        for (let i = 0; i < pathCount; i++) {
            // Allow starts on row indices 6, 7, or 8 (labels 3, 2, 1).
            // If we start on rows 7 or 8 (the rows that contain the free cluster),
            // force the column to be outside that cluster (cols 0-3 are reserved).
            const rowCandidates = [this.rows - 3, this.rows - 2, this.rows - 1]; // 6,7,8
            let startRow = rowCandidates[Math.floor(Math.random() * rowCandidates.length)];
            let startCol = startCols[i];
            if (startRow >= this.rows - 2 && startCol <= 3) {
                // Bump to the first safe column on the right side.
                startCol = 4 + (i % (this.cols - 4));
            }
            const endPoint = this.getRandomEndPoint();

            if (pattern === 'vertical_lanes') {
                endPoint.c = startCol; // End in same column as start
            } else if (pattern === 's_curves' && pathCount === 2) {
                // Mirrored start/end points for S-shape
                const endCol = this.cols - 1 - startCol;
                endPoint.c = endCol;
            }
            configs.push({ start: { r: startRow, c: startCol }, end: endPoint });
        }
        return configs;
    }

    getRandomEndPoint() {
        // A random end point in the top third of the board (but not the very top row)
        const row = Math.floor(Math.random() * (this.rows / 3)) + 1;
        const col = Math.floor(Math.random() * (this.cols));
        return { r: row, c: col };
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
        // Simple Manhattan-ish walk with slight randomness.
        let current = { ...start };

        while (current.r !== end.r || current.c !== end.c) {
            // Mark current cell (skip if start or key)
            if (this.grid[current.r][current.c] !== 'start' && this.grid[current.r][current.c] !== 'key') {
                this.grid[current.r][current.c] = type;
            }

            const moveR = Math.sign(end.r - current.r);
            const moveC = Math.sign(end.c - current.c);

            // 20% chance to add a sideways/vertical detour to create zig-zag shapes
            if (Math.random() < 0.2) {
                const sideMoves = [];
                if (current.c + 1 < this.cols && this.grid[current.r][current.c + 1] !== 'key') sideMoves.push({ dr: 0, dc: 1 });
                if (current.c - 1 >= 0 && this.grid[current.r][current.c - 1] !== 'key') sideMoves.push({ dr: 0, dc: -1 });
                if (current.r + 1 < this.rows && this.grid[current.r + 1][current.c] !== 'key') sideMoves.push({ dr: 1, dc: 0 });
                if (current.r - 1 >= 0 && this.grid[current.r - 1][current.c] !== 'key') sideMoves.push({ dr: -1, dc: 0 });
                if (sideMoves.length) {
                    const pick = sideMoves[Math.floor(Math.random() * sideMoves.length)];
                    current.r += pick.dr;
                    current.c += pick.dc;
                    continue; // skip normal move this iteration
                }
            }

            // Otherwise move toward the end point (Manhattan)
            if (moveR !== 0 && moveC !== 0) {
                if (Math.random() < 0.5) current.r += moveR; else current.c += moveC;
            } else if (moveR !== 0) {
                current.r += moveR;
            } else if (moveC !== 0) {
                current.c += moveC;
            }
        }

        // Write the end cell if it's not the key
        if (this.grid[end.r][end.c] !== 'key') {
            this.grid[end.r][end.c] = type;
        }

        return end;
    }
} 