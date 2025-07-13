import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Zap, Lock, Mountain, Circle, Flag, CheckCircle, Trash2, Upload } from 'lucide-react';
import PropTypes from 'prop-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { findAllPathsFromEntries } from '@/generation/pathAnalysis';

export default function LayoutPreview({ layout, analysis, showDetails = true, compact = false, onPromote, onDelete }) {
  // Master state for the component's view of the layout and analysis
  const [localLayout, setLocalLayout] = useState(layout);
  const [localAnalysis, setLocalAnalysis] = useState(analysis);
  
  // Selection state
  const [selectedPathIndex, setSelectedPathIndex] = useState(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState(null);

  // Editing state
  const [editingEntry, setEditingEntry] = useState(false);
  const [flagMode, setFlagMode] = useState('feedback'); // 'feedback', 'entry', 'remove', 'rock'

  // Feedback state
  const [feedback, setFeedback] = useState(() => {
    // ... (feedback loading logic remains the same)
    const init = { label: null, comment: '', entryOverride: [], suppressFlags: [] };
    if (typeof window === 'undefined') return init;
    try {
      const stored = JSON.parse(localStorage.getItem('layoutFeedback') || '{}');
      const raw = stored[layout.id];
      if (!raw) return init;
      if (typeof raw === 'string') return { ...init, label: raw };
      if (raw && raw.entryOverride && !Array.isArray(raw.entryOverride)) {
         raw.entryOverride = raw.entryOverride ? [raw.entryOverride] : [];
      }
      if (raw && raw.suppressFlags === undefined) raw.suppressFlags = [];
      return { ...init, ...raw };
    } catch {
      return init;
    }
  });

  // ========== Effects for State Synchronization ==========

  // Sync with parent props
  useEffect(() => {
    setLocalLayout(layout);
    setLocalAnalysis(analysis);
    setSelectedPathIndex(null);
    setSelectedTileIndex(null);
  }, [layout, analysis]);

  // Re-run full analysis when critical tile properties change
  const entryPointsKey = useMemo(() => localLayout.tiles.filter(t => t.isEntryPoint).map(t => `${t.row},${t.col}`).sort().join(';'), [localLayout]);
  const passableTilesKey = useMemo(() => localLayout.tiles.filter(t => ['semi_locked', 'bridge', 'key'].includes(t.tile_type)).map(t => `${t.row},${t.col}`).sort().join(';'), [localLayout]);
  
  useEffect(() => {
    if (!localLayout.id) return;
    rebuildAnalysisFromTiles();
  }, [entryPointsKey, passableTilesKey, localLayout.id]);

  // ========== Derived State (Memos) ==========
  
  const selectedPathKeys = useMemo(() => {
    if (selectedPathIndex !== null && localAnalysis?.all_paths?.[selectedPathIndex]) {
      return localAnalysis.all_paths[selectedPathIndex].path || [];
    }
    return [];
  }, [selectedPathIndex, localAnalysis]);
  
  const selectedTile = useMemo(() => {
    if (selectedTileIndex !== null) {
      return localLayout.tiles[selectedTileIndex];
    }
    return null;
  }, [selectedTileIndex, localLayout.tiles]);

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

  // ========== Core Functions ==========

  const stepCost = (level) => Math.pow(2, level - 1);
  const chainMaxMap = { orange: 12, blue: 10, green: 10 };

  const recalculateAnalysisMetrics = (currentAnalysis, newPathCosts) => {
    const newAnalysis = { ...currentAnalysis, path_costs: newPathCosts };
    const avg = newPathCosts.length > 0 ? newPathCosts.reduce((a, b) => a + b, 0) / newPathCosts.length : 0;
    const maxDiff = newPathCosts.length > 0 ? Math.max(...newPathCosts.map(c => Math.abs(c - avg))) : 0;
    newAnalysis.cost_variance = avg > 0 ? (maxDiff / avg) * 100 : 0;
    newAnalysis.balanced_costs = newAnalysis.cost_variance <= 15;
    newAnalysis.shortest_path = newPathCosts.length > 0 ? Math.ceil(Math.min(...newPathCosts)) : 0;
    newAnalysis.longest_path = newPathCosts.length > 0 ? Math.ceil(Math.max(...newPathCosts)) : 0;
    newAnalysis.average_path = newPathCosts.length > 0 ? avg : 0;
    if (newAnalysis.all_paths) {
      newAnalysis.all_paths = newAnalysis.all_paths.map((p, idx) => ({ ...p, cost: newPathCosts[idx] || p.cost }));
    }
    return newAnalysis;
  };

  const rebuildAnalysisFromTiles = (layoutToAnalyze = localLayout) => {
    if (!layoutToAnalyze.id) return;

    const { tiles } = layoutToAnalyze;
    const freshGrid = Array(9).fill(null).map(() => Array(7).fill('rock'));
    tiles.forEach(t => {
      if (t.row - 1 >= 0 && t.row - 1 < 9 && t.col - 1 >= 0 && t.col - 1 < 7) {
        let type;
        switch (t.tile_type) {
          case 'semi_locked': type = 'path'; break;
          case 'bridge': type = 'bridge'; break;
          case 'key': type = 'key'; break;
          default: type = t.tile_type; break;
        }
        freshGrid[t.row - 1][t.col - 1] = type;
      }
    });
    const { all_paths } = findAllPathsFromEntries(freshGrid, tiles);
    const path_costs = all_paths.map(p => p.cost);
    
    const newAnalysis = recalculateAnalysisMetrics({ ...localAnalysis, all_paths }, path_costs);
    setLocalAnalysis(newAnalysis);
  };
  
  // ========== Button Handlers ==========

  const adjustSingleTileLevel = (delta) => {
    if (selectedTileIndex === null) return;
    const tile = localLayout.tiles[selectedTileIndex];
    if (!tile || !tile.required_item_level) return;

    const newTiles = [...localLayout.tiles];
    const newTile = { ...tile };
    const maxLevel = (chainMaxMap[newTile.required_item_chain_color] || 12) - 1;
    const newLevel = Math.max(2, Math.min(maxLevel, newTile.required_item_level + delta));

    if (newLevel === newTile.required_item_level) return;

    newTile.required_item_level = newLevel;
    if (newTile.required_item_name) {
      const parts = newTile.required_item_name.split(' L');
      newTile.required_item_name = `${parts[0]} L${newLevel}`;
    }
    newTiles[selectedTileIndex] = newTile;
    
    // Create a new layout object to ensure state updates correctly
    const newLayout = { ...localLayout, tiles: newTiles };
    setLocalLayout(newLayout);
    
    // Directly trigger a full recalculation after the state update.
    // We wrap this in a timeout to ensure it runs after the state has been set.
    setTimeout(() => rebuildAnalysisFromTiles(newLayout), 0);
  };

  const persist = (next) => {
    try {
      const stored = JSON.parse(localStorage.getItem('layoutFeedback') || '{}');
      stored[layout.id] = next;
      localStorage.setItem('layoutFeedback', JSON.stringify(stored));
    } catch (e) {
      console.error("Failed to persist feedback:", e);
    }
  };

  const updateFeedback = (patch) => {
    setFeedback(prev => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  };

  const balancePathToAverage = () => {
    if (selectedPathIndex === null || !localAnalysis?.path_costs) return;

    const otherCosts = localAnalysis.path_costs.filter((_, idx) => idx !== selectedPathIndex);
    if (otherCosts.length === 0) return;

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

    let iterations = 0;
    
    while (Math.abs(currentCost - targetCost) > 5 && iterations < 150) {
        let tileToChange = null;
        for (let i = 0; i <= pathTileRefs.length - 3; i++) {
            const t1 = pathTileRefs[i], t2 = pathTileRefs[i+1], t3 = pathTileRefs[i+2];
            if (t1.required_item_level === t2.required_item_level && t2.required_item_level === t3.required_item_level) {
                tileToChange = t2;
                break;
            }
        }

        const direction = (currentCost - targetCost) > 0 ? -1 : 1;

        if (!tileToChange) {
            const sorted = [...pathTileRefs].sort((a,b) => (direction === -1 ? b.required_item_level : a.required_item_level) - (direction === -1 ? a.required_item_level : b.required_item_level));
            tileToChange = sorted[0];
        }

        if (!tileToChange) break; 

        const oldLevel = tileToChange.required_item_level;
        const newLevel = oldLevel + direction;
        
        const maxLevel = (chainMaxMap[tileToChange.required_item_chain_color] || 12) - 1;
        const clampedLevel = Math.max(2, Math.min(maxLevel, newLevel));
        
        if (clampedLevel === oldLevel) {
            iterations++;
            continue;
        }

        const costChange = stepCost(clampedLevel) - stepCost(oldLevel);
        currentCost += costChange;
        tileToChange.required_item_level = clampedLevel;
        iterations++;
    }

    newTiles.forEach(t => {
      if(t.required_item_name) {
        const parts = t.required_item_name.split(' L');
        t.required_item_name = `${parts[0]} L${t.required_item_level}`;
      }
    });

    const newPathCosts = [...localAnalysis.path_costs];
    newPathCosts[selectedPathIndex] = Math.ceil(currentCost);

    setLocalLayout({ ...localLayout, tiles: newTiles });
    setLocalAnalysis(recalculateAnalysisMetrics(localAnalysis, newPathCosts));
  };

  const autoBalanceAcrossPaths = () => {
    if (!localAnalysis?.all_paths || localAnalysis.all_paths.length < 2) return;

    const newTiles = localLayout.tiles.map(t => ({ ...t }));

    const pathTileRefs = localAnalysis.all_paths.map(p =>
      p.path.map(coord => {
        const [r, c] = coord.split(',').map(Number);
        return newTiles.find(t => t.row === r + 1 && t.col === c + 1);
      }).filter(t => t && t.required_item_level)
    );

    let pathCosts = pathTileRefs.map(arr => arr.reduce((sum, t) => sum + stepCost(t.required_item_level), 0));
    let iterations = 0;
    const MAX_ITER = 400;

    while (iterations < MAX_ITER) {
      const avg = pathCosts.reduce((a, b) => a + b, 0) / pathCosts.length;
      let maxIdx = 0, minIdx = 0;
      pathCosts.forEach((c, idx) => { if (c > pathCosts[maxIdx]) maxIdx = idx; if (c < pathCosts[minIdx]) minIdx = idx; });
      
      if (pathCosts[maxIdx] === pathCosts[minIdx]) break;

      const direction = (pathCosts[maxIdx] - avg > avg - pathCosts[minIdx]) ? -1 : 1;
      const pathToTweakIdx = direction === -1 ? maxIdx : minIdx;
      
      let tileToChange = null;
      const pathTilesToTweak = pathTileRefs[pathToTweakIdx];

      // Rule 1: Prioritize breaking sequences of 3+ identical levels
      for (let i = 0; i <= pathTilesToTweak.length - 3; i++) {
        const t1 = pathTilesToTweak[i], t2 = pathTilesToTweak[i+1], t3 = pathTilesToTweak[i+2];
        if (t1.required_item_level === t2.required_item_level && t2.required_item_level === t3.required_item_level) {
          tileToChange = t2; // Pick the middle tile
          break;
        }
      }

      // Rule 2: If no sequences, fall back to changing the most impactful tile
      if (!tileToChange) {
        const sortedTiles = [...pathTilesToTweak].sort((a,b) => (direction === -1 ? b.required_item_level - a.required_item_level : a.required_item_level - b.required_item_level));
        tileToChange = sortedTiles[0];
      }

      if (!tileToChange) {
        iterations++;
        continue;
      }
      
      const oldLevel = tileToChange.required_item_level;
      const maxLevel = (chainMaxMap[tileToChange.required_item_chain_color] || 12) - 1;
      const newLevel = Math.max(2, Math.min(maxLevel, oldLevel + direction));

      if (newLevel === oldLevel) {
          iterations++;
          continue;
      }
      
      const costChange = stepCost(newLevel) - stepCost(oldLevel);
      pathCosts[pathToTweakIdx] += costChange;
      tileToChange.required_item_level = newLevel;
      if(tileToChange.required_item_name){
        const parts = tileToChange.required_item_name.split(' L');
        tileToChange.required_item_name = `${parts[0]} L${newLevel}`;
      }
      
      iterations++;
    }
    
    setLocalLayout({ ...localLayout, tiles: newTiles });
    setLocalAnalysis(recalculateAnalysisMetrics(localAnalysis, pathCosts.map(c => Math.ceil(c))));
  };

  const addEntryAndRecalc = (coord, tileObj) => {
      const newTiles = localLayout.tiles.map(t => {
          if (t.id !== tileObj.id) return t;
          const newTile = { ...t, isEntryPoint: true, discovered: true };
          const existingEntryLevels = localLayout.tiles.filter(et => et.isEntryPoint && et.required_item_level).map(et => et.required_item_level);
          if (existingEntryLevels.length > 0) {
              const minLevel = Math.min(...existingEntryLevels);
              const adjustment = Math.floor(Math.random() * 3) - 1;
              let targetLevel = minLevel + adjustment;
              const maxLevel = (chainMaxMap[newTile.required_item_chain_color] || 12) - 1;
              targetLevel = Math.max(2, Math.min(targetLevel, maxLevel));
              newTile.required_item_level = targetLevel;
              if (newTile.required_item_name) {
                  const parts = newTile.required_item_name.split(' L');
                  newTile.required_item_name = `${parts[0]} L${targetLevel}`;
              }
          }
          return newTile;
      });
      setLocalLayout(prev => ({ ...prev, tiles: newTiles }));
  };

  const removeEntryAndRecalc = (coord, tileObj) => {
      if (!tileObj.isEntryPoint) return;
      const newTiles = localLayout.tiles.map(t => (t.id === tileObj.id) ? { ...t, isEntryPoint: false } : t);
      setLocalLayout(prev => ({ ...prev, tiles: newTiles }));
  };

  const placeRockAndRecalc = (tileObj) => {
    if (tileObj.tile_type === 'rock') return;
    const newTiles = localLayout.tiles.map(t => (t.id === tileObj.id) ? { ...t, tile_type: 'rock', isEntryPoint: false } : t);
    setLocalLayout(prev => ({ ...prev, tiles: newTiles }));
  };

  const adjustPathLevels = (delta) => {
    if (selectedPathIndex === null) return;
    const path = localAnalysis?.all_paths?.[selectedPathIndex];
    if (!path || !path.path) return;

    const newTiles = localLayout.tiles.map(t => {
      if (!path.path.includes(`${t.row - 1},${t.col - 1}`)) return t;
      if (!t.required_item_level) return t;
      
      const newTile = { ...t };
      const maxLevel = (chainMaxMap[newTile.required_item_chain_color] || 12) - 1;
      const newLevel = Math.max(2, Math.min(maxLevel, newTile.required_item_level + delta));
      newTile.required_item_level = newLevel;
      if (newTile.required_item_name) {
        const parts = newTile.required_item_name.split(' L');
        newTile.required_item_name = `${parts[0]} L${newLevel}`;
      }
      return newTile;
    });

    const newCost = path.path.reduce((sum, coord) => {
        const [r, c] = coord.split(',').map(Number);
        const tile = newTiles.find(t => t.row === r + 1 && t.col === c + 1);
        return sum + (tile?.required_item_level ? stepCost(tile.required_item_level) : 0);
    }, 0);

    const newPathCosts = [...localAnalysis.path_costs];
    newPathCosts[selectedPathIndex] = Math.ceil(newCost);
    
    setLocalLayout({ ...localLayout, tiles: newTiles });
    setLocalAnalysis(recalculateAnalysisMetrics(localAnalysis, newPathCosts));
  };

  const exportFeedback = () => {
    try {
      const all = JSON.parse(localStorage.getItem('layoutFeedback') || '{}');
      const thisLayoutFeedback = all[layout.id] || feedback;

      const data = {
        exported_at: new Date().toISOString(),
        layouts: [{
            ...layout,
            analysis: analysis || null,
            feedback: thisLayoutFeedback
        }]
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
    } catch (e) {
      console.error("Failed to export feedback:", e);
    }
  };

  const isCustom = String(layout.id).startsWith('custom-');

  // ========== JSX Rendering ==========

  if (!localLayout || !localLayout.tiles) {
    return <Card><CardContent className="pt-6"><p>No layout data.</p></CardContent></Card>;
  }

  const grid = Array(9).fill(null).map(() => Array(7).fill(null));
  localLayout.tiles.forEach(tile => {
    if (tile.row - 1 >= 0 && tile.row - 1 < 9 && tile.col - 1 >= 0 && tile.col - 1 < 7) {
      grid[tile.row - 1][tile.col - 1] = tile;
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
                    if(flagMode==='entry'){
                        if(tile){
                          addEntryAndRecalc(coord,tile);
                        }
                    } else if(flagMode==='remove'){
                        if(tile){ removeEntryAndRecalc(coord,tile);} 
                    } else if (flagMode === 'rock') {
                        if (tile) { placeRockAndRecalc(tile); }
                    } else {
                        // feedback mode (blue flag) behaves as before
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
                    }
                    setEditingEntry(false);
                    return;
                  }

                  // New Selection Logic
                  const tileIndex = (rowIndex * 7) + colIndex;
                  if (pathEntryMap[coord]) {
                    const pathsForEntry = pathEntryMap[coord];
                    const currentIdxInList = pathsForEntry.indexOf(selectedPathIndex);
                    const nextIdx = currentIdxInList === -1 || currentIdxInList === pathsForEntry.length - 1 ? 0 : currentIdxInList + 1;
                    setSelectedPathIndex(pathsForEntry[nextIdx]);
                    setSelectedTileIndex(null); // Clear single tile selection when a path is selected
                  } else {
                    // It's not an entry point, so treat it as a single tile selection
                    setSelectedTileIndex(tileIndex);
                    setSelectedPathIndex(null); // Clear path selection
                  }
                }}
                className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} relative border rounded flex items-center justify-center text-xs font-medium transition-all cursor-pointer
                ${getTileColor(tile)}
                ${selectedPathKeys.includes(coord) ? 'ring-2 ring-offset-1 ring-red-500' : ''}
                ${selectedTileIndex === (rowIndex * 7) + colIndex ? 'ring-2 ring-blue-500' : ''}
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
          <div className="flex-1 flex justify-center gap-1">
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
                title="Edit flags"
                onClick={() => {
                  if(editingEntry){setEditingEntry(false);} else {setFlagMode('feedback');setEditingEntry(true);} }}
               className={`px-2 py-0.5 text-xs rounded border ${editingEntry ? 'bg-blue-100 border-blue-400' : 'border-gray-300'}`}>✏️</button>
             {editingEntry && (
               <div className="flex gap-1 ml-1">
                 <Button size="xs" variant={flagMode==='entry'?'secondary':'outline'} onClick={()=>setFlagMode('entry')}>🚩 Red</Button>
                 <Button size="xs" variant={flagMode==='feedback'?'secondary':'outline'} onClick={()=>setFlagMode('feedback')}>🏳️ Blue</Button>
                 <Button size="xs" variant={flagMode==='rock'?'secondary':'outline'} onClick={()=>setFlagMode('rock')}>🪨 Rock</Button>
                 <Button size="xs" variant={flagMode==='remove'?'secondary':'outline'} onClick={()=>setFlagMode('remove')}>❌ Remove</Button>
               </div>
             )}
             <button
               title="Export feedback JSON"
               onClick={exportFeedback}
               className="px-2 py-0.5 text-xs rounded border border-gray-300">📤</button>
            {isCustom && (
              <div className="flex gap-2 ml-4">
                <Button size="xs" variant="outline" onClick={() => onPromote(localLayout)}>
                  <Upload className="w-4 h-4 mr-1" />
                  Promote
                </Button>
                <Button size="xs" variant="destructive" onClick={() => onDelete(localLayout.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
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
                    onClick={() => {
                        setSelectedPathIndex(null);
                        setSelectedTileIndex(null);
                    }}
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
                {selectedTile && selectedTile.required_item_level && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => adjustSingleTileLevel(1)}>Lvl +1</Button>
                    <Button size="sm" variant="outline" onClick={() => adjustSingleTileLevel(-1)}>Lvl -1</Button>
                  </div>
                )}
                {selectedPathIndex !== null && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => adjustPathLevels(1)}>Raise +1</Button>
                    <Button size="sm" variant="outline" onClick={() => adjustPathLevels(-1)}>Lower -1</Button>
                    <Button size="sm" variant="outline" onClick={balancePathToAverage}>Balance to Avg</Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      const newTiles = localLayout.tiles.map(t => {
                        if (!t.required_item_level || t.required_item_level <= 2) return t;
                        const newTile = { ...t };
                        const newLevel = newTile.required_item_level - 1;
                        newTile.required_item_level = newLevel;
                        if (newTile.required_item_name) {
                          const parts = newTile.required_item_name.split(' L');
                          newTile.required_item_name = `${parts[0]} L${newLevel}`;
                        }
                        return newTile;
                      });
                      const newLayout = { ...localLayout, tiles: newTiles };
                      setLocalLayout(newLayout);
                      setTimeout(() => rebuildAnalysisFromTiles(newLayout), 0);
                    }}>
                      -1 to All Levels
                    </Button>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Cost Variance (%)</span>
                  <span className={`font-semibold ${localAnalysis.balanced_costs ? 'text-green-700' : 'text-yellow-800'}`}>{localAnalysis.cost_variance.toFixed(1)}%</span>
                </div>
                 <div className="flex justify-between font-semibold">
                    <span>Cheapest Path:</span>
                    <span>{localAnalysis.shortest_path}</span>
                </div>
                <div className="flex justify-between font-semibold">
                    <span>Most Expensive Path:</span>
                    <span>{localAnalysis.longest_path}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average (Cheap &amp; Expensive):</span>
                  <span>{((localAnalysis.shortest_path+localAnalysis.longest_path)/2).toFixed(1)}</span>
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
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    tiles: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  analysis: PropTypes.object,
  showDetails: PropTypes.bool,
  compact: PropTypes.bool,
  onPromote: PropTypes.func,
  onDelete: PropTypes.func,
}; 