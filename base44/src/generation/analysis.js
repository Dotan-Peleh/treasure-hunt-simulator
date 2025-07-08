// src/generation/analysis.js

import { findAllPathsFromEntries } from './pathAnalysis';

const calculateBalanceScore = (analysis) => {
    let score = 100;
    const costVariancePenalty = Math.min(analysis.cost_variance / 10, 30);
    score -= costVariancePenalty;

    const pathLengths = analysis.path_info.path_tiles;
    if (pathLengths && pathLengths.length > 1) {
        const minLength = Math.min(...pathLengths);
        const maxLength = Math.max(...pathLengths);
        if (maxLength > 0) {
            const pathRatio = minLength / maxLength;
            const pathBalanceBonus = pathRatio * 10;
            score += pathBalanceBonus;
        }
    }
    
    return Math.max(0, Math.min(100, score));
};

const calculateComplexityScore = (analysis) => {
    let score = 0;
    score += Math.min(analysis.total_path_tiles / 2, 30);
    if (analysis.path_info.has_connection) score += 20;
    score += Math.min(analysis.path_info.bridge_tiles * 3, 25);
    score += Math.min(analysis.cost_variance / 5, 25);
    return Math.min(100, score);
};

const calculateStrategicVariance = (analysis) => {
    const pathLengths = analysis.path_info.path_tiles;
    if (!pathLengths || pathLengths.length < 2) return 0;

    const minLength = Math.min(...pathLengths);
    const maxLength = Math.max(...pathLengths);
    
    const totalTiles = pathLengths.reduce((a, b) => a + b, 0);
    if (totalTiles === 0) return 0;

    return ((maxLength - minLength) / totalTiles) * 100;
};


export function recalculateAnalysis(layout) {
    const { tiles } = layout;
    
    // Create a simple grid for the pathfinder
    const grid = Array(9).fill(null).map(() => Array(7).fill('rock'));
    tiles.forEach(t => {
        if (t.row - 1 >= 0 && t.row - 1 < 9 && t.col - 1 >= 0 && t.col - 1 < 7) {
            let type;
            switch (t.tile_type) {
                case 'semi_locked': type = 'path'; break;
                case 'bridge': type = 'bridge'; break;
                case 'key': type = 'key'; break;
                default: type = t.tile_type; break;
            }
            grid[t.row - 1][t.col - 1] = type;
        }
    });

    const { all_paths } = findAllPathsFromEntries(grid, tiles);
    const pathCosts = all_paths.map(p => p.cost);
    const avgCost = pathCosts.length > 0 ? pathCosts.reduce((a, b) => a + b, 0) / pathCosts.length : 0;
    const maxDiff = pathCosts.length > 0 ? Math.max(...pathCosts.map(c => Math.abs(c - avgCost))) : 0;
    const costVariancePercent = avgCost > 0 ? (maxDiff / avgCost) * 100 : 0;

    const newAnalysis = {
        ...layout.analysis, // Carry over existing info like milestones
        path_costs: pathCosts.map(cost => Math.ceil(cost)),
        cost_variance: costVariancePercent,
        balanced_costs: costVariancePercent <= 15,
        shortest_path: pathCosts.length > 0 ? Math.ceil(Math.min(...pathCosts)) : 0,
        longest_path: pathCosts.length > 0 ? Math.ceil(Math.max(...pathCosts)) : 0,
        average_path: pathCosts.length > 0 ? avgCost : 0,
        all_paths: all_paths,
    };
    
    // Recalculate scores based on the new analysis
    newAnalysis.balance_score = calculateBalanceScore(newAnalysis);
    newAnalysis.complexity_score = calculateComplexityScore(newAnalysis);
    newAnalysis.strategic_variance = calculateStrategicVariance(newAnalysis);

    return newAnalysis;
} 