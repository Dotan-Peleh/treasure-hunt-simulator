import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Zap, Lock, Mountain, Circle, Flag, CheckCircle } from 'lucide-react';
import PropTypes from 'prop-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function LayoutPreview({ layout, analysis, showDetails = true, compact = false }) {
  // Local mutable copies so we can tweak levels without touching parent data
  const [localLayout, setLocalLayout] = useState(layout);
  const [localAnalysis, setLocalAnalysis] = useState(analysis);

  // Sync when parent supplies a new layout
  useEffect(() => {
    setLocalLayout(layout);
    setLocalAnalysis(analysis);
    setSelectedPathIndex(null);
  }, [layout, analysis]);

  const [selectedPathIndex, setSelectedPathIndex] = useState(null);
  // Local feedback state: { label: "good"|"bad"|null, comment: string, entryOverride: "r,c"|null }
  const [feedback, setFeedback] = useState(() => {
    const init = { label: null, comment: '', entryOverride: [], suppressFlags: [] };
    if (typeof window === 'undefined') return init;
    try {
      const stored = JSON.parse(localStorage.getItem('layoutFeedback') || '{}');
      const raw = stored[layout.id];
      if (!raw) return init;
      if (typeof raw === 'string') return { ...init, label: raw }; // backward-compat
      if (raw && raw.entryOverride && !Array.isArray(raw.entryOverride)) {
         raw.entryOverride = raw.entryOverride ? [raw.entryOverride] : [];
      }
      if (raw && raw.suppressFlags === undefined) raw.suppressFlags = [];
      return { ...init, ...raw };
    } catch {
      return init;
    }
  });

  const persist = (next) => {
    try {
      const stored = JSON.parse(localStorage.getItem('layoutFeedback') || '{}');
      stored[layout.id] = next;
      localStorage.setItem('layoutFeedback', JSON.stringify(stored));
    } catch {/* ignore */}
  };

  const updateFeedback = (patch) => {
    setFeedback(prev => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  };

  const [editingEntry, setEditingEntry] = useState(false);

  // Helper to adjust every tile level in the selected path by delta (+1 or -1)
  const adjustPathLevels = (delta) => {
    if (selectedPathIndex === null) return;
    const path = localAnalysis?.all_paths?.[selectedPathIndex];
    if (!path || !path.path) return;

    const stepCost = (level) => Math.pow(2, level - 1);

    const newTiles = localLayout.tiles.map(t => ({ ...t }));
    let newCost = 0;

    path.path.forEach(coord => {
      const [r, c] = coord.split(',').map(Number);
      const idx = newTiles.findIndex(t => t.row === r + 1 && t.col === c + 1);
      if (idx === -1) return;
      const tile = { ...newTiles[idx] };
      if (!tile.required_item_level) return;
      const chainMax = 12; // hard cap; could derive from chain meta
      const newLevel = Math.min(chainMax, Math.max(1, tile.required_item_level + delta));
      tile.required_item_level = newLevel;
      if (tile.required_item_name) {
        const parts = tile.required_item_name.split(' L');
        tile.required_item_name = `${parts[0]} L${newLevel}`;
      }
      newTiles[idx] = tile;
      newCost += stepCost(newLevel);
    });

    // Update analysis cost arrays
    const newAnalysis = { ...localAnalysis };
    newAnalysis.path_costs = [...newAnalysis.path_costs];
    newAnalysis.path_costs[selectedPathIndex] = Math.ceil(newCost);
    if (newAnalysis.all_paths && newAnalysis.all_paths[selectedPathIndex]) {
      newAnalysis.all_paths = [...newAnalysis.all_paths];
      newAnalysis.all_paths[selectedPathIndex] = { ...newAnalysis.all_paths[selectedPathIndex], cost: Math.ceil(newCost) };
    }

    // Recompute cost variance & balance flag
    const avg = newAnalysis.path_costs.reduce((a,b)=>a+b,0) / newAnalysis.path_costs.length;
    const maxDiff = Math.max(...newAnalysis.path_costs.map(c=>Math.abs(c-avg)));
    newAnalysis.cost_variance = avg>0 ? (maxDiff/avg)*100 : 0;
    newAnalysis.balanced_costs = newAnalysis.cost_variance <= 15;

    setLocalLayout({ ...localLayout, tiles: newTiles });
    setLocalAnalysis(newAnalysis);
  };

  const balancePathToAverage = () => {
    if (selectedPathIndex === null || !localAnalysis?.path_costs) return;

    const otherCosts = localAnalysis.path_costs.filter((_, idx) => idx !== selectedPathIndex);
    if (otherCosts.length === 0) return; // Cannot balance a single path

    const targetCost = otherCosts.reduce((a, b) => a + b, 0) / otherCosts.length;
    let currentCost = localAnalysis.path_costs[selectedPathIndex];
    
    const path = localAnalysis.all_paths[selectedPathIndex];
    if (!path || !path.path) return;
    
    const newTiles = localLayout.tiles.map(t => ({...t}));
    const pathTileRefs = path.path.map(coord => {
        const [r, c] = coord.split(',').map(Number);
        return newTiles.find(t => t.row === r + 1 && t.col === c + 1);
    }).filter(t => t && t.required_item_level);

    if (pathTileRefs.length === 0) return;

    const stepCost = (level) => Math.pow(2, level-1);
    let iterations = 0;

    while (Math.abs(currentCost - targetCost) > 5 && iterations < 100) {
        if (currentCost > targetCost) {
            // Path is too expensive, lower the highest level
            pathTileRefs.sort((a,b) => (b.required_item_level || 0) - (a.required_item_level || 0));
            const tileToChange = pathTileRefs.find(t => t.required_item_level > 2);
            if (!tileToChange) break;
            currentCost -= stepCost(tileToChange.required_item_level) - stepCost(tileToChange.required_item_level - 1);
            tileToChange.required_item_level--;
        } else {
            // Path is too cheap, raise the lowest level
            pathTileRefs.sort((a,b) => (a.required_item_level || 0) - (b.required_item_level || 0));
            const tileToChange = pathTileRefs.find(t => t.required_item_level < 12);
            if (!tileToChange) break;
            currentCost -= stepCost(tileToChange.required_item_level) - stepCost(tileToChange.required_item_level + 1);
            tileToChange.required_item_level++;
        }
        iterations++;
    }

    // Update names and analysis
    newTiles.forEach(t => {
      if(t.required_item_name) {
        const parts = t.required_item_name.split(' L');
        t.required_item_name = `${parts[0]} L${t.required_item_level}`;
      }
    });

    const newAnalysis = { ...localAnalysis };
    newAnalysis.path_costs = [...newAnalysis.path_costs];
    newAnalysis.path_costs[selectedPathIndex] = Math.ceil(currentCost);
    if (newAnalysis.all_paths && newAnalysis.all_paths[selectedPathIndex]) {
      newAnalysis.all_paths = [...newAnalysis.all_paths];
      newAnalysis.all_paths[selectedPathIndex] = { ...newAnalysis.all_paths[selectedPathIndex], cost: Math.ceil(currentCost) };
    }

    // Recompute cost variance & balance flag after balancing
    const avg = newAnalysis.path_costs.reduce((a,b)=>a+b,0) / newAnalysis.path_costs.length;
    const maxDiff = Math.max(...newAnalysis.path_costs.map(c=>Math.abs(c-avg)));
    newAnalysis.cost_variance = avg>0 ? (maxDiff/avg)*100 : 0;
    newAnalysis.balanced_costs = newAnalysis.cost_variance <= 15;

    setLocalLayout({ ...localLayout, tiles: newTiles });
    setLocalAnalysis(newAnalysis);
  };

  // Automatically balance ALL paths until variance ≤ 15 %
  const autoBalanceAcrossPaths = () => {
    if (!localAnalysis?.all_paths || localAnalysis.all_paths.length < 2) return;

    const newTiles = localLayout.tiles.map(t => ({ ...t }));

    const getTileObj = (r, c) => newTiles.find(t => t.row === r + 1 && t.col === c + 1);
    const stepCost = (lvl) => Math.pow(2, lvl - 1);

    // Build arrays of tile references for quicker iteration per path
    const pathTileRefs = localAnalysis.all_paths.map(p =>
      p.path.map(coord => {
        const [r, c] = coord.split(',').map(Number);
        return getTileObj(r, c);
      }).filter(t => t && t.required_item_level)
    );

    const computeCosts = () => pathTileRefs.map(arr => arr.reduce((sum, t) => sum + stepCost(t.required_item_level), 0));

    let pathCosts = computeCosts();
    let iterations = 0;
    const MAX_ITER = 400;

    while (iterations < MAX_ITER) {
      const avg = pathCosts.reduce((a, b) => a + b, 0) / pathCosts.length;
      const maxDiff = Math.max(...pathCosts.map(c => Math.abs(c - avg)));
      const variancePct = avg > 0 ? (maxDiff / avg) * 100 : 0;
      if (variancePct <= 15) break;

      // Determine which path to tweak
      let maxIdx = 0, minIdx = 0;
      pathCosts.forEach((c, idx) => {
        if (c > pathCosts[maxIdx]) maxIdx = idx;
        if (c < pathCosts[minIdx]) minIdx = idx;
      });

      const lowerPath = (idx) => {
        const tilesArr = pathTileRefs[idx].sort((a, b) => (b.required_item_level || 0) - (a.required_item_level || 0));
        for (const tile of tilesArr) {
          if (tile.required_item_level > 2) {
            const prev = tile.required_item_level;
            tile.required_item_level -= 1;
            if (tile.required_item_name) {
              const parts = tile.required_item_name.split(' L');
              tile.required_item_name = `${parts[0]} L${tile.required_item_level}`;
            }
            pathCosts[idx] -= stepCost(prev) - stepCost(prev - 1);
            return true;
          }
        }
        return false;
      };

      const raisePath = (idx) => {
        const tilesArr = pathTileRefs[idx].sort((a, b) => (a.required_item_level || 0) - (b.required_item_level || 0));
        for (const tile of tilesArr) {
          if (tile.required_item_level < 12) {
            const prev = tile.required_item_level;
            tile.required_item_level += 1;
            if (tile.required_item_name) {
              const parts = tile.required_item_name.split(' L');
              tile.required_item_name = `${parts[0]} L${tile.required_item_level}`;
            }
            pathCosts[idx] += stepCost(prev + 1) - stepCost(prev);
            return true;
          }
        }
        return false;
      };

      // Decide which adjustment to perform
      if (pathCosts[maxIdx] - avg > avg - pathCosts[minIdx]) {
        if (!lowerPath(maxIdx)) break;
      } else {
        if (!raisePath(minIdx)) break;
      }

      iterations++;
    }

    // Enforce variety: no more than 2 identical item IDs in a row per path
    const enforceVariety = () => {
      localAnalysis.all_paths.forEach((p, idx) => {
        const tilesArr = pathTileRefs[idx];
        let prevLvl = null, run = 0;
        tilesArr.forEach(tile => {
          const lvl = tile.required_item_level;
          if (lvl === prevLvl) {
            run += 1;
          } else {
            run = 1; prevLvl = lvl;
          }
          if (run > 2) {
            // tweak level by +/-1 to break repetition, clamp 2-12
            const prevLevel = tile.required_item_level;
            let newLevel = prevLevel + (prevLevel > 6 ? -1 : 1);
            if (newLevel < 2) newLevel = prevLevel + 1; if (newLevel > 12) newLevel = prevLevel - 1;
            tile.required_item_level = newLevel;
            const parts = tile.required_item_name.split(' L');
            tile.required_item_name = `${parts[0]} L${newLevel}`;
            pathCosts[idx] += stepCost(newLevel) - stepCost(prevLevel);
            prevLvl = newLevel;
            run = 1;
          }
        });
      });
    };

    enforceVariety();

    const enforceLevelDistribution = () => {
      pathTileRefs.forEach((tilesArr, idx) => {
        if (tilesArr.length < 3) return;
        const limit = Math.ceil(tilesArr.length * 0.4); // 40% max same level
        let counts = {};
        tilesArr.forEach(t => { counts[t.required_item_level] = (counts[t.required_item_level] || 0) + 1; });
        let dominantLevel = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        let distinct = Object.keys(counts).length;
        let safety = 60;
        while ((counts[dominantLevel] > limit || distinct < 3) && safety--) {
          const candidates = tilesArr.filter(t => t.required_item_level === Number(dominantLevel));
          if (!candidates.length) break;
          const tile = candidates[Math.floor(Math.random() * candidates.length)];
          const prevLevel = tile.required_item_level;
          let newLevel = prevLevel + (prevLevel > 6 ? -1 : 1);
          if (newLevel < 2) newLevel = prevLevel + 1; if (newLevel > 12) newLevel = prevLevel - 1;
          tile.required_item_level = newLevel;
          const parts = tile.required_item_name.split(' L');
          tile.required_item_name = `${parts[0]} L${newLevel}`;
          pathCosts[idx] += stepCost(newLevel) - stepCost(prevLevel);
          // update counts
          counts[prevLevel]--; counts[newLevel] = (counts[newLevel] || 0) + 1;
          dominantLevel = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
          distinct = Object.keys(counts).length;
        }
      });
    };

    enforceLevelDistribution();

    // Recompute analysis path costs after variety tweak
    const newPathCosts = pathCosts.map(c => Math.ceil(c));
    const avg = newPathCosts.reduce((a, b) => a + b, 0) / newPathCosts.length;
    const maxDiff = Math.max(...newPathCosts.map(c => Math.abs(c - avg)));
    const costVar = avg > 0 ? (maxDiff / avg) * 100 : 0;

    const newAnalysis = { ...localAnalysis, path_costs: newPathCosts, cost_variance: costVar, balanced_costs: costVar <= 15 };
    if (newAnalysis.all_paths) {
      newAnalysis.all_paths = newAnalysis.all_paths.map((p, idx) => ({ ...p, cost: newPathCosts[idx] }));
    }

    setLocalLayout({ ...localLayout, tiles: newTiles });
    setLocalAnalysis(newAnalysis);
  };

  const exportFeedback = () => {
    try {
      // Retrieve stored feedback for all layouts (needed to keep thumbs up/down etc.)
      const all = JSON.parse(localStorage.getItem('layoutFeedback') || '{}');
      const thisLayoutFeedback = all[layout.id] || feedback;

      const data = {
        exported_at: new Date().toISOString(),
        layouts: [
          {
            ...layout,
            analysis: analysis || null,
            feedback: thisLayoutFeedback
          }
        ]
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `layout-feedback-${layout.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {/* ignore */}
  };

  // When a new layout is rendered, reload its stored feedback (or blank) and reset UI state
  useEffect(() => {
    const init = { label: null, comment: '', entryOverride: [], suppressFlags: [] };
    try {
      const stored = JSON.parse(localStorage.getItem('layoutFeedback') || '{}');
      const raw = stored[layout.id];
      const fresh = raw
        ? (typeof raw === 'string' ? { ...init, label: raw } : { ...init, ...raw })
        : init;
      setFeedback(fresh);
    } catch {
      setFeedback(init);
    }
    setSelectedPathIndex(null);
    setEditingEntry(false);
  }, [layout.id]);

  // Map entry-point coordinates (first key in each path) → path index
  const pathEntryMap = useMemo(() => {
    if (!localAnalysis?.all_paths) return {};
    const map = {};
    localAnalysis.all_paths.forEach((p, idx) => {
      if (p.path && p.path.length > 0) {
        const key = p.path[0];
        if (!map[key]) map[key] = [];
        map[key].push(idx);
      }
    });
    return map;
  }, [localAnalysis]);

  const selectedPathKeys = useMemo(() => {
    if (!localAnalysis?.all_paths) return [];
    if (selectedPathIndex !== null) {
      return localAnalysis.all_paths[selectedPathIndex]?.path || [];
    }
    return [];
  }, [selectedPathIndex, localAnalysis]);

  if (!localLayout || !localLayout.tiles) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No layout data available</p>
        </CardContent>
      </Card>
    );
  }

  // Convert tiles to grid for visualization
  const grid = Array(9).fill(null).map(() => Array(7).fill(null));
  
  localLayout.tiles.forEach(tile => {
    const row = tile.row - 1;
    const col = tile.col - 1;
    if (row >= 0 && row < 9 && col >= 0 && col < 7) {
      grid[row][col] = tile;
    }
  });

  const getTileColor = (tile) => {
    if (!tile) return 'bg-gray-200';
    
    switch (tile.tile_type) {
      case 'free':
        return 'bg-green-100 border-green-300';
      case 'semi_locked':
        return 'bg-yellow-100 border-yellow-300';
      case 'locked':
        return 'bg-red-100 border-red-300';
      case 'rock':
        return 'bg-gray-400 border-gray-600';
      case 'key':
        return 'bg-purple-200 border-purple-400';
      default:
        return 'bg-gray-200 border-gray-400';
    }
  };

  const getTileContent = (tile) => {
    if (!tile) return null;
    if (tile.tile_type === 'key') return <Key className="w-4 h-4 text-purple-700" />;
    if (tile.item?.type === 'generator') return <Zap className="w-4 h-4 text-yellow-600" />;
    // ENTRY-POINT WITH REQUIREMENT: overlay flag in corner
    if (tile.required_item_name) {
      const level = tile.required_item_level;
      const color = tile.required_item_chain_color;
      const colorMap = {
        orange: 'text-orange-600',
        blue: 'text-blue-600',
        green: 'text-green-600',
      };

      const requirementContent = (
        <div className="flex items-center gap-0.5">
          <Circle className={`w-3 h-3 ${colorMap[color] || 'text-gray-500'}`} />
          <span className="font-bold text-xs">{level}</span>
        </div>
      );

      if (tile.isEntryPoint) {
        return (
          <div className="relative flex items-center justify-center">
            {requirementContent}
            <Flag className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
          </div>
        );
      }

      return requirementContent;
    }

    if (tile.isEntryPoint) return <Flag className="w-4 h-4 text-red-500" />;
    if (tile.tile_type === 'semi_locked') return <Lock className="w-4 h-4 text-yellow-700" />;
    if (tile.tile_type === 'rock') return <Mountain className="w-4 h-4 text-gray-600" />;
    
    return null;
  };

  const milestoneColorMap = {
    green: { bg: 'bg-green-300', border: 'border-green-400', text: 'text-green-600' },
    yellow: { bg: 'bg-yellow-300', border: 'border-yellow-400', text: 'text-yellow-600' },
    red: { bg: 'bg-red-300', border: 'border-red-400', text: 'text-red-600' },
    blue: { bg: 'bg-blue-300', border: 'border-blue-400', text: 'text-blue-600' }
  };

  const boardGrid = (
    <div className={`relative grid grid-cols-7 gap-1 ${compact ? 'p-1 bg-slate-200' : 'p-2 bg-gray-100'} rounded-lg`}>
        {/* Dynamic Milestone Lines */}
        {!compact && localAnalysis?.milestones && localAnalysis.milestones.map((milestone, index) => {
          const topPercentage = ((milestone.row -1) / 9) * 100;
          const colorNames = ['green', 'yellow', 'red'];
          const colorName = colorNames[index % colorNames.length] || 'blue';
          const colors = milestoneColorMap[colorName];
          return (
            <div
              key={index}
              className={`absolute left-[-4px] right-[-4px] h-px ${colors.bg} border-t border-dashed ${colors.border} z-10`}
              style={{ top: `${topPercentage}%` }}
            >
                <span className={`absolute left-2 -top-2 text-xs font-bold ${colors.text}`}>
                    +{milestone.reward}
                </span>
            </div>
          );
        })}
        {grid.flatMap((row, rowIndex) =>
          row.map((tile, colIndex) => {
            const coord = `${rowIndex},${colIndex}`;
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => {
                  if (editingEntry) {
                    if (tile?.isEntryPoint) {
                      const sup = Array.isArray(feedback.suppressFlags) ? [...feedback.suppressFlags] : [];
                      const si = sup.indexOf(coord);
                      if (si === -1) sup.push(coord); else sup.splice(si,1);
                      updateFeedback({ suppressFlags: sup });
                    } else {
                      const arr = Array.isArray(feedback.entryOverride) ? [...feedback.entryOverride] : [];
                      const idx = arr.indexOf(coord);
                      if (idx === -1) arr.push(coord); else arr.splice(idx,1);
                      updateFeedback({ entryOverride: arr });
                    }
                    setEditingEntry(false);
                    return;
                  }
                  if (pathEntryMap[coord]) {
                    const pathsForEntry = pathEntryMap[coord];
                    const currentIdxInList = pathsForEntry.indexOf(selectedPathIndex);
                    const nextIdx = currentIdxInList === -1 || currentIdxInList === pathsForEntry.length - 1 ? 0 : currentIdxInList + 1;
                    setSelectedPathIndex(pathsForEntry[nextIdx]);
                  }
                }}
                className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} relative border rounded flex items-center justify-center text-xs font-medium transition-all cursor-pointer
                ${getTileColor(tile)}
                ${selectedPathKeys.includes(coord) ? 'ring-2 ring-offset-1 ring-red-500' : (tile?.discovered ? 'ring-2 ring-blue-400' : '')}
                ${editingEntry ? 'animate-pulse' : ''}`}
                title={tile ? `${tile.tile_type}${tile.required_item_name ? ` - ${tile.required_item_name}` : ''}` : 'Empty'}
              >
                {getTileContent(tile)}
                {tile?.isEntryPoint && Array.isArray(feedback.suppressFlags) && feedback.suppressFlags.includes(coord) && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center pointer-events-none"></div>
                )}
                {Array.isArray(feedback.entryOverride) && feedback.entryOverride.includes(coord) && !tile?.isEntryPoint && (
                  <Flag className="w-3 h-3 text-blue-500 absolute -top-1 -right-1" />
                )}
              </div>
            );
          })
        )}
    </div>
  );

  if (compact) {
      return boardGrid;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between gap-2">
          <span>{localLayout.name || `Layout ${localLayout.id}`}</span>
          <div className="flex gap-1">
            <Badge variant="outline">#{localLayout.id}</Badge>
            {localAnalysis?.path_info?.has_connection && (
              <Badge variant="secondary">Connected</Badge>
            )}
            {typeof localAnalysis?.balanced_costs === 'boolean' && (
              localAnalysis.balanced_costs ? (
                <Badge className="bg-green-100 text-green-700 border-green-300" title="Cost variance ≤ 15%">Balanced</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300" title="Cost variance exceeds 15%">Unbalanced</Badge>
              )
            )}
          </div>
          <div className="flex gap-1 ml-2">
             <button
               onClick={() => updateFeedback({ label: 'good' })}
               className={`px-2 py-0.5 text-xs rounded border ${feedback.label==='good' ? 'bg-green-100 border-green-400' : 'border-gray-300'}`}>👍</button>
             <button
               onClick={() => updateFeedback({ label: 'bad' })}
               className={`px-2 py-0.5 text-xs rounded border ${feedback.label==='bad' ? 'bg-red-100 border-red-400' : 'border-gray-300'}`}>👎</button>
             <button
               title="Edit entry flag"
               onClick={() => setEditingEntry(e => !e)}
               className={`px-2 py-0.5 text-xs rounded border ${editingEntry ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}>✏️</button>
             <button
               title="Export feedback JSON"
               onClick={exportFeedback}
               className="px-2 py-0.5 text-xs rounded border border-gray-300">📤</button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Board Visualization */}
        <div className="flex justify-center relative">
            {!compact && (
              <>
                {/* Column labels */}
                <div className="absolute -top-5 left-0 right-0 flex justify-center gap-1">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <div key={`col-label-${idx}`} className="w-8 text-center text-xs text-gray-600">
                      {idx + 1}
                    </div>
                  ))}
                </div>
                {/* Row labels */}
                <div className="absolute inset-y-0 -left-5 flex flex-col justify-center gap-1">
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div key={`row-label-${idx}`} className="h-8 flex items-center justify-center text-xs text-gray-600">
                      {9 - idx}
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="relative">
              {boardGrid}
              {selectedPathIndex !== null && (
                <div className="absolute -top-5 right-0 bg-white border rounded px-2 py-0.5 text-xs font-semibold shadow">
                  Cost: {localAnalysis.path_costs[selectedPathIndex]}
                </div>
              )}
            </div>
        </div>

        {/* Comment box */}
        <div>
          <label className="text-xs font-semibold">Comment:</label>
          <textarea
            className="mt-1 w-full border rounded p-1 text-xs"
            rows={3}
            placeholder="Your comment..."
            value={feedback.comment}
            onChange={(e) => updateFeedback({ comment: e.target.value })}
          />
        </div>

        {/* Legend */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              Free
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              Semi-locked
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              Locked
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 border border-gray-600 rounded"></div>
              Rock
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-200 border border-purple-400 rounded"></div>
              Key
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Generator</span>
            <span className="flex items-center gap-1"><Key className="w-3 h-3" /> Key</span>
            <span className="flex items-center gap-1"><Circle className="w-3 h-3 text-orange-500" /> Item Lvl</span>
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
          </div>
        </div>

        {/* Analysis Details */}
        {showDetails && localAnalysis && (
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Cost Analysis
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span
                    className="cursor-pointer hover:underline"
                    onClick={() => setSelectedPathIndex(null)}
                  >
                    Total Strategic Paths:
                  </span>
                  <span>{localAnalysis.all_paths?.length || localAnalysis.path_costs.length}</span>
                </div>
                <div className="font-medium text-xs text-muted-foreground">Optimal Path Costs:</div>
                <ScrollArea className="h-24 pr-3 border rounded-md">
                  <div className="space-y-1 p-2">
                    {localAnalysis.path_costs.map((cost, index) => (
                        <div 
                          className={`flex justify-between text-xs cursor-pointer p-1 rounded hover:bg-slate-100 ${selectedPathIndex === index ? 'bg-blue-100' : ''}`} 
                          key={`path-cost-${index}`}
                          onClick={() => setSelectedPathIndex(index)}
                        >
                            <span>Path {index + 1} Cost:</span>
                            <span>{cost}</span>
                        </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="secondary" onClick={autoBalanceAcrossPaths}>Auto Balance Paths</Button>
                </div>
                {selectedPathIndex !== null && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => adjustPathLevels(1)}>Raise +1</Button>
                    <Button size="sm" variant="outline" onClick={() => adjustPathLevels(-1)}>Lower -1</Button>
                    <Button size="sm" variant="outline" onClick={balancePathToAverage}>Balance to Avg</Button>
                    <Button size="sm" variant="secondary" onClick={() => {
                      if (selectedPathIndex === null) return;
                      const path = localAnalysis?.all_paths?.[selectedPathIndex];
                      if (!path || !path.path) return;

                      const stepCost = (level) => Math.pow(2, level - 1);

                      const newTiles = localLayout.tiles.map(t => ({ ...t }));

                      // Build working array of tile references for quicker cost update
                      const pathTileRefs = path.path.map(coord => {
                        const [r, c] = coord.split(',').map(Number);
                        return newTiles.find(t => t.row === r + 1 && t.col === c + 1);
                      }).filter(Boolean);

                      const otherCosts = localAnalysis.path_costs.filter((_, idx) => idx !== selectedPathIndex);

                      let currentCost = localAnalysis.path_costs[selectedPathIndex];
                      let targetMax = ((otherCosts.length? (otherCosts.reduce((a,b)=>a+b,0)+currentCost)/(otherCosts.length+1):currentCost) *1.15);

                      // Lower levels starting from highest until under threshold
                      while (currentCost > targetMax) {
                        let changed = false;
                        // sort by level desc each loop to always lower highest first
                        pathTileRefs.sort((a,b)=> (b.required_item_level||0)-(a.required_item_level||0));
                        for(const tile of pathTileRefs){
                          if(tile.required_item_level>1){
                            tile.required_item_level -=1;
                            const parts = tile.required_item_name.split(' L');
                            tile.required_item_name = `${parts[0]} L${tile.required_item_level}`;
                            currentCost -= stepCost(tile.required_item_level+1) - stepCost(tile.required_item_level);
                            changed = true;
                            if(currentCost <= targetMax) break;
                          }
                        }
                        if(!changed) break; // cannot lower further
                      }

                      // Recompute average with new cost
                      const newCosts = [...localAnalysis.path_costs];
                      newCosts[selectedPathIndex] = Math.ceil(currentCost);
                      const newAnalysis = { ...localAnalysis, path_costs: newCosts };
                      if(newAnalysis.all_paths && newAnalysis.all_paths[selectedPathIndex]){
                         newAnalysis.all_paths = [...newAnalysis.all_paths];
                         newAnalysis.all_paths[selectedPathIndex] = { ...newAnalysis.all_paths[selectedPathIndex], cost: Math.ceil(currentCost) };
                      }

                      setLocalLayout({ ...localLayout, tiles: newTiles });
                      setLocalAnalysis(newAnalysis);
                    }}>
                      Balance ≤15%
                    </Button>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Cost Variance (%)</span>
                  <span className={`font-semibold ${localAnalysis.balanced_costs ? 'text-green-700' : 'text-yellow-800'}`}>{localAnalysis.cost_variance.toFixed(1)}%</span>
                </div>
                 <div className="flex justify-between font-semibold">
                    <span>Shortest Path:</span>
                    <span>{localAnalysis.shortest_path}</span>
                </div>
                <div className="flex justify-between font-semibold">
                    <span>Longest Path:</span>
                    <span>{localAnalysis.longest_path}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Path:</span>
                  <span>{localAnalysis.average_path.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <h4 className="font-medium mb-2">Scores</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {localAnalysis.balance_score?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {localAnalysis.complexity_score?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">Complexity</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {localAnalysis.strategic_variance?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">Strategic</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 

LayoutPreview.propTypes = {
    layout: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string,
        tiles: PropTypes.arrayOf(PropTypes.object).isRequired,
    }).isRequired,
    analysis: PropTypes.object,
    showDetails: PropTypes.bool,
    compact: PropTypes.bool,
}; 